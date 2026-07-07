<script lang="ts" setup>
import type { AssetCategory } from '#/api/erp/finance/assets/category';
import type { AssetRecord } from '#/api/erp/finance/assets/manage';
import type { FinanceAuxValueOption } from '#/api/erp/finance/settings/auxiliary/finance-aux-values';

import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useRouter } from 'vue-router';

import { divMoney, moneyNumber, moneyText as formatMoneyText, mulMoney, subMoney } from '#/utils/finance/decimal-money';


import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { fetchAssetCategorySimpleList } from '#/api/erp/finance/assets/category';
import { fetchAssetList, hardDeleteAsset, saveAsset } from '#/api/erp/finance/assets/manage';
import { getFinanceAuxiliaryValueOptions } from '#/api/erp/finance/settings/auxiliary/finance-aux-values';
import AccumulatedDepreciationAdjustDialog from '#/views/finance/assets/manage/modules/AccumulatedDepreciationAdjustDialog.vue';
import DepartmentAdjustDialog from '#/views/finance/assets/manage/modules/DepartmentAdjustDialog.vue';
import DepreciationMethodAdjustDialog from '#/views/finance/assets/manage/modules/DepreciationMethodAdjustDialog.vue';
import Form from '#/views/finance/assets/manage/modules/form.vue';
import OriginalValueAdjustDialog from '#/views/finance/assets/manage/modules/OriginalValueAdjustDialog.vue';
import ServiceLifeAdjustDialog from '#/views/finance/assets/manage/modules/ServiceLifeAdjustDialog.vue';
import StatusChangeDialog from '#/views/finance/assets/manage/modules/StatusChangeDialog.vue';
import SubjectAdjustDialog from '#/views/finance/assets/manage/modules/SubjectAdjustDialog.vue';
import { createAssetChangeWithVoucher } from '#/views/finance/assets/manage/modules/assetChangeVoucher';
import {
  getLocalDate,
  getLocalMonth,
  recordAssetDeleteChange,
} from '#/views/finance/assets/utils';

defineOptions({ name: 'FinanceAssetManage' });

type AssetChangeVoucherDraft = {
  attachmentsCount?: number;
  date?: number;
  entries?: Array<Record<string, any>>;
  note?: string;
  returnPath?: string;
  rowIds?: string[];
  source?: 'asset-change';
  voucherWord?: string;
};

type AssetSubtotalRow = Partial<AssetRecord> & {
  __groupLabel: string;
  __rowType: 'subtotal';
};

type AssetDisplayRow = AssetRecord | AssetSubtotalRow;

const router = useRouter();

const loading = ref(false);
const rows = ref<AssetRecord[]>([]);
const categoryOptions = ref<AssetCategory[]>([]);
const departmentOptions = ref<FinanceAuxValueOption[]>([]);
const propertyOrder = ['固定资产', '无形资产', '长期待摊费用'];

const query = reactive({
  keyword: '',
  categoryId: '',
  assetStatus: '' as '' | number,
  usingDepartment: '',
  amortizationType: '',
});

const showForm = ref(false);
const formReadonly = ref(false);
const showOriginalValueAdjustDialog = ref(false);
const showAccumulatedDepreciationAdjustDialog = ref(false);
const showServiceLifeAdjustDialog = ref(false);
const showSubjectAdjustDialog = ref(false);
const showDepartmentAdjustDialog = ref(false);
const showDepreciationMethodAdjustDialog = ref(false);
const showStatusChangeDialog = ref(false);
const currentRow = ref<AssetRecord | null>(null);
const showDisposeDialog = ref(false);
const disposing = ref(false);
const disposeRow = ref<AssetRecord | null>(null);

const disposeForm = reactive({
  clearing_expense: 0,
  disposal_date: '',
  disposal_income: 0,
  disposal_method: '出售',
  disposal_period: '',
  disposal_reason: '',
});

const disposeNetValue = computed(() =>
  disposeRow.value ? getNetValue(disposeRow.value) : 0,
);
const disposeProfit = computed(() =>
  moneyNumber(
    disposeForm.disposal_income -
      disposeForm.clearing_expense -
      disposeNetValue.value,
  ),
);

function toAmount(value: unknown) {
  return moneyNumber(value as any);
}

function isSubtotalRow(row?: AssetDisplayRow | null): row is AssetSubtotalRow {
  return row?.__rowType === 'subtotal';
}

