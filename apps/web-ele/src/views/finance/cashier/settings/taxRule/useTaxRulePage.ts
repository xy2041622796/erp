import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ElMessage, ElMessageBox } from 'element-plus';

import { getSalaryItemMetaPage } from '#/api/erp/finance/cashier/settings/payroll';
import {
  getSalaryRuleBundle,
  resetSalaryRulesByType,
  saveSalaryRuleBundle,
} from '#/api/erp/finance/cashier/salaryRule';

import {
  defaultHousingFundRules,
  defaultSalaryTaxRules,
  defaultSocialInsuranceRules,
  type SalaryTaxRule,
} from '#/views/finance/cashier/wages/tax-rules';

type SalaryItemOption = {
  category?: string;
  code: string;
  direction?: string;
  label: string;
  name: string;
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeBaseItemCodes(values: string[]) {
  return Array.from(new Set((values || []).map((item) => normalizeText(item)).filter(Boolean)));
}

function buildSalaryItemOptions(list: any[]) {
  return (list || [])
    .map((item) => {
      const code = normalizeText(item.item_code);
      const name = normalizeText(item.display_name || item.item_name || item.item_code);
      return {
        code,
        name,
        label: name ? `${name}（${code}）` : code,
        category: normalizeText(item.item_category),
        direction: normalizeText(item.item_direction),
      };
    })
    .filter((item) => item.code)
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
}

function normalizeTaxRule(rule: SalaryTaxRule): SalaryTaxRule {
  const next = deepClone(rule);
  next.code = normalizeText(next.code);
  next.title = normalizeText(next.title);
  next.description = normalizeText(next.description);
  next.baseItemCodes = normalizeBaseItemCodes(next.baseItemCodes || []);
  next.threshold = Number(next.threshold || 0);
  next.minTaxableAmount = Number(next.minTaxableAmount || 0);
  next.taxableIncomeMode = next.taxableIncomeMode === 'already_taxable' ? 'already_taxable' : 'minus_threshold';
  next.roundMode = next.roundMode || 'ROUND';
  next.brackets = (next.brackets || []).map((item, index, arr) => ({
    upperBound: index === arr.length - 1 ? Number.POSITIVE_INFINITY : Number(item.upperBound || 0),
    rate: Number(item.rate || 0),
    quickDeduction: Number(item.quickDeduction || 0),
  }));
  return next;
}

export function useTaxRulePage() {
  const router = useRouter();
  const editing = ref(false);
  const loading = ref(false);
  const saving = ref(false);
  const taxRulesDraft = ref<SalaryTaxRule[]>(deepClone(defaultSalaryTaxRules));
  const salaryItemOptions = ref<SalaryItemOption[]>([]);

  const taxableSalaryItemOptions = computed(() => {
    const preferred = new Set(['income', 'middle', 'result']);
    return salaryItemOptions.value.filter((item) => {
      const code = normalizeText(item.code).toLowerCase();
      const direction = normalizeText(item.direction).toLowerCase();
      return preferred.has(direction) || code.includes('tax') || code.includes('base') || code.includes('total');
    });
  });

  const taxRuleCount = computed(() => taxRulesDraft.value.length);
  const taxBracketCount = computed(() => taxRulesDraft.value.reduce((sum, item) => sum + (item.brackets?.length || 0), 0));
  const taxableSourceCount = computed(() => taxableSalaryItemOptions.value.length);

  async function reloadAllRules() {
    loading.value = true;
    try {
      const [bundle, itemMetaRes] = await Promise.all([
        getSalaryRuleBundle(),
        getSalaryItemMetaPage({ is_enabled: 1, pageNo: 1, page: 9999 }).catch(() => ({ list: [] })),
      ]);
      taxRulesDraft.value = deepClone(bundle.salaryTaxRules || defaultSalaryTaxRules).map(normalizeTaxRule);
      salaryItemOptions.value = buildSalaryItemOptions(itemMetaRes.list || []);
    } catch (error: any) {
      taxRulesDraft.value = deepClone(defaultSalaryTaxRules).map(normalizeTaxRule);
      ElMessage.error(error?.message || '加载个税规则失败，已使用默认规则');
    } finally {
      loading.value = false;
    }
  }

  async function beginEdit() {
    await reloadAllRules();
    editing.value = true;
  }

  async function cancelEdit() {
    await reloadAllRules();
    editing.value = false;
  }

  function validateTaxRules(rules: SalaryTaxRule[]) {
    const codes = new Set<string>();
    for (const rule of rules) {
      const code = normalizeText(rule.code);
      if (!code) throw new Error('个税规则编码不能为空');
      if (codes.has(code)) throw new Error(`个税规则编码重复：${code}`);
      codes.add(code);
      if (!normalizeText(rule.title)) throw new Error(`个税规则标题不能为空：${code}`);
      if (!normalizeBaseItemCodes(rule.baseItemCodes || []).length) {
        throw new Error(`个税规则 ${code} 必须至少配置 1 个应税收入来源`);
      }
      if (!rule.brackets?.length) throw new Error(`个税规则 ${code} 必须至少配置 1 个税档`);

      let previousUpperBound = 0;
      rule.brackets.forEach((bracket, index) => {
        const isLast = index === rule.brackets.length - 1;
        const upperBound = isLast ? Number.POSITIVE_INFINITY : Number(bracket.upperBound || 0);
        if (!isLast && (!Number.isFinite(upperBound) || upperBound <= 0)) {
          throw new Error(`个税规则 ${code} 第 ${index + 1} 档上限必须大于 0`);
        }
        if (!isLast && upperBound <= previousUpperBound) {
          throw new Error(`个税规则 ${code} 的税档上限必须严格递增`);
        }
        previousUpperBound = upperBound;
        if (Number(bracket.rate || 0) < 0 || Number(bracket.rate || 0) > 1) {
          throw new Error(`个税规则 ${code} 第 ${index + 1} 档税率必须介于 0 到 1 之间`);
        }
        if (Number(bracket.quickDeduction || 0) < 0) {
          throw new Error(`个税规则 ${code} 第 ${index + 1} 档速算扣除数不能小于 0`);
        }
      });
    }
  }

  async function resetCurrentCategory() {
    await ElMessageBox.confirm('确认恢复默认个税规则吗？默认税档将写入当前账套规则表。', '恢复默认税档', {
      type: 'warning',
    });
    saving.value = true;
    try {
      const bundle = await resetSalaryRulesByType('TAX');
      taxRulesDraft.value = deepClone(bundle.salaryTaxRules).map(normalizeTaxRule);
      editing.value = false;
      ElMessage.success('已恢复默认个税规则');
    } catch (error: any) {
      ElMessage.error(error?.message || '恢复默认个税规则失败');
    } finally {
      saving.value = false;
    }
  }

  async function saveAllRules() {
    saving.value = true;
    try {
      const normalizedRules = (taxRulesDraft.value || []).map(normalizeTaxRule);
      validateTaxRules(normalizedRules);
      const bundle = await saveSalaryRuleBundle({
        salaryTaxRules: normalizedRules,
        socialInsuranceRules: defaultSocialInsuranceRules,
        housingFundRules: defaultHousingFundRules,
      });
      taxRulesDraft.value = deepClone(bundle.salaryTaxRules).map(normalizeTaxRule);
      editing.value = false;
      ElMessage.success('个税税档保存成功');
    } catch (error: any) {
      ElMessage.error(error?.message || '个税税档保存失败');
    } finally {
      saving.value = false;
    }
  }

  function addTaxRule() {
    taxRulesDraft.value.push(normalizeTaxRule({
      code: `SALARY_TAX_RULE_${taxRulesDraft.value.length + 1}`,
      title: `个税规则${taxRulesDraft.value.length + 1}`,
      description: '',
      baseItemCodes: ['tax_base'],
      threshold: 5000,
      taxableIncomeMode: 'minus_threshold',
      minTaxableAmount: 0,
      roundMode: 'ROUND',
      brackets: [
        { upperBound: 3000, rate: 0.03, quickDeduction: 0 },
        { upperBound: Number.POSITIVE_INFINITY, rate: 0.1, quickDeduction: 210 },
      ],
    }));
  }

  function removeTaxRule(index: number) {
    taxRulesDraft.value.splice(index, 1);
  }

  function addTaxBracket(ruleIndex: number) {
    const brackets = taxRulesDraft.value[ruleIndex]?.brackets || [];
    if (brackets.length) {
      brackets[brackets.length - 1]!.upperBound = Math.max(Number(brackets[brackets.length - 2]?.upperBound || 0) + 3000, 3000);
    }
    taxRulesDraft.value[ruleIndex]?.brackets.push({
      upperBound: Number.POSITIVE_INFINITY,
      rate: 0,
      quickDeduction: 0,
    });
  }

  function removeTaxBracket(ruleIndex: number, bracketIndex: number) {
    const brackets = taxRulesDraft.value[ruleIndex]?.brackets || [];
    if (brackets.length <= 1) {
      ElMessage.warning('至少保留 1 个税档');
      return;
    }
    brackets.splice(bracketIndex, 1);
    if (brackets.length) brackets[brackets.length - 1]!.upperBound = Number.POSITIVE_INFINITY;
  }

  function updateBaseItemCodes(rule: { baseItemCodes: string[] }, value: string | string[]) {
    if (Array.isArray(value)) {
      rule.baseItemCodes = normalizeBaseItemCodes(value);
      return;
    }
    rule.baseItemCodes = normalizeBaseItemCodes(String(value || '').split(','));
  }

  function formatBaseItemCodes(rule: { baseItemCodes: string[] }) {
    return (rule.baseItemCodes || []).join(' / ');
  }

  function formatUpperBound(value: number) {
    return Number.isFinite(value) ? value.toLocaleString() : '以上';
  }

  function formatPercent(value: number) {
    return `${Number(value || 0) * 100}%`;
  }

  function go(path: string) {
    router.push(path);
  }

  onMounted(() => {
    reloadAllRules();
  });

  return {
    editing,
    loading,
    saving,
    taxRulesDraft,
    taxableSalaryItemOptions,
    taxRuleCount,
    taxBracketCount,
    taxableSourceCount,
    beginEdit,
    cancelEdit,
    resetCurrentCategory,
    saveAllRules,
    addTaxRule,
    removeTaxRule,
    removeTaxBracket,
    addTaxBracket,
    updateBaseItemCodes,
    formatBaseItemCodes,
    formatUpperBound,
    formatPercent,
    go,
  };
}
