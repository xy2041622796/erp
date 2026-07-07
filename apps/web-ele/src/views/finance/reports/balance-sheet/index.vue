<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  addMoney,
  moneyNumber,
  moneyText,
  subMoney,
  sumByMoney,
} from '#/utils/finance/decimal-money';

import { ArrowDown, RefreshRight } from '@element-plus/icons-vue';

import {
  fetchBalanceSheetReport,
  type BalanceSheetRow,
} from '#/api/erp/finance/reports';
import { signedBalanceBySubjectType } from '#/api/erp/finance/reports/balance-sheet-calculation';
import { useAccountSetStore } from '#/store/account-set';

import { buildBalanceSheetPrintHtml } from '#/views/finance/print-templates/balance-sheet';
import ReportPeriodPopover from '#/views/finance/reports/components/report-period-popover.vue';
import { exportBalanceSheet } from '#/views/finance/reports/components/financial-statement-export';

import {
  ElButton,
  ElIcon,
  ElMessage,
  ElOption,
  ElPopover,
  ElSelect,
} from 'element-plus';

defineOptions({ name: 'FinanceBalanceSheetReport' });

const monthValue = ref(
  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
);
const loading = ref(false);
const exportLoading = ref(false);
const printLoading = ref(false);
const assetRows = ref<BalanceSheetRow[]>([]);
const liabilityRows = ref<BalanceSheetRow[]>([]);
const equityRows = ref<BalanceSheetRow[]>([]);
const printFrameRef = ref<HTMLIFrameElement>();
const accountSetStore = useAccountSetStore();
const companyName = computed(() =>
  String(accountSetStore.currentName || accountSetStore.displayName || '当前账套').trim(),
);
const periodPopoverVisible = ref(false);
const draftMonthValue = ref(monthValue.value);

function toMoney(v: any) {
  const n = moneyNumber(v);
  if (!n) return '';
  return moneyText(n);
}

function sumLineRows(rows: any[]) {
  return {
    beginning: moneyNumber(sumByMoney(rows, (row) => row.beginning)),
    ending: moneyNumber(sumByMoney(rows, (row) => row.ending)),
  };
}

function addLineAmounts(...rows: Array<{ beginning?: any; ending?: any }>) {
  return {
    beginning: moneyNumber(addMoney(rows.map((row) => row.beginning))),
    ending: moneyNumber(addMoney(rows.map((row) => row.ending))),
  };
}

function subLineAmounts(
  left: { beginning?: any; ending?: any },
  right: { beginning?: any; ending?: any },
) {
  return {
    beginning: moneyNumber(subMoney(left.beginning, right.beginning)),
    ending: moneyNumber(subMoney(left.ending, right.ending)),
  };
}

function updateMonthByYearMonth(year: string | number, month: string | number) {
  return `${Number(year)}-${String(Number(month)).padStart(2, '0')}`;
}

const periodLabel = computed(() => {
  const [y, m] = monthValue.value.split('-').map(Number);
  return `${y}年${m}月`;
});

const draftPeriodLabel = computed(() => {
  const [y, m] = draftMonthValue.value.split('-').map(Number);
  return `${y}年${m}月`;
});

const draftMonthYear = computed({
  get: () =>
    String(
      Number(draftMonthValue.value.split('-')[0]) || new Date().getFullYear(),
    ),
  set: (value: string | number) => {
    const month = Number(draftMonthNumber.value);
    draftMonthValue.value = updateMonthByYearMonth(value, month || 1);
  },
});

const draftMonthNumber = computed({
  get: () => String(Number(draftMonthValue.value.split('-')[1]) || 1),
  set: (value: string | number) => {
    const year = Number(draftMonthYear.value);
    draftMonthValue.value = updateMonthByYearMonth(year, value || 1);
  },
});

const yearOptions = computed(() => {
  const currentYear =
    Number(monthValue.value.split('-')[0]) || new Date().getFullYear();
  return Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);
});

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  label: `${index + 1}月`,
  value: String(index + 1),
}));

