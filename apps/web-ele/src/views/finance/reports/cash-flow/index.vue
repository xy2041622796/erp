<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { RefreshRight } from '@element-plus/icons-vue';

import { fetchCashFlowReport, type CashFlowLine } from '#/api/erp/finance/reports';
import { useAccountSetStore } from '#/store/account-set';

import { buildCashFlowPrintHtml } from '#/views/finance/print-templates/cash-flow';
import ReportPeriodPopover from '#/views/finance/reports/components/report-period-popover.vue';

import { ElButton, ElIcon, ElMessage, ElOption, ElSelect } from 'element-plus';

defineOptions({ name: 'FinanceCashFlowReport' });

const periodMode = ref<'month' | 'quarter'>('month');
const route = useRoute();
const router = useRouter();
if (route.query.periodMode === 'quarter') periodMode.value = 'quarter';
const monthValue = ref(String(route.query.month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`));
const loading = ref(false);
const printLoading = ref(false);
const calculationMethod = ref('公式法');
const reportLines = ref<CashFlowLine[]>([]);
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
const yearColumnLabel = '本年累计金额';

async function handlePrint() {
  if (reportLines.value.length === 0) {
    ElMessage.warning('当前没有可打印的现金流量表数据');
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
    title: '现金流量表',
    companyName: companyName.value,
    periodText: periodLabel.value,
    unitText: '元',
    yearLabel: yearColumnLabel,
    currentLabel: currentColumnLabel.value,
    rows: reportLines.value.map((row) => ({
      label: row.label,
      lineNo: row.lineNo,
      year: row.isSection ? undefined : Number(row.year || 0),
      current: row.isSection ? undefined : Number(row.current || 0),
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
      periodMode: periodMode.value,
      showLastYear: false,
    });
    reportLines.value = report.lines || [];
  } catch (e) {
    console.error(e);
    ElMessage.error('加载现金流量表失败');
  } finally {
    loading.value = false;
  }
}

function openDraft() {
  router.push({
    path: '/finance/reports/cash-flow-draft',
    query: {
      month: monthValue.value,
      periodMode: periodMode.value,
    },
  });
}

onMounted(load);
watch([monthValue, periodMode], load);
</script>

<template>
  <Page auto-content-height class="h-full finance-report-page">
    <div class="flex h-full flex-col gap-4">
      <div class="finance-toolbar">
        <div class="finance-toolbar-main">
          <ReportPeriodPopover
            v-model="monthValue"
            v-model:period-mode="periodMode"
            :allow-quarter="true"
            :width="360"
          />
          <ElSelect v-model="calculationMethod" class="cash-flow-method-select" placeholder="核算方法">
            <ElOption label="公式法" value="公式法" />
          </ElSelect>
        </div>

        <div class="finance-toolbar-actions">
          <ElButton @click="openDraft">查看底稿</ElButton>
          <ElButton :loading="printLoading" @click="handlePrint">打印</ElButton>
          <ElButton>导出</ElButton>
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
              <td class="text-right" :class="{ negative: !row.isSection && Number(row.year || 0) < 0 }">
                {{ row.isSection ? '' : toMoney(row.year) }}
              </td>
              <td class="text-right" :class="{ negative: !row.isSection && Number(row.current || 0) < 0 }">
                {{ row.isSection ? '' : toMoney(row.current) }}
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

.cash-flow-method-select {
  width: 120px;
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
