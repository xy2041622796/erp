<script lang="ts" setup>
import type { AssetRecord } from '#/api/erp/finance/assets/manage';
import type { AssetDepreciationRecord } from '#/api/erp/finance/assets/summary';
import type { BilSubjectApi } from '#/api/erp/finance/settings/project';
import type { ErpVoucherApi } from '#/api/erp/finance/voucher';

import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';


import { addMoney, divMoney, moneyNumber, moneyText, mulMoney, subMoney, sumByMoney } from '#/utils/finance/decimal-money';

import {
  ElButton,
  ElDatePicker,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { fetchAssetList, saveAsset } from '#/api/erp/finance/assets/manage';
import {
  deleteAssetDepreciation,
  fetchAssetDepreciationList,
  saveAssetDepreciation,
} from '#/api/erp/finance/assets/summary';
import { getSubjectList } from '#/api/erp/finance/settings/project';
import { getVoucherPage } from '#/api/erp/finance/voucher';

import Form from '#/views/finance/assets/summary/modules/form.vue';
import {
  getLocalMonth,
  getLocalMonthEndDate,
} from '#/views/finance/assets/utils';

defineOptions({ name: 'FinanceAssetDepreciationVoucher' });
const router = useRouter();

const loading = ref(false);
const accrueLoading = ref(false);
const voucherLoading = ref(false);
const rows = ref<AssetDepreciationRecord[]>([]);
const query = reactive({ keyword: '', period: '', status: '' as '' | number });
const showForm = ref(false);
const currentRow = ref<AssetDepreciationRecord | null>(null);

type VoucherSubject = {
  code: string;
  name: string;
};

function formatMoney(value: unknown) {
  const amount = moneyNumber(value as any);
  if (!Number.isFinite(amount) || Math.abs(amount) < 0.005) return '';
  return moneyText(amount);
}

function toAmount(value: unknown) {
  return moneyNumber(value as any);
}

function roundMoney(value: number) {
  return moneyNumber(value as any);
}

function getCurrentMonth() {
  return getLocalMonth();
}

function getPeriodEndDate(period: string) {
  return getLocalMonthEndDate(period || getCurrentMonth());
}

function getAssetId(asset: AssetRecord) {
  return String(asset.id || asset.rowid || '').trim();
}

function getDepreciationId(row: AssetDepreciationRecord) {
  return String(row.id || row.rowid || '').trim();
}

function updateLocalDepreciationRow(row: AssetDepreciationRecord) {
  const key = getDepreciationId(row);
  if (!key) return;

  const index = rows.value.findIndex((item) => getDepreciationId(item) === key);
  if (index === -1) {
    rows.value = [row, ...rows.value];
    return;
  }
  rows.value.splice(index, 1, { ...rows.value[index], ...row });
}

function removeLocalDepreciationRow(row: AssetDepreciationRecord) {
  const key = getDepreciationId(row);
  if (!key) return;
  rows.value = rows.value.filter((item) => getDepreciationId(item) !== key);
}

function getDepreciationAssetId(row: AssetDepreciationRecord) {
  return String(row.asset_id || '').trim();
}

function getMonthText(value: unknown) {
  return String(value || '').slice(0, 7);
}

function isVoucherGenerated(row: AssetDepreciationRecord) {
  return Number(row.voucher_generated || 0) === 1;
}

function getLatestDepreciationRow(list: AssetDepreciationRecord[]) {
  return list.toSorted((a, b) => {
    const monthCompare = getMonthText(b.depreciation_period).localeCompare(
      getMonthText(a.depreciation_period),
    );
    if (monthCompare !== 0) return monthCompare;
    return String(b.depreciation_date || '').localeCompare(
      String(a.depreciation_date || ''),
    );
  })[0];
}

function addOneMonth(month: string) {
  if (!month) return '';
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthNo = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(monthNo)) return '';
  const next = new Date(year, monthNo, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}

function getAssetStartPeriod(asset: AssetRecord) {
  const startMonth = getMonthText(
    asset.begin_date || asset.purchase_date || asset.entry_period,
  );
  if (!startMonth) return '';

  const bucket = getAssetBucket(asset);
  if (bucket === 'intangible') return startMonth;
  if (Number(asset.current_period_depreciate || 0) === 1) return startMonth;
  return addOneMonth(startMonth);
}

function isAssetEligibleForPeriod(asset: AssetRecord, period: string) {
  const originalValue = toAmount(asset.purchase_price);
  if (originalValue <= 0) return false;
  if (Number(asset.asset_status || 1) === 3) return false;

  const startPeriod = getAssetStartPeriod(asset);
  if (startPeriod && period < startPeriod) return false;

  return true;
}

function getResidualRate(asset: AssetRecord) {
  const rawRate = toAmount(asset.residual_rate);
  if (rawRate <= 0) return 0;
  return rawRate > 1 ? rawRate / 100 : rawRate;
}

function calculateAssetDepreciation(
  asset: AssetRecord,
  period: string,
  allDepreciations: AssetDepreciationRecord[],
) {
  const assetId = getAssetId(asset);
  const originalValue = toAmount(asset.purchase_price);
  const residualValue = roundMoney(mulMoney(originalValue, getResidualRate(asset), 'round', 6) as any);
  const depreciableAmount = Math.max(0, moneyNumber(subMoney(originalValue, residualValue)));
  const depreciationMonth = Math.max(0, Number(asset.depreciation_month || 0));
  let monthlyAmount = toAmount(asset.month_depreciation);
  if (monthlyAmount <= 0 && depreciationMonth > 0) {
    monthlyAmount = roundMoney(divMoney(depreciableAmount, depreciationMonth) as any);
  }

  if (monthlyAmount <= 0 || depreciableAmount <= 0) return null;

  const currentRecord = allDepreciations.find(
    (item) =>
      getDepreciationAssetId(item) === assetId &&
      getMonthText(item.depreciation_period) === period,
  );
  if (currentRecord && Number(currentRecord.voucher_generated || 0) === 1) return null;
  const previousRecords = allDepreciations.filter(
    (item) =>
      getDepreciationAssetId(item) === assetId &&
      getMonthText(item.depreciation_period) < period &&
      Number(item.depreciation_status || 0) !== 2,
  );
  const openingAccumulated = toAmount(asset.opening_accumulated_depreciation);
  const previousDepreciation = moneyNumber(sumByMoney(previousRecords, (item) => item.current_depreciation));
  const assetAccumulatedBeforeCurrent = Math.max(
    0,
    moneyNumber(subMoney(asset.accumulated_depreciation, currentRecord?.current_depreciation)),
  );
  const accumulatedBefore = Math.max(
    moneyNumber(addMoney([openingAccumulated, previousDepreciation])),
    assetAccumulatedBeforeCurrent,
  );
  const remainingDepreciable = roundMoney(
    subMoney(depreciableAmount, accumulatedBefore) as any,
  );
  if (remainingDepreciable <= 0) return null;

  const currentDepreciation = roundMoney(
    Math.min(monthlyAmount, remainingDepreciable),
  );
  const accumulatedDepreciation = roundMoney(
    addMoney([accumulatedBefore, currentDepreciation]) as any,
  );
  const netAssetValue = roundMoney(subMoney(originalValue, accumulatedDepreciation) as any);
  const depreciatedMonths =
    Number(asset.opening_depreciated_months || 0) + previousRecords.length + 1;
  const remainingMonths = Math.max(0, depreciationMonth - depreciatedMonths);

  return {
    id: String(currentRecord?.id || currentRecord?.rowid || ''),
    lingma_sys_key: currentRecord?.lingma_sys_key,
    asset_id: assetId,
    asset_code: String(asset.asset_code || ''),
    asset_name: String(asset.asset_name || ''),
    depreciation_period: period,
    depreciation_date: getPeriodEndDate(period),
    depreciation_method: String(asset.depreciation_method || '平均年限法'),
    original_value: originalValue,
    opening_accumulated_depreciation: openingAccumulated,
    current_depreciation: currentDepreciation,
    accumulated_depreciation: accumulatedDepreciation,
    net_asset_value: netAssetValue,
    residual_value: residualValue,
    depreciation_month: depreciationMonth,
    depreciated_months: depreciatedMonths,
    remaining_months: remainingMonths,
    voucher_generated: currentRecord?.voucher_generated || 0,
    voucher_no: currentRecord?.voucher_no || '',
    voucher_date: currentRecord?.voucher_date || '',
    depreciation_status: 1,
    remark: `${getAssetBucket(asset) === 'fixed' ? '计提固定资产折旧' : getAssetBucket(asset) === 'intangible' ? '计提无形资产摊销' : '计提长期待摊费用摊销'} ${period}`,
  } satisfies AssetDepreciationRecord;
}

async function loadSubjectByKeywords(
  keywords: string[],
  fallback: VoucherSubject,
) {
  for (const keyword of keywords) {
    const res = await getSubjectList({
      keyword,
      lingma_sys_is_delete: 0,
      subject_state: 1,
    });
    const subjects = (res?.list || []) as BilSubjectApi.Subject[];
    const matched =
      subjects.find((item) =>
        String(item.subject_number || '').startsWith(keyword),
      ) ||
      subjects.find((item) =>
        String(item.subject_name || '').includes(keyword),
      ) ||
      subjects[0];
    if (matched?.subject_number || matched?.subject_name) {
      return {
        code: String(matched.subject_number || fallback.code),
        name: String(matched.subject_name || fallback.name),
      };
    }
  }
  return fallback;
}

function normalizeText(...values: unknown[]) {
  return values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

function getAssetBucket(asset?: AssetRecord) {
  const explicitType = String(asset?.asset_amortization_type || '').trim();
  if (
    explicitType === 'fixed' ||
    explicitType === 'intangible' ||
    explicitType === 'deferred'
  ) {
    return explicitType;
  }

  const text = normalizeText(
    asset?.asset_property,
    asset?.asset_category_name,
    asset?.asset_name,
  );
  if (text.includes('无形')) return 'intangible';
  if (text.includes('长期待摊') || text.includes('待摊')) return 'deferred';
  return 'fixed';
}

async function getCreditSubject(asset?: AssetRecord) {
  const code = String(
    asset?.accumulated_depreciation_subject_code || '',
  ).trim();
  const name = String(
    asset?.accumulated_depreciation_subject_name || '',
  ).trim();
  if (code || name) return { code, name: name || '累计折旧/摊销' };

  const bucket = getAssetBucket(asset);
  if (bucket === 'intangible') {
    return await loadSubjectByKeywords(['1702', '累计摊销'], {
      code: '1702',
      name: '累计摊销',
    });
  }
  if (bucket === 'deferred') {
    return await loadSubjectByKeywords(['1801', '长期待摊费用'], {
      code: '1801',
      name: '长期待摊费用',
    });
  }
  return await loadSubjectByKeywords(['1602', '累计折旧'], {
    code: '1602',
    name: '累计折旧',
  });
}

async function getDebitSubject(asset?: AssetRecord) {
  const configuredCode = String(asset?.depreciation_fee_subject_code || '').trim();
  const configuredName = String(asset?.depreciation_fee_subject_name || '').trim();
  if (configuredCode || configuredName) {
    return {
      code: configuredCode,
      name: configuredName || '折旧费用',
    };
  }

  const expenseType = String(asset?.depreciation_expense_type || '').trim();
  if (expenseType) {
    return await loadSubjectByKeywords([expenseType, '折旧费'], {
      code: '6602',
      name: expenseType,
    });
  }

  const department = String(asset?.using_department || '').trim();
  if (department.includes('销售')) {
    return await loadSubjectByKeywords(['销售费用', '折旧费'], {
      code: '6601',
      name: '销售费用-折旧费',
    });
  }
  if (department.includes('研发')) {
    return await loadSubjectByKeywords(['研发支出', '折旧费'], {
      code: '5301',
      name: '研发支出-折旧费',
    });
  }
  return await loadSubjectByKeywords(['管理费用', '折旧费'], {
    code: '6602',
    name: '管理费用-折旧费',
  });
}


function getVoucherSummaryByAsset(asset?: AssetRecord, period = getCurrentMonth()) {
  const bucket = getAssetBucket(asset);
  if (bucket === 'intangible') return period + '计提无形资产摊销';
  if (bucket === 'deferred') return period + '计提长期待摊费用摊销';
  return period + '计提固定资产折旧';
}

async function buildAssetDepreciationVoucherDraftEntries(
  targets: AssetDepreciationRecord[],
  assetMap: Map<string, AssetRecord>,
) {
  const entries: Array<{ credit?: number; debit?: number; subject: string; summary: string }> = [];
  const addEntry = (entry: { credit?: number; debit?: number; subject: string; summary: string }) => {
    const current = entries.find((item) => item.subject === entry.subject && item.summary === entry.summary);
    if (current) {
      current.debit = roundMoney(addMoney([current.debit || 0, entry.debit || 0]) as any);
      current.credit = roundMoney(addMoney([current.credit || 0, entry.credit || 0]) as any);
      return;
    }
    entries.push(entry);
  };
  await Promise.all(
    targets.map(async (item) => {
      const asset = assetMap.get(String(item.asset_id || ''));
      const debitSubject = await getDebitSubject(asset);
      const creditSubject = await getCreditSubject(asset);
      const amount = toAmount(item.current_depreciation);
      const summary = getVoucherSummaryByAsset(asset, getMonthText(item.depreciation_period));
      addEntry({ debit: amount, subject: debitSubject.code, summary });
      addEntry({ credit: amount, subject: creditSubject.code, summary });
    }),
  );
  return entries;
}

function openFinanceVoucherCreateFromDepreciation(
  targets: AssetDepreciationRecord[],
  entries: Array<{ credit?: number; debit?: number; subject: string; summary: string }>,
  period: string,
) {
  const voucherDate = getPeriodEndDate(period);
  const rowIds = targets.map((row) => String(row.id || row.rowid || '').trim()).filter(Boolean);
  const draft = {
    source: 'asset-depreciation',
    rowIds,
    returnPath: '/finance/assets/manage?tab=depreciationVoucher',
    voucherWord: '记',
    date: new Date(voucherDate + ' 00:00:00').getTime(),
    attachmentsCount: 0,
    note: period + '资产折旧/摊销生成凭证：' + targets.length + ' 条',
    entries,
  };
  try {
    window.sessionStorage.setItem('finance_voucher_create_draft', JSON.stringify(draft));
  } catch (error) {
    console.error(error);
    ElMessage.error('凭证草稿缓存失败');
    return;
  }
  router.push({
    name: 'FinanceVoucherCreate',
    query: {
      date: period,
      moduleScope: 'finance',
      source: 'asset-depreciation',
      returnPath: '/finance/assets/manage?tab=depreciationVoucher',
      ids: rowIds.join(','),
    },
  });
}

function getVoucherBusinessCode(period: string) {
  return `ASSET-DEPRECIATION-${period}`;
}

function getVoucherOpenMonth(row: AssetDepreciationRecord) {
  return getMonthText(row.voucher_date || row.depreciation_period) || getCurrentMonth();
}

function getVoucherDateRange(row: AssetDepreciationRecord) {
  const month = getVoucherOpenMonth(row);
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthNo = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(monthNo)) return null;
  return [
    new Date(year, monthNo - 1, 1, 0, 0, 0).toISOString(),
    new Date(year, monthNo, 0, 23, 59, 59).toISOString(),
  ] as [string, string];
}

async function openVoucherDetail(row: AssetDepreciationRecord) {
  const voucherNo = String(row.voucher_no || '').trim();
  if (!voucherNo) {
    ElMessage.warning('当前折旧记录暂无凭证号');
    return;
  }

  try {
    const dateRange = getVoucherDateRange(row);
    const res = await getVoucherPage({
      pageNo: 1,
      page: 0,
      voucherCodeExact: voucherNo,
      ...(dateRange ? { voucherDateRange: dateRange } : {}),
    });
    const matched = ((res?.list || []) as ErpVoucherApi.VoucherMain[]).find(
      (item) =>
        String(item.voucher_code || item.ReportID || item.business_code || '').trim() ===
        voucherNo,
    );
    const id = String(matched?.rowid || matched?.row_id || '').trim();
    if (!id) {
      ElMessage.warning('未找到对应凭证详情');
      return;
    }

    router.push({
      name: 'FinanceVoucherCreate',
      query: {
        id,
        type: 'detail',
        date: getVoucherOpenMonth(row),
        moduleScope: 'finance',
      },
    });
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '打开凭证详情失败');
  }
}


