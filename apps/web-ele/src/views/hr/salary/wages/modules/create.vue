<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';

import { computed, reactive, ref, watch } from 'vue';

import { evaluateFormulaExpr } from '../../settings/payrollFormula/helpers';


import { getSalaryItemMetaPage } from '#/api/erp/finance/cashier/payroll';
import { getSalaryFormulaPage } from '#/api/erp/finance/cashier/payrollFormula';
import { getSalaryRuleBundle } from '#/api/erp/finance/cashier/salaryRule';
import {
  getSalaryRuleAssignmentPage,
  matchSalaryRuleAssignment,
  type SalaryRuleAssignmentApi,
} from '#/api/erp/finance/cashier/salaryRuleAssignment';
import { getSalaryRankEmployeeList } from '#/api/erp/finance/cashier/rank';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';

import {
  calcHousingFundByRule,
  calcSalaryTaxByRule,
  resolveSocialInsuranceAnyItemAmount,
  type HousingFundRule,
  type SalaryTaxRule,
  type SocialInsuranceRule,
} from '../tax-rules';
import {
  ensureStandardSalaryItemValues,
  getCanonicalSalaryFieldCode,
  getSalaryFieldValue,
  setSalaryFieldValue,
  STANDARD_SALARY_FIELDS,
} from '../salary-field-registry';

import {
  ElAlert,
  ElButton,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTag,
  ElUpload,
} from 'element-plus';

defineOptions({ name: 'FinanceCashierWagesCreate' });

const emit = defineEmits<{
  success: [payload?: any];
}>();

type SalaryMetaItem = {
  default_value?: number;
  display_name?: string;
  housing_fund_rule_code?: string;
  input_mode?: string;
  is_formula_item?: number;
  item_category?: string;
  item_code?: string;
  item_direction?: string;
  item_name?: string;
  social_insurance_rule_code?: string;
  sort_no?: number;
  tax_rule_code?: string;
};

type SalaryFormulaItem = {
  calc_order?: number;
  depends_on?: string;
  formula_expr?: string;
  is_enabled?: number;
  target_item_code?: string;
};

type EmployeeSalaryRow = {
  companyFund: number;
  companySocial: number;
  detailDept: string;
  detailDeptId?: string;
  detailProject: string;
  employeeId?: string;
  employeeName: string;
  employeeNo?: string;
  rankId?: string;
  rankCode?: string;
  rankName?: string;
  feeType: string;
  itemValues: Record<string, number>;
  remark: string;
};

const DEFAULT_FEE_TYPE = '工资';

const visible = ref(false);
const loading = ref(false);
const metaLoading = ref(false);
const mockLoading = ref(false);
const attachmentName = ref('');
const salaryItems = ref<SalaryMetaItem[]>([]);
const salaryFormulas = ref<SalaryFormulaItem[]>([]);
const salaryTaxRules = ref<SalaryTaxRule[]>([]);
const socialInsuranceRules = ref<SocialInsuranceRule[]>([]);
const housingFundRules = ref<HousingFundRule[]>([]);
const salaryRuleAssignments = ref<SalaryRuleAssignmentApi.Row[]>([]);
const rankEmployeeMap = ref(new Map<string, any>());
const payMonthAutoLinked = ref(true);

const form = reactive({
  month: '',
  payMonth: '',
  dept: '',
  project: '',
  remark: '',
});

const rows = ref<EmployeeSalaryRow[]>([]);

const groupMap: Record<string, string> = {
  BASIC: '固定工资',
  FLOATING: '浮动工资',
  ALLOWANCE: '补贴项目',
  ATTENDANCE: '考勤调整',
  INSURANCE: '五险一金',
  TAX: '税务项目',
  RESULT: '汇总项目',
  CUSTOM: '自定义项目',
};

const groupedSalaryItems = computed(() => {
  const groups = new Map<string, { key: string; label: string; items: SalaryMetaItem[] }>();
  salaryItems.value.forEach((item) => {
    const key = String(item.item_category || 'CUSTOM');
    if (!groups.has(key)) {
      groups.set(key, { key, label: groupMap[key] || key, items: [] });
    }
    groups.get(key)?.items.push(item);
  });
  return Array.from(groups.values());
});

const HIDDEN_SYSTEM_RESULT_CODES = new Set(['should_pay_total', 'deduct_total', 'real_pay', 'company_contribution_total']);

function isHiddenDynamicItem(item: SalaryMetaItem) {
  const canonicalCode = getCanonicalSalaryFieldCode(item.item_code);
  return item.item_direction === 'company' || (item.item_direction === 'result' && HIDDEN_SYSTEM_RESULT_CODES.has(canonicalCode));
}

const groupedDynamicColumns = computed(() =>
  groupedSalaryItems.value
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !isHiddenDynamicItem(item)),
    }))
    .filter((group) => group.items.length > 0),
);

const hasSocialRuleDrivenItem = computed(() =>
  salaryItems.value.some((item) => Boolean(String(item.social_insurance_rule_code || '').trim())),
);
const hasHousingFundRuleDrivenItem = computed(() =>
  salaryItems.value.some((item) => Boolean(String(item.housing_fund_rule_code || '').trim())),
);

const totalShouldPay = computed(() => rows.value.reduce((sum, row) => sum + calcShouldPay(row), 0));
const totalTax = computed(() => rows.value.reduce((sum, row) => sum + calcTax(row), 0));
const totalRealPay = computed(() => rows.value.reduce((sum, row) => sum + calcRealPay(row), 0));

