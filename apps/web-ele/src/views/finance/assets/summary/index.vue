<script lang="ts" setup>
import type { AssetRecord } from '#/api/erp/finance/assets/manage';
import type { AssetDepreciationRecord } from '#/api/erp/finance/assets/summary';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { addMoney, moneyNumber, moneyText as formatMoneyText, subMoney, sumByMoney } from '#/utils/finance/decimal-money';
import { downloadFileFromBlobPart } from '@vben/utils';

import {
  ElButton,
  ElDatePicker,
  ElInput,
  ElMessage,
  ElOption,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
} from 'element-plus';
import ExcelJS from 'exceljs';

import { fetchAssetList } from '#/api/erp/finance/assets/manage';
import { fetchAssetDepreciationList } from '#/api/erp/finance/assets/summary';

defineOptions({ name: 'FinanceAssetSummary' });

type SummaryMode = 'asset' | 'department';

type AssetSummaryRow = {
  accumulatedDepreciationCurrentDecrease: number;
  accumulatedDepreciationCurrentIncrease: number;
  accumulatedDepreciationEnding: number;
  accumulatedDepreciationOpening: number;
  impairmentCurrentDecrease: number;
  impairmentCurrentIncrease: number;
  impairmentEnding: number;
  impairmentOpening: number;
  isTotal?: boolean;
  key: string;
  originalCurrentDecrease: number;
  originalCurrentIncrease: number;
  originalEnding: number;
  originalOpening: number;
  summaryName: string;
};

type AssetComputedAmount = Omit<
  AssetSummaryRow,
  'isTotal' | 'key' | 'summaryName'
>;

type AmountField = keyof AssetComputedAmount;

const amountGroups = [
  {
    label: '资产原值',
    fields: [
      { label: '期初数', prop: 'originalOpening' },
      { label: '本期增加', prop: 'originalCurrentIncrease' },
      { label: '本期减少', prop: 'originalCurrentDecrease' },
      { label: '期末数', prop: 'originalEnding' },
    ],
  },
  {
    label: '累计折旧',
    fields: [
      { label: '期初数', prop: 'accumulatedDepreciationOpening' },
      { label: '本期增加', prop: 'accumulatedDepreciationCurrentIncrease' },
      { label: '本期减少', prop: 'accumulatedDepreciationCurrentDecrease' },
      { label: '期末数', prop: 'accumulatedDepreciationEnding' },
    ],
  },
  {
    label: '减值准备',
    fields: [
      { label: '期初数', prop: 'impairmentOpening' },
      { label: '本期增加', prop: 'impairmentCurrentIncrease' },
      { label: '本期减少', prop: 'impairmentCurrentDecrease' },
      { label: '期末数', prop: 'impairmentEnding' },
    ],
  },
] satisfies Array<{
  fields: Array<{ label: string; prop: AmountField }>;
  label: string;
}>;

const loading = ref(false);
const exportLoading = ref(false);
const assets = ref<AssetRecord[]>([]);
const depreciations = ref<AssetDepreciationRecord[]>([]);
const summaryMode = ref<SummaryMode>('department');
const query = reactive({
  assetStatus: '' as '' | number,
  keyword: '',
  periodRange: [getCurrentMonth(), getCurrentMonth()] as [string, string],
});

const firstColumnLabel = computed(() =>
  summaryMode.value === 'department' ? '部门名称' : '资产名称',
);

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeMonth(value: unknown) {
  return String(value ?? '')
    .trim()
    .slice(0, 7);
}

function getPeriodStart() {
  const [start, end] = query.periodRange || [];
  if (start && end && start > end) return end;
  return start || end || getCurrentMonth();
}

function getPeriodEnd() {
  const [start, end] = query.periodRange || [];
  if (start && end && start > end) return start;
  return end || start || getCurrentMonth();
}

function isMonthBefore(month: string, target: string) {
  return !!month && !!target && month < target;
}

function isMonthInRange(month: string, start: string, end: string) {
  return !!month && !!start && !!end && month >= start && month <= end;
}

function toAmount(value: unknown) {
  return moneyNumber(value as any);
}

function formatMoney(value: unknown) {
  const amount = toAmount(value);
  if (Math.abs(amount) < 0.005) return '0.0';
  return formatMoneyText(amount);
}

function cloneAndSort<T>(items: T[], compareFn: (a: T, b: T) => number) {
  const cloned = [...items];
  // eslint-disable-next-line unicorn/no-array-sort -- keep runtime compatibility with browsers missing Array#toSorted
  return cloned.sort(compareFn);
}

