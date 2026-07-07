<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { Page } from '@vben/common-ui';


import { getSalaryItemMetaPage } from '#/api/erp/finance/cashier/settings/payroll';
import { getSalaryRankList } from '#/api/erp/finance/cashier/rank';
import {
  getSalaryRuleBundle,
  upsertSalaryRulesByType,
  type SalaryRuleType,
} from '#/api/erp/finance/cashier/salaryRule';
import {
  getSalaryRuleAssignmentPage,
  saveSalaryRuleAssignmentBatch,
  type SalaryRuleAssignmentApi,
} from '#/api/erp/finance/cashier/salaryRuleAssignment';
import type {
  HousingFundRule,
  SocialInsuranceComponentRule,
  SocialInsuranceRule,
} from '#/views/finance/cashier/wages/tax-rules';

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ErpFinanceCashierRankContributionRulePage' });

type ContributionKind = 'fund' | 'injury' | 'maternity' | 'medical' | 'pension' | 'unemployment';

type ContributionRuleRow = {
  assignmentRowId?: string;
  baseItemCodes: string[];
  companyRate: number;
  kind: ContributionKind;
  label: string;
  maxBase: string;
  minBase: string;
  personalRate: number;
  ruleCode: string;
  ruleType: SalaryRuleType;
};

type RankRow = {
  rank_code?: string;
  rank_id?: string;
  rank_name?: string;
};

type SalaryItemOption = {
  category?: string;
  code: string;
  direction?: string;
  label: string;
  name: string;
};

const SIX_ITEM_TEMPLATES: Array<{
  defaultCompanyRate: number;
  defaultPersonalRate: number;
  kind: ContributionKind;
  label: string;
  ruleType: SalaryRuleType;
}> = [
  { kind: 'pension', label: '养老保险', ruleType: 'SOCIAL', defaultPersonalRate: 0.08, defaultCompanyRate: 0.16 },
  { kind: 'medical', label: '医疗保险', ruleType: 'SOCIAL', defaultPersonalRate: 0.02, defaultCompanyRate: 0.1 },
  { kind: 'unemployment', label: '失业保险', ruleType: 'SOCIAL', defaultPersonalRate: 0.005, defaultCompanyRate: 0.005 },
  { kind: 'injury', label: '工伤保险', ruleType: 'SOCIAL', defaultPersonalRate: 0, defaultCompanyRate: 0.004 },
  { kind: 'maternity', label: '生育保险', ruleType: 'SOCIAL', defaultPersonalRate: 0, defaultCompanyRate: 0.005 },
  { kind: 'fund', label: '住房公积金', ruleType: 'HOUSING_FUND', defaultPersonalRate: 0.12, defaultCompanyRate: 0.12 },
];

const SOCIAL_PERSONAL_ITEM_CODES: Record<Exclude<ContributionKind, 'fund'>, string[]> = {
  pension: ['personal_pension_insurance'],
  medical: ['personal_medical_insurance'],
  unemployment: ['personal_unemployment_insurance'],
  injury: ['personal_work_injury_insurance'],
  maternity: ['personal_maternity_insurance'],
};

const loading = ref(false);
const saving = ref(false);
const ranks = ref<RankRow[]>([]);
const currentRankId = ref('');
const assignmentRows = ref<SalaryRuleAssignmentApi.Row[]>([]);
const socialRules = ref<SocialInsuranceRule[]>([]);
const fundRules = ref<HousingFundRule[]>([]);
const ruleRows = ref<ContributionRuleRow[]>([]);
const salaryItemOptions = ref<SalaryItemOption[]>([]);

const batchForm = reactive({
  baseItemCodes: ['basic_salary', 'should_pay_total'] as string[],
  effectiveStartPeriod: '',
  effectiveEndPeriod: '',
});