function roundMoney(value: number) {
  return moneyNumber(value);
}

function getResidualRateValue(row: AssetRecord) {
  const rawRate = toAmount(row.residual_rate);
  return rawRate > 1 ? rawRate / 100 : rawRate;
}

function getResidualValue(row: AssetRecord) {
  return roundMoney(
    mulMoney(toAmount(row.purchase_price), getResidualRateValue(row), 'round', 6) as any,
  );
}

function getRemainingMonths(row: AssetRecord) {
  const remainingMonths = toAmount((row as any).remaining_months);
  if (remainingMonths > 0) return remainingMonths;

  const months = toAmount(row.depreciation_month);
  const depreciatedMonths = toAmount(row.opening_depreciated_months);
  return Math.max(0, months - depreciatedMonths);
}

function getCurrentDepreciationAmount(row: AssetRecord) {
  const remainingMonths = getRemainingMonths(row);
  if (remainingMonths <= 0) return 0;

  const remainingDepreciableAmount = subMoney(
    getNetValue(row),
    getResidualValue(row),
    'round',
    6,
  );
  return roundMoney(divMoney(remainingDepreciableAmount, remainingMonths) as any);
}

function getAssetKey(row: AssetRecord) {
  return String(row.id || row.rowid || '').trim();
}

function getCategoryDisplay(item: AssetCategory) {
  return [item.category_code, item.category_name].filter(Boolean).join(' ');
}

function getAssetPropertyText(row: Partial<AssetRecord>) {
  return String(row.asset_property || row.asset_category_name || '-').trim() || '-';
}

function getAssetPropertySortWeight(row: AssetRecord) {
  const property = getAssetPropertyText(row);
  const index = propertyOrder.findIndex((item) => property.includes(item));
  return index === -1 ? propertyOrder.length : index;
}

function buildSubtotalRow(
  groupLabel: string,
  sourceRows: AssetRecord[],
): AssetSubtotalRow {
  return {
    __groupLabel: groupLabel,
    __rowType: 'subtotal',
    accumulated_depreciation: sourceRows.reduce(
      (sum, item) => sum + toAmount(item.accumulated_depreciation),
      0,
    ),
    asset_category_name: `${groupLabel}小计`,
    current_depreciation: sourceRows.reduce(
      (sum, item) => sum + getCurrentDepreciationAmount(item),
      0,
    ),
    net_asset_value: sourceRows.reduce((sum, item) => sum + getNetValue(item), 0),
    purchase_price: sourceRows.reduce(
      (sum, item) => sum + toAmount(item.purchase_price),
      0,
    ),
  };
}

const groupedRows = computed<AssetDisplayRow[]>(() => {
  const sorted = [...rows.value].sort((a, b) => {
    const propertyDiff = getAssetPropertySortWeight(a) - getAssetPropertySortWeight(b);
    if (propertyDiff !== 0) return propertyDiff;

    const propertyCompare = getAssetPropertyText(a).localeCompare(
      getAssetPropertyText(b),
      'zh-Hans-CN',
    );
    if (propertyCompare !== 0) return propertyCompare;

    const categoryCompare = String(a.asset_category_name || '').localeCompare(
      String(b.asset_category_name || ''),
      'zh-Hans-CN',
    );
    if (categoryCompare !== 0) return categoryCompare;

    return String(a.asset_code || '').localeCompare(
      String(b.asset_code || ''),
      'zh-Hans-CN',
    );
  });

  const result: AssetDisplayRow[] = [];
  let currentGroup = '';
  let groupRows: AssetRecord[] = [];

  const flushGroup = () => {
    if (!currentGroup || groupRows.length === 0) return;
    result.push(buildSubtotalRow(currentGroup, groupRows));
    groupRows = [];
  };

  sorted.forEach((row) => {
    const property = getAssetPropertyText(row);
    if (property !== currentGroup) {
      flushGroup();
      currentGroup = property;
    }
    result.push(row);
    groupRows.push(row);
  });

  flushGroup();
  return result;
});