function getAssetMonth(asset: AssetRecord) {
  return (
    normalizeMonth(asset.entry_period) ||
    normalizeMonth(asset.purchase_date) ||
    normalizeMonth(asset.begin_date)
  );
}

function getAssetId(asset: AssetRecord) {
  return String(asset.id || asset.rowid || '').trim();
}

function getDepreciationAssetId(row: AssetDepreciationRecord) {
  return String(row.asset_id || '').trim();
}

function getGroupName(asset: AssetRecord) {
  if (summaryMode.value === 'asset') {
    return String(asset.asset_name || asset.asset_code || '未维护资产').trim();
  }
  return String(asset.using_department || '未维护部门').trim();
}

function createEmptyAmount(): AssetComputedAmount {
  return {
    accumulatedDepreciationCurrentDecrease: 0,
    accumulatedDepreciationCurrentIncrease: 0,
    accumulatedDepreciationEnding: 0,
    accumulatedDepreciationOpening: 0,
    impairmentCurrentDecrease: 0,
    impairmentCurrentIncrease: 0,
    impairmentEnding: 0,
    impairmentOpening: 0,
    originalCurrentDecrease: 0,
    originalCurrentIncrease: 0,
    originalEnding: 0,
    originalOpening: 0,
  };
}

function addAmount(target: AssetComputedAmount, source: AssetComputedAmount) {
  target.originalOpening = moneyNumber(addMoney([target.originalOpening, source.originalOpening]));
  target.originalCurrentIncrease = moneyNumber(addMoney([target.originalCurrentIncrease, source.originalCurrentIncrease]));
  target.originalCurrentDecrease = moneyNumber(addMoney([target.originalCurrentDecrease, source.originalCurrentDecrease]));
  target.originalEnding = moneyNumber(addMoney([target.originalEnding, source.originalEnding]));
  target.accumulatedDepreciationOpening = moneyNumber(addMoney([target.accumulatedDepreciationOpening, source.accumulatedDepreciationOpening]));
  target.accumulatedDepreciationCurrentIncrease = moneyNumber(addMoney([target.accumulatedDepreciationCurrentIncrease, source.accumulatedDepreciationCurrentIncrease]));
  target.accumulatedDepreciationCurrentDecrease = moneyNumber(addMoney([target.accumulatedDepreciationCurrentDecrease, source.accumulatedDepreciationCurrentDecrease]));
  target.accumulatedDepreciationEnding = moneyNumber(addMoney([target.accumulatedDepreciationEnding, source.accumulatedDepreciationEnding]));
  target.impairmentOpening = moneyNumber(addMoney([target.impairmentOpening, source.impairmentOpening]));
  target.impairmentCurrentIncrease = moneyNumber(addMoney([target.impairmentCurrentIncrease, source.impairmentCurrentIncrease]));
  target.impairmentCurrentDecrease = moneyNumber(addMoney([target.impairmentCurrentDecrease, source.impairmentCurrentDecrease]));
  target.impairmentEnding = moneyNumber(addMoney([target.impairmentEnding, source.impairmentEnding]));
}

function getAssetDepreciationRows(asset: AssetRecord) {
  const assetId = getAssetId(asset);
  const assetCode = String(asset.asset_code || '').trim();
  return depreciations.value.filter((item) => {
    const rowAssetId = getDepreciationAssetId(item);
    if (assetId && rowAssetId && rowAssetId === assetId) return true;
    return assetCode && String(item.asset_code || '').trim() === assetCode;
  });
}

