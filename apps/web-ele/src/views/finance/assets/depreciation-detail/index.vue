<script lang="ts" setup>
import type { AssetRecord } from '#/api/erp/finance/assets/manage';
import type { AssetDepreciationRecord } from '#/api/erp/finance/assets/summary';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElDatePicker,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { fetchAssetList } from '#/api/erp/finance/assets/manage';
import { fetchAssetDepreciationList } from '#/api/erp/finance/assets/summary';
import { buildDepreciationDetailPrintHtml } from '#/views/finance/print-templates/depreciation-detail';

defineOptions({ name: 'FinanceAssetDepreciationDetail' });

type DetailRow = {
  accumulatedDepreciation: number;
  asset: AssetRecord;
  assetCategory: string;
  assetCode: string;
  assetId: string;
  assetName: string;
  assetProperty: string;
  impairmentProvision: number;
  model: string;
  netAssetValue: number;
  originalValue: number;
  period: string;
  rowId: string;
  usingDepartment: string;
  currentDepreciation: number;
  yearDepreciation: number;
};

const loading = ref(false);
const assets = ref<AssetRecord[]>([]);
const depreciationRows = ref<AssetDepreciationRecord[]>([]);
const query = reactive({
  period: getCurrentMonth(),
});
const printFrameRef = ref<HTMLIFrameElement>();
const printLoading = ref(false);

const assetMap = computed(() => {
  return new Map(assets.value.map((item) => [getAssetId(item), item]));
});

const displayedRows = computed<DetailRow[]>(() => {
  const depreciationByAsset = new Map<string, AssetDepreciationRecord>();
  const usedDepreciationIds = new Set<string>();

  for (const item of depreciationRows.value) {
    const assetId = getDepreciationAssetId(item);
    if (!assetId) continue;
    const old = depreciationByAsset.get(assetId);
    if (!old || compareDepreciation(item, old) > 0) {
      depreciationByAsset.set(assetId, item);
    }
  }

  const result = assets.value.map((asset) => {
    const assetId = getAssetId(asset);
    const depreciation = depreciationByAsset.get(assetId);
    if (depreciation) {
      usedDepreciationIds.add(getDepreciationRowId(depreciation));
    }
    return buildDetailRow(asset, depreciation);
  });

  for (const item of depreciationRows.value) {
    const rowId = getDepreciationRowId(item);
    if (usedDepreciationIds.has(rowId)) continue;
    const asset = assetMap.value.get(getDepreciationAssetId(item));
    if (!asset) continue;
    result.push(buildDetailRow(asset, item));
  }

  return result;
});

const summaryRow = computed<DetailRow>(() => {
  const sum = displayedRows.value.reduce(
    (total, row) => {
      total.accumulatedDepreciation += row.accumulatedDepreciation;
      total.currentDepreciation += row.currentDepreciation;
      total.impairmentProvision += row.impairmentProvision;
      total.netAssetValue += row.netAssetValue;
      total.originalValue += row.originalValue;
      total.yearDepreciation += row.yearDepreciation;
      return total;
    },
    {
      accumulatedDepreciation: 0,
      currentDepreciation: 0,
      impairmentProvision: 0,
      netAssetValue: 0,
      originalValue: 0,
      yearDepreciation: 0,
    },
  );

  return {
    ...sum,
    asset: {},
    assetCategory: '合计',
    assetCode: '',
    assetId: '__summary__',
    assetName: '',
    assetProperty: '',
    model: '',
    period: query.period,
    rowId: '__summary__',
    usingDepartment: '',
  } as DetailRow;
});