function getSignedAmountByCategory(row: BalanceSheetRow) {
  const amount = moneyNumber(row.endingBalance);
  const beginning = moneyNumber(row.beginningBalance);
  const beginningDirection = String(
    row.beginningBalanceDirection || row.balanceDirection || '',
  ).trim();
  const endingDirection = String(row.balanceDirection || '').trim();
  return {
    beginning: signedBalanceBySubjectType(
      beginning,
      beginningDirection as '借' | '贷',
      Number(row.subjectType || 0),
    ),
    ending: signedBalanceBySubjectType(
      amount,
      endingDirection as '借' | '贷',
      Number(row.subjectType || 0),
    ),
  };
}

function pickByCodePrefixes(rows: BalanceSheetRow[], prefixes: string[]) {
  return rows
    .filter((row) =>
      prefixes.some((prefix) => row.subjectCode.startsWith(prefix)),
    )
    .reduce(
      (acc, row) => {
        const signed = getSignedAmountByCategory(row);
        return {
          beginning: moneyNumber(addMoney([acc.beginning, signed.beginning])),
          ending: moneyNumber(addMoney([acc.ending, signed.ending])),
        };
      },
      { beginning: 0, ending: 0 },
    );
}

function pickAbsoluteByCodePrefixes(
  rows: BalanceSheetRow[],
  prefixes: string[],
) {
  return rows
    .filter((row) =>
      prefixes.some((prefix) => row.subjectCode.startsWith(prefix)),
    )
    .reduce(
      (acc, row) => ({
        beginning: moneyNumber(addMoney([acc.beginning, row.beginningBalance])),
        ending: moneyNumber(addMoney([acc.ending, row.endingBalance])),
      }),
      { beginning: 0, ending: 0 },
    );
}

function syncDraftFromCurrent() {
  draftMonthValue.value = monthValue.value;
}

function handlePopoverShow() {
  syncDraftFromCurrent();
}

function applyPeriod() {
  monthValue.value = draftMonthValue.value;
  periodPopoverVisible.value = false;
}