function roundMoney(value: any) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function parseFormulaExpr(expr: string) {
  const text = String(expr || '').trim();
  const matched = text.match(/^(DIRECT|ADD|SUBTRACT|MULTIPLY|DIVIDE)\((.*)\)$/);
  if (!matched) return null;
  return {
    preset: matched[1],
    fields: String(matched[2] || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

function isSocialInsuranceItem(item: SalaryMetaItem) {
  const canonicalCode = getCanonicalSalaryFieldCode(item.item_code);
  const text = [canonicalCode, item.item_code, item.item_name, item.display_name]
    .map((value) => normalizeText(value).toLowerCase())
    .join(' ');
  const category = String(item.item_category || '').toUpperCase();
  return (
    category === 'INSURANCE' &&
    !text.includes('housing') &&
    !text.includes('fund') &&
    !text.includes('公积金') &&
    (text.includes('social') || text.includes('insurance') || text.includes('社保') || text.includes('保险'))
  );
}

function isHousingFundItem(item: SalaryMetaItem) {
  const canonicalCode = getCanonicalSalaryFieldCode(item.item_code);
  const text = [canonicalCode, item.item_code, item.item_name, item.display_name]
    .map((value) => normalizeText(value).toLowerCase())
    .join(' ');
  const category = String(item.item_category || '').toUpperCase();
  return category === 'INSURANCE' && (text.includes('housing') || text.includes('fund') || text.includes('公积金'));
}

function isTaxRuleDriven(item: SalaryMetaItem) {
  return Boolean(String(item.tax_rule_code || '').trim()) || getCanonicalSalaryFieldCode(item.item_code) === 'personal_income_tax';
}

function isSocialRuleDriven(item: SalaryMetaItem) {
  return Boolean(String(item.social_insurance_rule_code || '').trim()) || isSocialInsuranceItem(item);
}

function isHousingFundRuleDriven(item: SalaryMetaItem) {
  return Boolean(String(item.housing_fund_rule_code || '').trim()) || isHousingFundItem(item);
}

function isFormulaReadonly(item: SalaryMetaItem) {
  return (
    String(item.input_mode || '').toUpperCase() === 'FORMULA' ||
    Number(item.is_formula_item || 0) === 1 ||
    isTaxRuleDriven(item) ||
    isSocialRuleDriven(item) ||
    isHousingFundRuleDriven(item)
  );
}

function pushUniqueCode(target: string[], code: unknown) {
  const text = normalizeText(code);
  if (text && !target.includes(text)) target.push(text);
}

function salaryItemExists(code: unknown) {
  const text = normalizeText(code);
  return Boolean(text && salaryItems.value.some((item) => normalizeText(item.item_code) === text));
}

function itemTextIncludes(item: SalaryMetaItem, words: string[]) {
  const text = [item.item_code, item.item_name, item.display_name].map((value) => normalizeText(value).toLowerCase()).join(' ');
  return words.some((word) => text.includes(word.toLowerCase()));
}

function resolveRuleBaseItemCodes(baseItemCodes: string[] = [], ruleType: 'HOUSING_FUND' | 'SOCIAL' | 'TAX') {
  const resolved: string[] = [];

  baseItemCodes.forEach((code) => {
    if (salaryItemExists(code)) pushUniqueCode(resolved, code);
  });

  const baseKeywordsByType: Record<'HOUSING_FUND' | 'SOCIAL' | 'TAX', string[]> = {
    HOUSING_FUND: ['housing_fund_base', 'fund_base', '公积金基数'],
    SOCIAL: ['social_insurance_base', 'insurance_base', '社保基数'],
    TAX: ['tax_base', 'taxable_income', '应税收入'],
  };

  salaryItems.value
    .filter((item) => itemTextIncludes(item, baseKeywordsByType[ruleType]))
    .forEach((item) => pushUniqueCode(resolved, item.item_code));

  salaryItems.value
    .filter((item) => item.item_direction === 'income' && itemTextIncludes(item, ['base_salary', 'basic_salary', '基本工资', '基础工资']))
    .forEach((item) => pushUniqueCode(resolved, item.item_code));

  salaryItems.value
    .filter((item) => item.item_direction === 'income' && String(item.item_category || '').toUpperCase() === 'BASIC')
    .forEach((item) => pushUniqueCode(resolved, item.item_code));

  if (ruleType === 'TAX') {
    ['should_pay_total', 'gross_salary'].forEach((code) => pushUniqueCode(resolved, code));
  }

  salaryItems.value
    .filter((item) => item.item_direction === 'income')
    .forEach((item) => pushUniqueCode(resolved, item.item_code));

  baseItemCodes.forEach((code) => pushUniqueCode(resolved, code));
  return resolved;
}

function buildRuleValues(row: EmployeeSalaryRow, baseItemCodes: string[]) {
  const values = { ...(row.itemValues || {}) };
  setSalaryFieldValue({ itemValues: values } as any, 'should_pay_total', calcShouldPay(row));
  baseItemCodes.forEach((code) => {
    const canonicalCode = getCanonicalSalaryFieldCode(code);
    if (values[code] === undefined && values[canonicalCode] !== undefined) values[code] = values[canonicalCode];
    if (values[code] === undefined) values[code] = Number(getSalaryFieldValue(row as any, code) || 0);
  });
  return values;
}

function ruleText(rule: { code?: string; description?: string; title?: string }) {
  return [rule.code, rule.title, rule.description].map((value) => normalizeText(value).toLowerCase()).join(' ');
}

function getSocialKeywordByItem(item: SalaryMetaItem) {
  const canonicalCode = getCanonicalSalaryFieldCode(item.item_code);
  const text = [canonicalCode, item.item_code, item.item_name, item.display_name].map((value) => normalizeText(value).toLowerCase()).join(' ');
  const keywordMap = [
    { key: 'pension', words: ['pension', '养老'] },
    { key: 'medical', words: ['medical', '医疗'] },
    { key: 'unemployment', words: ['unemployment', '失业'] },
    { key: 'injury', words: ['injury', '工伤'] },
    { key: 'maternity', words: ['maternity', '生育'] },
  ];
  return keywordMap.find((item) => item.words.some((word) => text.includes(word)))?.key || '';
}

function resolveSocialRulesForItem(item: SalaryMetaItem, fallbackRuleCode: string) {
  const exactRule = socialInsuranceRules.value.find((rule) => normalizeText(rule.code) === fallbackRuleCode);
  if (exactRule) return [exactRule];

  const keyword = getSocialKeywordByItem(item);
  if (keyword) {
    const matchedRules = socialInsuranceRules.value.filter((rule) => {
      const text = ruleText(rule);
      return text.includes(keyword) || (rule.components || []).some((component) => normalizeText(component.key) === keyword);
    });
    if (matchedRules.length) return matchedRules;
  }

  return socialInsuranceRules.value.slice();
}

function resolveHousingFundRulesForItem(fallbackRuleCode: string) {
  const exactRule = housingFundRules.value.find((rule) => normalizeText(rule.code) === fallbackRuleCode);
  if (exactRule) return [exactRule];
  return housingFundRules.value.slice();
}

function buildRuntimeSalaryItems(sourceList: SalaryMetaItem[]) {
  const seenCanonicalCodes = new Set<string>();
  const normalizedSourceList = sourceList.map((source) => {
    const item = { ...source };
    if (isSocialInsuranceItem(item) && !normalizeText(item.social_insurance_rule_code)) {
      item.social_insurance_rule_code = 'AUTO_SOCIAL_INSURANCE_RULE';
      item.input_mode = 'FORMULA';
      item.is_formula_item = 1;
    }
    if (isHousingFundItem(item) && !normalizeText(item.housing_fund_rule_code)) {
      item.housing_fund_rule_code = 'AUTO_HOUSING_FUND_RULE';
      item.input_mode = 'FORMULA';
      item.is_formula_item = 1;
    }
    if (getCanonicalSalaryFieldCode(item.item_code) === 'personal_income_tax' && !normalizeText(item.tax_rule_code)) {
      item.tax_rule_code = 'SALARY_TAX_SIMPLE_CN_MONTHLY';
      item.input_mode = 'FORMULA';
      item.is_formula_item = 1;
    }
    const canonicalCode = getCanonicalSalaryFieldCode(item.item_code);
    if (seenCanonicalCodes.has(canonicalCode)) {
      item.item_direction = 'middle';
      item.input_mode = 'FORMULA';
      item.is_formula_item = 1;
    } else {
      seenCanonicalCodes.add(canonicalCode);
    }
    return item;
  });

  const existedCodes = new Set(normalizedSourceList.map((item) => normalizeText(item.item_code)).filter(Boolean));
  const standardRuntimeItems = STANDARD_SALARY_FIELDS
    .filter((item) => !existedCodes.has(item.code))
    .map((item, index) => {
      const isHousingFund = item.code.includes('housing_fund');
      const isSocialInsurance = item.category === 'INSURANCE' && !isHousingFund;
      const isTax = item.code === 'personal_income_tax';
      return {
        item_code: item.code,
        item_name: item.title,
        display_name: item.title,
        item_category: item.category,
        item_direction: item.direction,
        input_mode: item.direction === 'income' ? 'MANUAL' : 'FORMULA',
        is_formula_item: item.direction === 'income' ? 0 : 1,
        social_insurance_rule_code: isSocialInsurance ? 'AUTO_SOCIAL_INSURANCE_RULE' : '',
        housing_fund_rule_code: isHousingFund ? 'AUTO_HOUSING_FUND_RULE' : '',
        tax_rule_code: isTax ? 'SALARY_TAX_SIMPLE_CN_MONTHLY' : '',
        sort_no: 8000 + index,
      };
    });
  return [...normalizedSourceList, ...standardRuntimeItems].sort((a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0));
}

function createEmptyRow(): EmployeeSalaryRow {
  const itemValues: Record<string, number> = {};
  salaryItems.value.forEach((item) => {
    const code = String(item.item_code || '');
    if (code) itemValues[code] = roundMoney(item.default_value ?? 0);
  });
  const row = {
    employeeId: undefined,
    employeeNo: '',
    employeeName: '',
    rankId: '',
    rankCode: '',
    rankName: '',
    detailDept: normalizeText(form.dept),
    detailDeptId: undefined,
    detailProject: normalizeText(form.project),
    feeType: DEFAULT_FEE_TYPE,
    companySocial: 0,
    companyFund: 0,
    itemValues,
    remark: '',
  };
  recomputeRow(row);
  return row;
}

async function loadSalaryItems() {
  metaLoading.value = true;
  try {
    const [metaRes, formulaRes, ruleBundle, assignmentRes, rankEmployeeRes] = await Promise.all([
      getSalaryItemMetaPage({ is_enabled: 1, pageNo: 1, page: 9999 }),
      getSalaryFormulaPage({ is_enabled: 1, pageNo: 1, page: 9999 }),
      getSalaryRuleBundle(),
      getSalaryRuleAssignmentPage({ is_enabled: 1, pageNo: 1, page: 9999 }).catch(() => ({ list: [] })),
      getSalaryRankEmployeeList({}).catch(() => ({ list: [] })),
    ]);
    salaryItems.value = buildRuntimeSalaryItems((metaRes.list || []).slice());
    salaryTaxRules.value = ruleBundle.salaryTaxRules || [];
    socialInsuranceRules.value = ruleBundle.socialInsuranceRules || [];
    housingFundRules.value = ruleBundle.housingFundRules || [];
    salaryRuleAssignments.value = assignmentRes.list || [];
    const nextRankEmployeeMap = new Map<string, any>();
    (rankEmployeeRes.list || []).forEach((item: any) => {
      const employeeId = normalizeText(item.employee_id);
      const employeeNo = normalizeText(item.employee_no);
      if (employeeId) nextRankEmployeeMap.set(`id:${employeeId}`, item);
      if (employeeNo) nextRankEmployeeMap.set(`no:${employeeNo}`, item);
    });
    rankEmployeeMap.value = nextRankEmployeeMap;
    salaryFormulas.value = (formulaRes.list || [])
      .filter((item: any) => Number(item.is_enabled ?? 1) === 1)
      .slice()
      .sort((a: any, b: any) => Number(a.calc_order || 0) - Number(b.calc_order || 0));
  } finally {
    metaLoading.value = false;
  }
}

async function openModal(payload?: any) {
  if (!salaryItems.value.length) {
    await loadSalaryItems();
  }
  const currentMonth = getCurrentMonth();
  form.month = payload?.month || currentMonth;
  form.payMonth = payload?.payMonth || form.month || currentMonth;
  form.dept = payload?.dept || '';
  form.project = payload?.project || '';
  form.remark = '';
  attachmentName.value = '';
  payMonthAutoLinked.value = true;
  rows.value = [createEmptyRow()];
  visible.value = true;
}

defineExpose({ openModal });

function addRow() {
  rows.value.push(createEmptyRow());
}

function clearRows() {
  rows.value = [createEmptyRow()];
}

function removeRow(index: number) {
  if (rows.value.length <= 1) {
    ElMessage.warning('至少保留 1 行');
    return;
  }
  rows.value.splice(index, 1);
}

function fillRankInfoForRow(row: EmployeeSalaryRow) {
  const matched =
    rankEmployeeMap.value.get(`id:${normalizeText(row.employeeId)}`) ||
    rankEmployeeMap.value.get(`no:${normalizeText(row.employeeNo)}`) ||
    {};
  row.rankId = normalizeText(matched.rank_id);
  row.rankCode = normalizeText(matched.rank_code);
  row.rankName = normalizeText(matched.rank_name);
  if (!normalizeText(row.detailDeptId) && normalizeText(matched.dept_id)) row.detailDeptId = normalizeText(matched.dept_id);
  if (!normalizeText(row.detailDept) && normalizeText(matched.dept_name)) row.detailDept = normalizeText(matched.dept_name);
}

function resolveRuleCodeByAssignment(row: EmployeeSalaryRow, ruleType: 'HOUSING_FUND' | 'SOCIAL' | 'TAX', fallbackRuleCode: string) {
  const matched = matchSalaryRuleAssignment(salaryRuleAssignments.value, ruleType, {
    employeeId: row.employeeId,
    rankId: row.rankId,
    rankCode: row.rankCode,
    deptId: row.detailDeptId,
    period: form.month,
  });
  return normalizeText(matched?.rule_code) || fallbackRuleCode;
}

function handleEmployeePicked(row: EmployeeSalaryRow, staff?: Staff) {
  if (!staff) {
    row.employeeId = undefined;
    row.employeeNo = '';
    row.employeeName = '';
    row.rankId = '';
    row.rankCode = '';
    row.rankName = '';
    row.detailDeptId = undefined;
    row.detailDept = normalizeText(form.dept);
    if (!normalizeText(row.detailProject)) {
      row.detailProject = normalizeText(form.project);
    }
    if (!normalizeText(row.feeType)) {
      row.feeType = DEFAULT_FEE_TYPE;
    }
    recomputeRow(row);
    return;
  }

  row.employeeId = staff.ROWID;
  row.employeeNo = String(staff.LoginName || '').trim();
  row.employeeName = String(staff.UserName || '').trim();
  row.detailDeptId = staff.DepID;
  row.detailDept = String(staff.DepName || '').trim();
  if (!normalizeText(row.detailProject)) {
    row.detailProject = normalizeText(form.project);
  }
  if (!normalizeText(row.feeType)) {
    row.feeType = DEFAULT_FEE_TYPE;
  }
  fillRankInfoForRow(row);
  recomputeRow(row);
}

function handleEmployeeIdChange(row: EmployeeSalaryRow, value?: string) {
  row.employeeId = value ? String(value) : undefined;
  if (!value) {
    row.employeeNo = '';
    row.employeeName = '';
    row.rankId = '';
    row.rankCode = '';
    row.rankName = '';
    row.detailDeptId = undefined;
    row.detailDept = normalizeText(form.dept);
  }
  if (!normalizeText(row.detailProject)) {
    row.detailProject = normalizeText(form.project);
  }
  if (!normalizeText(row.feeType)) {
    row.feeType = DEFAULT_FEE_TYPE;
  }
  fillRankInfoForRow(row);
  recomputeRow(row);
}

function getItemValue(row: EmployeeSalaryRow, code: string) {
  return Number(getSalaryFieldValue(row as any, code) || 0);
}

function buildSalaryItemsPayload() {
  const existedCodes = new Set(salaryItems.value.map((item) => String(item.item_code || '').trim()).filter(Boolean));
  const standardItems = STANDARD_SALARY_FIELDS
    .filter((item) => !existedCodes.has(item.code))
    .map((item) => ({
      item_code: item.code,
      item_name: item.title,
      item_category: item.category,
      item_direction: item.direction,
      sort_no: 9000,
    }));

  return [
    ...salaryItems.value.map((item) => ({
      item_code: item.item_code,
      item_name: item.item_name,
      item_category: item.item_category,
      item_direction: item.item_direction,
      sort_no: item.sort_no,
    })),
    ...standardItems,
  ];
}

function getSalaryItemFormulaOptions() {
  return salaryItems.value.map((item) => ({
    label: `${item.display_name || item.item_name || ''}（${item.item_code || ''}）`,
    value: String(item.item_code || ''),
    raw: item,
  }));
}

function applyFormulas(row: EmployeeSalaryRow) {
  const formulaOptions = getSalaryItemFormulaOptions();
  salaryFormulas.value.forEach((formula) => {
    const targetCode = String(formula.target_item_code || '').trim();
    if (!targetCode) return;
    row.itemValues[targetCode] = evaluateFormulaExpr(
      String(formula.formula_expr || ''),
      { ...row, ...(row.itemValues || {}) },
      formulaOptions,
      'ROUND',
      2,
    );
  });
}

function applySocialInsuranceRules(row: EmployeeSalaryRow) {
  let hasRule = false;
  let companyTotal = 0;
  const countedRuleCodes = new Set<string>();
  salaryItems.value.forEach((item) => {
    const itemCode = String(item.item_code || '').trim();
    const fallbackRuleCode = String(item.social_insurance_rule_code || '').trim();
    const assignedRuleCode = resolveRuleCodeByAssignment(row, 'SOCIAL', fallbackRuleCode) || (isSocialInsuranceItem(item) ? 'AUTO_SOCIAL_INSURANCE_RULE' : '');
    if (!itemCode || !assignedRuleCode) return;

    let itemAmount = 0;
    const matchedRules = resolveSocialRulesForItem(item, assignedRuleCode);
    matchedRules.forEach((rule) => {
      const baseItemCodes = resolveRuleBaseItemCodes(rule.baseItemCodes, 'SOCIAL');
      const result = resolveSocialInsuranceAnyItemAmount({ ...rule, baseItemCodes }, itemCode, buildRuleValues(row, baseItemCodes));
      itemAmount += Number(result.amount || 0);
      const ruleCode = normalizeText(rule.code);
      if (ruleCode && !countedRuleCodes.has(ruleCode)) {
        companyTotal += Number(result.calcResult?.totalCompanyAmount || 0);
        countedRuleCodes.add(ruleCode);
      }
      hasRule = true;
    });
    row.itemValues[itemCode] = roundMoney(itemAmount);
  });
  if (hasRule) {
    row.companySocial = roundMoney(companyTotal);
    setSalaryFieldValue(row as any, 'company_social_insurance', row.companySocial);
  }
}

function applyHousingFundRules(row: EmployeeSalaryRow) {
  let hasRule = false;
  let companyTotal = 0;
  const countedRuleCodes = new Set<string>();
  salaryItems.value.forEach((item) => {
    const itemCode = String(item.item_code || '').trim();
    const fallbackRuleCode = String(item.housing_fund_rule_code || '').trim();
    const assignedRuleCode = resolveRuleCodeByAssignment(row, 'HOUSING_FUND', fallbackRuleCode) || (isHousingFundItem(item) ? 'AUTO_HOUSING_FUND_RULE' : '');
    if (!itemCode || !assignedRuleCode) return;

    let personalAmount = 0;
    let companyAmount = 0;
    const matchedRules = resolveHousingFundRulesForItem(assignedRuleCode);
    matchedRules.forEach((rule) => {
      const baseItemCodes = resolveRuleBaseItemCodes(rule.baseItemCodes, 'HOUSING_FUND');
      const result = calcHousingFundByRule({ ...rule, baseItemCodes }, buildRuleValues(row, baseItemCodes));
      personalAmount += Number(result.personalAmount || 0);
      companyAmount += Number(result.companyAmount || 0);
      const ruleCode = normalizeText(rule.code);
      if (ruleCode && !countedRuleCodes.has(ruleCode)) {
        companyTotal += Number(result.companyAmount || 0);
        countedRuleCodes.add(ruleCode);
      }
      hasRule = true;
    });

    const canonicalCode = getCanonicalSalaryFieldCode(itemCode);
    row.itemValues[itemCode] = canonicalCode === 'company_housing_fund'
      ? roundMoney(companyAmount)
      : roundMoney(personalAmount);
  });
  if (hasRule) {
    row.companyFund = roundMoney(companyTotal);
    setSalaryFieldValue(row as any, 'company_housing_fund', row.companyFund);
  }
}

function applyTaxRules(row: EmployeeSalaryRow) {
  salaryItems.value.forEach((item) => {
    const itemCode = String(item.item_code || '').trim();
    const fallbackTaxRuleCode = String(item.tax_rule_code || '').trim();
    const taxRuleCode = resolveRuleCodeByAssignment(row, 'TAX', fallbackTaxRuleCode);
    if (!itemCode || !taxRuleCode) return;
    const rule = salaryTaxRules.value.find((item) => normalizeText(item.code) === taxRuleCode);
    if (!rule) return;
    const baseItemCodes = resolveRuleBaseItemCodes(rule.baseItemCodes, 'TAX');
    const result = calcSalaryTaxByRule({ ...rule, baseItemCodes }, buildRuleValues(row, baseItemCodes));
    row.itemValues[itemCode] = roundMoney(result.taxAmount);
  });
}

function syncStandardSummaryValues(row: EmployeeSalaryRow) {
  ensureStandardSalaryItemValues(row as any);
  setSalaryFieldValue(row as any, 'should_pay_total', calcShouldPay(row));
  setSalaryFieldValue(row as any, 'deduct_total', calcDeduct(row));
  setSalaryFieldValue(row as any, 'personal_income_tax', calcTax(row));
  setSalaryFieldValue(row as any, 'real_pay', calcRealPay(row));
}

function recomputeRow(row: EmployeeSalaryRow) {
  applyFormulas(row);
  applySocialInsuranceRules(row);
  applyHousingFundRules(row);
  applyFormulas(row);
  applyTaxRules(row);
  applyFormulas(row);
  syncStandardSummaryValues(row);
}

function setItemValue(row: EmployeeSalaryRow, code: string, value: number | null | undefined) {
  row.itemValues[code] = roundMoney(value || 0);
  recomputeRow(row);
}

function getColumnTitle(item: SalaryMetaItem) {
  return item.display_name || item.item_name || item.item_code || '-';
}

function calcShouldPay(row: EmployeeSalaryRow) {
  return roundMoney(
    salaryItems.value
      .filter((item) => item.item_direction === 'income')
      .reduce((sum, item) => sum + getItemValue(row, String(item.item_code || '')), 0),
  );
}

function calcTax(row: EmployeeSalaryRow) {
  return roundMoney(
    salaryItems.value
      .filter((item) => item.item_category === 'TAX' || item.item_code === 'personal_income_tax')
      .reduce((sum, item) => sum + getItemValue(row, String(item.item_code || '')), 0),
  );
}

function calcDeduct(row: EmployeeSalaryRow) {
  const countedCodes = new Set<string>();
  return roundMoney(
    salaryItems.value
      .filter((item) => item.item_direction === 'deduct')
      .reduce((sum, item) => {
        const canonicalCode = getCanonicalSalaryFieldCode(item.item_code);
        if (!canonicalCode || countedCodes.has(canonicalCode)) return sum;
        countedCodes.add(canonicalCode);
        return sum + getItemValue(row, String(item.item_code || ''));
      }, 0),
  );
}

function calcRealPay(row: EmployeeSalaryRow) {
  return roundMoney(calcShouldPay(row) - calcDeduct(row));
}

function getMockValueByItem(item: SalaryMetaItem, index: number) {
  const code = String(item.item_code || '').toLowerCase();
  const category = String(item.item_category || '').toUpperCase();
  const direction = String(item.item_direction || '').toLowerCase();
  const defaultValue = roundMoney(item.default_value || 0);

  if (category === 'TAX' || code.includes('tax')) {
    return defaultValue || roundMoney(120 + index * 18);
  }
  if (direction === 'deduct') {
    if (code.includes('social')) return defaultValue || roundMoney(320 + index * 25);
    if (code.includes('fund')) return defaultValue || roundMoney(180 + index * 15);
    return defaultValue || roundMoney(60 + index * 8);
  }
  if (direction === 'income' || direction === 'middle') {
    if (code.includes('base') || code.includes('basic')) return defaultValue || roundMoney(6800 + index * 360);
    if (code.includes('post') || code.includes('rank')) return defaultValue || roundMoney(1200 + index * 120);
    if (code.includes('performance') || code.includes('bonus')) return defaultValue || roundMoney(1500 + index * 180);
    if (category === 'ALLOWANCE') return defaultValue || roundMoney(280 + index * 30);
    if (category === 'ATTENDANCE') return defaultValue || roundMoney(150 + index * 20);
    return defaultValue || roundMoney(100 + index * 12);
  }
  return defaultValue;
}

function createMockRow(employee: any, index: number) {
  const row = createEmptyRow();
  row.employeeId = String(employee?.employee_id || `mock-employee-${index + 1}`);
  row.employeeNo = String(employee?.employee_no || `MOCK${String(index + 1).padStart(3, '0')}`);
  row.employeeName = String(employee?.employee_name || `模拟员工${index + 1}`);
  row.rankId = String(employee?.rank_id || '');
  row.rankCode = String(employee?.rank_code || '');
  row.rankName = String(employee?.rank_name || '');
  row.detailDeptId = String(employee?.dept_id || '');
  row.detailDept = String(employee?.dept_name || form.dept || '模拟部门');
  row.detailProject = String(form.project || `模拟项目${index + 1}`);
  row.feeType = DEFAULT_FEE_TYPE;
  row.companySocial = roundMoney(520 + index * 36);
  row.companyFund = roundMoney(260 + index * 18);
  row.remark = '模拟生成';

  salaryItems.value.forEach((item) => {
    const code = String(item.item_code || '');
    if (!code || isFormulaReadonly(item)) return;
    row.itemValues[code] = getMockValueByItem(item, index);
  });
  recomputeRow(row);
  return row;
}

async function fillMockRows() {
  if (!salaryItems.value.length) {
    await loadSalaryItems();
  }
  mockLoading.value = true;
  try {
    const employeeRes = await getSalaryRankEmployeeList({});
    const employeeList = (employeeRes.list || []).filter((item: any) => String(item.employee_id || '').trim());
    if (!employeeList.length) {
      ElMessage.warning('请先在职级配置页维护职级人员，再生成可命中导出方案的模拟数据');
      return;
    }
    rows.value = employeeList.slice(0, 8).map((employee: any, index: number) => createMockRow(employee, index));
    ElMessage.success(`已填充 ${rows.value.length} 行模拟工资数据`);
  } catch (error: any) {
    ElMessage.error(error?.message || '填充模拟数据失败');
  } finally {
    mockLoading.value = false;
  }
}

function validateBeforeSubmit() {
  if (!form.month) {
    throw new Error('请选择工资月份');
  }
  if (!form.payMonth) {
    throw new Error('请选择工资发放月份');
  }
  if (!rows.value.length) {
    throw new Error('请至少录入 1 行工资明细');
  }
  rows.value.forEach((row, index) => {
    if (!String(row.employeeId || '').trim()) {
      throw new Error(`第 ${index + 1} 行请选择员工`);
    }
    if (!String(row.employeeName || '').trim()) {
      throw new Error(`第 ${index + 1} 行员工姓名不能为空`);
    }
  });
}

function buildSubmitPayload() {
  return {
    month: form.month,
    payMonth: form.payMonth,
    dept: form.dept,
    project: form.project,
    remark: form.remark,
    attachmentName: attachmentName.value,
    items: buildSalaryItemsPayload(),
    rows: rows.value.map((row) => {
      syncStandardSummaryValues(row);
      return {
      employeeId: String(row.employeeId || '').trim(),
      employeeNo: String(row.employeeNo || '').trim(),
      employeeName: String(row.employeeName || '').trim(),
      rankId: String(row.rankId || '').trim(),
      rankCode: String(row.rankCode || '').trim(),
      rankName: String(row.rankName || '').trim(),
      detailDeptId: String(row.detailDeptId || '').trim(),
      detailDept: String(row.detailDept || '').trim(),
      detailProject: String(row.detailProject || '').trim(),
      feeType: String(row.feeType || '').trim(),
      companySocial: roundMoney(row.companySocial || 0),
      companyFund: roundMoney(row.companyFund || 0),
      shouldPay: calcShouldPay(row),
      tax: calcTax(row),
      deductTotal: calcDeduct(row),
      realPay: calcRealPay(row),
      itemValues: { ...row.itemValues },
      remark: String(row.remark || '').trim(),
    };
    }),
  };
}

function handleAttachmentChange(uploadFile: any) {
  attachmentName.value = uploadFile?.name || '';
}

function onExceed() {
  ElMessage.warning('最多只能上传 1 个附件');
}

function handlePayMonthChange(value?: string) {
  form.payMonth = value || '';
  payMonthAutoLinked.value = normalizeText(form.payMonth) === normalizeText(form.month);
}

async function handleSubmit() {
  loading.value = true;
  try {
    validateBeforeSubmit();
    const payload = buildSubmitPayload();
    ElMessage.success('工资录入数据已生成，可继续对接后端保存');
    visible.value = false;
    emit('success', payload);
  } catch (error: any) {
    ElMessage.error(error?.message || '保存失败');
  } finally {
    loading.value = false;
  }
}

watch(
  () => form.month,
  (newMonth, oldMonth) => {
    const oldMonthText = normalizeText(oldMonth);
    const payMonthText = normalizeText(form.payMonth);
    if (payMonthAutoLinked.value || !payMonthText || payMonthText === oldMonthText) {
      form.payMonth = normalizeText(newMonth);
      payMonthAutoLinked.value = true;
    }
  },
);

watch(
  () => form.project,
  (newProject, oldProject) => {
    const newText = normalizeText(newProject);
    const oldText = normalizeText(oldProject);
    rows.value.forEach((row) => {
      const current = normalizeText(row.detailProject);
      if (!current || current === oldText) {
        row.detailProject = newText;
      }
    });
  },
);

watch(
  () => form.dept,
  (newDept, oldDept) => {
    const newText = normalizeText(newDept);
    const oldText = normalizeText(oldDept);
    rows.value.forEach((row) => {
      const current = normalizeText(row.detailDept);
      const hasEmployeeDept = Boolean(normalizeText(row.detailDeptId));
      if (!hasEmployeeDept && (!current || current === oldText)) {
        row.detailDept = newText;
      }
    });
  },
);
</script>

<template>
  <el-dialog v-model="visible" width="92%" top="4vh" destroy-on-close append-to-body :z-index="1200"
    :close-on-click-modal="false" class="wage-create-dialog">
    <template #header>
      <div class="header">
        <div class="title" @click="visible = false">
          <span class="back">‹</span>
          <span>录入工资表</span>
        </div>
        <div class="header-actions">
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
        </div>
      </div>
    </template>

    <div class="content" v-loading="metaLoading">
      <el-alert type="info" :closable="false" show-icon
        title="当前录入页以工资项元数据作为列布局，并按元数据和规则配置自动推导社保、公积金、个税的计算基数；录入基础工资等手工项后会立即重算五险一金、个税和实发工资。"
        class="page-alert" />

      <el-form :model="form" label-width="96px" class="top-form">
        <el-form-item label="工资月份" required>
          <el-date-picker v-model="form.month" type="month" placeholder="请选择" value-format="YYYY-MM"
            style="width: 220px" />
        </el-form-item>
        <el-form-item label="发放月份" required>
          <el-date-picker :model-value="form.payMonth" type="month" placeholder="请选择" value-format="YYYY-MM"
            style="width: 220px" @update:model-value="handlePayMonthChange" />
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="form.dept" placeholder="请输入部门" style="width: 220px" />
        </el-form-item>
        <el-form-item label="项目">
          <el-input v-model="form.project" placeholder="请输入项目" style="width: 220px" />
        </el-form-item>
      </el-form>

      <div class="meta-groups">
        <el-tag v-for="group in groupedSalaryItems" :key="group.key" effect="light" class="group-tag">
          {{ group.label }}
        </el-tag>
      </div>

      <div class="table-wrap">
        <el-table :data="rows" border height="420" class="wage-table">
          <el-table-column type="index" label="序号" width="60" fixed="left" />
          <el-table-column label="员工姓名" min-width="180" fixed="left">
            <template #default="{ row = {}} = {}">
              <StaffPicker :model-value="row.employeeId" placeholder="请选择员工"
                @update:model-value="handleEmployeeIdChange(row, $event as string | undefined)"
                @update:data="handleEmployeePicked(row, $event as Staff | undefined)" />
            </template>
          </el-table-column>
          <el-table-column label="员工工号" min-width="140" fixed="left">
            <template #default="{ row = {}} = {}">
              <el-input :model-value="row.employeeNo" readonly placeholder="随所选人员自动带出" />
            </template>
          </el-table-column>
          <el-table-column label="明细部门" min-width="160" fixed="left">
            <template #default="{ row = {}} = {}">
              <el-input :model-value="row.detailDept" readonly placeholder="随所选人员自动带出" />
            </template>
          </el-table-column>
          <el-table-column label="明细项目" min-width="140">
            <template #default="{ row = {}} = {}">
              <el-input v-model="row.detailProject" placeholder="请输入明细项目" />
            </template>
          </el-table-column>
          <el-table-column label="费用类别" min-width="140">
            <template #default="{ row = {}} = {}">
              <el-input v-model="row.feeType" placeholder="请输入费用类别" />
            </template>
          </el-table-column>

          <el-table-column v-for="group in groupedDynamicColumns" :key="group.key" :label="group.label" align="center">
            <el-table-column v-for="item in group.items" :key="item.item_code" :label="getColumnTitle(item)"
              min-width="130" align="right">
              <template #default="{ row = {}} = {}">
                <div v-if="isFormulaReadonly(item)" class="readonly-cell">
                  {{ getItemValue(row, String(item.item_code || '')).toFixed(2) }}
                </div>
                <el-input-number v-else :data-item-code="item.item_code" :aria-label="`工资项-${item.item_code || ''}`" :model-value="getItemValue(row, String(item.item_code || ''))" :min="0"
                  :controls="false" style="width: 110px"
                  @update:model-value="setItemValue(row, String(item.item_code || ''), $event)" />
              </template>
            </el-table-column>
          </el-table-column>

          <el-table-column label="公司承担" align="center">
            <el-table-column label="公司社保" width="120" align="right">
              <template #default="{ row = {}} = {}">
                <div v-if="hasSocialRuleDrivenItem" class="readonly-cell">{{ Number(row.companySocial || 0).toFixed(2)
                  }}</div>
                <el-input-number v-else v-model="row.companySocial" :min="0" :controls="false" style="width: 100px" />
              </template>
            </el-table-column>
            <el-table-column label="公司公积金" width="130" align="right">
              <template #default="{ row = {}} = {}">
                <div v-if="hasHousingFundRuleDrivenItem" class="readonly-cell">{{ Number(row.companyFund ||
                  0).toFixed(2) }}</div>
                <el-input-number v-else v-model="row.companyFund" :min="0" :controls="false" style="width: 110px" />
              </template>
            </el-table-column>
          </el-table-column>

          <el-table-column label="汇总结果" align="center" fixed="right">
            <el-table-column label="应发合计" width="120" align="right">
              <template #default="{ row = {}} = {}">
                <span class="money">{{ calcShouldPay(row).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="个税合计" width="120" align="right">
              <template #default="{ row = {}} = {}">
                <span class="money">{{ calcTax(row).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="实发工资" width="120" align="right">
              <template #default="{ row = {}} = {}">
                <span class="money">{{ calcRealPay(row).toFixed(2) }}</span>
              </template>
            </el-table-column>
          </el-table-column>

          <el-table-column label="备注" min-width="180" fixed="right">
            <template #default="{ row = {}} = {}">
              <el-input v-model="row.remark" placeholder="备注" />
            </template>
          </el-table-column>
          <el-table-column label="" width="60" fixed="right" align="center">
            <template #default="{ $index } = {}">
              <el-button text type="danger" @click="removeRow($index)">删</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="table-bottom">
          <div class="links">
            <el-button text type="primary" @click="addRow">添加一行</el-button>
            <el-button text type="success" :loading="mockLoading" @click="fillMockRows">填充模拟数据</el-button>
            <el-button text @click="clearRows">重置明细</el-button>
          </div>
          <div class="stats">
            <div class="stats-row"><span>人数合计</span><strong>{{ rows.length }}</strong></div>
            <div class="stats-row"><span>应发合计</span><strong>{{ totalShouldPay.toFixed(2) }}</strong></div>
            <div class="stats-row"><span>个税合计</span><strong>{{ totalTax.toFixed(2) }}</strong></div>
            <div class="stats-row"><span>实发合计</span><strong>{{ totalRealPay.toFixed(2) }}</strong></div>
          </div>
        </div>
      </div>

      <div class="extra">
        <div class="extra-item">
          <div class="extra-label">备注</div>
          <el-input v-model="form.remark" type="textarea" :rows="4" placeholder="请输入内容" />
        </div>
        <div class="extra-item">
          <el-upload :auto-upload="false" :limit="1" :on-change="handleAttachmentChange" :on-exceed="onExceed">
            <el-button>添加附件</el-button>
            <template #tip>
              <div class="upload-tip">
                {{ attachmentName ? `已选择：${attachmentName}` : '你可以上传单个附件，每次最大50MB' }}
              </div>
            </template>
          </el-upload>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.back {
  font-size: 18px;
  line-height: 1;
  opacity: 0.7;
}

.content {
  max-height: 78vh;
  overflow: auto;
  padding: 8px 4px 0;
}

.page-alert {
  margin-bottom: 12px;
}

.top-form {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
  margin-bottom: 14px;
}

.meta-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.group-tag {
  margin-right: 0;
}

.money,
.readonly-cell {
  display: inline-block;
  min-width: 80px;
  text-align: right;
}

.readonly-cell {
  width: 100%;
  color: var(--el-text-color-regular);
}

.table-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px 0;
}

.links {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.stats {
  display: grid;
  gap: 6px;
  min-width: 220px;
  justify-items: end;
}

.stats-row {
  display: grid;
  grid-template-columns: auto 100px;
  gap: 14px;
}

.extra {
  margin-top: 18px;
  display: grid;
  gap: 14px;
}

.extra-label {
  margin-bottom: 6px;
  font-size: 12px;
  opacity: 0.8;
}

.upload-tip {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.75;
}
</style>