function computeAssetAmount(asset: AssetRecord): AssetComputedAmount {
  const start = getPeriodStart();
  const end = getPeriodEnd();
  const assetMonth = getAssetMonth(asset);
  const originalValue = toAmount(asset.purchase_price);
  const amount = createEmptyAmount();

  if (isMonthBefore(assetMonth, start) || !assetMonth) {
    amount.originalOpening = originalValue;
  } else if (isMonthInRange(assetMonth, start, end)) {
    amount.originalCurrentIncrease = originalValue;
  }
  amount.originalEnding = moneyNumber(
    subMoney(
      addMoney([amount.originalOpening, amount.originalCurrentIncrease], 'round', 6),
      amount.originalCurrentDecrease,
    ),
  );

  const assetDepreciations = cloneAndSort(
    getAssetDepreciationRows(asset),
    (a, b) =>
      normalizeMonth(a.depreciation_period).localeCompare(
        normalizeMonth(b.depreciation_period),
      ),
  );
  const beforeRows = assetDepreciations.filter((item) =>
    isMonthBefore(normalizeMonth(item.depreciation_period), start),
  );
  const currentRows = assetDepreciations.filter((item) =>
    isMonthInRange(normalizeMonth(item.depreciation_period), start, end),
  );
  const latestBefore = beforeRows.at(-1);
  const latestCurrent = currentRows.at(-1);

  amount.accumulatedDepreciationOpening = latestBefore
    ? toAmount(latestBefore.accumulated_depreciation)
    : toAmount(asset.opening_accumulated_depreciation);

  amount.accumulatedDepreciationCurrentIncrease = moneyNumber(
    sumByMoney(currentRows, (item) => item.current_depreciation),
  );
  amount.accumulatedDepreciationEnding = latestCurrent
    ? toAmount(latestCurrent.accumulated_depreciation)
    : moneyNumber(
        subMoney(
          addMoney([amount.accumulatedDepreciationOpening, amount.accumulatedDepreciationCurrentIncrease], 'round', 6),
          amount.accumulatedDepreciationCurrentDecrease,
        ),
      );

  return amount;
}

const tableData = computed(() => {
  const map = new Map<string, AssetSummaryRow>();
  for (const asset of assets.value) {
    const summaryName = getGroupName(asset);
    const key =
      summaryMode.value === 'asset'
        ? `${summaryMode.value}:${getAssetId(asset) || asset.asset_code || summaryName}`
        : `${summaryMode.value}:${summaryName}`;
    const row =
      map.get(key) ||
      ({
        ...createEmptyAmount(),
        key,
        summaryName,
      } satisfies AssetSummaryRow);

    addAmount(row, computeAssetAmount(asset));
    map.set(key, row);
  }

  const rows = cloneAndSort([...map.values()], (a, b) => {
    if (a.isTotal) return 1;
    if (b.isTotal) return -1;
    return a.summaryName.localeCompare(b.summaryName, 'zh-CN');
  });

  const total: AssetSummaryRow = {
    ...createEmptyAmount(),
    isTotal: true,
    key: 'total',
    summaryName: '合计',
  };
  for (const row of rows) {
    addAmount(total, row);
  }

  return rows.length > 0 ? [...rows, total] : rows;
});

