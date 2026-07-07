<script lang="ts" setup>
import type { AssetChangeRecord } from '#/api/erp/finance/assets/check-ledger';
import type { AssetRecord } from '#/api/erp/finance/assets/manage';
import type { BilSubjectApi } from '#/api/erp/finance/settings/project';
import type { ErpVoucherApi } from '#/api/erp/finance/voucher';

import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';


import { addMoney, moneyNumber, moneyText, sumByMoney } from '#/utils/finance/decimal-money';

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
} from 'element-plus';

import {
  deleteAssetChange,
  fetchAssetChangeList,
} from '#/api/erp/finance/assets/check-ledger';
import { fetchAssetList } from '#/api/erp/finance/assets/manage';
import { getSubjectList } from '#/api/erp/finance/settings/project';
import {
  getLocalMonth,
  getLocalMonthEndDate,
} from '#/views/finance/assets/utils';

defineOptions({ name: 'FinanceAssetChangeVoucher' });
const router = useRouter();

const loading = ref(false);
const voucherLoading = ref(false);
const rows = ref<AssetChangeRecord[]>([]);
const query = reactive({
  keyword: '',
  period: '',
  voucherGenerated: '' as 0 | 1 | '',
});

type VoucherSubject = {
  code: string;
  name: string;
};

type ChangeVoucherLine = {
  creditSubject: VoucherSubject;
  debitSubject: VoucherSubject;
  record: AssetChangeRecord;
  summary: string;
  value: number;
};

function formatMoney(value: unknown) {
  const amount = moneyNumber(value as any);
  if (!Number.isFinite(amount) || Math.abs(amount) < 0.005) return '';
  return amount.toFixed(2);
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

function getChangeKey(row: AssetChangeRecord) {
  return String(row.id || row.rowid || '').trim();
}

function isVoucherGenerated(row: AssetChangeRecord) {
  return Number(row.voucher_generated || 0) === 1;
}

function getMonthText(value: unknown) {
  return String(value || '').slice(0, 7);
}

function formatPeriodText(value: unknown) {
  const month = getMonthText(value);
  const matched = month.match(/^(\d{4})-(\d{1,2})$/);
  if (!matched) return month;
  return matched[1] + '年' + Number(matched[2]) + '月';
}

function getBeforeContent(row: AssetChangeRecord) {
  return formatMoney(row.before_value);
}

function getAfterContent(row: AssetChangeRecord) {
  return formatMoney(row.after_value);
}

function getRelatedVoucher(row: AssetChangeRecord) {
  const voucherNo = String(row.voucher_no || '').trim();
  if (voucherNo === '无需生成' || voucherNo === '期初初始化') return '';
  return voucherNo;
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

async function getAssetSubject(asset?: AssetRecord) {
  const code = String(asset?.asset_account_code || '').trim();
  const name = String(asset?.asset_account_name || '').trim();
  if (code || name) return { code, name: name || '资产科目' };

  const bucket = getAssetBucket(asset);
  if (bucket === 'intangible') {
    return await loadSubjectByKeywords(['1701', '无形资产'], {
      code: '1701',
      name: '无形资产',
    });
  }
  if (bucket === 'deferred') {
    return await loadSubjectByKeywords(['1801', '长期待摊费用'], {
      code: '1801',
      name: '长期待摊费用',
    });
  }
  return await loadSubjectByKeywords(['1601', '固定资产'], {
    code: '1601',
    name: '固定资产',
  });
}

async function getAccumulatedSubject(asset?: AssetRecord) {
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
  return await loadSubjectByKeywords(['1602', '累计折旧'], {
    code: '1602',
    name: '累计折旧',
  });
}

async function getDepreciationExpenseSubject(asset?: AssetRecord) {
  const code = String(asset?.depreciation_fee_subject_code || '').trim();
  const name = String(asset?.depreciation_fee_subject_name || '').trim();
  if (code || name) return { code, name: name || '折旧费用' };

  return await loadSubjectByKeywords(['管理费用', '折旧费'], {
    code: '6602',
    name: '管理费用-折旧费',
  });
}

async function getChangeCounterSubject(asset?: AssetRecord) {
  return await loadSubjectByKeywords(['1606', '固定资产清理', '资产处置损益'], {
    code: '1606',
    name: '固定资产清理',
  });
}

function isDepreciationChange(row: AssetChangeRecord) {
  const text = normalizeText(row.change_type, row.change_reason, row.remark);
  return (
    text.includes('折旧') || text.includes('摊销') || text.includes('累计')
  );
}

async function buildChangeVoucherLine(
  record: AssetChangeRecord,
  asset?: AssetRecord,
): Promise<ChangeVoucherLine | null> {
  const amount = roundMoney(toAmount(record.change_amount));
  if (Math.abs(amount) < 0.005) return null;

  const value = Math.abs(amount);
  const summary = [
    record.change_type || '资产变更',
    [asset?.using_department, record.asset_name || record.asset_code]
      .filter(Boolean)
      .join(' '),
  ]
    .filter(Boolean)
    .join('_');
  if (isDepreciationChange(record)) {
    const accumulatedSubject = await getAccumulatedSubject(asset);
    const expenseSubject = await getDepreciationExpenseSubject(asset);
    return amount > 0
      ? {
          creditSubject: accumulatedSubject,
          debitSubject: expenseSubject,
          record,
          summary,
          value,
        }
      : {
          creditSubject: expenseSubject,
          debitSubject: accumulatedSubject,
          record,
          summary,
          value,
        };
  }

  const assetSubject = await getAssetSubject(asset);
  const counterSubject = await getChangeCounterSubject(asset);
  return amount > 0
    ? {
        creditSubject: counterSubject,
        debitSubject: assetSubject,
        record,
        summary,
        value,
      }
    : {
        creditSubject: assetSubject,
        debitSubject: counterSubject,
        record,
        summary,
        value,
      };
}


function openFinanceVoucherCreateFromAssetChange(
  targets: AssetChangeRecord[],
  lines: ChangeVoucherLine[],
  period: string,
) {
  const voucherDate = getPeriodEndDate(period);
  const rowIds = targets.map((row) => String(row.id || row.rowid || '').trim()).filter(Boolean);
  const entries = lines.flatMap((line) => [
    { debit: line.value, subject: line.debitSubject.code, summary: line.summary },
    { credit: line.value, subject: line.creditSubject.code, summary: line.summary },
  ]);
  const draft = {
    source: 'asset-change',
    rowIds,
    returnPath: '/finance/assets/manage?tab=changeVoucher',
    voucherWord: '记',
    date: new Date(voucherDate + ' 00:00:00').getTime(),
    attachmentsCount: 0,
    note: period + '资产变更/处置生成凭证：' + targets.length + ' 条',
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
      source: 'asset-change',
      returnPath: '/finance/assets/manage?tab=changeVoucher',
      ids: rowIds.join(','),
    },
  });
}

