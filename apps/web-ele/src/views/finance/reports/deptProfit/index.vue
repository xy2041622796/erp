<script lang="ts" setup>
import type {
  DeptProfitCell,
  DeptProfitDeptColumn,
  DeptProfitStatementRow,
} from '#/api/erp/finance/reports/deptProfit';

import { computed, nextTick, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { useAccountSetStore } from '#/store/account-set';

import {
  ElButton,
  ElCard,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import {
  DEPT_PROFIT_TOTAL_COLUMN_ID,
  fetchDeptProfitReport,
} from '#/api/erp/finance/reports/deptProfit';
import { useHorizontalWheelScroll } from '#/hooks/use-horizontal-wheel-scroll';
import { buildDimensionProfitStatementPrintHtml } from '#/views/finance/print-templates/dimension-profit-statement';

import { exportDimensionProfitStatement } from '../components/dimension-profit-statement-export';
import ReportPeriodPopover from '../components/report-period-popover.vue';

defineOptions({ name: 'FinanceCwhsReportsDeptProfit' });

const now = new Date();
const monthValue = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
);
const periodMode = ref<'month' | 'quarter'>('month');
const accountSetStore = useAccountSetStore();
const loading = ref(false);
const exportLoading = ref(false);
const printLoading = ref(false);
const deptColumns = ref<DeptProfitDeptColumn[]>([]);
const rows = ref<DeptProfitStatementRow[]>([]);
const tableRef = ref<InstanceType<typeof ElTable>>();
const printFrameRef = ref<HTMLIFrameElement>();

const periodLabel = computed(() => {
  const [y, m] = monthValue.value.split('-').map(Number);
  if (periodMode.value === 'quarter') {
    const q = Math.floor(((m || 1) - 1) / 3) + 1;
    return `${y}年第${q}季度`;
  }
  return `${y}年${m}月`;
});

const currentColumnLabel = computed(() =>
  periodMode.value === 'quarter' ? '本季金额' : '本期金额',
);

function money(value: number) {
  const num = Number(value || 0);
  if (Math.abs(num) < 1e-9) return '';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function rowClassName({ row }: { row: DeptProfitStatementRow }) {
  if (row.isStrong) return 'dept-profit-strong-row';
  if (row.isTitle) return 'dept-profit-title-row';
  return '';
}

function getRowTotalCell(row: DeptProfitStatementRow): DeptProfitCell {
  return (
    row.values?.[DEPT_PROFIT_TOTAL_COLUMN_ID] || {
      currentAmount: 0,
      yearAmount: 0,
    }
  );
}

async function loadReport() {
  loading.value = true;
  try {
    const report = await fetchDeptProfitReport({
      month: monthValue.value,
      periodMode: periodMode.value,
    });
    deptColumns.value = report.deptColumns || [];
    rows.value = report.rows || [];
  } catch (error: any) {
    deptColumns.value = [];
    rows.value = [];
    ElMessage.error(error?.message || '部门利润表加载失败');
  } finally {
    loading.value = false;
  }
}

function handlePeriodApply(payload: {
  monthValue: string;
  periodMode: 'month' | 'quarter';
}) {
  monthValue.value = payload.monthValue;
  periodMode.value = payload.periodMode;
  loadReport();
}

function getAccountSetNameForFile() {
  return String(accountSetStore.currentName || accountSetStore.displayName || '当前账套').trim() || '当前账套';
}

async function handleExport() {
  if (rows.value.length === 0) {
    ElMessage.warning('当前没有可导出的部门利润表数据');
    return;
  }
  exportLoading.value = true;
  try {
    await exportDimensionProfitStatement({
      title: '部门利润表',
      sheetName: '部门利润表',
      fileNamePrefix: '部门利润表月报',
      companyName: getAccountSetNameForFile(),
      periodText: periodLabel.value,
      currentLabel: currentColumnLabel.value,
      yearLabel: '本年累计金额',
      totalColumnId: DEPT_PROFIT_TOTAL_COLUMN_ID,
      dimensionColumns: deptColumns.value.map((dept) => ({
        id: dept.deptId,
        name: dept.deptName,
      })),
      rows: rows.value,
    });
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '部门利润表导出失败');
  } finally {
    exportLoading.value = false;
  }
}

async function handlePrint() {
  if (rows.value.length === 0) {
    ElMessage.warning('当前没有可打印的部门利润表数据');
    return;
  }
  await nextTick();
  const iframe = printFrameRef.value;
  const win = iframe?.contentWindow;
  const doc = iframe?.contentDocument || win?.document;
  if (!iframe || !win || !doc) {
    ElMessage.error('打印容器初始化失败');
    return;
  }

  const html = buildDimensionProfitStatementPrintHtml({
    title: '部门利润表',
    companyName: getAccountSetNameForFile(),
    periodText: periodLabel.value,
    unitText: '元',
    currentLabel: currentColumnLabel.value,
    yearLabel: '本年累计金额',
    dimensionColumns: [
      ...deptColumns.value.map((dept) => ({
        id: dept.deptId,
        name: dept.deptName,
      })),
      { id: DEPT_PROFIT_TOTAL_COLUMN_ID, name: '合计' },
    ],
    rows: rows.value,
  });

  printLoading.value = true;
  doc.open();
  doc.write(html);
  doc.close();
  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      printLoading.value = false;
    }
  }, 120);
}