function getCurrentMonth() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function toAmount(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function getAssetId(row: { id?: string; rowid?: string }) {
  return String(row.id || row.rowid || '').trim();
}

function getDepreciationAssetId(row: AssetDepreciationRecord) {
  return String(row.asset_id || '').trim();
}

function getDepreciationRowId(row: AssetDepreciationRecord) {
  return String(row.id || row.rowid || '').trim();
}

function getPeriodText(value: unknown) {
  return String(value || '').slice(0, 7);
}

function compareDepreciation(a: AssetDepreciationRecord, b: AssetDepreciationRecord) {
  const periodCompare = getPeriodText(a.depreciation_period).localeCompare(
    getPeriodText(b.depreciation_period),
  );
  if (periodCompare !== 0) return periodCompare;
  return String(a.depreciation_date || '').localeCompare(
    String(b.depreciation_date || ''),
  );
}

function buildDetailRow(
  asset: AssetRecord,
  depreciation?: AssetDepreciationRecord,
): DetailRow {
  const originalValue = toAmount(
    depreciation?.original_value === undefined || depreciation?.original_value === ''
      ? asset.purchase_price
      : depreciation?.original_value,
  );
  const openingAccumulated = toAmount(
    depreciation?.opening_accumulated_depreciation === undefined ||
      depreciation?.opening_accumulated_depreciation === ''
      ? asset.opening_accumulated_depreciation
      : depreciation?.opening_accumulated_depreciation,
  );
  const currentDepreciation = toAmount(
    depreciation?.current_depreciation === undefined ||
      depreciation?.current_depreciation === ''
      ? asset.current_depreciation || asset.month_depreciation
      : depreciation?.current_depreciation,
  );
  const accumulatedDepreciation = toAmount(
    depreciation?.accumulated_depreciation === undefined ||
      depreciation?.accumulated_depreciation === ''
      ? asset.accumulated_depreciation || openingAccumulated + currentDepreciation
      : depreciation?.accumulated_depreciation,
  );
  const netAssetValue = toAmount(
    depreciation?.net_asset_value === undefined || depreciation?.net_asset_value === ''
      ? asset.net_asset_value === undefined || asset.net_asset_value === ''
        ? originalValue - accumulatedDepreciation
        : asset.net_asset_value
      : depreciation?.net_asset_value,
  );

  return {
    accumulatedDepreciation,
    asset,
    assetCategory: String(asset.asset_category_name || ''),
    assetCode: String(asset.asset_code || depreciation?.asset_code || ''),
    assetId: getAssetId(asset),
    assetName: String(asset.asset_name || depreciation?.asset_name || ''),
    assetProperty: String(asset.asset_property || ''),
    currentDepreciation,
    impairmentProvision: toAmount((asset as any).impairment_provision),
    model: String(asset.model || asset.asset_specification || ''),
    netAssetValue,
    originalValue,
    period: getPeriodText(depreciation?.depreciation_period) || query.period,
    rowId: depreciation ? getDepreciationRowId(depreciation) : getAssetId(asset),
    usingDepartment: String(asset.using_department || ''),
    yearDepreciation: toAmount(
      asset.current_year_depreciation || accumulatedDepreciation - openingAccumulated,
    ),
  };
}

function formatPeriod(value: string) {
  if (!value) return '';
  const [year, month] = value.split('-');
  return `${year}年${Number(month || 0)}月`;
}

function formatMoney(value: unknown) {
  const amount = toAmount(value);
  return amount.toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function tableSummaryMethod() {
  return [
    formatPeriod(summaryRow.value.period),
    '',
    '合计',
    '',
    '',
    '',
    '',
    formatMoney(summaryRow.value.originalValue),
    formatMoney(summaryRow.value.currentDepreciation),
    formatMoney(summaryRow.value.yearDepreciation),
    formatMoney(summaryRow.value.accumulatedDepreciation),
    formatMoney(summaryRow.value.impairmentProvision),
    formatMoney(summaryRow.value.netAssetValue),
  ];
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function handleExport() {
  const headers = [
    '会计期间',
    '资产编号',
    '资产类别',
    '资产属性',
    '资产名称',
    '规格型号',
    '使用部门',
    '资产原值',
    '本期折旧',
    '本年累计折旧',
    '累计折旧',
    '减值准备',
    '资产净值',
  ];
  const body = displayedRows.value.map((row) => [
    formatPeriod(row.period),
    row.assetCode,
    row.assetCategory,
    row.assetProperty,
    row.assetName,
    row.model,
    row.usingDepartment,
    formatMoney(row.originalValue),
    formatMoney(row.currentDepreciation),
    formatMoney(row.yearDepreciation),
    formatMoney(row.accumulatedDepreciation),
    formatMoney(row.impairmentProvision),
    formatMoney(row.netAssetValue),
  ]);
  body.push(tableSummaryMethod());
  download(
    `摊销明细表-${query.period || '全部'}.csv`,
    [headers, ...body].map((line) => line.map(escapeCsv).join(',')).join('\n'),
  );
}

function buildPrintRows() {
  const rows = displayedRows.value.map((row) => ({
    accumulatedDepreciation: row.accumulatedDepreciation,
    assetCategory: row.assetCategory,
    assetCode: row.assetCode,
    assetName: row.assetName,
    assetProperty: row.assetProperty,
    currentDepreciation: row.currentDepreciation,
    impairmentProvision: row.impairmentProvision,
    model: row.model,
    netAssetValue: row.netAssetValue,
    originalValue: row.originalValue,
    period: formatPeriod(row.period),
    usingDepartment: row.usingDepartment,
    yearDepreciation: row.yearDepreciation,
  }));
  rows.push({
    accumulatedDepreciation: summaryRow.value.accumulatedDepreciation,
    assetCategory: '合计',
    currentDepreciation: summaryRow.value.currentDepreciation,
    impairmentProvision: summaryRow.value.impairmentProvision,
    netAssetValue: summaryRow.value.netAssetValue,
    originalValue: summaryRow.value.originalValue,
    period: formatPeriod(summaryRow.value.period),
    yearDepreciation: summaryRow.value.yearDepreciation,
  });
  return rows;
}

async function getPrintContext() {
  const iframe = printFrameRef.value;
  const win = iframe?.contentWindow;
  const doc = iframe?.contentDocument || win?.document;
  if (!iframe || !win || !doc) {
    ElMessage.error('打印容器初始化失败');
    return null;
  }
  return { doc, win };
}

function printHtml(html: string, win: Window, doc: Document) {
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

async function handlePrint() {
  if (displayedRows.value.length === 0) {
    ElMessage.warning('当前期间没有可打印的摊销明细数据');
    return;
  }

  const ctx = await getPrintContext();
  if (!ctx) return;

  const html = buildDepreciationDetailPrintHtml({
    periodLabel: formatPeriod(query.period),
    printedAt: new Date().toLocaleString('zh-CN'),
    rows: buildPrintRows(),
    title: '摊销明细表',
  });

  printHtml(html, ctx.win, ctx.doc);
}

async function reload() {
  loading.value = true;
  try {
    const [assetRows, depreciationList] = await Promise.all([
      fetchAssetList(),
      fetchAssetDepreciationList({ period: query.period }),
    ]);
    assets.value = assetRows;
    depreciationRows.value = depreciationList;
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载摊销明细表失败');
  } finally {
    loading.value = false;
  }
}

onMounted(reload);
</script>

<template>
  <Page auto-content-height class="h-full depreciation-detail-page">
    <div class="depreciation-detail">
      <div class="depreciation-toolbar">
        <ElDatePicker
          v-model="query.period"
          type="month"
          value-format="YYYY-MM"
          format="YYYY年M月"
          class="period-picker"
          :clearable="false"
          @change="reload"
        />
        <div class="toolbar-actions">
          <ElButton @click="handleExport">导出</ElButton>
          <ElButton :loading="printLoading" @click="handlePrint">打印</ElButton>
          <ElButton link class="refresh-btn" @click="reload">⟳</ElButton>
        </div>
      </div>

      <ElTable
        v-loading="loading"
        :data="displayedRows"
        border
        class="detail-table"
        height="100%"
        show-summary
        :summary-method="tableSummaryMethod"
      >
        <ElTableColumn prop="period" label="会计期间" width="140">
          <template #default="{ row }">{{ formatPeriod(row.period) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="assetCode" label="资产编号" width="132" />
        <ElTableColumn prop="assetCategory" label="资产类别" width="132" />
        <ElTableColumn prop="assetProperty" label="资产属性" width="132" />
        <ElTableColumn prop="assetName" label="资产名称" min-width="132" />
        <ElTableColumn prop="model" label="规格型号" min-width="132" show-overflow-tooltip />
        <ElTableColumn prop="usingDepartment" label="使用部门" width="132" />
        <ElTableColumn label="资产原值" width="132" align="right">
          <template #default="{ row }">{{ formatMoney(row.originalValue) }}</template>
        </ElTableColumn>
        <ElTableColumn label="本期折旧" width="132" align="right">
          <template #default="{ row }">
            {{ formatMoney(row.currentDepreciation) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="本年累计折旧" width="132" align="right">
          <template #default="{ row }">
            {{ formatMoney(row.yearDepreciation) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="累计折旧" width="132" align="right">
          <template #default="{ row }">
            {{ formatMoney(row.accumulatedDepreciation) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="减值准备" width="132" align="right">
          <template #default="{ row }">
            {{ formatMoney(row.impairmentProvision) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="资产净值" width="132" align="right">
          <template #default="{ row }">{{ formatMoney(row.netAssetValue) }}</template>
        </ElTableColumn>
      </ElTable>
    </div>
    <iframe ref="printFrameRef" class="print-frame"></iframe>
  </Page>
</template>

<style scoped>
.depreciation-detail-page :deep(.page-content) {
  padding: 0;
}

.depreciation-detail {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  background: var(--el-bg-color);
}

.depreciation-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
}

.period-picker {
  width: 110px;
}

.period-picker :deep(.el-input__wrapper) {
  border-radius: 0;
  background: var(--el-color-primary);
  box-shadow: none;
}

.period-picker :deep(.el-input__inner),
.period-picker :deep(.el-input__prefix),
.period-picker :deep(.el-input__suffix) {
  color: var(--el-color-white);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 10px;
}

.refresh-btn {
  color: var(--el-text-color-regular);
  font-size: 18px;
}

.detail-table {
  flex: 1;
  --el-table-header-bg-color: var(--el-color-primary-light-9);
}

.detail-table :deep(.el-table__cell) {
  height: 36px;
  padding: 0;
}

.detail-table :deep(.el-table__header th) {
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.detail-table :deep(.el-table__footer-wrapper td) {
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-primary);
  font-weight: 500;
}

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

@media print {
  .depreciation-toolbar {
    display: none;
  }
}
</style>