function getVoucherBusinessCode(period: string) {
  return `ASSET-CHANGE-${period}`;
}

function addVoucherDetail(
  detailMap: Map<string, ErpVoucherApi.VoucherDetail>,
  subject: VoucherSubject,
  direction: 'credit' | 'debit',
  amount: number,
  summary: string,
) {
  const key = `${direction}-${subject.code}-${subject.name}-${summary}`;
  const current = detailMap.get(key);
  if (current) {
    if (direction === 'debit') {
      current.debit_amount = roundMoney(addMoney([current.debit_amount, amount]) as any);
    } else {
      current.credit_amount = roundMoney(addMoney([current.credit_amount, amount]) as any);
    }
    return;
  }

  detailMap.set(key, {
    account_code: subject.code,
    account_name: subject.name,
    abstract_content: summary,
    credit_amount: direction === 'credit' ? amount : 0,
    debit_amount: direction === 'debit' ? amount : 0,
    sort_no: detailMap.size + 1,
  });
}

function matchesCurrentQuery(row: AssetChangeRecord) {
  const keyword = String(query.keyword || '').trim();
  if (keyword) {
    const text = normalizeText(
      row.asset_code,
      row.asset_name,
      row.change_type,
      row.voucher_no,
    );
    if (!text.includes(keyword)) return false;
  }

  const period = getMonthText(query.period);
  if (period && getMonthText(row.change_period) !== period) return false;

  if (query.voucherGenerated === 0 || query.voucherGenerated === 1) {
    return Number(row.voucher_generated || 0) === query.voucherGenerated;
  }

  return true;
}

function sortChangeRows(list: AssetChangeRecord[]) {
  return list.toSorted((a, b) => {
    const periodCompare = getMonthText(b.change_period).localeCompare(
      getMonthText(a.change_period),
    );
    if (periodCompare !== 0) return periodCompare;

    const dateCompare = String(b.change_date || '').localeCompare(
      String(a.change_date || ''),
    );
    if (dateCompare !== 0) return dateCompare;

    return String(b.asset_code || '').localeCompare(
      String(a.asset_code || ''),
      'zh-Hans-CN-u-kn-true',
      { numeric: true, sensitivity: 'base' },
    );
  });
}

function applyLocalChangeRow(row: AssetChangeRecord) {
  const key = getChangeKey(row);
  if (!key) return;

  const index = rows.value.findIndex((item) => getChangeKey(item) === key);
  if (!matchesCurrentQuery(row)) {
    if (index !== -1) rows.value.splice(index, 1);
    return;
  }

  if (index === -1) {
    rows.value = sortChangeRows([row, ...rows.value]);
    return;
  }

  rows.value.splice(index, 1, { ...rows.value[index], ...row });
  rows.value = sortChangeRows(rows.value);
}

function removeLocalChangeRow(row: AssetChangeRecord) {
  const key = getChangeKey(row);
  if (!key) return;
  rows.value = rows.value.filter((item) => getChangeKey(item) !== key);
}