useHorizontalWheelScroll(tableRef);

onMounted(() => {
  loadReport();
});
</script>

<template>
  <Page auto-content-height class="dept-profit-page">
    <div class="dept-profit-layout">
      <div class="dept-profit-toolbar">
        <div class="dept-profit-heading">
          <div class="dept-profit-actions">
            <ReportPeriodPopover
              v-model="monthValue"
              v-model:period-mode="periodMode"
              allow-quarter
              @apply="handlePeriodApply"
            />
            <ElButton :loading="printLoading" @click="handlePrint">
              打印
            </ElButton>
            <ElButton :loading="exportLoading" @click="handleExport">
              导出
            </ElButton>
            <ElButton type="primary" :loading="loading" @click="loadReport">
              刷新
            </ElButton>
          </div>
        </div>
      </div>

      <ElCard
        v-if="loading || rows.length > 0"
        shadow="never"
        class="dept-profit-card"
        body-class="dept-profit-card-body"
      >
        <ElTable
          v-if="rows.length > 0"
          ref="tableRef"
          v-loading="loading"
          :data="rows"
          border
          :row-class-name="rowClassName"
          height="100%"
        >
          <ElTableColumn prop="label" label="项目" min-width="300" fixed="left">
            <template #default="{ row }">
              <span class="dept-profit-item-cell">
                <span v-if="row.isExpandable">●</span>
                <span>{{ row.label }}</span>
              </span>
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="lineNo"
            label="行次"
            width="68"
            fixed="left"
            align="center"
          />
          <ElTableColumn
            v-for="dept in deptColumns"
            :key="dept.deptId"
            :label="dept.deptName"
            align="center"
            min-width="240"
          >
            <ElTableColumn
              :label="currentColumnLabel"
              min-width="120"
              align="right"
            >
              <template #default="{ row }">
                {{ money(row.values?.[dept.deptId]?.currentAmount) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="本年累计金额" min-width="120" align="right">
              <template #default="{ row }">
                {{ money(row.values?.[dept.deptId]?.yearAmount) }}
              </template>
            </ElTableColumn>
          </ElTableColumn>
          <ElTableColumn label="合计" align="center" min-width="240">
            <ElTableColumn
              :label="currentColumnLabel"
              min-width="120"
              align="right"
            >
              <template #default="{ row }">
                {{ money(getRowTotalCell(row).currentAmount) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="本年累计金额" min-width="120" align="right">
              <template #default="{ row }">
                {{ money(getRowTotalCell(row).yearAmount) }}
              </template>
            </ElTableColumn>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </div>
    <iframe ref="printFrameRef" class="print-frame"></iframe>
  </Page>
</template>

<style scoped>
.print-frame {
  position: fixed;
  right: 100%;
  bottom: 100%;
  width: 0;
  height: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}

.dept-profit-page :deep(.el-loading-mask) {
  border-radius: 4px;
}

.dept-profit-page {
  height: 100%;
  overflow: hidden;
  background: var(--el-bg-color-page);
}

.dept-profit-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.dept-profit-toolbar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  margin-bottom: 14px;
}

.dept-profit-heading {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.dept-profit-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.dept-profit-card {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  border-color: var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  background: var(--el-bg-color);
}

:deep(.dept-profit-card-body) {
  height: 100%;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.dept-profit-empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.dept-profit-item-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.dept-profit-expand-icon {
  color: var(--el-color-primary);
  font-size: 12px;
  line-height: 1;
}

:deep(.el-table) {
  --el-table-header-bg-color: var(--el-fill-color-light);
  --el-table-header-text-color: var(--el-text-color-primary);
  --el-table-border-color: var(--el-border-color-lighter);
  --el-table-row-hover-bg-color: var(--el-fill-color-light);
}

:deep(.el-table th.el-table__cell) {
  background: var(--el-table-header-bg-color);
  color: var(--el-table-header-text-color);
  font-weight: 700;
}

:deep(.dept-profit-title-row .el-table__cell),
:deep(.dept-profit-strong-row .el-table__cell) {
  font-weight: 700;
}

:deep(.dept-profit-title-row .el-table__cell) {
  background: var(--el-fill-color-lighter);
}

:deep(.dept-profit-strong-row .el-table__cell) {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

:deep(.el-table .cell) {
  white-space: nowrap;
}
</style>
