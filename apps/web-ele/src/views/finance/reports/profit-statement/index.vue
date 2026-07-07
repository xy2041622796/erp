<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import { RefreshRight } from '@element-plus/icons-vue';

import {
  fetchProfitStatementReport,
  type ProfitStatementLine,
} from '#/api/erp/finance/reports';
import { useAccountSetStore } from '#/store/account-set';

import { buildProfitStatementPrintHtml } from '#/views/finance/print-templates/profit-statement';
import { exportProfitStatement } from '#/views/finance/reports/components/financial-statement-export';
import ReportPeriodPopover from '#/views/finance/reports/components/report-period-popover.vue';

import { ElButton, ElCheckbox, ElIcon, ElMessage } from 'element-plus';

defineOptions({ name: 'FinanceProfitStatementReport' });

const periodMode = ref<'month' | 'quarter'>('month');
const monthValue = ref(
  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
);
const loading = ref(false);
const exportLoading = ref(false);
const printLoading = ref(false);
const reportLines = ref<ProfitStatementLine[]>([]);
const showLastYear = ref(false);
const printFrameRef = ref<HTMLIFrameElement>();
const accountSetStore = useAccountSetStore();

const companyName = computed(() =>
  String(accountSetStore.currentName || accountSetStore.displayName || '当前账套').trim(),
);

function toMoney(v: any) {
  const n = Number(v ?? 0);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getSectionMarker(label: string) {
  const match = String(label || '')
    .trim()
    .match(/^([一二三四五六七八九十]+)、/);
  return match?.[1] || '';
}

function getSectionTitle(label: string) {
  return String(label || '')
    .trim()
    .replace(/^[一二三四五六七八九十]+、/, '');
}

const periodLabel = computed(() => {
  const [y, m] = monthValue.value.split('-').map(Number);
  if (periodMode.value === 'quarter') {
    const q = Math.floor(((m || 1) - 1) / 3) + 1;
    return `${y}年${q}季度`;
  }
  return `${y}年${m}月`;
});

const currentColumnLabel = computed(() =>
  periodMode.value === 'quarter' ? '本季金额' : '本期金额',
);
const yearColumnLabel = computed(() =>
  showLastYear.value ? '上年累计金额' : '本年累计金额',
);

async function handlePrint() {
  if (reportLines.value.length === 0) {
    ElMessage.warning('当前没有可打印的利润表数据');
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

  const html = buildProfitStatementPrintHtml({
    title: '利润表',
    companyName: companyName.value,
    periodText: periodLabel.value,
    unitText: '元',
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

async function handleExport() {
  if (reportLines.value.length === 0) {
    ElMessage.warning('当前没有可导出的利润表数据');
    return;
  }

  exportLoading.value = true;
  try {
    await exportProfitStatement(
      {
        companyName: companyName.value,
        currentLabel: currentColumnLabel.value,
        fileName: '利润表',
        periodText: periodLabel.value,
        sheetName: '利润表',
        title: '利润表',
        yearLabel: yearColumnLabel.value,
      },
      reportLines.value.map((row) => ({
        label: row.label,
        lineNo: row.lineNo,
        year: Number(row.year || 0),
        current: Number(row.current || 0),
      })),
    );
    ElMessage.success('利润表导出成功');
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '利润表导出失败');
  } finally {
    exportLoading.value = false;
  }
}

async function load() {
  loading.value = true;
  try {
    const report = await fetchProfitStatementReport({
      month: monthValue.value,
      periodMode: periodMode.value,
      showLastYear: showLastYear.value,
    });
    reportLines.value = report.lines || [];
  } catch (e) {
    console.error(e);
    ElMessage.error('加载利润表失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch([monthValue, periodMode, showLastYear], load);
</script>

<template>
  <Page auto-content-height class="finance-report-page h-full">
    <div class="flex h-full flex-col gap-4">
      <div class="finance-toolbar">
        <div class="finance-toolbar-main">
          <ReportPeriodPopover
            v-model="monthValue"
            v-model:period-mode="periodMode"
            :allow-quarter="true"
            :width="360"
          />
        </div>

        <div class="finance-toolbar-actions">
          <ElCheckbox v-model="showLastYear">显示上年累计金额</ElCheckbox>
          <ElButton :loading="printLoading" @click="handlePrint">打印</ElButton>
          <ElButton :loading="exportLoading" @click="handleExport">导出</ElButton>
          <ElButton circle @click="load"
            ><ElIcon><RefreshRight /></ElIcon
          ></ElButton>
        </div>
      </div>

      <div
        class="finance-report-table-wrap finance-single-wrap"
        v-loading="loading"
      >
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
              :key="row.key || index"
              :class="{ 'is-strong': row.isStrong, 'is-title': row.isTitle }"
            >
              <td class="text-left">
                <div
                  v-if="row.isTitle || row.isStrong"
                  class="profit-title-cell"
                >
                  <span
                    v-if="getSectionMarker(row.label)"
                    class="profit-title-badge"
                    >{{ getSectionMarker(row.label) }}</span
                  >
                  <span class="profit-title-text">{{
                    getSectionTitle(row.label)
                  }}</span>
                </div>
                <span v-else>{{ row.label }}</span>
              </td>
              <td class="text-center">{{ row.lineNo }}</td>
              <td
                class="text-right"
                :class="{ negative: Number(row.year || 0) < 0 }"
              >
                {{ toMoney(row.year) }}
              </td>
              <td
                class="text-right"
                :class="{ negative: Number(row.current || 0) < 0 }"
              >
                {{ toMoney(row.current) }}
              </td>
            </tr>
          </tbody>
        </table>
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

.finance-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.finance-toolbar-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.finance-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.finance-report-table-wrap {
  overflow: auto;
  border: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
}

.finance-single-wrap {
  max-width: 1100px;
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

.finance-report-table tbody tr.is-title td,
.finance-report-table tbody tr.is-strong td {
  font-weight: 700;
}

.finance-report-table tbody tr.is-title,
.finance-report-table tbody tr.is-strong {
  position: relative;
  background: linear-gradient(
    90deg,
    rgba(64, 158, 255, 0.12) 0%,
    rgba(64, 158, 255, 0.05) 52%,
    rgba(255, 255, 255, 0.96) 100%
  );
}

.finance-report-table tbody tr.is-title td:first-child,
.finance-report-table tbody tr.is-strong td:first-child {
  position: relative;
  padding-top: 14px;
  padding-bottom: 14px;
}

.finance-report-table tbody tr.is-title td:first-child::before,
.finance-report-table tbody tr.is-strong td:first-child::before {
  position: absolute;
  top: -1px;
  bottom: -1px;
  left: -1px;
  width: 3px;
  content: '';
  background: var(--el-color-primary);
}

.profit-title-cell {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  min-height: 24px;
}

.profit-title-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: var(--el-color-primary);
  background: rgba(64, 158, 255, 0.14);
  border: 1px solid rgba(64, 158, 255, 0.28);
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45);
}

.profit-title-text {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  letter-spacing: 0.2px;
}

.negative {
  color: var(--el-text-color-primary);
}
</style>
