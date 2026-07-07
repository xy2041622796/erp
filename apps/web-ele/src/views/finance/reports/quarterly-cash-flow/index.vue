<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import { ArrowDown, RefreshRight } from '@element-plus/icons-vue';

import { fetchCashFlowReport, type CashFlowLine } from '#/api/erp/finance/reports';
import { useAccountSetStore } from '#/store/account-set';
import { buildCashFlowPrintHtml } from '#/views/finance/print-templates/cash-flow';

import {
  ElButton,
  ElIcon,
  ElMessage,
  ElPopover,
} from 'element-plus';

defineOptions({ name: 'FinanceQuarterlyCashFlowReport' });

type CashFlowQuarterLine = CashFlowLine & { quarterAmounts?: number[] };

const monthValue = ref(normalizeQuarterMonth(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`));
const loading = ref(false);
const printLoading = ref(false);
const pickerVisible = ref(false);
const reportLines = ref<CashFlowQuarterLine[]>([]);
const printFrameRef = ref<HTMLIFrameElement>();
const accountSetStore = useAccountSetStore();
const currentYear = new Date().getFullYear();
const companyName = computed(() =>
  String(accountSetStore.currentName || accountSetStore.displayName || '当前账套').trim(),
);

function normalizeQuarterMonth(monthValue: string) {
  const [yearText, monthText] = String(monthValue || '').split('-');
  const year = Number(yearText || 0) || new Date().getFullYear();
  const month = Number(monthText || 1) || 1;
  const startMonth = Math.floor((month - 1) / 3) * 3 + 1;
  return `${year}-${String(startMonth).padStart(2, '0')}`;
}

function toMoney(v: any) {
  const n = Number(v ?? 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getSectionMarker(label: string) {
  const match = String(label || '').trim().match(/^([一二三四五六七八九十]+)、/);
  return match?.[1] || '';
}

function getSectionTitle(label: string) {
  return String(label || '').trim().replace(/^[一二三四五六七八九十]+、/, '');
}

const quarterInfo = computed(() => {
  const [yearText, monthText] = monthValue.value.split('-');
  const year = Number(yearText || 0) || new Date().getFullYear();
  const startMonth = Number(monthText || 1) || 1;
  const quarter = Math.floor((startMonth - 1) / 3) + 1;
  return {
    year,
    quarter,
    startMonth,
    endMonth: startMonth + 2,
    label: `${year}年${quarter}季度`,
    rangeLabel: `${startMonth}-${startMonth + 2}月`,
  };
});

const yearColumnLabel = '本年累计金额';

const openingPeriod = computed(() => {
  const startDate = accountSetStore.currentStartDate;
  if (!startDate) return { year: currentYear, quarter: Math.floor(new Date().getMonth() / 3) + 1 };

  const text = String(startDate);
  const year = Number(text.match(/\d{4}/)?.[0] || 0) || currentYear;
  const monthMatch = text.match(/\d{4}[-/]?(\d{1,2})/) || text.match(/[年-](\d{1,2})月?/);
  const month = Number(monthMatch?.[1] || 1) || 1;
  return {
    year,
    quarter: Math.floor((Math.min(Math.max(month, 1), 12) - 1) / 3) + 1,
  };
});

const openingYear = computed(() => openingPeriod.value.year);
const openingQuarter = computed(() => openingPeriod.value.quarter);

const pickerYears = computed(() => {
  const startYear = Math.min(openingYear.value, currentYear);
  const endYear = Math.max(currentYear, quarterInfo.value.year);
  const years = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
  return years.sort((a, b) => b - a);
});
const activePickerYear = ref(currentYear);
const hasSyncedOpeningPeriod = ref(false);

const availableQuarters = computed(() => {
  const year = activePickerYear.value;
  const startQuarter = year === openingYear.value ? openingQuarter.value : 1;
  return [1, 2, 3, 4].filter((quarter) => quarter >= startQuarter);
});

function normalizeToOpeningPeriod(value: string) {
  const normalized = normalizeQuarterMonth(value);
  const [yearText, monthText] = normalized.split('-');
  const year = Number(yearText || 0) || currentYear;
  const quarter = Math.floor(((Number(monthText) || 1) - 1) / 3) + 1;
  if (year < openingYear.value || (year === openingYear.value && quarter < openingQuarter.value)) {
    return buildQuarterValue(openingYear.value, openingQuarter.value);
  }
  return normalized;
}

function handleMonthChange(value: string) {
  if (!value) return;
  monthValue.value = normalizeToOpeningPeriod(value);
}

function buildQuarterValue(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3 + 1;
  return `${year}-${String(startMonth).padStart(2, '0')}`;
}

function selectQuarter(year: number, quarter: number) {
  handleMonthChange(buildQuarterValue(year, quarter));
  activePickerYear.value = year;
  pickerVisible.value = false;
}

async function handlePrint() {
  if (reportLines.value.length === 0) {
    ElMessage.warning('当前没有可打印的现金流量表季报数据');
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
    title: '现金流量表季报',
    companyName: companyName.value,
    periodText: `${quarterInfo.value.label}（${quarterInfo.value.rangeLabel}）`,
    unitText: '元',
    yearLabel: yearColumnLabel,
    currentLabel: '本季金额',
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

async function load() {
  loading.value = true;
  try {
    const report = await fetchCashFlowReport({
      month: monthValue.value,
      periodMode: 'quarter',
      showLastYear: false,
      fillEmptyQuarterWithYear: false,
    });
    const lines: CashFlowQuarterLine[] = report.lines || [];
    reportLines.value = lines;
  } catch (e) {
    console.error(e);
    ElMessage.error('加载现金流量表季报失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(monthValue, load);
watch(pickerVisible, (visible) => {
  if (visible) activePickerYear.value = quarterInfo.value.year;
});
watch(openingPeriod, () => {
  if (!hasSyncedOpeningPeriod.value) {
    monthValue.value = buildQuarterValue(openingYear.value, openingQuarter.value);
    activePickerYear.value = openingYear.value;
    hasSyncedOpeningPeriod.value = true;
    return;
  }
  monthValue.value = normalizeToOpeningPeriod(monthValue.value);
}, { immediate: true });
</script>

<template>
  <Page auto-content-height class="h-full quarterly-cash-flow-page">
    <div class="flex h-full flex-col gap-4">
      <div class="finance-report-header">
        <div class="finance-toolbar-actions">
          <ElPopover
            v-model:visible="pickerVisible"
            trigger="click"
            placement="bottom-start"
            :width="360"
            :teleported="false"
          >
            <template #reference>
              <button type="button" class="quarter-trigger">
                <span>{{ quarterInfo.year }}年第{{ quarterInfo.quarter }}季度</span>
                <ElIcon><ArrowDown /></ElIcon>
              </button>
            </template>

            <div class="quarter-picker">
              <div class="quarter-picker-years">
                <button
                  v-for="year in pickerYears"
                  :key="year"
                  type="button"
                  class="quarter-picker-year"
                  :class="{ active: year === activePickerYear }"
                  @click="activePickerYear = year"
                >
                  {{ year }}年
                </button>
              </div>
              <div class="quarter-picker-quarters">
                <button
                  v-for="quarter in availableQuarters"
                  :key="quarter"
                  type="button"
                  class="quarter-picker-quarter"
                  :class="{ active: activePickerYear === quarterInfo.year && quarter === quarterInfo.quarter }"
                  @click="selectQuarter(activePickerYear, quarter)"
                >
                  第{{ quarter }}季度
                </button>
              </div>
            </div>
          </ElPopover>
          <ElButton :loading="printLoading" @click="handlePrint">打印</ElButton>
          <ElButton disabled>导出</ElButton>
          <ElButton circle @click="load"><ElIcon><RefreshRight /></ElIcon></ElButton>
        </div>
      </div>

      <div class="finance-report-table-wrap finance-single-wrap" v-loading="loading">
        <table class="finance-report-table finance-single-table">
          <thead>
            <tr>
              <th>项目</th>
              <th class="w-line">行次</th>
              <th class="w-amount">{{ yearColumnLabel }}</th>
              <th class="w-amount">本季金额</th>
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

.finance-report-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.finance-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.quarter-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 220px;
  height: 32px;
  padding: 0 12px;
  color: var(--el-text-color-primary);
  cursor: pointer;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.quarter-trigger:hover {
  border-color: var(--el-color-primary);
}

.quarter-picker {
  display: grid;
  grid-template-columns: 104px 1fr;
  min-height: 184px;
}

.quarter-picker-years {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 10px;
  border-right: 1px solid var(--el-border-color-light);
}

.quarter-picker-year,
.quarter-picker-quarter {
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--el-text-color-regular);
  cursor: pointer;
  text-align: left;
}

.quarter-picker-year {
  height: 30px;
  padding: 0 10px;
}

.quarter-picker-year:hover,
.quarter-picker-year.active,
.quarter-picker-quarter:hover,
.quarter-picker-quarter.active {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.quarter-picker-quarters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  align-content: start;
  padding-left: 12px;
}

.quarter-picker-quarter {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 52px;
  padding: 8px 10px;
  font-weight: 600;
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

.finance-report-table .w-quarter {
  width: 150px;
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
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45);
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
</style>
