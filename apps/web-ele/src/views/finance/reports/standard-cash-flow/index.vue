<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';

import { RefreshRight } from '@element-plus/icons-vue';

import {
  fetchStandardCashFlowReport,
  type StandardCashFlowDetailRow,
  type StandardCashFlowLine,
} from '#/api/erp/finance/reports/standard-cash-flow';
import { useAccountSetStore } from '#/store/account-set';
import { buildCashFlowPrintHtml } from '#/views/finance/print-templates/cash-flow';
import ReportPeriodPopover from '#/views/finance/reports/components/report-period-popover.vue';

import {
  ElButton,
  ElCheckbox,
  ElIcon,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinanceStandardCashFlowReport' });

const periodMode = ref<'month' | 'quarter'>('month');
const monthValue = ref(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
const loading = ref(false);
const printLoading = ref(false);
const filterCollapsed = ref(true);
const showLastYear = ref(false);
const showDetails = ref(false);
const reportLines = ref<StandardCashFlowLine[]>([]);
const detailRows = ref<StandardCashFlowDetailRow[]>([]);
const printFrameRef = ref<HTMLIFrameElement>();
const accountSetStore = useAccountSetStore();
const companyName = computed(() =>
  String(accountSetStore.currentName || accountSetStore.displayName || '当前账套').trim(),
);

function toMoney(v: any) {
  const n = Number(v || 0);
  if (!n) return '';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getSectionMarker(label: string) {
  const match = String(label || '').trim().match(/^([一二三四五六七八九十]+)、/);
  return match?.[1] || '';
}

function getSectionTitle(label: string) {
  return String(label || '').trim().replace(/^[一二三四五六七八九十]+、/, '');
}

const periodLabel = computed(() => {
  const [y, m] = monthValue.value.split('-').map(Number);
  if (periodMode.value === 'quarter') {
    const q = Math.floor(((m || 1) - 1) / 3) + 1;
    return `${y}年${q}季度`;
  }
  return `${y}年${m}月`;
});

const currentColumnLabel = computed(() => (periodMode.value === 'quarter' ? '本季金额' : '本期金额'));
const yearColumnLabel = computed(() => (showLastYear.value ? '上年累计金额' : '本年累计金额'));

const filterSummary = computed(() => {
  const parts: string[] = [];
  if (showLastYear.value) parts.push('上年累计');
  if (showDetails.value) parts.push('辅助核算明细');
  return parts.join(' / ');
});

async function handlePrint() {
  if (reportLines.value.length === 0) {
    ElMessage.warning('当前没有可打印的标准现金流量表数据');
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

  const html = buildCashFlowPrintHtml({
    title: '标准现金流量表',
    companyName: companyName.value,
    periodText: periodLabel.value,
    unitText: '元',
    yearLabel: yearColumnLabel.value,
    currentLabel: currentColumnLabel.value,
    rows: reportLines.value.map((row) => ({
      label: row.label,
      lineNo: row.lineNo,
      year: Number(row.year || 0),
      current: Number(row.current || 0),
    })),
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


function handleExport() {
  if (reportLines.value.length === 0) {
    ElMessage.warning('当前没有可导出的标准现金流量表数据');
    return;
  }
  const headers = ['项目', '行次', yearColumnLabel.value, currentColumnLabel.value];
  const esc = (value: any) => {
    const text = String(value ?? '').replace(/\r?\n/g, ' ');
    return text.includes(',') || text.includes('"') ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  const rows = reportLines.value.map((row) => [
    row.label,
    row.lineNo,
    Number(row.year || 0).toFixed(2),
    Number(row.current || 0).toFixed(2),
  ]);
  const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(esc).join(',')).join('\n');
  downloadFileFromBlobPart({
    fileName: `标准现金流量表-${monthValue.value}.csv`,
    source: new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
  });
}

async function load() {
  loading.value = true;
  try {
    const report = await fetchStandardCashFlowReport({
      month: monthValue.value,
      periodMode: periodMode.value,
      showLastYear: showLastYear.value,
    });
    reportLines.value = report.lines || [];
    detailRows.value = report.details || [];
  } catch (e) {
    console.error(e);
    ElMessage.error('加载标准现金流量表失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch([monthValue, periodMode, showLastYear], load);
</script>

<template>
  <Page auto-content-height class="h-full finance-report-page">
    <div class="standard-cashflow-layout flex h-full flex-col gap-4">
      <div class="finance-filter-toolbar standard-cashflow-top-filter">
        <div v-if="filterCollapsed" class="finance-filter-compact">
          <div class="finance-filter-compact__left">
            <ReportPeriodPopover
              v-model="monthValue"
              v-model:period-mode="periodMode"
              :allow-quarter="true"
              :width="360"
            />
            <div
              v-if="filterSummary"
              class="finance-filter-summary"
              :title="filterSummary"
            >
              {{ filterSummary }}
            </div>
          </div>
          <div class="finance-filter-compact__actions">
            <ElButton type="primary" @click="load">查询</ElButton>
            <ElButton :loading="printLoading" @click="handlePrint">打印</ElButton>
            <ElButton @click="handleExport">导出</ElButton>
            <ElButton text type="primary" class="finance-filter-toggle" @click="filterCollapsed = false">展开筛选</ElButton>
            <ElButton circle @click="load"><ElIcon><RefreshRight /></ElIcon></ElButton>
          </div>
        </div>

        <div v-else class="finance-filter-expanded">
          <div class="finance-filter-grid">
            <label class="finance-filter-item">
              <span class="finance-filter-label">会计期间</span>
              <ReportPeriodPopover
                v-model="monthValue"
                v-model:period-mode="periodMode"
                :allow-quarter="true"
                :width="360"
              />
            </label>
            <label class="finance-filter-item finance-filter-item--check">
              <span class="finance-filter-label">累计口径</span>
              <ElCheckbox v-model="showLastYear">显示上年累计金额</ElCheckbox>
            </label>
            <label class="finance-filter-item finance-filter-item--check">
              <span class="finance-filter-label">明细</span>
              <ElCheckbox v-model="showDetails">显示辅助核算明细</ElCheckbox>
            </label>
          </div>

          <div class="finance-filter-actions">
            <ElButton text type="primary" class="finance-filter-toggle" @click="filterCollapsed = true">收起筛选</ElButton>
            <div class="finance-filter-buttons">
              <ElButton type="primary" @click="load">查询</ElButton>
              <ElButton :loading="printLoading" @click="handlePrint">打印</ElButton>
              <ElButton @click="handleExport">导出</ElButton>
              <ElButton circle @click="load"><ElIcon><RefreshRight /></ElIcon></ElButton>
            </div>
          </div>
        </div>
      </div>

      <div class="finance-report-table-wrap finance-single-wrap" v-loading="loading">
        <div class="finance-report-table-scroll">
          <table class="finance-report-table finance-single-table">
          <thead>
            <tr>
              <th>项目</th>
              <th class="w-line">行次</th>
              <th class="w-amount">{{ yearColumnLabel }}</th>
              <th class="w-amount">{{ currentColumnLabel }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in reportLines"
              :key="`${row.key}-${index}`"
              :class="{ 'is-section': row.isSection, 'is-strong': row.isStrong }"
            >
              <td class="text-left" :class="[`indent-${row.indent || 0}`]">
                <div v-if="row.isSection || (row.isStrong && getSectionMarker(row.label))" class="cashflow-title-cell">
                  <span v-if="getSectionMarker(row.label)" class="cashflow-title-badge">{{ getSectionMarker(row.label) }}</span>
                  <span class="cashflow-title-text">{{ getSectionTitle(row.label) }}</span>
                </div>
                <span v-else>{{ row.label }}</span>
              </td>
              <td class="text-center">{{ row.lineNo }}</td>
              <td class="text-right" :class="{ negative: Number(row.year || 0) < 0 }">{{ toMoney(row.year) }}</td>
              <td class="text-right" :class="{ negative: Number(row.current || 0) < 0 }">{{ toMoney(row.current) }}</td>
            </tr>
          </tbody>
          </table>
        </div>
      </div>

      <div v-if="showDetails" class="standard-detail-card">
        <div class="standard-detail-title">
          <span>辅助核算明细</span>
          <ElTag type="info">共 {{ detailRows.length }} 条</ElTag>
        </div>
        <ElTable :data="detailRows" border stripe height="320" :style="{ width: '100%' }">
          <ElTableColumn prop="voucherDate" label="凭证日期" width="110" />
          <ElTableColumn prop="voucherCode" label="凭证号" width="130" show-overflow-tooltip />
          <ElTableColumn prop="summary" label="摘要" min-width="180" show-overflow-tooltip />
          <ElTableColumn prop="accountCode" label="科目编码" width="120" />
          <ElTableColumn prop="accountName" label="科目名称" min-width="150" show-overflow-tooltip />
          <ElTableColumn prop="cashFlowCode" label="现金流编码" width="110" />
          <ElTableColumn prop="cashFlowName" label="现金流项目" min-width="260" show-overflow-tooltip />
          <ElTableColumn label="本年金额" width="140" align="right">
            <template #default="{ row }">{{ toMoney(row.yearAmount) }}</template>
          </ElTableColumn>
          <ElTableColumn label="本期金额" width="140" align="right">
            <template #default="{ row }">{{ toMoney(row.currentAmount) }}</template>
          </ElTableColumn>
        </ElTable>
      </div>
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



.finance-report-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
}

.finance-filter-toolbar {
  padding: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
}

.standard-cashflow-top-filter {
  flex: 0 0 auto;
  width: 100%;
}

.standard-cashflow-layout {
  min-height: 0;
}

.finance-filter-toolbar :deep(.el-button) {
  flex: 0 0 auto;
  height: 32px;
  min-width: 64px;
  padding-right: 14px;
  padding-left: 14px;
  white-space: nowrap;
}

.finance-filter-toolbar :deep(.el-button.is-circle) {
  min-width: 32px;
  padding-right: 8px;
  padding-left: 8px;
}

.finance-filter-toolbar :deep(.el-button.is-text) {
  min-width: auto;
  padding-right: 8px;
  padding-left: 8px;
}

.finance-filter-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.finance-filter-compact__left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.finance-filter-compact__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.finance-filter-summary {
  max-width: 360px;
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.finance-filter-expanded {
  display: grid;
  gap: 12px;
}

.finance-filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}

.finance-filter-item {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.finance-filter-item--check {
  align-content: end;
}

.finance-filter-label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.finance-filter-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.finance-filter-buttons {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  white-space: nowrap;
}

.finance-report-table-scroll {
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.finance-single-wrap {
  max-width: 1180px;
  align-self: center;
  width: 100%;
}

.finance-report-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 14px;
}

.finance-report-table th,
.finance-report-table td {
  border: 1px solid var(--el-border-color-light);
  padding: 10px 12px;
}

.finance-report-table thead th {
  background: var(--el-fill-color-light);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.finance-report-table .w-line {
  width: 70px;
}

.finance-report-table .w-amount {
  width: 240px;
}

.text-left {
  text-align: left;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.finance-report-table tbody tr.is-section td,
.finance-report-table tbody tr.is-strong td {
  font-weight: 700;
}

.finance-report-table tbody tr.is-section,
.finance-report-table tbody tr.is-strong {
  position: relative;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.12) 0%, rgba(64, 158, 255, 0.05) 52%, rgba(255, 255, 255, 0.96) 100%);
}

.finance-report-table tbody tr.is-section td:first-child,
.finance-report-table tbody tr.is-strong td:first-child {
  position: relative;
  padding-top: 14px;
  padding-bottom: 14px;
}

.finance-report-table tbody tr.is-section td:first-child::before,
.finance-report-table tbody tr.is-strong td:first-child::before {
  position: absolute;
  top: -1px;
  bottom: -1px;
  left: -1px;
  width: 3px;
  content: '';
  background: var(--el-color-primary);
}

.cashflow-title-cell {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  min-height: 24px;
}

.cashflow-title-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: var(--el-color-primary);
  background: rgba(64, 158, 255, 0.14);
  border: 1px solid rgba(64, 158, 255, 0.28);
  border-radius: 6px;
}

.cashflow-title-text {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  letter-spacing: 0.2px;
}

.indent-1 {
  padding-left: 28px;
}

.indent-2 {
  padding-left: 40px;
}

.negative {
  color: var(--el-text-color-primary);
}

.standard-detail-card {
  flex: 0 0 auto;
  padding: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.standard-detail-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-weight: 600;
}

@media (max-width: 960px) {
  .finance-filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .finance-filter-compact,
  .finance-filter-compact__left,
  .finance-filter-actions,
  .finance-filter-buttons {
    display: grid;
    grid-template-columns: 1fr;
    justify-items: stretch;
  }

  .finance-filter-compact__actions {
    display: grid;
    grid-template-columns: repeat(4, max-content);
    justify-content: start;
  }

  .finance-filter-grid {
    grid-template-columns: 1fr;
  }

  .finance-filter-buttons {
    justify-content: stretch;
  }

  .finance-filter-summary {
    max-width: none;
  }
}

@media print {
  .finance-filter-toolbar,
  .standard-detail-card {
    display: none !important;
  }

  .finance-report-table-wrap {
    border: 0;
  }

  .finance-report-table-scroll {
    overflow: visible;
  }
}
</style>
