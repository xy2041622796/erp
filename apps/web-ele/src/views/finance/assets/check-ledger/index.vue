<script lang="ts" setup>
import type { AssetRecord } from '#/api/erp/finance/assets/manage';
import type { SubjectBalanceRow } from '#/api/erp/finance/ledger/subject-balance';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';

import {
  ElButton,
  ElDatePicker,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';
import ExcelJS from 'exceljs';

import { fetchAssetList } from '#/api/erp/finance/assets/manage';
import { fetchSubjectBalanceRows } from '#/api/erp/finance/ledger/subject-balance';
import { moneyNumber, subMoney } from '#/utils/finance/decimal-money';

defineOptions({ name: 'FinanceAssetLedgerCheck' });

type AssetBucket = 'deferred' | 'fixed' | 'intangible';

type CheckRow = {
  balance: number;
  creditAmount: number;
  debitAmount: number;
  diff?: number;
  isDiff?: boolean;
  name: string;
  openingBalance: number;
  project: string;
  rowId: string;
  status?: 'different' | 'matched';
};

type SubjectSnapshot = {
  balance: number;
  creditAmount: number;
  debitAmount: number;
  openingBalance: number;
};

type AssetSnapshot = {
  deferredNet: number;
  fixedAccumulated: number;
  fixedNet: number;
  fixedOriginal: number;
  intangibleAccumulated: number;
  intangibleNet: number;
  intangibleOriginal: number;
};

const loading = ref(false);
const exportLoading = ref(false);
const period = ref(getCurrentMonth());
const assets = ref<AssetRecord[]>([]);
const subjectRows = ref<SubjectBalanceRow[]>([]);

function getCurrentMonth() {
  return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

function toAmount(value: unknown) {
  return moneyNumber(value);
}

function formatMoney(value: unknown) {
  const amount = toAmount(value);
  if (Math.abs(amount) < 0.005) return '';
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getSubjectBalance(row?: SubjectBalanceRow): SubjectSnapshot {
  if (!row) {
    return {
      openingBalance: 0,
      debitAmount: 0,
      creditAmount: 0,
      balance: 0,
    };
  }

  return {
    openingBalance: toAmount(row.openingDebit) || toAmount(row.openingCredit),
    debitAmount: toAmount(row.currentDebit),
    creditAmount: toAmount(row.currentCredit),
    balance: toAmount(row.endingDebit) || toAmount(row.endingCredit),
  };
}

function normalizeText(...values: unknown[]) {
  return values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

function getAssetBucket(asset: AssetRecord): AssetBucket {
  const explicitType = String(asset.asset_amortization_type || '').trim();
  if (
    explicitType === 'fixed' ||
    explicitType === 'intangible' ||
    explicitType === 'deferred'
  ) {
    return explicitType;
  }

  const text = normalizeText(
    asset.asset_property,
    asset.asset_category_name,
    asset.asset_name,
  );
  if (text.includes('无形')) return 'intangible';
  if (text.includes('长期待摊') || text.includes('待摊')) return 'deferred';
  return 'fixed';
}

function matchSubject(code: string, keyword: string) {
  const exactCode = subjectRows.value.find(
    (row) => String(row.subjectCode || '').trim() === code,
  );
  if (exactCode) return exactCode;

  return subjectRows.value.find((row) => {
    const subjectCode = String(row.subjectCode || '').trim();
    const subjectName = String(row.subjectName || '').trim();
    return subjectCode.startsWith(code) || subjectName.includes(keyword);
  });
}

const assetSnapshot = computed(() => {
  const snapshot: AssetSnapshot = {
    fixedOriginal: 0,
    fixedAccumulated: 0,
    fixedNet: 0,
    intangibleOriginal: 0,
    intangibleAccumulated: 0,
    intangibleNet: 0,
    deferredNet: 0,
  };

  for (const asset of assets.value) {
    const bucket = getAssetBucket(asset);
    const original = toAmount(asset.purchase_price);
    const accumulated = toAmount(asset.accumulated_depreciation);
    const netValue = toAmount(asset.net_asset_value) || moneyNumber(subMoney(original, accumulated));

    if (bucket === 'intangible') {
      snapshot.intangibleOriginal = moneyNumber(subMoney(snapshot.intangibleOriginal, -moneyNumber(original)));
      snapshot.intangibleAccumulated = moneyNumber(subMoney(snapshot.intangibleAccumulated, -moneyNumber(accumulated)));
      snapshot.intangibleNet = moneyNumber(subMoney(snapshot.intangibleNet, -moneyNumber(netValue)));
      continue;
    }
    if (bucket === 'deferred') {
      snapshot.deferredNet = moneyNumber(subMoney(snapshot.deferredNet, -moneyNumber(netValue)));
      continue;
    }
    snapshot.fixedOriginal = moneyNumber(subMoney(snapshot.fixedOriginal, -moneyNumber(original)));
    snapshot.fixedAccumulated = moneyNumber(subMoney(snapshot.fixedAccumulated, -moneyNumber(accumulated)));
    snapshot.fixedNet = moneyNumber(subMoney(snapshot.fixedNet, -moneyNumber(netValue)));
  }

  return snapshot;
});

function buildCompareRows(
  rowPrefix: string,
  subjectName: string,
  cardName: string,
  subject: SubjectSnapshot,
  cardBalance: number,
) {
  const diff = moneyNumber(subMoney(subject.balance, cardBalance));
  const matched = Math.abs(diff) < 0.01;

  return [
    {
      rowId: `${rowPrefix}-subject`,
      project: '会计科目',
      name: subjectName,
      openingBalance: subject.openingBalance,
      debitAmount: subject.debitAmount,
      creditAmount: subject.creditAmount,
      balance: subject.balance,
    },
    {
      rowId: `${rowPrefix}-card`,
      project: '资产卡片',
      name: cardName,
      openingBalance: 0,
      debitAmount: 0,
      creditAmount: 0,
      balance: cardBalance,
    },
    {
      rowId: `${rowPrefix}-diff`,
      project: '差异',
      name: '',
      openingBalance: 0,
      debitAmount: 0,
      creditAmount: 0,
      balance: diff,
      diff,
      status: matched ? 'matched' : 'different',
      isDiff: true,
    },
  ] satisfies CheckRow[];
}

const tableData = computed(() => {
  const snapshot = assetSnapshot.value;
  const fixedAsset = getSubjectBalance(matchSubject('1601', '固定资产'));
  const accumulatedDepreciation = getSubjectBalance(
    matchSubject('1602', '累计折旧'),
  );
  const intangibleAsset = getSubjectBalance(matchSubject('1701', '无形资产'));
  const accumulatedAmortization = getSubjectBalance(
    matchSubject('1702', '累计摊销'),
  );
  const deferredExpense = getSubjectBalance(
    matchSubject('1801', '长期待摊费用'),
  );

  return [
    ...buildCompareRows(
      'fixed-original',
      '固定资产',
      '固定资产原值',
      fixedAsset,
      snapshot.fixedOriginal,
    ),
    ...buildCompareRows(
      'fixed-depreciation',
      '累计折旧',
      '固定资产累计折旧',
      accumulatedDepreciation,
      snapshot.fixedAccumulated,
    ),
    ...buildCompareRows(
      'intangible-original',
      '无形资产',
      '无形资产原值',
      intangibleAsset,
      snapshot.intangibleOriginal,
    ),
    ...buildCompareRows(
      'intangible-amortization',
      '累计摊销',
      '无形资产累计摊销',
      accumulatedAmortization,
      snapshot.intangibleAccumulated,
    ),
    ...buildCompareRows(
      'deferred-net',
      '长期待摊费用',
      '长期待摊费用净值',
      deferredExpense,
      snapshot.deferredNet,
    ),
  ];
});

const differenceCount = computed(
  () =>
    tableData.value.filter((row) => row.isDiff && row.status === 'different')
      .length,
);

function getRowClassName({ row }: { row: CheckRow }) {
  if (!row.isDiff) return '';
  return row.status === 'matched'
    ? 'asset-ledger-row-matched'
    : 'asset-ledger-row-different';
}

function getStatusText(row: CheckRow) {
  if (!row.isDiff) return '';
  return row.status === 'matched' ? '平衡' : '有差异';
}

async function reload() {
  loading.value = true;
  try {
    const [assetList, balanceRows] = await Promise.all([
      fetchAssetList(),
      fetchSubjectBalanceRows({
        periodStart: period.value,
        periodEnd: period.value,
      }),
    ]);
    assets.value = assetList;
    subjectRows.value = balanceRows;
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function exportCurrent() {
  if (tableData.value.length === 0) {
    ElMessage.warning('当前没有可导出的核对数据');
    return;
  }

  exportLoading.value = true;
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('资产账实核对');
    worksheet.columns = [
      { header: '项目', key: 'project', width: 16 },
      { header: '名称', key: 'name', width: 24 },
      { header: '期初余额', key: 'openingBalance', width: 16 },
      { header: '借方', key: 'debitAmount', width: 16 },
      { header: '贷方', key: 'creditAmount', width: 16 },
      { header: '余额', key: 'balance', width: 16 },
      { header: '状态', key: 'statusText', width: 14 },
    ];
    worksheet.addRows(
      tableData.value.map((row) => ({
        ...row,
        statusText: getStatusText(row),
      })),
    );
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        fgColor: { argb: 'EEF7EE' },
        pattern: 'solid',
        type: 'pattern',
      };
    });
    for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      worksheet.getRow(rowIndex).eachCell((cell, columnNumber) => {
        cell.border = {
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
          top: { style: 'thin' },
        };
        cell.alignment = {
          horizontal: columnNumber >= 3 && columnNumber <= 6 ? 'right' : 'left',
          vertical: 'middle',
        };
        if (columnNumber >= 3 && columnNumber <= 6) cell.numFmt = '#,##0.00';
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    downloadFileFromBlobPart({
      fileName: `资产账实核对_${period.value}.xlsx`,
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
        class="asset-ledger-panel border-border bg-card min-h-0 flex-1 rounded-md border shadow-sm"
      >
        <div class="table-toolbar">
          <div class="table-toolbar__filters">
            <div class="filter-item">
              <span class="filter-label">会计期间</span>
              <ElDatePicker
                v-model="period"
                type="month"
                value-format="YYYY-MM"
                class="period-picker"
                placeholder="选择月份"
                @change="reload"
              />
            </div>
            <div class="filter-item">
              <span class="filter-label">核对结果</span>
              <ElTag :type="differenceCount === 0 ? 'success' : 'danger'">
                {{
                  differenceCount === 0
                    ? '全部平衡'
                    : `${differenceCount} 项差异`
                }}
              </ElTag>
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

        <ElTable
          v-loading="loading"
          :data="tableData"
          :row-class-name="getRowClassName"
          border
          height="100%"
        >
          <ElTableColumn prop="project" label="项目" width="120" fixed="left" />
          <ElTableColumn
            prop="name"
            label="名称"
            min-width="190"
            fixed="left"
          />
          <ElTableColumn
            prop="openingBalance"
            label="期初余额"
            width="130"
            align="right"
          >
            <template #default="{ row }">
              {{ formatMoney(row.openingBalance) }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="debitAmount"
            label="借方"
            width="130"
            align="right"
          >
            <template #default="{ row }">
              {{ formatMoney(row.debitAmount) }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="creditAmount"
            label="贷方"
            width="130"
            align="right"
          >
            <template #default="{ row }">
              {{ formatMoney(row.creditAmount) }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="balance" label="余额" width="130" align="right">
            <template #default="{ row }">
              {{ formatMoney(row.balance) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="110" fixed="right">
            <template #default="{ row }">
              <ElTag
                v-if="row.isDiff"
                :type="row.status === 'matched' ? 'success' : 'danger'"
              >
                {{ row.status === 'matched' ? '平衡' : '有差异' }}
              </ElTag>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.asset-ledger-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.filter-label {
  flex: 0 0 auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.period-picker {
  width: 150px;
}

.table-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

:deep(.asset-ledger-row-matched) {
  background: var(--el-color-success-light-9);
}

:deep(.asset-ledger-row-different) {
  background: var(--el-color-danger-light-9);
}
</style>