function assetPropertySpanMethod({
  columnIndex,
  row,
  rowIndex,
}: {
  columnIndex: number;
  row: AssetDisplayRow;
  rowIndex: number;
}) {
  if (columnIndex !== 3) return { colspan: 1, rowspan: 1 };
  if (isSubtotalRow(row)) return { colspan: 1, rowspan: 1 };

  const current = groupedRows.value[rowIndex];
  if (!current || isSubtotalRow(current)) return { colspan: 1, rowspan: 1 };

  const currentProperty = getAssetPropertyText(current);
  const previous = groupedRows.value[rowIndex - 1];
  if (
    previous &&
    !isSubtotalRow(previous) &&
    getAssetPropertyText(previous) === currentProperty
  ) {
    return { colspan: 0, rowspan: 0 };
  }

  let rowspan = 1;
  for (let index = rowIndex + 1; index < groupedRows.value.length; index += 1) {
    const next = groupedRows.value[index];
    if (!next || isSubtotalRow(next)) break;
    if (getAssetPropertyText(next) !== currentProperty) break;
    rowspan += 1;
  }

  return { colspan: 1, rowspan };
}

function tableRowClassName({ row }: { row: AssetDisplayRow }) {
  return isSubtotalRow(row) ? 'asset-list-subtotal-row' : '';
}

function getDepartmentName(item: FinanceAuxValueOption) {
  return String(item?.raw?.department_name || item?.raw?.value_name || item?.label || '').trim();
}

async function loadDepartmentOptions() {
  const options = await getFinanceAuxiliaryValueOptions({ dimCodes: ['DEPT'] });
  departmentOptions.value = options.DEPT || [];
}

function getNetValue(row: AssetRecord) {
  const value = row.net_asset_value;
  if (value !== undefined && value !== null && value !== '') {
    return toAmount(value);
  }

  return moneyNumber(subMoney(row.purchase_price, row.accumulated_depreciation));
}

function updateLocalRow(row: AssetRecord) {
  const key = getAssetKey(row);
  if (!key) return;

  const index = rows.value.findIndex((item) => getAssetKey(item) === key);
  if (index === -1) {
    rows.value = [row, ...rows.value];
    return;
  }

  rows.value.splice(index, 1, { ...rows.value[index], ...row });
}

function removeLocalRow(row: AssetRecord) {
  const key = getAssetKey(row);
  if (!key) return;

  rows.value = rows.value.filter((item) => getAssetKey(item) !== key);
}

function notifyAssetBalanceRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('finance-asset-change-saved', {
      detail: { source: 'asset-list-delete' },
    }),
  );
}


function moneyText(value?: number | string) {
  return formatMoneyText(value as any);
}

function statusText(status?: number | string) {
  const value = Number(status || 1);
  if (value === 2) return '闲置';
  if (value === 3) return '已处置';
  return '在用';
}

function depreciationTitle(row: AssetRecord) {
  const property = String(row.asset_property || row.asset_category_name || '');
  return property.includes('无形') || property.includes('长期待摊')
    ? '摊销'
    : '折旧';
}

async function loadCategoryOptions() {
  categoryOptions.value = await fetchAssetCategorySimpleList();
}

async function reload() {
  if (keywordSearchTimer) {
    window.clearTimeout(keywordSearchTimer);
    keywordSearchTimer = null;
  }

  loading.value = true;
  try {
    const list = await fetchAssetList({
      keyword: query.keyword,
      categoryId: query.categoryId,
      assetStatus: query.assetStatus,
      usingDepartment: query.usingDepartment,
      amortizationType: query.amortizationType,
    });

    rows.value = list;
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}
let keywordSearchTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleKeywordSearch() {
  if (keywordSearchTimer) {
    clearTimeout(keywordSearchTimer);
    keywordSearchTimer = null; // 可选，但习惯上清掉
  }

  keywordSearchTimer = setTimeout(() => {
    keywordSearchTimer = null;
    reload();
  }, 350);
}

function openAdd() {
  formReadonly.value = false;
  currentRow.value = null;
  showForm.value = true;
}

function openView(row: AssetRecord) {
  formReadonly.value = true;
  currentRow.value = { ...row, id: String(row.id || row.rowid || '') };
  showForm.value = true;
}

function openEdit(row: AssetRecord) {
  formReadonly.value = false;
  currentRow.value = { ...row, id: String(row.id || row.rowid || '') };
  showForm.value = true;
}

function openAttachment(row: AssetRecord) {
  const assetName = [row.asset_code, row.asset_name].filter(Boolean).join(' ');
  ElMessage.info((assetName ? assetName + '：' : '') + '附件功能待接入');
}

type AssetAdjustType =
  | 'accumulatedDepreciation'
  | 'department'
  | 'depreciationMethod'
  | 'originalValue'
  | 'serviceLife'
  | 'status'
  | 'subject';

function openAdjust(row: AssetRecord, type: AssetAdjustType) {
  currentRow.value = { ...row, id: String(row.id || row.rowid || '') };
  showOriginalValueAdjustDialog.value = type === 'originalValue';
  showAccumulatedDepreciationAdjustDialog.value = type === 'accumulatedDepreciation';
  showServiceLifeAdjustDialog.value = type === 'serviceLife';
  showSubjectAdjustDialog.value = type === 'subject';
  showDepartmentAdjustDialog.value = type === 'department';
  showDepreciationMethodAdjustDialog.value = type === 'depreciationMethod';
  showStatusChangeDialog.value = type === 'status';
}

function onAdjustSuccess(data: AssetRecord) {
  updateLocalRow(data);
}

function openAssetChangeVoucherDraft(draft: AssetChangeVoucherDraft) {
  if (!draft) return;
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
      moduleScope: 'finance',
      returnPath: draft.returnPath || '/finance/assets/manage?tab=list',
      source: 'asset-change',
    },
  });
}