async function reload() {
  loading.value = true;
  try {
    const [assetRows, depreciationRows] = await Promise.all([
      fetchAssetList({
        assetStatus: query.assetStatus,
        keyword: query.keyword,
      }),
      fetchAssetDepreciationList(),
    ]);
    assets.value = assetRows;
    depreciations.value = depreciationRows;
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function setHeaderCellStyle(cell: ExcelJS.Cell) {
  cell.font = { bold: true };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.fill = {
    fgColor: { argb: 'EEF7EE' },
    pattern: 'solid',
    type: 'pattern',
  };
  cell.border = {
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
    top: { style: 'thin' },
  };
}

function setBodyCellStyle(cell: ExcelJS.Cell, align: 'left' | 'right') {
  cell.alignment = { horizontal: align, vertical: 'middle' };
  cell.border = {
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
    top: { style: 'thin' },
  };
  if (align === 'right') cell.numFmt = '#,##0.00';
}

async function exportCurrent() {
  if (tableData.value.length === 0) {
    ElMessage.warning('当前没有可导出的资产汇总数据');
    return;
  }

  exportLoading.value = true;
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('资产汇总表');
    const firstLabel = firstColumnLabel.value;

    worksheet.mergeCells('A1:A2');
    worksheet.mergeCells('B1:E1');
    worksheet.mergeCells('F1:I1');
    worksheet.mergeCells('J1:M1');
    worksheet.getRow(1).values = [
      firstLabel,
      '资产原值',
      '',
      '',
      '',
      '累计折旧',
      '',
      '',
      '',
      '减值准备',
      '',
      '',
      '',
    ];
    worksheet.getRow(2).values = [
      '',
      '期初数',
      '本期增加',
      '本期减少',
      '期末数',
      '期初数',
      '本期增加',
      '本期减少',
      '期末数',
      '期初数',
      '本期增加',
      '本期减少',
      '期末数',
    ];

    worksheet.columns = [
      { key: 'summaryName', width: 24 },
      { key: 'originalOpening', width: 14 },
      { key: 'originalCurrentIncrease', width: 14 },
      { key: 'originalCurrentDecrease', width: 14 },
      { key: 'originalEnding', width: 14 },
      { key: 'accumulatedDepreciationOpening', width: 14 },
      { key: 'accumulatedDepreciationCurrentIncrease', width: 14 },
      { key: 'accumulatedDepreciationCurrentDecrease', width: 14 },
      { key: 'accumulatedDepreciationEnding', width: 14 },
      { key: 'impairmentOpening', width: 14 },
      { key: 'impairmentCurrentIncrease', width: 14 },
      { key: 'impairmentCurrentDecrease', width: 14 },
      { key: 'impairmentEnding', width: 14 },
    ];

    for (let rowIndex = 1; rowIndex <= 2; rowIndex += 1) {
      worksheet.getRow(rowIndex).height = 24;
      worksheet.getRow(rowIndex).eachCell(setHeaderCellStyle);
    }

    for (const item of tableData.value) {
      worksheet.addRow({
        accumulatedDepreciationCurrentDecrease:
          item.accumulatedDepreciationCurrentDecrease,
        accumulatedDepreciationCurrentIncrease:
          item.accumulatedDepreciationCurrentIncrease,
        accumulatedDepreciationEnding: item.accumulatedDepreciationEnding,
        accumulatedDepreciationOpening: item.accumulatedDepreciationOpening,
        impairmentCurrentDecrease: item.impairmentCurrentDecrease,
        impairmentCurrentIncrease: item.impairmentCurrentIncrease,
        impairmentEnding: item.impairmentEnding,
        impairmentOpening: item.impairmentOpening,
        originalCurrentDecrease: item.originalCurrentDecrease,
        originalCurrentIncrease: item.originalCurrentIncrease,
        originalEnding: item.originalEnding,
        originalOpening: item.originalOpening,
        summaryName: item.summaryName,
      });
    }

    for (let rowIndex = 3; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      const row = worksheet.getRow(rowIndex);
      row.eachCell((cell, columnNumber) => {
        setBodyCellStyle(cell, columnNumber === 1 ? 'left' : 'right');
      });
    }

    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const modeText =
      summaryMode.value === 'department' ? '按使用部门汇总' : '按资产汇总';
    downloadFileFromBlobPart({
      fileName: `资产汇总表_${modeText}_${getPeriodStart()}-${getPeriodEnd()}.xlsx`,
      source: blob,
    });
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '导出失败');
  } finally {
    exportLoading.value = false;
  }
}

onMounted(reload);
</script>

<template>
  <Page auto-content-height class="h-full">
    <div class="flex h-full flex-col gap-3">
      <div
        class="asset-summary-panel border-border bg-card min-h-0 flex-1 rounded-md border shadow-sm"
      >
        <div class="table-toolbar">
          <div class="table-toolbar__filters">
            <div class="filter-item">
              <span class="filter-label">汇总方式</span>
              <ElRadioGroup v-model="summaryMode" size="default">
                <ElRadioButton label="department">按使用部门汇总</ElRadioButton>
                <ElRadioButton label="asset">按资产汇总</ElRadioButton>
              </ElRadioGroup>
            </div>
            <div class="filter-item">
              <span class="filter-label">会计期间</span>
              <ElDatePicker
                v-model="query.periodRange"
                type="monthrange"
                range-separator="至"
                start-placeholder="开始月份"
                end-placeholder="结束月份"
                value-format="YYYY-MM"
                class="period-range-picker"
                @change="reload"
              />
            </div>
            <div class="filter-item filter-item--search">
              <span class="filter-label">资产搜索</span>
              <ElInput
                v-model="query.keyword"
                class="search-input"
                placeholder="资产编号/名称/类别/型号"
                clearable
                @clear="reload"
                @keyup.enter="reload"
              />
            </div>
            <div class="filter-item">
              <span class="filter-label">资产状态</span>
              <ElSelect
                v-model="query.assetStatus"
                class="status-select"
                clearable
                placeholder="全部"
                @change="reload"
                @clear="reload"
              >
                <ElOption :value="1" label="在用" />
                <ElOption :value="2" label="闲置" />
                <ElOption :value="3" label="处置" />
              </ElSelect>
            </div>
          </div>
          <div class="table-toolbar__actions">
            <ElButton type="primary" @click="reload">查询</ElButton>
            <ElButton @click="reload">刷新</ElButton>
            <ElButton
              type="primary"
              :loading="exportLoading"
              @click="exportCurrent"
            >
              导出
            </ElButton>
          </div>
        </div>

        <div
          v-loading="loading"
          class="summary-grid-table"
          role="table"
          aria-label="资产汇总表"
        >
          <div
            class="summary-grid-cell summary-grid-cell--main-header summary-grid-name"
          >
            {{ firstColumnLabel }}
          </div>
          <div
            class="summary-grid-cell summary-grid-cell--main-header summary-grid-group summary-grid-group--original"
          >
            资产原值
          </div>
          <div
            class="summary-grid-cell summary-grid-cell--main-header summary-grid-group summary-grid-group--depreciation"
          >
            累计折旧
          </div>
          <div
            class="summary-grid-cell summary-grid-cell--main-header summary-grid-group summary-grid-group--impairment"
          >
            减值准备
          </div>

          <template v-for="group in amountGroups" :key="group.label">
            <div
              v-for="field in group.fields"
              :key="`${group.label}-${field.prop}`"
              class="summary-grid-cell summary-grid-cell--sub-header"
            >
              {{ field.label }}
            </div>
          </template>

          <template v-for="row in tableData" :key="row.key">
            <div
              class="summary-grid-cell summary-grid-cell--name"
              :class="{ 'summary-grid-cell--total': row.isTotal }"
            >
              {{ row.summaryName }}
            </div>
            <template
              v-for="group in amountGroups"
              :key="`${row.key}-${group.label}`"
            >
              <div
                v-for="field in group.fields"
                :key="`${row.key}-${field.prop}`"
                class="summary-grid-cell summary-grid-cell--amount"
                :class="{ 'summary-grid-cell--total': row.isTotal }"
              >
                {{ formatMoney(row[field.prop]) }}
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.asset-summary-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-size: 14px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
  flex-wrap: wrap;
}

