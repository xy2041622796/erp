<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  fetchAuxiliaryProjectDetailRows,
  type AuxiliaryDetailRow,
} from '#/api/erp/finance/reports/auxiliary-project-ledger';
import { monthLabel, toMoney } from '#/views/finance/ledger/subject-balance/data';

import {
  ElButton,
  ElDatePicker,
  ElInput,
  ElMessage,
  ElSelect,
  ElOption,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'FinanceAuxiliaryProjectDetail' });

const route = useRoute();

function getCurrentMonth() {
  return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

const dimOptions = [
  { label: '全部核算项目', value: '' },
  { label: '客户', value: 'CUSTOMER' },
  { label: '供应商', value: 'SUPPLIER' },
  { label: '项目', value: 'PROJECT' },
  { label: '部门', value: 'DEPT' },
  { label: '员工', value: 'EMPLOYEE' },
  { label: '合同', value: 'CONTRACT' },
];

const periodRange = ref<[string, string]>([getCurrentMonth(), getCurrentMonth()]);
const dimCode = ref('');
const departmentCode = ref('');
const projectCode = ref('');
const subjectCode = ref('');
const keyword = ref('');
const loading = ref(false);
const tableData = ref<AuxiliaryDetailRow[]>([]);
const activeAuxiliaryCode = ref('');

const periodText = computed(() => {
  const [start, end] = periodRange.value || [];
  if (!start && !end) return '';
  if (start && end && start !== end) return `${monthLabel(start)} 至 ${monthLabel(end)}`;
  return monthLabel(start || end || '');
});

const auxiliaryDimensionLabel = computed(() => {
  const matched = dimOptions.find((item) => item.value === dimCode.value);
  return matched?.label || '核算项目';
});

const auxiliaryItems = computed(() => {
  const map = new Map<string, AuxiliaryDetailRow>();
  tableData.value.forEach((row) => {
    const code = String(row.auxiliaryCode || '').trim();
    if (!code || map.has(code)) return;
    map.set(code, row);
  });
  return [...map.values()].sort((a, b) =>
    String(a.auxiliaryCode || '').localeCompare(String(b.auxiliaryCode || ''), 'zh-Hans-CN'),
  );
});

const displayRows = computed(() => {
  const code = String(activeAuxiliaryCode.value || '').trim();
  const rows = code
    ? tableData.value.filter((row) => String(row.auxiliaryCode || '') === code)
    : tableData.value;
  let running = 0;
  return rows.map((row) => {
    running += Number(row.debit || 0) - Number(row.credit || 0);
    return { ...row, balance: running };
  });
});

const selectedAuxiliaryTitle = computed(() => {
  const code = String(activeAuxiliaryCode.value || '').trim();
  const item = auxiliaryItems.value.find((row) => String(row.auxiliaryCode || '') === code);
  return [item?.auxiliaryCode, item?.auxiliaryName].filter(Boolean).join(' ') || code;
});

const totalDebit = computed(() => displayRows.value.reduce((sum, row) => sum + Number(row.debit || 0), 0));
const totalCredit = computed(() => displayRows.value.reduce((sum, row) => sum + Number(row.credit || 0), 0));
const endingBalance = computed(() => displayRows.value.length > 0 ? displayRows.value[displayRows.value.length - 1]!.balance : 0);

const summaryText = computed(() =>
  `${periodText.value} · ${selectedAuxiliaryTitle.value} · 显示 ${displayRows.value.length} 条${auxiliaryDimensionLabel.value}明细 · 借 ${toMoney(totalDebit.value)} · 贷 ${toMoney(totalCredit.value)} · 余 ${toMoney(endingBalance.value)}`,
);

function applyRoutePreset() {
  const start = String(route.query.periodStart || route.query.month || '').trim();
  const end = String(route.query.periodEnd || route.query.periodStart || route.query.month || '').trim();
  if (start || end) {
    periodRange.value = [start || end, end || start] as [string, string];
  }
  dimCode.value = String(route.query.dimCode || '').trim();
  activeAuxiliaryCode.value = String(route.query.valueCode || '').trim();
  departmentCode.value = String(route.query.departmentCode || '').trim();
  projectCode.value = String(route.query.projectCode || '').trim();
  subjectCode.value = String(route.query.subjectCode || '').trim();
}

function selectDefaultAuxiliary() {
  const currentCode = String(activeAuxiliaryCode.value || '').trim();
  const next =
    auxiliaryItems.value.find((item) => String(item.auxiliaryCode || '') === currentCode) ||
    auxiliaryItems.value[0];
  activeAuxiliaryCode.value = String(next?.auxiliaryCode || '');
}

async function load() {
  loading.value = true;
  try {
    tableData.value = await fetchAuxiliaryProjectDetailRows({
      periodStart: periodRange.value?.[0] || '',
      periodEnd: periodRange.value?.[1] || periodRange.value?.[0] || '',
      dimCode: dimCode.value || undefined,
      departmentCode: departmentCode.value || undefined,
      projectCode: projectCode.value || undefined,
      subjectCode: subjectCode.value || undefined,
      keyword: keyword.value || undefined,
    });
    selectDefaultAuxiliary();
  } catch (error) {
    console.error(error);
    ElMessage.error('加载核算项目明细帐失败');
  } finally {
    loading.value = false;
  }
}

function exportCurrent() {
  ElMessage.info('导出功能待接入');
}

function pickAuxiliary(code: string) {
  activeAuxiliaryCode.value = code;
}

onMounted(() => {
  applyRoutePreset();
  load();
});
watch([periodRange, dimCode], async () => {
  activeAuxiliaryCode.value = '';
  await load();
});
</script>

<template>
  <Page auto-content-height class="h-full auxiliary-detail-page">
    <div class="auxiliary-detail-layout">
      <div class="auxiliary-report-panel min-h-0 flex-1 rounded-md border border-border bg-card shadow-sm">
        <div class="table-toolbar">
          <div class="table-toolbar__filters">
            <div class="filter-item">
              <span class="filter-label">查询期间</span>
              <ElDatePicker
                v-model="periodRange"
                type="monthrange"
                range-separator="至"
                start-placeholder="开始月份"
                end-placeholder="结束月份"
                value-format="YYYY-MM"
                class="period-range-picker"
              />
            </div>
            <div class="filter-item">
              <span class="filter-label">核算维度</span>
              <ElSelect v-model="dimCode" class="dimension-select" filterable>
                <ElOption
                  v-for="item in dimOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </div>
            <div class="filter-item filter-item--code">
              <span class="filter-label">部门编码</span>
              <ElInput v-model="departmentCode" clearable placeholder="可为空" @keyup.enter="load" />
            </div>
            <div class="filter-item filter-item--code">
              <span class="filter-label">项目编码</span>
              <ElInput v-model="projectCode" clearable placeholder="可为空" @keyup.enter="load" />
            </div>
            <div class="filter-item filter-item--code">
              <span class="filter-label">科目编码</span>
              <ElInput v-model="subjectCode" clearable placeholder="可为空" @keyup.enter="load" />
            </div>
            <div class="filter-item filter-item--search">
              <span class="filter-label">搜索</span>
              <ElInput
                v-model="keyword"
                clearable
                :placeholder="'摘要/' + auxiliaryDimensionLabel + '/科目'"
                @keyup.enter="load"
              />
            </div>
          </div>
          <div class="table-toolbar__actions">
            <ElButton type="primary" @click="load">查询</ElButton>
            <ElButton type="primary" @click="exportCurrent">导出</ElButton>
          </div>
        </div>

        <div class="auxiliary-detail-content">
          <div class="auxiliary-project-panel">
            <div class="auxiliary-project-panel__header">
              <span>核算项目</span>
              <span>{{ auxiliaryItems.length }} 个</span>
            </div>
            <div class="auxiliary-project-panel__body">
              <div
                v-for="item in auxiliaryItems"
                :key="String(item.auxiliaryCode)"
                class="auxiliary-project-row"
                :class="{ 'auxiliary-project-row--active': activeAuxiliaryCode === item.auxiliaryCode }"
                :title="[item.auxiliaryCode, item.auxiliaryName].filter(Boolean).join(' ')"
                @click="pickAuxiliary(String(item.auxiliaryCode || ''))"
              >
                <span class="auxiliary-project-code">{{ item.auxiliaryCode }}</span>
                <span class="auxiliary-project-name">{{ item.auxiliaryName }}</span>
              </div>
              <div v-if="!loading && auxiliaryItems.length === 0" class="auxiliary-project-empty">
                当前维度下没有核算项目
              </div>
            </div>
          </div>

          <div class="auxiliary-table-wrap">
            <ElTable
              :data="displayRows"
              border
              stripe
              v-loading="loading"
              height="100%"
              class="w-full"
            >
              <ElTableColumn prop="date" label="日期" width="120" fixed="left" />
              <ElTableColumn prop="voucherNo" label="凭证字号" width="130" fixed="left" />
              <ElTableColumn prop="summary" label="摘要" min-width="180" />
              <ElTableColumn prop="subjectCode" label="科目编码" width="120" />
              <ElTableColumn prop="subjectName" label="科目名称" min-width="180" />
              <ElTableColumn prop="debit" label="借方发生额" width="140" align="right">
                <template #default="scope">{{ toMoney(scope.row.debit) }}</template>
              </ElTableColumn>
              <ElTableColumn prop="credit" label="贷方发生额" width="140" align="right">
                <template #default="scope">{{ toMoney(scope.row.credit) }}</template>
              </ElTableColumn>
              <ElTableColumn prop="balance" label="余额" width="140" align="right">
                <template #default="scope">{{ toMoney(scope.row.balance) }}</template>
              </ElTableColumn>
            </ElTable>
          </div>
        </div>
      </div>

      <div class="auxiliary-summary-text">{{ summaryText }}</div>
    </div>
  </Page>
</template>

<style scoped>
.auxiliary-detail-page :deep(.vben-page-content) {
  min-height: 0;
  padding: 0;
}

.auxiliary-detail-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
.auxiliary-report-panel {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 0;
  border-radius: 0;
}

.auxiliary-detail-content {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.auxiliary-project-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
}

.auxiliary-project-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  padding: 0 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
  font-weight: 600;
}