const currentRank = computed(() => ranks.value.find((item) => item.rank_id === currentRankId.value) || ranks.value[0] || null);
const currentRankLabel = computed(() => currentRank.value ? `${currentRank.value.rank_code || '-'} / ${currentRank.value.rank_name || '-'}` : '未选择职级');
const baseSalaryItemOptions = computed(() => {
  const preferred = new Set(['income', 'middle', 'result']);
  return salaryItemOptions.value.filter((item) => preferred.has(normalizeText(item.direction).toLowerCase()) || item.code.includes('base') || item.code.includes('total'));
});

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeRate(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Number(num.toFixed(4)) : 0;
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

function formatPercent(value: number) {
  return `${Number(value || 0) * 100}%`;
}

function formatBaseItemCodes(codes: string[]) {
  return (codes || []).join(', ');
}

function buildRuleCode(rank: RankRow, kind: ContributionKind) {
  const rankCode = normalizeText(rank.rank_code || rank.rank_id || 'DEFAULT').toUpperCase();
  return `${kind === 'fund' ? 'HOUSING_FUND' : 'SOCIAL'}_${kind.toUpperCase()}_${rankCode}`;
}

function findAssignment(ruleType: SalaryRuleType, ruleCode: string, rank: RankRow) {
  return assignmentRows.value.find((item) => {
    return (
      normalizeText(item.rule_type) === ruleType &&
      normalizeText(item.rule_code) === ruleCode &&
      normalizeText(item.apply_scope) === 'RANK' &&
      (normalizeText(item.rank_id) === normalizeText(rank.rank_id) || normalizeText(item.rank_code) === normalizeText(rank.rank_code)) &&
      Number(item.lingma_sys_is_delete || 0) !== 1
    );
  });
}

function findSocialComponentRule(ruleCode: string, kind: Exclude<ContributionKind, 'fund'>) {
  const rule = socialRules.value.find((item) => normalizeText(item.code) === ruleCode);
  const component = rule?.components?.find((item) => item.key === kind);
  return { component, rule };
}

function findFundRule(ruleCode: string) {
  return fundRules.value.find((item) => normalizeText(item.code) === ruleCode) || null;
}

function createDefaultRows(rank: RankRow): ContributionRuleRow[] {
  return SIX_ITEM_TEMPLATES.map((tpl) => {
    const ruleCode = buildRuleCode(rank, tpl.kind);
    const assignment = findAssignment(tpl.ruleType, ruleCode, rank);
    if (tpl.kind === 'fund') {
      const fundRule = findFundRule(ruleCode);
      return {
        kind: tpl.kind,
        label: tpl.label,
        ruleType: tpl.ruleType,
        ruleCode,
        assignmentRowId: assignment?.rowid,
        baseItemCodes: fundRule?.baseItemCodes || ['housing_fund_base', 'fund_base', 'basic_salary', 'should_pay_total'],
        personalRate: normalizeRate(fundRule?.personalRate ?? tpl.defaultPersonalRate),
        companyRate: normalizeRate(fundRule?.companyRate ?? tpl.defaultCompanyRate),
        minBase: String(fundRule?.minBase ?? 0),
        maxBase: Number.isFinite(Number(fundRule?.maxBase)) ? String(fundRule?.maxBase) : '',
      };
    }

    const social = findSocialComponentRule(ruleCode, tpl.kind);
    return {
      kind: tpl.kind,
      label: tpl.label,
      ruleType: tpl.ruleType,
      ruleCode,
      assignmentRowId: assignment?.rowid,
      baseItemCodes: social.rule?.baseItemCodes || ['social_insurance_base', 'basic_salary', 'should_pay_total'],
      personalRate: normalizeRate(social.component?.personalRate ?? tpl.defaultPersonalRate),
      companyRate: normalizeRate(social.component?.companyRate ?? tpl.defaultCompanyRate),
      minBase: String(social.rule?.minBase ?? 0),
      maxBase: Number.isFinite(Number(social.rule?.maxBase)) ? String(social.rule?.maxBase) : '',
    };
  });
}

function refreshRuleRows() {
  if (!currentRank.value) {
    ruleRows.value = [];
    return;
  }
  ruleRows.value = createDefaultRows(currentRank.value);
}

async function loadData() {
  loading.value = true;
  try {
    const [rankRes, ruleBundle, assignmentRes, itemMetaRes] = await Promise.all([
      getSalaryRankList({}),
      getSalaryRuleBundle(),
      getSalaryRuleAssignmentPage({ is_enabled: 1, pageNo: 1, page: 9999 }),
      getSalaryItemMetaPage({ is_enabled: 1, pageNo: 1, page: 9999 }),
    ]);

    ranks.value = (rankRes.list || []).map((item: any) => ({
      rank_id: normalizeText(item.rowid),
      rank_code: normalizeText(item.rank_code),
      rank_name: normalizeText(item.rank_name),
    }));
    socialRules.value = ruleBundle.socialInsuranceRules || [];
    fundRules.value = ruleBundle.housingFundRules || [];
    assignmentRows.value = assignmentRes.list || [];
    salaryItemOptions.value = buildSalaryItemOptions(itemMetaRes.list || []);
    if (!currentRankId.value && ranks.value.length) currentRankId.value = normalizeText(ranks.value[0].rank_id);
    refreshRuleRows();
  } catch (error: any) {
    ElMessage.error(error?.message || '加载五险一金总体维护数据失败');
  } finally {
    loading.value = false;
  }
}

function handleRankSelect(row: RankRow) {
  currentRankId.value = normalizeText(row.rank_id);
  refreshRuleRows();
}

function validateRuleRows() {
  if (!currentRank.value) throw new Error('请先选择职级');
  for (const row of ruleRows.value) {
    if (!normalizeText(row.ruleCode)) throw new Error(`${row.label} 规则编码不能为空`);
    if (!row.baseItemCodes.length) throw new Error(`${row.label} 至少需要一个基数来源`);
    if (row.personalRate < 0 || row.personalRate > 1) throw new Error(`${row.label} 个人比例必须介于 0 到 1`);
    if (row.companyRate < 0 || row.companyRate > 1) throw new Error(`${row.label} 公司比例必须介于 0 到 1`);
  }
}

function buildSocialRulesFromRows(rank: RankRow) {
  const socialRows = ruleRows.value.filter((item) => item.ruleType === 'SOCIAL' && item.kind !== 'fund');
  return socialRows.map((row) => {
    const component: SocialInsuranceComponentRule = {
      key: row.kind,
      label: row.label,
      personalRate: normalizeRate(row.personalRate),
      companyRate: normalizeRate(row.companyRate),
      itemCodes: SOCIAL_PERSONAL_ITEM_CODES[row.kind as Exclude<ContributionKind, 'fund'>] || [],
    };
    return {
      code: row.ruleCode,
      title: `${currentRankLabel.value} - ${row.label}`,
      description: `按职级 ${rank.rank_code || rank.rank_name || rank.rank_id} 维护的${row.label}规则`,
      baseItemCodes: row.baseItemCodes,
      minBase: Number(row.minBase || 0),
      maxBase: row.maxBase ? Number(row.maxBase) : Number.POSITIVE_INFINITY,
      roundMode: 'ROUND' as const,
      components: [component],
    };
  });
}

function buildFundRulesFromRows(rank: RankRow) {
  return ruleRows.value
    .filter((item) => item.ruleType === 'HOUSING_FUND')
    .map((row) => ({
      code: row.ruleCode,
      title: `${currentRankLabel.value} - ${row.label}`,
      description: `按职级 ${rank.rank_code || rank.rank_name || rank.rank_id} 维护的${row.label}规则`,
      baseItemCodes: row.baseItemCodes,
      personalRate: normalizeRate(row.personalRate),
      companyRate: normalizeRate(row.companyRate),
      minBase: Number(row.minBase || 0),
      maxBase: row.maxBase ? Number(row.maxBase) : Number.POSITIVE_INFINITY,
      roundMode: 'ROUND' as const,
    }));
}

async function saveAssignmentsForRows(rank: RankRow) {
  const added: SalaryRuleAssignmentApi.Row[] = [];
  const changed: Array<SalaryRuleAssignmentApi.Row & { rowid: string }> = [];

  ruleRows.value.forEach((row, index) => {
    const payload: SalaryRuleAssignmentApi.Row = {
      rowid: row.assignmentRowId,
      rule_type: row.ruleType,
      rule_code: row.ruleCode,
      apply_scope: 'RANK',
      rank_id: normalizeText(rank.rank_id),
      rank_code: normalizeText(rank.rank_code),
      effective_start_period: normalizeText(batchForm.effectiveStartPeriod),
      effective_end_period: normalizeText(batchForm.effectiveEndPeriod),
      priority: 200 + index,
      is_enabled: 1,
      remark: `${rank.rank_name || rank.rank_code || ''} ${row.label}适用规则`,
    };

    if (row.assignmentRowId) {
      changed.push(payload as SalaryRuleAssignmentApi.Row & { rowid: string });
    } else {
      added.push(payload);
    }
  });

  await saveSalaryRuleAssignmentBatch({ added, changed });
}

async function handleSave() {
  saving.value = true;
  try {
    validateRuleRows();
    const rank = currentRank.value!;
    await upsertSalaryRulesByType('SOCIAL', buildSocialRulesFromRows(rank));
    await upsertSalaryRulesByType('HOUSING_FUND', buildFundRulesFromRows(rank));
    await saveAssignmentsForRows(rank);
    ElMessage.success('当前职级五险一金六项规则已保存');
    await loadData();
  } catch (error: any) {
    ElMessage.error(error?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleDisableCurrentRankAssignments() {
  if (!currentRank.value) return;
  await ElMessageBox.confirm(`确认停用【${currentRankLabel.value}】当前五险一金适用关系吗？规则本身不会删除。`, '停用适用关系', { type: 'warning' });
  saving.value = true;
  try {
    const rank = currentRank.value;
    const matched = assignmentRows.value.filter((item) =>
      normalizeText(item.apply_scope) === 'RANK' &&
      (normalizeText(item.rank_id) === normalizeText(rank.rank_id) || normalizeText(item.rank_code) === normalizeText(rank.rank_code)) &&
      ['SOCIAL', 'HOUSING_FUND'].includes(normalizeText(item.rule_type))
    );
    await saveSalaryRuleAssignmentBatch({
      changed: matched
        .filter((item) => normalizeText(item.rowid))
        .map((item) => ({ ...item, rowid: item.rowid || '', is_enabled: 0 }) as any),
    });
    ElMessage.success('已停用当前职级五险一金适用关系');
    await loadData();
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    ElMessage.error(error?.message || '停用失败');
  } finally {
    saving.value = false;
  }
}

function applyBatchBaseItems() {
  const codes = normalizeBaseItemCodes(batchForm.baseItemCodes);
  if (!codes.length) {
    ElMessage.warning('请输入至少一个基数来源编码');
    return;
  }
  ruleRows.value = ruleRows.value.map((item) => ({ ...item, baseItemCodes: codes }));
}

function updateBaseItemCodes(row: ContributionRuleRow, value: string[]) {
  row.baseItemCodes = normalizeBaseItemCodes(value);
}


onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="page-wrap">
      <div class="content-grid">
        <el-card shadow="never" class="rank-card">
          <template #header>
            <div class="card-title">职级列表</div>
          </template>
          <el-table
            v-loading="loading"
            :data="ranks"
            border
            height="640"
            highlight-current-row
            row-key="rank_id"
            :current-row-key="currentRankId"
            @row-click="handleRankSelect"
          >
            <el-table-column type="index" label="#" width="58" />
            <el-table-column prop="rank_code" label="职级编码" min-width="120" />
            <el-table-column prop="rank_name" label="职级名称" min-width="160" />
          </el-table>
        </el-card>

        <el-card shadow="never" class="detail-card">
          <template #header>
            <div class="detail-header">
              <div>
                <div class="card-title">六项缴纳规则</div>
                <div class="sub-title">保存后会生成/更新规则，并把规则按当前职级写入适用关系表。</div>
              </div>
              <div class="detail-header__actions">
                <el-button @click="loadData">刷新</el-button>
                <el-button type="warning" plain :loading="saving" @click="handleDisableCurrentRankAssignments">停用当前适用关系</el-button>
                <el-button type="primary" :loading="saving" @click="handleSave">保存当前职级</el-button>
              </div>
            </div>
          </template>

          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="规则匹配优先级为：员工 > 职级 > 部门 > 全局默认。当前页面维护的是职级级别的五险一金规则。"
            class="page-alert"
          />

          <div class="batch-row">
            <el-select
              v-model="batchForm.baseItemCodes"
              multiple
              filterable
              allow-create
              collapse-tags
              collapse-tags-tooltip
              style="min-width: 420px"
              placeholder="请选择统一基数来源"
            >
              <el-option
                v-for="item in baseSalaryItemOptions"
                :key="item.code"
                :label="item.label"
                :value="item.code"
              />
            </el-select>
            <el-date-picker v-model="batchForm.effectiveStartPeriod" type="month" value-format="YYYY-MM" placeholder="生效开始" />
            <el-date-picker v-model="batchForm.effectiveEndPeriod" type="month" value-format="YYYY-MM" placeholder="生效结束" />
            <el-button @click="applyBatchBaseItems">应用基数来源</el-button>
          </div>

          <el-table v-loading="loading" :data="ruleRows" border class="detail-table">
            <el-table-column prop="label" label="缴纳项" min-width="120" fixed="left" />
            <el-table-column prop="ruleCode" label="规则编码" min-width="260">
              <template #default="{ row }">
                <el-input v-model="row.ruleCode" />
              </template>
            </el-table-column>
            <el-table-column label="基数来源编码" min-width="320">
              <template #default="{ row }">
                <el-select
                  :model-value="row.baseItemCodes"
                  multiple
                  filterable
                  allow-create
                  collapse-tags
                  collapse-tags-tooltip
                  style="width: 100%"
                  @update:model-value="updateBaseItemCodes(row, $event as string[])"
                >
                  <el-option
                    v-for="item in baseSalaryItemOptions"
                    :key="item.code"
                    :label="item.label"
                    :value="item.code"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="个人比例" min-width="140" align="center">
              <template #default="{ row }">
                <el-input-number v-model="row.personalRate" :min="0" :max="1" :step="0.001" :controls="false" style="width: 110px" />
              </template>
            </el-table-column>
            <el-table-column label="公司比例" min-width="140" align="center">
              <template #default="{ row }">
                <el-input-number v-model="row.companyRate" :min="0" :max="1" :step="0.001" :controls="false" style="width: 110px" />
              </template>
            </el-table-column>
            <el-table-column label="比例预览" min-width="160" align="center">
              <template #default="{ row }">
                <span>{{ formatPercent(row.personalRate) }} / {{ formatPercent(row.companyRate) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="最小基数" min-width="130" align="center">
              <template #default="{ row }">
                <el-input v-model="row.minBase" />
              </template>
            </el-table-column>
            <el-table-column label="最大基数" min-width="130" align="center">
              <template #default="{ row }">
                <el-input v-model="row.maxBase" placeholder="留空无限制" />
              </template>
            </el-table-column>
            <el-table-column label="已绑定" min-width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.assignmentRowId ? 'success' : 'info'">{{ row.assignmentRowId ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>

          <div class="explain-box">
            <div class="explain-title">当前职级会写入的规则</div>
            <div v-for="row in ruleRows" :key="row.kind" class="explain-line">
              <strong>{{ row.label }}</strong>
              <span>{{ row.ruleCode }}</span>
              <em>基数：{{ formatBaseItemCodes(row.baseItemCodes) }}</em>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.page-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rank-card,
.detail-card {
  border-radius: 12px;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.sub-title {
  color: var(--el-text-color-secondary);
  line-height: 1.7;
}

.detail-header__actions,
.batch-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.content-grid {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
}

.page-alert,
.batch-row {
  margin-bottom: 12px;
}

.batch-row :deep(.el-input) {
  max-width: 420px;
}

.detail-table {
  width: 100%;
}

.explain-box {
  margin-top: 16px;
  padding: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
}

.explain-title {
  margin-bottom: 8px;
  font-weight: 600;
}

.explain-line {
  display: grid;
  grid-template-columns: 120px minmax(220px, 1fr) minmax(280px, 1.2fr);
  gap: 12px;
  line-height: 1.8;
}

.explain-line em {
  color: var(--el-text-color-secondary);
  font-style: normal;
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