.table-toolbar__filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.filter-item--search {
  flex: 1;
  min-width: 280px;
}

.filter-label {
  flex: 0 0 auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.period-range-picker {
  width: 240px;
}

.search-input {
  flex: 1;
}

.status-select {
  width: 140px;
}

.table-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.summary-grid-table {
  display: grid;
  grid-template-columns: minmax(92px, 1.3fr) repeat(12, minmax(42px, 1fr));
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border-top: 1px solid var(--el-border-color-light);
  border-left: 1px solid var(--el-border-color-light);
}

.summary-grid-cell {
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 42px;
  padding: 7px 6px;
  font-size: 14px;
  line-height: 1.35;
  word-break: break-word;
  overflow-wrap: anywhere;
  border-right: 1px solid var(--el-border-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
}

.summary-grid-cell--main-header,
.summary-grid-cell--sub-header {
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.summary-grid-cell--amount {
  justify-content: flex-end;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.summary-grid-cell--name {
  justify-content: flex-start;
}

.summary-grid-cell--total {
  font-weight: 600;
}

.summary-grid-name {
  grid-column: 1;
  grid-row: 1 / 3;
}

.summary-grid-group--original {
  grid-column: 2 / 6;
}

.summary-grid-group--depreciation {
  grid-column: 6 / 10;
}

.summary-grid-group--impairment {
  grid-column: 10 / 14;
}

@media (max-width: 1200px) {
  .summary-grid-table {
    grid-template-columns: minmax(86px, 1.15fr) repeat(12, minmax(34px, 1fr));
  }
}

@media (max-width: 768px) {
  .summary-grid-table {
    grid-template-columns: minmax(76px, 1.1fr) repeat(12, minmax(28px, 1fr));
  }

  .summary-grid-cell {
    min-height: 36px;
    padding: 5px 3px;
    font-size: 12px;
  }

  .table-toolbar {
    align-items: stretch;
  }

  .table-toolbar__filters,
  .table-toolbar__actions {
    width: 100%;
  }

  .filter-item {
    width: 100%;
    align-items: flex-start;
    flex-direction: column;
  }

  .filter-item--search {
    min-width: 0;
  }

  .period-range-picker,
  .search-input,
  .status-select {
    width: 100%;
  }

  .table-toolbar__actions {
    justify-content: flex-end;
    flex-wrap: wrap;
  }
}

@media (max-width: 520px) {
  .summary-grid-table {
    grid-template-columns: minmax(64px, 1fr) repeat(12, minmax(22px, 1fr));
  }

  .summary-grid-cell {
    min-height: 32px;
    padding: 4px 2px;
    font-size: 11px;
  }
}
</style>