.auxiliary-project-panel__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 6px 0;
}

.auxiliary-project-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 10px;
  font-size: 13px;
  cursor: pointer;
}

.auxiliary-project-row:hover,
.auxiliary-project-row--active {
  background: var(--el-fill-color-light);
}

.auxiliary-project-code {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.auxiliary-project-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auxiliary-project-empty {
  padding: 24px 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-align: center;
}

.table-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
  flex-wrap: nowrap;
}

.table-toolbar__filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: nowrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 0 0 auto;
}

.filter-item--search {
  flex: 1 1 auto;
  min-width: 220px;
}

.filter-item--code {
  width: 170px;
}

.filter-label {
  flex: 0 0 auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.period-range-picker {
  width: 280px;
}

.dimension-select {
  width: 150px;
}

.table-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}
.auxiliary-table-wrap {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.auxiliary-table-wrap :deep(.el-table) {
  height: 100%;
}

.auxiliary-table-wrap :deep(.el-table__body-wrapper) {
  overflow: auto;
}

.auxiliary-summary-text {
  flex: 0 0 auto;
  padding: 6px 12px 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.table-toolbar :deep(.el-input__wrapper),
.table-toolbar :deep(.el-select__wrapper),
.table-toolbar :deep(.el-date-editor) {
  min-height: 32px;
}

.table-toolbar__actions :deep(.el-button) {
  height: 32px;
  padding: 0 16px;
}

@media (max-width: 1360px) {
  .table-toolbar {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .table-toolbar__filters {
    width: 100%;
    flex-wrap: wrap;
  }

  .table-toolbar__actions {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 900px) {
  .auxiliary-detail-content {
    grid-template-columns: 1fr;
  }

  .auxiliary-project-panel {
    max-height: 220px;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-light);
  }
}
</style>