async function reload() {
  loading.value = true;
  try {
    rows.value = await fetchAssetDepreciationList(query);
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function syncAssetDepreciationSnapshot(assetId: string) {
  if (!assetId) return;

  const [assets, depreciations] = await Promise.all([
    fetchAssetList(),
    fetchAssetDepreciationList(),
  ]);
  const asset = assets.find((item) => getAssetId(item) === assetId);
  if (!asset) return;

  const assetDepreciations = depreciations.filter(
    (item) =>
      getDepreciationAssetId(item) === assetId &&
      Number(item.depreciation_status || 0) !== 2,
  );
  const latest = getLatestDepreciationRow(assetDepreciations);
  const accumulated = latest
    ? toAmount(latest.accumulated_depreciation)
    : toAmount(asset.opening_accumulated_depreciation);
  const netAssetValue = latest
    ? toAmount(latest.net_asset_value)
    : roundMoney(subMoney(asset.purchase_price, accumulated) as any);

  await saveAsset({
    ...asset,
    accumulated_depreciation: accumulated,
    current_depreciation: latest ? toAmount(latest.current_depreciation) : 0,
    net_asset_value: netAssetValue,
  });
}


function openEdit(row: AssetDepreciationRecord) {
  if (isVoucherGenerated(row)) {
    ElMessage.warning('已生成凭证的折旧记录不允许编辑');
    return;
  }
  currentRow.value = { ...row, id: String(row.id || row.rowid || '') };
  showForm.value = true;
}

async function onDelete(row: AssetDepreciationRecord) {
  try {
    if (isVoucherGenerated(row)) {
      ElMessage.warning('已生成凭证的折旧记录不允许删除');
      return;
    }

    const id = getDepreciationId(row);
    if (!id) {
      ElMessage.warning('未找到折旧记录主键，无法删除');
      return;
    }

    await ElMessageBox.confirm(
      `确定删除 ${row.asset_name || row.asset_code || '该资产'} ${getMonthText(row.depreciation_period)} 的折旧记录吗？`,
      '删除确认',
      { type: 'warning' },
    );
    await deleteAssetDepreciation(id, row.lingma_sys_key);
    await syncAssetDepreciationSnapshot(getDepreciationAssetId(row));
    removeLocalDepreciationRow(row);
    ElMessage.success('删除成功');
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    console.error(error);
    ElMessage.error(error?.message || '删除失败');
  }
}

async function onFormSuccess(data: AssetDepreciationRecord) {
  const assetIds = new Set(
    [currentRow.value, data].map((item) =>
      item ? getDepreciationAssetId(item) : '',
    ),
  );
  for (const assetId of assetIds) {
    await syncAssetDepreciationSnapshot(assetId);
  }
  updateLocalDepreciationRow(data);
}

async function accrueDepreciation() {
  const period = query.period || getCurrentMonth();
  query.period = period;

  accrueLoading.value = true;
  try {
    const [assets, depreciations] = await Promise.all([
      fetchAssetList(),
      fetchAssetDepreciationList(),
    ]);
    const records = (assets || [])
      .filter((asset) => isAssetEligibleForPeriod(asset, period))
      .map((asset) => calculateAssetDepreciation(asset, period, depreciations))
      .filter(Boolean) as AssetDepreciationRecord[];

    if (records.length === 0) {
      ElMessage.warning('当前期间没有可计提折旧的资产');
      return;
    }

    await ElMessageBox.confirm(
      `将按资产类型规则计提/摊销 ${period}，共 ${records.length} 条资产，是否继续？`,
      '计提折旧',
      { type: 'warning' },
    );

    await Promise.all(records.map((record) => saveAssetDepreciation(record)));

    const assetMap = new Map(
      (assets || []).map((asset) => [getAssetId(asset), asset]),
    );
    await Promise.all(
      records.map((record) => {
        const asset = assetMap.get(String(record.asset_id || ''));
        if (!asset) return Promise.resolve();
        return saveAsset({
          ...asset,
          accumulated_depreciation: record.accumulated_depreciation,
          current_depreciation: record.current_depreciation,
          net_asset_value: record.net_asset_value,
        });
      }),
    );

    ElMessage.success(`计提完成：${records.length} 条`);
    await reload();
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    console.error(error);
    ElMessage.error(error?.message || '计提折旧失败');
  } finally {
    accrueLoading.value = false;
  }
}

async function generateVoucher(row?: AssetDepreciationRecord) {
  if (row && Number(row.voucher_generated || 0) === 1) {
    ElMessage.info('该折旧记录已生成凭证');
    return;
  }

  const period = row?.depreciation_period || query.period || getCurrentMonth();
  query.period = period;
  voucherLoading.value = true;
  try {
    const [assets, depreciationRows] = await Promise.all([
      fetchAssetList(),
      row
        ? Promise.resolve([row])
        : fetchAssetDepreciationList({ period, status: 1 }),
    ]);
    const targets = depreciationRows.filter(
      (item) =>
        Number(item.voucher_generated || 0) !== 1 &&
        toAmount(item.current_depreciation) > 0,
    );
    if (targets.length === 0) {
      ElMessage.warning('当前没有可生成凭证的折旧/摊销记录');
      return;
    }

    const total = roundMoney(sumByMoney(targets, (item) => item.current_depreciation) as any);
    if (total <= 0) {
      ElMessage.warning('本期折旧/摊销金额为 0，不能生成凭证');
      return;
    }

    const assetMap = new Map((assets || []).map((asset) => [getAssetId(asset), asset]));
    const entries = await buildAssetDepreciationVoucherDraftEntries(targets, assetMap);
    openFinanceVoucherCreateFromDepreciation(targets, entries, period);
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '生成凭证草稿失败');
  } finally {
    voucherLoading.value = false;
  }
}

onMounted(() => {
  query.period = query.period || getCurrentMonth();
  reload();
});
</script>

<template>
  <div class="h-full">
    <div class="flex h-full flex-col">
      <div
        class="asset-depreciation-panel border-border bg-card min-h-0 flex-1 rounded-md border shadow-sm"
      >
        <div class="table-toolbar">
          <div class="table-toolbar__filters">
            <div class="filter-item filter-item--search">
              <span class="filter-label">资产搜索</span>
              <ElInput
                v-model="query.keyword"
                class="search-input"
                placeholder="资产编号/名称/凭证号"
                clearable
                @clear="reload"
                @keyup.enter="reload"
              />
            </div>
            <div class="filter-item">
              <span class="filter-label">折旧期间</span>
              <ElDatePicker
                v-model="(query as any).period"
                type="month"
                value-format="YYYY-MM"
                class="period-picker"
                placeholder="选择月份"
                @change="reload"
              />
            </div>
            <div class="filter-item">
              <span class="filter-label">折旧状态</span>
              <ElSelect
                v-model="query.status"
                class="status-select"
                clearable
                placeholder="全部"
                @change="reload"
                @clear="reload"
              >
                <ElOption :value="0" label="未计提" />
                <ElOption :value="1" label="已计提" />
                <ElOption :value="2" label="已冲回" />
              </ElSelect>
            </div>
          </div>
          <div class="table-toolbar__actions">
            <ElButton type="primary" @click="reload">查询</ElButton>
            <ElButton @click="reload">刷新</ElButton>
            <ElButton
              type="primary"
              :loading="accrueLoading"
              @click="accrueDepreciation"
            >
              计提折旧
            </ElButton>
            <ElButton
              type="primary"
              :loading="voucherLoading"
              @click="generateVoucher()"
            >
              生成凭证
            </ElButton>
          </div>
        </div>

        <ElTable v-loading="loading" :data="rows" border height="100%">
          <ElTableColumn prop="asset_code" label="资产编号" width="130" />
          <ElTableColumn prop="asset_name" label="资产名称" min-width="160" />
          <ElTableColumn
            prop="depreciation_period"
            label="折旧期间"
            width="100"
          />
          <ElTableColumn
            prop="depreciation_method"
            label="折旧方法"
            width="120"
          />
          <ElTableColumn
            prop="original_value"
            label="资产原值"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              {{ formatMoney(row.original_value) }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="current_depreciation"
            label="本期折旧"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              {{ formatMoney(row.current_depreciation) }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="accumulated_depreciation"
            label="累计折旧"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              {{ formatMoney(row.accumulated_depreciation) }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="net_asset_value"
            label="资产净值"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              {{ formatMoney(row.net_asset_value) }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="voucher_no" label="凭证号" width="120">
            <template #default="{ row }">
              <ElButton
                v-if="row.voucher_no"
                class="voucher-no-link"
                link
                type="primary"
                @click="openVoucherDetail(row)"
              >
                {{ row.voucher_no }}
              </ElButton>
              <span v-else>-</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="凭证状态" width="110">
            <template #default="{ row }">
              <ElTag
                :type="
                  Number(row.voucher_generated || 0) === 1
                    ? 'success'
                    : 'warning'
                "
              >
                {{
                  Number(row.voucher_generated || 0) === 1 ? '已生成' : '未生成'
                }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <ElButton
                link
                type="primary"
                :disabled="isVoucherGenerated(row)"
                @click="openEdit(row)"
              >
                编辑
              </ElButton>
              <ElButton
                link
                type="primary"
                :disabled="voucherLoading"
                @click="generateVoucher(row)"
              >
                生成凭证
              </ElButton>
              <ElButton
                link
                type="danger"
                :disabled="isVoucherGenerated(row)"
                @click="onDelete(row)"
              >
                删除
              </ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>

      <Form v-model="showForm" :data="currentRow" @success="onFormSuccess" />
    </div>
  </div>
</template>

<style scoped>
.asset-depreciation-panel {
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

.filter-item--search {
  flex: 1;
  min-width: 280px;
}

.filter-label {
  flex: 0 0 auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.period-picker {
  width: 150px;
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

.voucher-no-link {
  padding: 0;
  font-weight: 500;
}
</style>