function resetPeriod() {
  const now = new Date();
  draftMonthValue.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const assetLines = computed(() => {
  const list = assetRows.value;
  const rows = [
    { label: '流动资产', lineNo: '', isSection: true },
    {
      label: '货币资金',
      lineNo: 1,
      ...pickByCodePrefixes(list, ['1001', '1002', '1012']),
    },
    { label: '短期投资', lineNo: 2, ...pickByCodePrefixes(list, ['1101']) },
    { label: '应收票据', lineNo: 3, ...pickByCodePrefixes(list, ['1121']) },
    { label: '应收账款', lineNo: 4, ...pickByCodePrefixes(list, ['1122']) },
    { label: '预付账款', lineNo: 5, ...pickByCodePrefixes(list, ['1123']) },
    { label: '应收股利', lineNo: 6, ...pickByCodePrefixes(list, ['1131']) },
    { label: '应收利息', lineNo: 7, ...pickByCodePrefixes(list, ['1132']) },
    { label: '其他应收款', lineNo: 8, ...pickByCodePrefixes(list, ['1221']) },
    {
      label: '存货',
      lineNo: 9,
      ...pickByCodePrefixes(list, [
        '1401',
        '1402',
        '1403',
        '1404',
        '1405',
        '1407',
        '1408',
        '1411',
        '1421',
      ]),
    },
    {
      label: '其他流动资产',
      lineNo: 14,
      ...pickByCodePrefixes(list, ['1901']),
    },
  ] as Array<any>;

  const currentAsset = sumLineRows(rows.filter((row) => !row.isSection));
  rows.push({
    label: '流动资产合计',
    lineNo: 15,
    isTotal: true,
    ...currentAsset,
  });
  rows.push({ label: '非流动资产', lineNo: '', isSection: true });

  const fixedAssetOriginal = pickAbsoluteByCodePrefixes(list, ['1601']);
  const accumulatedDepreciation = pickAbsoluteByCodePrefixes(list, ['1602']);
  const fixedAssetBook = {
    ...subLineAmounts(fixedAssetOriginal, accumulatedDepreciation),
  };

  const nonCurrentRows = [
    {
      label: '长期债券投资',
      lineNo: 16,
      ...pickByCodePrefixes(list, ['1501']),
    },
    {
      label: '长期股权投资',
      lineNo: 17,
      ...pickByCodePrefixes(list, ['1511']),
    },
    { label: '固定资产 原价', lineNo: 18, ...fixedAssetOriginal },
    { label: '减：累计折旧', lineNo: 19, ...accumulatedDepreciation },
    { label: '固定资产账面价值', lineNo: 20, ...fixedAssetBook },
    { label: '在建工程', lineNo: 21, ...pickByCodePrefixes(list, ['1604']) },
    { label: '工程物资', lineNo: 22, ...pickByCodePrefixes(list, ['1605']) },
    { label: '无形资产', lineNo: 23, ...pickByCodePrefixes(list, ['1701']) },
    {
      label: '长期待摊费用',
      lineNo: 24,
      ...pickByCodePrefixes(list, ['1801']),
    },
    {
      label: '其他非流动资产',
      lineNo: 25,
      ...pickByCodePrefixes(list, ['1606', '1621', '1622', '1702']),
    },
  ];
  rows.push(...nonCurrentRows);
  const nonCurrentTotalRows = nonCurrentRows.filter(
    (row) => !['固定资产 原价', '减：累计折旧'].includes(row.label),
  );
  const nonCurrentTotal = sumLineRows(nonCurrentTotalRows);
  rows.push({
    label: '非流动资产合计',
    lineNo: 26,
    isTotal: true,
    ...nonCurrentTotal,
  });
  rows.push({
    label: '资产总计',
    lineNo: 30,
    isGrandTotal: true,
    ...addLineAmounts(currentAsset, nonCurrentTotal),
  });
  return rows;
});

const rightsLines = computed(() => {
  const liabilityList = liabilityRows.value;
  const equityList = equityRows.value;
  const rows = [
    { label: '流动负债', lineNo: '', isSection: true },
    {
      label: '短期借款',
      lineNo: 31,
      ...pickByCodePrefixes(liabilityList, ['2001']),
    },
    {
      label: '应付票据',
      lineNo: 32,
      ...pickByCodePrefixes(liabilityList, ['2201']),
    },
    {
      label: '应付账款',
      lineNo: 33,
      ...pickByCodePrefixes(liabilityList, ['2202']),
    },
    {
      label: '预收账款',
      lineNo: 34,
      ...pickByCodePrefixes(liabilityList, ['2203']),
    },
    {
      label: '应付职工薪酬',
      lineNo: 35,
      ...pickByCodePrefixes(liabilityList, ['2211']),
    },
    {
      label: '应交税费',
      lineNo: 36,
      ...pickByCodePrefixes(liabilityList, ['2221']),
    },
    {
      label: '应付利息',
      lineNo: 37,
      ...pickByCodePrefixes(liabilityList, ['2231']),
    },
    {
      label: '应付利润',
      lineNo: 38,
      ...pickByCodePrefixes(liabilityList, ['2232']),
    },
    {
      label: '其他应付款',
      lineNo: 39,
      ...pickByCodePrefixes(liabilityList, ['2241']),
    },
    {
      label: '其他流动负债',
      lineNo: 40,
      ...pickByCodePrefixes(liabilityList, []),
    },
  ] as Array<any>;
  const currentLiability = sumLineRows(rows.filter((row) => !row.isSection));
  rows.push({
    label: '流动负债合计',
    lineNo: 41,
    isTotal: true,
    ...currentLiability,
  });
  rows.push({ label: '非流动负债', lineNo: '', isSection: true });
  const nonCurrentLiabilityRows = [
    {
      label: '长期借款',
      lineNo: 42,
      ...pickByCodePrefixes(liabilityList, ['2501']),
    },
    {
      label: '长期应付款',
      lineNo: 43,
      ...pickByCodePrefixes(liabilityList, ['2701']),
    },
    {
      label: '递延收益',
      lineNo: 44,
      ...pickByCodePrefixes(liabilityList, ['2401']),
    },
    {
      label: '其他非流动负债',
      lineNo: 45,
      ...pickByCodePrefixes(liabilityList, []),
    },
  ];
  rows.push(...nonCurrentLiabilityRows);
  const nonCurrentLiability = sumLineRows(nonCurrentLiabilityRows);
  rows.push({
    label: '非流动负债合计',
    lineNo: 46,
    isTotal: true,
    ...nonCurrentLiability,
  });
  rows.push({
    label: '负债合计',
    lineNo: 47,
    isGrandTotal: true,
    ...addLineAmounts(currentLiability, nonCurrentLiability),
  });
  rows.push({ label: '所有者权益', lineNo: '', isSection: true });
  const equityStdRows = [
    {
      label: '实收资本',
      lineNo: 48,
      ...pickByCodePrefixes(equityList, ['3001']),
    },
    {
      label: '资本公积',
      lineNo: 49,
      ...pickByCodePrefixes(equityList, ['3002']),
    },
    {
      label: '盈余公积',
      lineNo: 50,
      ...pickByCodePrefixes(equityList, ['3101']),
    },
    {
      label: '未分配利润',
      lineNo: 51,
      ...pickByCodePrefixes(equityList, ['3103', '3104006']),
    },
  ];
  rows.push(...equityStdRows);
  const equityTotal = sumLineRows(equityStdRows);
  rows.push({
    label: '所有者权益合计',
    lineNo: 52,
    isTotal: true,
    ...equityTotal,
  });
  rows.push({
    label: '负债和所有者权益总计',
    lineNo: 53,
    isGrandTotal: true,
    ...addLineAmounts(currentLiability, nonCurrentLiability, equityTotal),
  });
  return rows;
});

const blankReportLine = { label: '', lineNo: '', beginning: 0, ending: 0 };

const mergedLines = computed(() => {
  const left = [...assetLines.value];
  const right = [...rightsLines.value];
  const leftGrandTotal = left.find((row) => row.label === '资产总计');
  const rightGrandTotal = right.find(
    (row) => row.label === '负债和所有者权益总计',
  );
  const leftBody = left.filter((row) => row.label !== '资产总计');
  const rightBody = right.filter((row) => row.label !== '负债和所有者权益总计');
  const len = Math.max(leftBody.length, rightBody.length);
  const rows = Array.from({ length: len }).map((_, index) => ({
    left: leftBody[index] || blankReportLine,
    right: rightBody[index] || blankReportLine,
  }));

  if (leftGrandTotal || rightGrandTotal) {
    rows.push({
      left: leftGrandTotal || blankReportLine,
      right: rightGrandTotal || blankReportLine,
    });
  }

  return rows;
});

async function handlePrint() {
  if (mergedLines.value.length === 0) {
    ElMessage.warning('当前没有可打印的资产负债表数据');
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
  const html = buildBalanceSheetPrintHtml({
    title: '资产负债表',
    companyName: companyName.value,
    periodText: monthValue.value,
    unitText: '元',
    rows: mergedLines.value.map((row) => ({
      leftLabel: row.left.label,
      leftLineNo: row.left.lineNo,
      leftEnding: row.left.ending,
      leftBeginning: row.left.beginning,
      rightLabel: row.right.label,
      rightLineNo: row.right.lineNo,
      rightEnding: row.right.ending,
      rightBeginning: row.right.beginning,
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
  if (mergedLines.value.length === 0) {
    ElMessage.warning('当前没有可导出的资产负债表数据');
    return;
  }

  exportLoading.value = true;
  try {
    await exportBalanceSheet(
      {
        companyName: companyName.value,
        fileName: '资产负债表',
        periodText: periodLabel.value,
        sheetName: '资产负债表',
        title: '资产负债表',
      },
      mergedLines.value.map((row) => ({
        leftLabel: row.left.label,
        leftLineNo: row.left.lineNo,
        leftEnding: row.left.ending,
        leftBeginning: row.left.beginning,
        rightLabel: row.right.label,
        rightLineNo: row.right.lineNo,
        rightEnding: row.right.ending,
        rightBeginning: row.right.beginning,
      })),
    );
    ElMessage.success('资产负债表导出成功');
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '资产负债表导出失败');
  } finally {
    exportLoading.value = false;
  }
}

async function load() {
  loading.value = true;
  try {
    const report = await fetchBalanceSheetReport({ month: monthValue.value });
    assetRows.value = report.assetRows;
    liabilityRows.value = report.liabilityRows;
    equityRows.value = report.equityRows;
  } catch (e) {
    console.error(e);
    ElMessage.error('加载资产负债表失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(monthValue, load);
</script>

<template>
  <Page auto-content-height class="finance-report-page h-full">
    <div class="flex h-full flex-col gap-4">
      <div class="finance-toolbar">
        <div class="finance-toolbar-main">
          <ReportPeriodPopover v-model="monthValue" :width="320" />
        </div>

        <div class="finance-toolbar-actions">
          <ElButton :loading="printLoading" @click="handlePrint">打印</ElButton>
          <ElButton :loading="exportLoading" @click="handleExport">导出</ElButton>
          <ElButton circle @click="load">
            <ElIcon>
              <RefreshRight />
            </ElIcon>
          </ElButton>
        </div>
      </div>
      <div class="finance-report-table-wrap" v-loading="loading">
        <table class="finance-report-table">
          <thead>
            <tr>
              <th>资产</th>
              <th class="w-line">行次</th>
              <th class="w-amount">期末余额</th>
              <th class="w-amount">年初余额</th>
              <th>负债和所有者权益</th>
              <th class="w-line">行次</th>
              <th class="w-amount">期末余额</th>
              <th class="w-amount">年初余额</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in mergedLines"
              :key="index"
              :class="{
                'is-section': row.left.isSection || row.right.isSection,
                'is-total': row.left.isTotal || row.right.isTotal,
                'is-grand-total':
                  row.left.isGrandTotal || row.right.isGrandTotal,
              }"
            >
              <td class="text-left">{{ row.left.label }}</td>
              <td class="text-center">{{ row.left.lineNo }}</td>
              <td class="text-right">{{ toMoney(row.left.ending) }}</td>
              <td class="text-right">{{ toMoney(row.left.beginning) }}</td>
              <td class="text-left">{{ row.right.label }}</td>
              <td class="text-center">{{ row.right.lineNo }}</td>
              <td class="text-right">{{ toMoney(row.right.ending) }}</td>
              <td class="text-right">{{ toMoney(row.right.beginning) }}</td>
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

.finance-report-page :deep(.el-loading-mask) {
  border-radius: 4px;
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

.finance-period-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--el-color-primary);
  border-radius: 4px;
  background: var(--el-color-primary);
  color: var(--el-color-white);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.finance-period-trigger:hover {
  background: var(--el-color-primary-light-3);
  border-color: var(--el-color-primary-light-3);
}

.finance-period-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.finance-period-panel-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.finance-period-panel-label {
  width: 72px;
  flex-shrink: 0;
  color: var(--el-text-color-regular);
}

.finance-month-inline {
  display: flex;
  align-items: center;
  gap: 10px;
}

.finance-month-year {
  width: 120px;
}

.finance-month-number {
  width: 92px;
}

.finance-period-panel-preview {
  padding: 10px 12px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.finance-period-panel-actions {
  display: flex;
  align-items: center;
  gap: 10px;
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

.finance-report-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.finance-report-table th,
.finance-report-table td {
  border: 1px solid var(--el-border-color-light);
  padding: 8px 10px;
  vertical-align: middle;
}

.finance-report-table thead th {
  background: var(--el-fill-color-light);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.finance-report-table .w-line {
  width: 60px;
  white-space: nowrap;
}

.finance-report-table .w-amount {
  width: 130px;
}

.finance-report-table .text-left {
  text-align: left;
}

.finance-report-table .text-center {
  text-align: center;
}

.finance-report-table .text-right {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.finance-report-table tbody tr.is-section td {
  background: var(--el-fill-color-lighter);
  font-weight: 700;
}

.finance-report-table tbody tr.is-total td {
  background: var(--el-fill-color-blank);
  color: var(--el-color-primary);
}

.finance-report-table tbody tr.is-grand-total td {
  font-weight: 700;
}
</style>
