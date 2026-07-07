<script lang="ts" setup>
import { computed, nextTick, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { useHorizontalWheelScroll } from '#/hooks/use-horizontal-wheel-scroll';
import { useAccountSetStore } from '#/store/account-set';

import { buildDimensionProfitStatementPrintHtml } from '#/views/finance/print-templates/dimension-profit-statement';

import {
  ElButton,
  ElCard,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import {
  PROJECT_PROFIT_TOTAL_COLUMN_ID,
  fetchProjectProfitReport,
  type ProjectProfitCell,
  type ProjectProfitProjectColumn,
  type ProjectProfitStatementRow,
} from '#/api/erp/finance/reports/projectProfit';

import { exportDimensionProfitStatement } from '../components/dimension-profit-statement-export';
import ReportPeriodPopover from '../components/report-period-popover.vue';

defineOptions({ name: 'FinanceCwhsReportsProjectProfit' });

const now = new Date();
const monthValue = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
const periodMode = ref<'month' | 'quarter'>('month');
const accountSetStore = useAccountSetStore();
const loading = ref(false);
const exportLoading = ref(false);
const printLoading = ref(false);
const projectColumns = ref<ProjectProfitProjectColumn[]>([]);
const rows = ref<ProjectProfitStatementRow[]>([]);
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

const currentColumnLabel = computed(() => (periodMode.value === 'quarter' ? '本季金额' : '本期金额'));

function money(value: number) {
  const num = Number(value || 0);
  if (Math.abs(num) < 1e-9) return '';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function rowClassName({ row }: { row: ProjectProfitStatementRow }) {
  if (row.isStrong) return 'project-profit-strong-row';
  if (row.isTitle) return 'project-profit-title-row';
  return '';
}

function getRowTotalCell(row: ProjectProfitStatementRow): ProjectProfitCell {
  return (
    row.values?.[PROJECT_PROFIT_TOTAL_COLUMN_ID] || {
      currentAmount: 0,
      yearAmount: 0,
    }
  );
}

async function loadReport() {
  loading.value = true;
  try {
    const report = await fetchProjectProfitReport({
      month: monthValue.value,
      periodMode: periodMode.value,
    });
    projectColumns.value = report.projectColumns || [];
    rows.value = report.rows || [];
  } catch (error: any) {
    projectColumns.value = [];
    rows.value = [];
    ElMessage.error(error?.message || '项目利润表加载失败');
  } finally {
    loading.value = false;
  }
}

function handlePeriodApply(payload: { monthValue: string; periodMode: 'month' | 'quarter' }) {
  monthValue.value = payload.monthValue;
  periodMode.value = payload.periodMode;
  loadReport();
}

function getAccountSetNameForFile() {
  return String(accountSetStore.currentName || accountSetStore.displayName || '当前账套').trim() || '当前账套';
}

async function handleExport() {
  if (rows.value.length === 0) {
    ElMessage.warning('当前没有可导出的项目利润表数据');
    return;
  }
  exportLoading.value = true;
  try {
    await exportDimensionProfitStatement({
      title: '项目利润表',
      sheetName: '项目利润表',
      fileNamePrefix: '项目利润表月报',
      companyName: getAccountSetNameForFile(),
      periodText: periodLabel.value,
      currentLabel: currentColumnLabel.value,
      yearLabel: '本年累计金额',
      totalColumnId: PROJECT_PROFIT_TOTAL_COLUMN_ID,
      dimensionColumns: projectColumns.value.map((project) => ({
        id: project.projectId,
        name: project.projectName,
      })),
      rows: rows.value,
    });
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '项目利润表导出失败');
  } finally {
    exportLoading.value = false;
  }
}

async function handlePrint() {
  if (rows.value.length === 0) {
    ElMessage.warning('当前没有可打印的项目利润表数据');
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
    title: '项目利润表',
    companyName: getAccountSetNameForFile(),
    periodText: periodLabel.value,
    unitText: '元',
    currentLabel: currentColumnLabel.value,
    yearLabel: '本年累计金额',
    dimensionColumns: [
      ...projectColumns.value.map((project) => ({
        id: project.projectId,
        name: project.projectName,
      })),
      { id: PROJECT_PROFIT_TOTAL_COLUMN_ID, name: '合计' },
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
  <Page auto-content-height class="project-profit-page">
    <div class="project-profit-layout">
      <div class="project-profit-toolbar">
        <div class="project-profit-heading">
          <div class="project-profit-actions">
            <ReportPeriodPopover
              v-model="monthValue"
              v-model:period-mode="periodMode"
              allow-quarter
              @apply="handlePeriodApply"
            />
            <ElButton :loading="printLoading" @click="handlePrint">打印</ElButton>
            <ElButton :loading="exportLoading" @click="handleExport">导出</ElButton>
            <ElButton type="primary" :loading="loading" @click="loadReport">刷新</ElButton>
          </div>
        </div>
      </div>

      <ElCard
        v-if="loading || rows.length > 0"
        shadow="never"
        class="project-profit-card"
        body-class="project-profit-card-body"
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
              <span class="project-profit-item-cell">
                <span v-if="row.isExpandable" class="project-profit-expand-icon">●</span>
                <span>{{ row.label }}</span>
              </span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="lineNo" label="行次" width="68" fixed="left" align="center" />
          <ElTableColumn
            v-for="project in projectColumns"
            :key="project.projectId"
            :label="project.projectName"
            align="center"
            min-width="240"
          >
            <ElTableColumn label="本期金额" min-width="120" align="right">
              <template #default="{ row }">
                {{ money(row.values?.[project.projectId]?.currentAmount) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="本年累计金额" min-width="120" align="right">
              <template #default="{ row }">
                {{ money(row.values?.[project.projectId]?.yearAmount) }}
              </template>
            </ElTableColumn>
          </ElTableColumn>
          <ElTableColumn label="合计" align="center" min-width="240">
            <ElTableColumn :label="currentColumnLabel" min-width="120" align="right">
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

.project-profit-page :deep(.el-loading-mask) {
  border-radius: 4px;
}

.project-profit-page {
  height: 100%;
  overflow: hidden;
  background: var(--el-bg-color-page);
}

.project-profit-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.project-profit-toolbar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  margin-bottom: 14px;
}

.project-profit-heading {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.project-profit-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.project-profit-card {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  border-color: var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  background: var(--el-bg-color);
}

:deep(.project-profit-card-body) {
  height: 100%;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.project-profit-empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.project-profit-item-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.project-profit-expand-icon {
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

:deep(.project-profit-title-row .el-table__cell),
:deep(.project-profit-strong-row .el-table__cell) {
  font-weight: 700;
}

:deep(.project-profit-title-row .el-table__cell) {
  background: var(--el-fill-color-lighter);
}

:deep(.project-profit-strong-row .el-table__cell) {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

:deep(.el-table .cell) {
  white-space: nowrap;
}
</style>