function onExternalAssetChangeVoucherDraft(event: Event) {
  openAssetChangeVoucherDraft((event as CustomEvent<AssetChangeVoucherDraft>).detail);
}

function openDispose(row: AssetRecord) {
  if (Number(row.asset_status || 1) === 3) {
    ElMessage.info('该资产已处置');
    return;
  }
  disposeRow.value = row;
  Object.assign(disposeForm, {
    clearing_expense: 0,
    disposal_date: getLocalDate(),
    disposal_income: 0,
    disposal_method: '出售',
    disposal_period: getLocalMonth(),
    disposal_reason: '',
  });
  showDisposeDialog.value = true;
}

async function confirmDispose() {
  const row = disposeRow.value;
  if (!row) return;
  const id = getAssetKey(row);
  if (!id) {
    ElMessage.warning('未找到资产主键，无法处置');
    return;
  }
  if (!disposeForm.disposal_date) {
    ElMessage.warning('请选择处置日期');
    return;
  }

  disposing.value = true;
  try {
    const netValue = disposeNetValue.value;
    const next = { ...row, asset_status: 3 };
    await saveAsset(next);
    await createAssetChangeWithVoucher({
      asset: next,
      change: {
        asset_id: id,
      asset_code: String(row.asset_code || ''),
      asset_name: String(row.asset_name || ''),
      before_value: row.purchase_price,
      after_value: 0,
      change_amount: -netValue,
      change_date: disposeForm.disposal_date,
      change_period: disposeForm.disposal_period || getLocalMonth(),
      change_reason: [
        '资产处置',
        disposeForm.disposal_method,
        disposeForm.disposal_reason,
      ]
        .filter(Boolean)
        .join('；'),
      change_type: '资产处置',
      remark: [
        '处置收入：' + (disposeForm.disposal_income || 0),
        '清理费用：' + (disposeForm.clearing_expense || 0),
        '处置损益：' + disposeProfit.value,
      ].join('；'),
        voucher_generated: 0,
      },
    });
    updateLocalRow(next);
    showDisposeDialog.value = false;
    ElMessage.success('处置成功');
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '处置失败');
  } finally {
    disposing.value = false;
  }
}

async function onDelete(row: AssetRecord) {
  try {
    const id = getAssetKey(row);
    if (!id) {
      ElMessage.warning('未找到资产主键，无法删除');
      return;
    }

    await ElMessageBox.confirm(
      `确定删除资产 ${row.asset_code || row.asset_name || ''} 吗？`,
      '删除确认',
      { type: 'warning' },
    );

    await recordAssetDeleteChange(row, '资产列表删除');
    await hardDeleteAsset(id, row.lingma_sys_key);
    removeLocalRow(row);
    notifyAssetBalanceRefresh();
    ElMessage.success('删除成功');
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;

    console.error(error);
    ElMessage.error(error?.message || '删除失败');
  }
}

function onFormSuccess(data: AssetRecord) {
  updateLocalRow(data);
}

watch(() => query.keyword, scheduleKeywordSearch);

