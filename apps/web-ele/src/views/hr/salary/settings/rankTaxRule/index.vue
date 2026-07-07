<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { getSalaryRankList } from '#/api/erp/finance/cashier/rank';
import { getSalaryRuleBundle } from '#/api/erp/finance/cashier/salaryRule';
import {
  getSalaryRuleAssignmentPage,
  saveSalaryRuleAssignmentBatch,
  type SalaryRuleAssignmentApi,
} from '#/api/erp/finance/cashier/salaryRuleAssignment';
import type { SalaryTaxRule } from '#/views/finance/cashier/wages/tax-rules';

import {
  ElButton,
  ElCard,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ErpFinanceCashierRankTaxRulePage' });

type RankTaxBindRow = {
  rowid?: string;
  rank_id: string;
  rank_code: string;
  rank_name: string;
  rule_code: string;
  original_rule_code: string;
  effective_start_period: string;
  effective_end_period: string;
  priority: number;
  is_enabled: number;
  remark: string;
};

const loading = ref(false);
const saving = ref(false);
const rows = ref<RankTaxBindRow[]>([]);
const taxRules = ref<SalaryTaxRule[]>([]);
const keyword = ref('');
const bindStatus = ref<'all' | 'bound' | 'enabled' | 'unbound'>('all');
const searchedKeyword = ref('');
const searchedBindStatus = ref<'all' | 'bound' | 'enabled' | 'unbound'>('all');

const taxRuleOptions = computed(() => taxRules.value.map((item) => ({
  label: `${item.title || item.code}（${item.code}）`,
  value: item.code,
})));

const filteredRows = computed(() => {
  const kw = normalizeText(searchedKeyword.value).toLowerCase();
  return rows.value.filter((row) => {
    const matchedKeyword = !kw || [
      row.rank_code,
      row.rank_name,
      row.rule_code,
      getRuleTitle(row.rule_code),
      row.remark,
    ].some((item) => normalizeText(item).toLowerCase().includes(kw));
    const matchedStatus =
      searchedBindStatus.value === 'all' ||
      (searchedBindStatus.value === 'bound' && !!row.rule_code) ||
      (searchedBindStatus.value === 'enabled' && !!row.rule_code && Number(row.is_enabled ?? 1) === 1) ||
      (searchedBindStatus.value === 'unbound' && !row.rule_code);
    return matchedKeyword && matchedStatus;
  });
});

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeNumber(value: unknown, defaultValue = 0) {
  const num = Number(value ?? defaultValue);
  return Number.isFinite(num) ? num : defaultValue;
}

function getRankKey(rankId?: string, rankCode?: string) {
  return normalizeText(rankId) || `code:${normalizeText(rankCode)}`;
}

function createAssignmentMap(assignments: SalaryRuleAssignmentApi.Row[]) {
  const map = new Map<string, SalaryRuleAssignmentApi.Row>();
  (assignments || []).forEach((item) => {
    const key = getRankKey(item.rank_id, item.rank_code);
    if (key && !map.has(key)) map.set(key, item);
  });
  return map;
}

function getRuleTitle(ruleCode: string) {
  const code = normalizeText(ruleCode);
  const matched = taxRules.value.find((item) => item.code === code);
  return matched?.title || code || '-';
}

function buildRow(rank: any, assignment?: SalaryRuleAssignmentApi.Row): RankTaxBindRow {
  const ruleCode = normalizeText(assignment?.rule_code);
  return {
    rowid: normalizeText(assignment?.rowid),
    rank_id: normalizeText(rank?.rowid),
    rank_code: normalizeText(rank?.rank_code),
    rank_name: normalizeText(rank?.rank_name),
    rule_code: ruleCode,
    original_rule_code: ruleCode,
    effective_start_period: normalizeText(assignment?.effective_start_period),
    effective_end_period: normalizeText(assignment?.effective_end_period),
    priority: normalizeNumber(assignment?.priority, 200),
    is_enabled: normalizeNumber(assignment?.is_enabled, 1),
    remark: normalizeText(assignment?.remark),
  };
}

async function loadData() {
  loading.value = true;
  try {
    const [rankRes, ruleBundle, assignmentRes] = await Promise.all([
      getSalaryRankList({}),
      getSalaryRuleBundle(),
      getSalaryRuleAssignmentPage({ rule_type: 'TAX', apply_scope: 'RANK', pageNo: 1, page: 9999 }),
    ]);

    taxRules.value = ruleBundle.salaryTaxRules || [];
    const assignmentMap = createAssignmentMap(assignmentRes.list || []);
    rows.value = (rankRes.list || []).map((rank: any) => {
      const rankId = normalizeText(rank?.rowid);
      const rankCode = normalizeText(rank?.rank_code);
      const assignment = assignmentMap.get(getRankKey(rankId, rankCode)) || assignmentMap.get(`code:${rankCode}`);
      return buildRow(rank, assignment);
    });
  } catch (error: any) {
    ElMessage.error(error?.message || '加载职级纳税规则绑定失败');
  } finally {
    loading.value = false;
  }
}

function validateRows() {
  const validRuleCodes = new Set(taxRules.value.map((item) => item.code));
  rows.value.forEach((row) => {
    if (!row.rule_code) return;
    if (!validRuleCodes.has(row.rule_code)) {
      throw new Error(`职级 ${row.rank_name || row.rank_code} 选择的个税规则不存在`);
    }
    if (row.effective_start_period && row.effective_end_period && row.effective_start_period > row.effective_end_period) {
      throw new Error(`职级 ${row.rank_name || row.rank_code} 的生效开始期间不能晚于结束期间`);
    }
  });
}

function buildAssignment(row: RankTaxBindRow): SalaryRuleAssignmentApi.Row {
  return {
    rowid: row.rowid,
    rule_type: 'TAX',
    rule_code: row.rule_code,
    apply_scope: 'RANK',
    rank_id: row.rank_id,
    rank_code: row.rank_code,
    effective_start_period: row.effective_start_period,
    effective_end_period: row.effective_end_period,
    priority: normalizeNumber(row.priority, 200),
    is_enabled: normalizeNumber(row.is_enabled, 1),
    remark: row.remark,
    description: `职级 ${row.rank_name || row.rank_code} 适用个税规则 ${row.rule_code}`,
    status: 1,
  };
}

async function handleSaveAll() {
  try {
    validateRows();
    await ElMessageBox.confirm('确认保存职级与个税规则的绑定关系吗？保存后工资计算会按该绑定匹配个税规则。', '保存职级纳税规则', {
      type: 'warning',
    });
    saving.value = true;

    const added: SalaryRuleAssignmentApi.Row[] = [];
    const changed: Array<SalaryRuleAssignmentApi.Row & { rowid: string }> = [];
    const deletedRowIds: string[] = [];

    rows.value.forEach((row) => {
      if (!row.rule_code && row.rowid) {
        deletedRowIds.push(row.rowid);
        return;
      }
      if (!row.rule_code) return;
      const assignment = buildAssignment(row);
      if (row.rowid) changed.push({ ...assignment, rowid: row.rowid });
      else added.push(assignment);
    });

    await saveSalaryRuleAssignmentBatch({ added, changed, deletedRowIds });
    await loadData();
    ElMessage.success('职级纳税规则绑定已保存');
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    ElMessage.error(error?.message || '保存职级纳税规则绑定失败');
  } finally {
    saving.value = false;
  }
}

function clearRule(row: RankTaxBindRow) {
  row.rule_code = '';
  row.is_enabled = 0;
}

function handleSearch() {
  searchedKeyword.value = keyword.value;
  searchedBindStatus.value = bindStatus.value;
}

function resetSearch() {
  keyword.value = '';
  bindStatus.value = 'all';
  searchedKeyword.value = '';
  searchedBindStatus.value = 'all';
}


onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="page-wrap">
      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <div class="card-title">职级与个税规则绑定</div>
            <div class="card-actions">
              <el-button :loading="loading" @click="loadData">刷新</el-button>
              <el-button type="primary" :loading="saving" @click="handleSaveAll">保存绑定关系</el-button>
            </div>
          </div>
        </template>

        <div class="query-row">
          <el-input
            v-model="keyword"
            clearable
            placeholder="搜索职级编码 / 职级名称 / 个税规则 / 备注"
            style="width: 320px"
            @keyup.enter="handleSearch"
          />
          <el-select v-model="bindStatus" placeholder="绑定状态" style="width: 160px">
            <el-option label="全部" value="all" />
            <el-option label="已绑定" value="bound" />
            <el-option label="已启用" value="enabled" />
            <el-option label="未绑定" value="unbound" />
          </el-select>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </div>

        <el-table v-loading="loading" :data="filteredRows" border>
          <el-table-column type="index" label="#" width="60" fixed="left" />
          <el-table-column prop="rank_code" label="职级编码" min-width="120" fixed="left" />
          <el-table-column prop="rank_name" label="职级名称" min-width="140" fixed="left" />
          <el-table-column label="适用个税规则" min-width="260">
            <template #default="{ row = {}} = {}">
              <el-select v-model="row.rule_code" clearable filterable placeholder="请选择个税规则" style="width: 100%">
                <el-option v-for="item in taxRuleOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="规则名称" min-width="180">
            <template #default="{ row = {}} = {}">{{ getRuleTitle(row.rule_code) }}</template>
          </el-table-column>
          <el-table-column label="生效开始期间" width="150">
            <template #default="{ row = {}} = {}"><el-input v-model="row.effective_start_period" placeholder="YYYY-MM" /></template>
          </el-table-column>
          <el-table-column label="生效结束期间" width="150">
            <template #default="{ row = {}} = {}"><el-input v-model="row.effective_end_period" placeholder="YYYY-MM" /></template>
          </el-table-column>
          <el-table-column label="优先级" width="120" align="right">
            <template #default="{ row = {}} = {}"><el-input-number v-model="row.priority" :controls="false" style="width: 100%" /></template>
          </el-table-column>
          <el-table-column label="启用" width="100" align="center">
            <template #default="{ row = {}} = {}"><el-switch v-model="row.is_enabled" :active-value="1" :inactive-value="0" :disabled="!row.rule_code" /></template>
          </el-table-column>
          <el-table-column label="备注" min-width="180">
            <template #default="{ row = {}} = {}"><el-input v-model="row.remark" placeholder="备注" /></template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right" align="center">
            <template #default="{ row = {}} = {}"><el-button link type="danger" @click="clearRule(row)">清空</el-button></template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </Page>
</template>

<style scoped>
.page-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header,
.card-actions,
.query-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card-header {
  align-items: center;
  justify-content: space-between;
}

.query-row {
  align-items: center;
  margin-bottom: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
}
</style>