async function reload() {
  loading.value = true;
  try {
    rows.value = await fetchAssetChangeList(query);
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function onDelete(row: AssetChangeRecord) {
  try {
    if (isVoucherGenerated(row)) {
      ElMessage.warning('已生成凭证的变更记录不允许删除');
      return;
    }

    const id = getChangeKey(row);
    if (!id) {
      ElMessage.warning('未找到变更记录主键，无法删除');
      return;
    }

    await ElMessageBox.confirm(
      `确定删除 ${row.asset_name || row.asset_code || '该资产'} 的变更记录吗？`,
      '删除确认',
      { type: 'warning' },
    );
    await deleteAssetChange(id, row.lingma_sys_key);
    removeLocalChangeRow(row);
    ElMessage.success('删除成功');
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    console.error(error);
    ElMessage.error(error?.message || '删除失败');
  }
}

function onExternalAssetChangeSaved(event: Event) {
  const row = (event as CustomEvent<AssetChangeRecord>).detail;
  if (!row) return;
  applyLocalChangeRow(row);
}

async function generateVoucher(row?: AssetChangeRecord) {
  if (row && isVoucherGenerated(row)) {
    ElMessage.info('该变更记录已生成凭证');
    return;
  }

  const period = getMonthText(row?.change_period || query.period);
  if (!period) {
    ElMessage.warning('请先选择变更期间');
    return;
  }

  query.period = period;
  voucherLoading.value = true;
  try {
    const [assets, changeRows] = await Promise.all([
      fetchAssetList(),
      row ? Promise.resolve([row]) : fetchAssetChangeList({ period }),
    ]);
    const targets = changeRows.filter(
      (item) =>
        !isVoucherGenerated(item) &&
        getMonthText(item.change_period) === period &&
        Math.abs(toAmount(item.change_amount)) >= 0.005,
    );
    if (targets.length === 0) {
      ElMessage.warning('当前期间没有可生成凭证的变更记录');
      return;
    }

    const assetMap = new Map((assets || []).map((asset) => [getAssetId(asset), asset]));
    const lineResults = await Promise.all(
      targets.map((item) => buildChangeVoucherLine(item, assetMap.get(String(item.asset_id || '')))),
    );
    const lines = lineResults.filter(Boolean) as ChangeVoucherLine[];
    const total = roundMoney(sumByMoney(lines, (item) => item.value) as any);
    if (total <= 0) {
      ElMessage.warning('变更金额为 0，不能生成凭证');
      return;
    }

    openFinanceVoucherCreateFromAssetChange(targets, lines, period);
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '生成凭证草稿失败');
  } finally {
    voucherLoading.value = false;
  }
}

onMounted(() => {
  query.period = query.period || getCurrentMonth();
  window.addEventListener(
    'finance-asset-change-saved',
    onExternalAssetChangeSaved,
  );
  reload();
});

onBeforeUnmount(() => {
  window.removeEventListener(
    'finance-asset-change-saved',
    onExternalAssetChangeSaved,
  );
});
</script>

<template>
  <div class="h-full">
    <div class="flex h-full flex-col">
      <div
        class="asset-change-panel border-border bg-card min-h-0 flex-1 rounded-md border shadow-sm"
      >
        <div class="table-toolbar">
          <div class="table-toolbar__filters">
            <div class="filter-item filter-item--search">
              <span class="filter-label">变更搜索</span>
              <ElInput
                v-model="query.keyword"
                class="search-input"
                placeholder="资产编号/名称/变更类型/凭证号"
                clearable
                @clear="reload"
                @keyup.enter="reload"
              />
            </div>
            <div class="filter-item">
              <span class="filter-label">变更期间</span>
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
              <span class="filter-label">凭证状态</span>
              <ElSelect
                v-model="query.voucherGenerated"
                class="status-select"
                clearable
                placeholder="全部"
                @change="reload"
                @clear="reload"
              >
                <ElOption :value="1" label="已生成凭证" />
                <ElOption :value="0" label="未生成凭证" />
              </ElSelect>
            </div>
          </div>
          <div class="table-toolbar__actions">
            <ElButton type="primary" @click="reload">查询</ElButton>
            <ElButton @click="reload">刷新</ElButton>
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
          <ElTableColumn type="selection" width="48" />
          <ElTableColumn prop="change_type" label="变动类别" width="180" />
          <ElTableColumn prop="asset_code" label="资产编号" width="180" />
          <ElTableColumn prop="asset_name" label="资产名称" min-width="180" />
          <ElTableColumn label="变动前内容" min-width="180">
            <template #default="{ row }">
              {{ getBeforeContent(row) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="变动后内容" min-width="180">
            <template #default="{ row }">
              {{ getAfterContent(row) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="变动时间" width="180">
            <template #default="{ row }">
              {{ formatPeriodText(row.change_period) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="关联凭证" min-width="180">
            <template #default="{ row }">
              {{ getRelatedVoucher(row) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="170" fixed="right">
            <template #default="{ row }">
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
    </div>
  </div>
</template>

<style scoped>
.asset-change-panel {
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
</style>