onMounted(async () => {
  await Promise.all([loadCategoryOptions(), loadDepartmentOptions()]);
  window.addEventListener(
    'finance-asset-change-voucher-draft',
    onExternalAssetChangeVoucherDraft,
  );
  await reload();
});

onBeforeUnmount(() => {
  if (keywordSearchTimer) window.clearTimeout(keywordSearchTimer);
  window.removeEventListener(
    'finance-asset-change-voucher-draft',
    onExternalAssetChangeVoucherDraft,
  );
});
</script>

<template>
  <div class="h-full">
    <div class="flex h-full flex-col">
      <div
        class="asset-manage-panel border-border bg-card min-h-0 flex-1 rounded-md border shadow-sm"
      >
        <div class="table-toolbar">
          <div class="table-toolbar__filters">
            <div class="filter-item filter-item--search">
              <span class="filter-label">资产搜索</span>
              <ElInput
                v-model="query.keyword"
                class="asset-search-input"
                placeholder="资产编号/名称/类别/规格型号/部门"
                clearable
                @clear="reload"
                @keyup.enter="reload"
              />
            </div>

            <div class="filter-item">
              <span class="filter-label">资产类别</span>
              <ElSelect
                v-model="query.categoryId"
                class="category-select"
                clearable
                filterable
                placeholder="全部"
                @change="reload"
                @clear="reload"
              >
                <ElOption
                  v-for="item in categoryOptions"
                  :key="String(item.id || item.rowid || '')"
                  :label="getCategoryDisplay(item)"
                  :value="String(item.id || item.rowid || '')"
                />
              </ElSelect>
            </div>

            <div class="filter-item">
              <span class="filter-label">使用部门</span>
              <ElSelect
                v-model="query.usingDepartment"
                class="department-select"
                clearable
                filterable
                placeholder="全部"
                @change="reload"
                @clear="reload"
              >
                <ElOption
                  v-for="item in departmentOptions"
                  :key="String(item.value || item.raw?.row_id || item.raw?.rowid || item.label)"
                  :label="getDepartmentName(item)"
                  :value="getDepartmentName(item)"
                />
              </ElSelect>
            </div>

            <div class="filter-item">
              <span class="filter-label">资产类型</span>
              <ElSelect
                v-model="query.amortizationType"
                class="type-select"
                clearable
                placeholder="全部"
                @change="reload"
                @clear="reload"
              >
                <ElOption label="固定资产" value="fixed" />
                <ElOption label="无形资产" value="intangible" />
                <ElOption label="长期待摊费用" value="deferred" />
              </ElSelect>
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
                <ElOption :value="3" label="已处置" />
              </ElSelect>
            </div>
          </div>

          <div class="table-toolbar__actions">
            <ElButton type="primary" @click="reload">查询</ElButton>
            <ElButton @click="reload">刷新</ElButton>
            <ElButton type="primary" @click="openAdd">新增资产</ElButton>
          </div>
        </div>

        <ElTable
          v-loading="loading"
          :data="groupedRows"
          border
          height="100%"
          :span-method="assetPropertySpanMethod"
          :row-class-name="tableRowClassName"
        >
          <ElTableColumn
            prop="asset_code"
            label="资产编号"
            width="140"
            fixed="left"
          >
            <template #default="{ row }">
              <span v-if="!isSubtotalRow(row)">{{ row.asset_code }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn
            prop="asset_name"
            label="资产名称"
            min-width="180"
            fixed="left"
          >
            <template #default="{ row }">
              <span v-if="!isSubtotalRow(row)">{{ row.asset_name }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn
            prop="asset_category_name"
            label="资产类别"
            width="150"
          >
            <template #default="{ row }">
              <span v-if="isSubtotalRow(row)" class="subtotal-label">
                {{ row.asset_category_name }}
              </span>
              <span v-else>{{ row.asset_category_name }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn prop="asset_property" label="资产属性" width="120">
            <template #default="{ row }">
              <ElTag v-if="!isSubtotalRow(row)" effect="plain">
                {{ getAssetPropertyText(row) }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn prop="model" label="规格型号" width="150">
            <template #default="{ row }">
              <span
                v-if="!isSubtotalRow(row)"
                class="asset-model-cell"
                :title="String(row.model || '')"
              >
                {{ row.model }}
              </span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="purchase_date" label="购置日期" width="120">
            <template #default="{ row }">
              <span v-if="!isSubtotalRow(row)">{{ row.purchase_date }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="begin_date" label="开始使用日期" width="130">
            <template #default="{ row }">
              <span v-if="!isSubtotalRow(row)">{{ row.begin_date }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="using_department"
            label="使用部门"
            width="130"
          >
            <template #default="{ row }">
              <span v-if="!isSubtotalRow(row)">{{ row.using_department }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="storage_location"
            label="存放地点"
            width="130"
          >
            <template #default="{ row }">
              <span v-if="!isSubtotalRow(row)">{{ row.storage_location }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="资产原值" width="130" align="right">
            <template #default="{ row }">
              {{ moneyText(row.purchase_price) }}
            </template>
          </ElTableColumn>

          <ElTableColumn
            prop="depreciation_method"
            label="折旧/摊销方法"
            width="140"
          >
            <template #default="{ row }">
              <span v-if="!isSubtotalRow(row)">{{ row.depreciation_method }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn
            prop="depreciation_month"
            label="期限(月)"
            width="95"
            align="right"
          >
            <template #default="{ row }">
              <span v-if="!isSubtotalRow(row)">{{ row.depreciation_month }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="本月折旧/摊销" width="135" align="right">
            <template #default="{ row }">
              <span v-if="isSubtotalRow(row)">
                {{ moneyText(row.current_depreciation) }}
              </span>
              <span v-else>
                {{ moneyText(getCurrentDepreciationAmount(row)) }}
              </span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="累计折旧/摊销" width="135" align="right">
            <template #default="{ row }">
              <span v-if="isSubtotalRow(row)">
                {{ moneyText(row.accumulated_depreciation) }}
              </span>
              <span v-else :title="`累计${depreciationTitle(row)}`">
                {{ moneyText(row.accumulated_depreciation) }}
              </span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="账面净值" width="130" align="right">
            <template #default="{ row }">
              <span v-if="isSubtotalRow(row)">
                {{ moneyText(row.net_asset_value) }}
              </span>
              <span v-else>
                {{ moneyText(getNetValue(row)) }}
              </span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="状态" width="90" align="center">
            <template #default="{ row }">
              <ElTag v-if="!isSubtotalRow(row)">{{ statusText(row.asset_status) }}</ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn prop="remark" label="备注" min-width="160">
            <template #default="{ row }">
              <span v-if="!isSubtotalRow(row)">{{ row.remark }}</span>
            </template>
          </ElTableColumn>

          <ElTableColumn label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <div v-if="!isSubtotalRow(row)" class="asset-action-cell">
                <ElDropdown
                  trigger="click"
                  @command="(command) => openAdjust(row, command as AssetAdjustType)"
                >
                  <ElButton
                    class="asset-action-link"
                    link
                    type="primary"
                    :disabled="Number(row.asset_status || 1) === 3"
                  >
                    变更
                  </ElButton>
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem command="originalValue">原值调整</ElDropdownItem>
                      <ElDropdownItem command="accumulatedDepreciation">累计折旧调整</ElDropdownItem>
                      <ElDropdownItem command="serviceLife">使用年限调整</ElDropdownItem>
                      <ElDropdownItem command="subject">科目调整</ElDropdownItem>
                      <ElDropdownItem command="department">部门调整</ElDropdownItem>
                      <ElDropdownItem command="depreciationMethod">折旧方法调整</ElDropdownItem>
                      <ElDropdownItem command="status">状态修改</ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
                <ElButton
                  class="asset-action-link"
                  link
                  type="primary"
                  :disabled="Number(row.asset_status || 1) === 3"
                  @click="openDispose(row)"
                >
                  处置
                </ElButton>
                <ElButton class="asset-action-link" link type="primary" @click="openView(row)">
                  查看
                </ElButton>
                <ElButton class="asset-action-link" link type="primary" @click="openEdit(row)">
                  编辑
                </ElButton>
                <ElButton class="asset-action-link" link type="primary" @click="openAttachment(row)">
                  附件
                </ElButton>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>

      <Form
        v-model="showForm"
        :data="currentRow"
        :readonly="formReadonly"
        source="list"
        @success="onFormSuccess"
      />
      <OriginalValueAdjustDialog
        v-model="showOriginalValueAdjustDialog"
        :data="currentRow"
        @success="onAdjustSuccess"
      />
      <AccumulatedDepreciationAdjustDialog
        v-model="showAccumulatedDepreciationAdjustDialog"
        :data="currentRow"
        @success="onAdjustSuccess"
      />
      <ServiceLifeAdjustDialog
        v-model="showServiceLifeAdjustDialog"
        :data="currentRow"
        @success="onAdjustSuccess"
      />
      <SubjectAdjustDialog
        v-model="showSubjectAdjustDialog"
        :data="currentRow"
        @success="onAdjustSuccess"
      />
      <DepartmentAdjustDialog
        v-model="showDepartmentAdjustDialog"
        :data="currentRow"
        @success="onAdjustSuccess"
      />
      <DepreciationMethodAdjustDialog
        v-model="showDepreciationMethodAdjustDialog"
        :data="currentRow"
        @success="onAdjustSuccess"
      />
      <StatusChangeDialog
        v-model="showStatusChangeDialog"
        :data="currentRow"
        @success="onAdjustSuccess"
      />

      <ElDialog
        v-model="showDisposeDialog"
        title="资产处置"
        width="min(46rem, 92vw)"
        destroy-on-close
      >
        <ElForm label-width="110px">
          <div class="grid grid-cols-2 gap-x-4">
            <ElFormItem label="资产">
              <ElInput :model-value="[disposeRow?.asset_code, disposeRow?.asset_name].filter(Boolean).join(' ')" disabled />
            </ElFormItem>
            <ElFormItem label="账面净值">
              <ElInput :model-value="moneyText(disposeNetValue)" disabled />
            </ElFormItem>
            <ElFormItem label="处置日期" required>
              <ElDatePicker v-model="disposeForm.disposal_date" type="date" value-format="YYYY-MM-DD" class="w-full" />
            </ElFormItem>
            <ElFormItem label="处置期间">
              <ElDatePicker v-model="disposeForm.disposal_period" type="month" value-format="YYYY-MM" class="w-full" />
            </ElFormItem>
            <ElFormItem label="处置方式">
              <ElSelect v-model="disposeForm.disposal_method" class="w-full">
                <ElOption label="出售" value="出售" />
                <ElOption label="报废" value="报废" />
                <ElOption label="盘亏" value="盘亏" />
                <ElOption label="捐赠" value="捐赠" />
                <ElOption label="其他" value="其他" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="处置收入">
              <ElInputNumber v-model="disposeForm.disposal_income" :controls="false" class="w-full" />
            </ElFormItem>
            <ElFormItem label="清理费用">
              <ElInputNumber v-model="disposeForm.clearing_expense" :controls="false" class="w-full" />
            </ElFormItem>
            <ElFormItem label="处置损益">
              <ElInput :model-value="moneyText(disposeProfit)" disabled />
            </ElFormItem>
            <ElFormItem class="col-span-2" label="处置原因">
              <ElInput v-model="disposeForm.disposal_reason" type="textarea" :rows="3" placeholder="请输入处置原因" />
            </ElFormItem>
          </div>
        </ElForm>
        <template #footer>
          <ElButton @click="showDisposeDialog = false">取消</ElButton>
          <ElButton type="primary" :loading="disposing" @click="confirmDispose">确认处置</ElButton>
        </template>
      </ElDialog>
    </div>
  </div>
</template>

<style scoped>
.asset-manage-panel {
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
  min-width: 300px;
}

.filter-label {
  flex: 0 0 auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.asset-search-input {
  flex: 1;
}

.category-select {
  width: 210px;
}

.status-select {
  width: 140px;
}

.department-select {
  width: 170px;
}

.type-select {
  width: 150px;
}

.table-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.summary-bar {
  display: grid;
  grid-template-columns: repeat(5, minmax(130px, 1fr));
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-lighter);
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
}

.summary-card span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-card strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.asset-manage-panel :deep(.asset-list-subtotal-row),
.asset-manage-panel :deep(.asset-list-subtotal-row td) {
  background: var(--el-fill-color-lighter);
  font-weight: 600;
}

.asset-model-cell {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-action-cell {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  white-space: nowrap;
}

.asset-action-cell :deep(.el-button) {
  margin-left: 0;
  padding: 0;
}

.asset-action-cell :deep(.el-dropdown) {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.asset-action-link {
  width: 28px;
  justify-content: center;
}

.subtotal-label {
  color: var(--el-text-color-primary);
  font-weight: 600;
}
</style>
