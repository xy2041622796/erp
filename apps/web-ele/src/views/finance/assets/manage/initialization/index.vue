<script lang="ts" setup>
import type { AssetCategory } from '#/api/erp/finance/assets/category';
import type { AssetRecord } from '#/api/erp/finance/assets/manage';
import type { AssetDepreciationRecord } from '#/api/erp/finance/assets/summary';
import type { BilSubjectOpeningApi } from '#/api/erp/finance/settings/initial';

import { computed, onMounted, reactive, ref } from 'vue';

import { downloadFileFromBlobPart } from '@vben/utils';

import {
  ElButton,
  ElCheckbox,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';
import ExcelJS from 'exceljs';

import { fetchAssetCategorySimpleList } from '#/api/erp/finance/assets/category';
import {
  fetchAssetList,
  hardDeleteAsset,
  saveAsset,
} from '#/api/erp/finance/assets/manage';
import { fetchAssetDepreciationList } from '#/api/erp/finance/assets/summary';
import { getSubjectOpeningList } from '#/api/erp/finance/settings/initial';
import Form from '#/views/finance/assets/manage/modules/form.vue';
import {
  getLocalDate,
  getLocalMonth,
  recordAssetDeleteChange,
  recordAssetImportChange,
  recordAssetRecalculateChange,
  resolveAccountSetActivationMonth,
} from '#/views/finance/assets/utils';

defineOptions({ name: 'FinanceAssetInitialization' });

const loading = ref(false);
const importLoading = ref(false);
const exportLoading = ref(false);
const printLoading = ref(false);
const rows = ref<AssetRecord[]>([]);
const selectedRows = ref<AssetRecord[]>([]);
const depreciationRows = ref<AssetDepreciationRecord[]>([]);
const subjectOpeningRows = ref<BilSubjectOpeningApi.SubjectOpening[]>([]);
const categoryOptions = ref<AssetCategory[]>([]);
const query = reactive({
  assetStatus: 1 as '' | number,
  categoryId: '',
  keyword: '',
});
const showForm = ref(false);
const showAllInfo = ref(false);
const intangibleClosed = ref(false);
const currentRow = ref<AssetRecord | null>(null);
const importInputRef = ref<HTMLInputElement | null>(null);
const printFrameRef = ref<HTMLIFrameElement | null>(null);

type AssetColumn = {
  align?: 'left' | 'right';
  header: string;
  key: keyof AssetRecord;
  required?: boolean;
  width: number;
};

const assetColumns: AssetColumn[] = [
  { header: '资产编号', key: 'asset_code', required: true, width: 16 },
  { header: '资产名称', key: 'asset_name', required: true, width: 20 },
  { header: '资产类别', key: 'asset_category_name', width: 16 },
  { header: '资产类别编码', key: 'asset_category_code', width: 16 },
  { header: '资产属性', key: 'asset_property', width: 14 },
  { header: '规格型号', key: 'model', width: 16 },
  { header: '品牌', key: 'brand', width: 14 },
  { header: '录入期间', key: 'entry_period', width: 12 },
  { header: '购买日期', key: 'purchase_date', width: 14 },
  { header: '开始使用日期', key: 'begin_date', width: 14 },
  { header: '使用部门', key: 'using_department', width: 16 },
  { header: '使用项目', key: 'using_project', width: 16 },
  { header: '存放地点', key: 'storage_location', width: 16 },
  { align: 'right', header: '资产原值', key: 'purchase_price', width: 14 },
  {
    align: 'right',
    header: '期初累计折旧',
    key: 'opening_accumulated_depreciation',
    width: 16,
  },
  {
    align: 'right',
    header: '已折旧月份',
    key: 'opening_depreciated_months',
    width: 14,
  },
  {
    align: 'right',
    header: '累计折旧',
    key: 'accumulated_depreciation',
    width: 14,
  },
  { align: 'right', header: '资产净值', key: 'net_asset_value', width: 14 },
  { header: '折旧方法', key: 'depreciation_method', width: 16 },
  {
    align: 'right',
    header: '折旧期限(月)',
    key: 'depreciation_month',
    width: 14,
  },
  { align: 'right', header: '残值率(%)', key: 'residual_rate', width: 12 },
  { align: 'right', header: '月折旧额', key: 'month_depreciation', width: 14 },
  { header: '折旧费用类别', key: 'depreciation_expense_type', width: 18 },
  { header: '资产状态', key: 'asset_status', width: 12 },
  { header: '备注', key: 'remark', width: 28 },
];

const activationPeriod = computed(() => {
  const [year, month] = activationMonth.value.split('-');
  return `${year}年${Number(month)}月`;
});

const activationMonth = ref(getLocalMonth());

const activationMonthStartDate = computed(() => `${activationMonth.value}-01`);

const fixedInitializationRows = computed(() =>
  rows.value.filter((row) => isFixedAsset(row)),
);

const intangibleInitializationRows = computed(() =>
  rows.value.filter((row) => isIntangibleAsset(row)),
);

function getSubjectOpeningTotal(subjectCode: string) {
  const matchedRows = subjectOpeningRows.value.filter((row) =>
    String(row.subject_code || '').trim().startsWith(subjectCode),
  );
  const leafRows = matchedRows.filter((row) => Number(row.is_leaf_subject ?? 1) === 1);
  const targets = leafRows.length > 0 ? leafRows : matchedRows;
  return targets.reduce((sum, row) => sum + toNumberValue(row.beginning_balance), 0);
}

function getRowsOriginalValueTotal(sourceRows: AssetRecord[]) {
  return sourceRows.reduce((sum, row) => sum + toNumberValue(row.purchase_price), 0);
}

const fixedAssetCardTotal = computed(() =>
  getRowsOriginalValueTotal(fixedInitializationRows.value),
);

const intangibleAssetCardTotal = computed(() =>
  getRowsOriginalValueTotal(intangibleInitializationRows.value),
);

const fixedAssetSubjectOpeningTotal = computed(() => getSubjectOpeningTotal('1601'));

const intangibleAssetSubjectOpeningTotal = computed(() =>
  getSubjectOpeningTotal('1701'),
);

const fixedAssetBalanceDiff = computed(() =>
  Number((fixedAssetCardTotal.value - fixedAssetSubjectOpeningTotal.value).toFixed(2)),
);

const intangibleAssetBalanceDiff = computed(() =>
  Number((intangibleAssetCardTotal.value - intangibleAssetSubjectOpeningTotal.value).toFixed(2)),
);

const fixedAssetBalanceStatus = computed(() =>
  Math.abs(fixedAssetBalanceDiff.value) < 0.005 ? '平衡' : '不平衡',
);

const intangibleAssetBalanceStatus = computed(() =>
  Math.abs(intangibleAssetBalanceDiff.value) < 0.005 ? '平衡' : '不平衡',
);

const hasFixedAssetOpening = computed(() =>
  Math.abs(fixedAssetSubjectOpeningTotal.value) >= 0.005,
);

const hasIntangibleAssetOpening = computed(() =>
  Math.abs(intangibleAssetSubjectOpeningTotal.value) >= 0.005,
);

const isFixedOpeningLocked = computed(() =>
  (hasFixedAssetOpening.value || Math.abs(fixedAssetCardTotal.value) >= 0.005) &&
  fixedAssetBalanceStatus.value === '平衡',
);

const isIntangibleOpeningLocked = computed(() =>
  (hasIntangibleAssetOpening.value || Math.abs(intangibleAssetCardTotal.value) >= 0.005) &&
  intangibleAssetBalanceStatus.value === '平衡',
);

const isOpeningInitializationFullyBalanced = computed(() => {
  const hasAnyOpening =
    hasFixedAssetOpening.value ||
    hasIntangibleAssetOpening.value ||
    Math.abs(fixedAssetCardTotal.value) >= 0.005 ||
    Math.abs(intangibleAssetCardTotal.value) >= 0.005;
  if (!hasAnyOpening) return false;
  return (
    (!hasFixedAssetOpening.value && Math.abs(fixedAssetCardTotal.value) < 0.005 ||
      isFixedOpeningLocked.value) &&
    (!hasIntangibleAssetOpening.value &&
      Math.abs(intangibleAssetCardTotal.value) < 0.005 ||
      isIntangibleOpeningLocked.value)
  );
});

const displayedRows = computed(() => {
  if (!intangibleClosed.value) return rows.value;
  return rows.value.filter((row) => !isIntangibleAsset(row));
});

function formatDateValue(value: unknown, month = false) {
  if (value instanceof Date) {
    const text = getLocalDate(value);
    return month ? text.slice(0, 7) : text;
  }
  const text = normalizeText(value);
  if (!text) return '';
  return text.slice(0, month ? 7 : 10);
}

function formatMoney(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || Math.abs(amount) < 0.005) return '';
  return amount.toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function getAssetKey(row: AssetRecord) {
  return String(row.id || row.rowid || '').trim();
}

function getAssetBusinessMonth(row: AssetRecord) {
  return normalizeImportDate(
    row.begin_date || row.purchase_date || row.entry_period,
    true,
  );
}

function isInitializationAsset(row: AssetRecord) {
  const month = getAssetBusinessMonth(row);
  return (
    Number(row.asset_status || 1) === 1 &&
    (!month || month < activationMonth.value)
  );
}

function getLockedAssetKeys() {
  return new Set(
    depreciationRows.value
      .filter((row) => Number(row.depreciation_status || 0) !== 2)
      .map((row) => String(row.asset_id || '').trim())
      .filter(Boolean),
  );
}

function isInitializationLocked(row: AssetRecord) {
  if (getLockedAssetKeys().has(getAssetKey(row))) return true;
  if (isFixedAsset(row) && isFixedOpeningLocked.value) return true;
  if (isIntangibleAsset(row) && isIntangibleOpeningLocked.value) return true;
  return false;
}

function getInitializationLockMessage(row?: AssetRecord | null) {
  if (row && getLockedAssetKeys().has(getAssetKey(row))) {
    return '该资产已计提折旧/摊销，初始化数据不支持修改';
  }
  if (row && isFixedAsset(row) && isFixedOpeningLocked.value) {
    return '期初固定资产已与 1601 科目期初平衡，不能再修改';
  }
  if (row && isIntangibleAsset(row) && isIntangibleOpeningLocked.value) {
    return '期初无形资产已与 1701 科目期初平衡，不能再修改';
  }
  return '该初始化资产已锁定';
}

function getAssetStatusLabel(value: unknown) {
  const map: Record<string, string> = {
    1: '在用',
    2: '闲置',
    3: '处置',
  };
  return map[String(value ?? '')] || String(value ?? '');
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function isIntangibleAsset(row: AssetRecord) {
  const text = [
    row.asset_property,
    row.asset_category_name,
    row.asset_category_code,
  ].join(' ');
  return text.includes('无形');
}

function isFixedAsset(row: AssetRecord) {
  const explicitType = String(row.asset_amortization_type || '').trim();
  if (explicitType === 'fixed') return true;
  if (explicitType === 'intangible' || explicitType === 'deferred') return false;

  const text = [
    row.asset_property,
    row.asset_category_name,
    row.asset_category_code,
    row.asset_account_code,
  ].join(' ');
  if (text.includes('无形') || text.includes('长期待摊') || text.includes('待摊')) {
    return false;
  }
  return text.includes('固定资产') || text.includes('1601');
}

function toNumberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function createCopiedAsset(row: AssetRecord): AssetRecord {
  return {
    ...row,
    asset_code: row.asset_code ? `${row.asset_code}-COPY` : '',
    asset_name: row.asset_name ? `${row.asset_name} 副本` : '',
    id: '',
    lingma_sys_key: '',
    rowid: '',
  };
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

function removeLocalRows(keys: Set<string>) {
  rows.value = rows.value.filter((row) => !keys.has(getAssetKey(row)));
  selectedRows.value = selectedRows.value.filter(
    (row) => !keys.has(getAssetKey(row)),
  );
}

function onSelectionChange(selection: AssetRecord[]) {
  selectedRows.value = selection;
}

function ensureInitializationMaintainable(actionText = '维护') {
  if (!isOpeningInitializationFullyBalanced.value) return true;
  ElMessage.warning(`资产初始化已平衡锁定，不能再${actionText}期初资产`);
  return false;
}

function notifyAssetBalanceRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('finance-asset-change-saved', {
      detail: { source: 'asset-initialization' },
    }),
  );
}

function openCopy() {
  if (!ensureInitializationMaintainable('复制')) return;
  if (selectedRows.value.length !== 1) {
    ElMessage.warning('请选择一条资产后复制');
    return;
  }
  currentRow.value = createCopiedAsset(selectedRows.value[0] as AssetRecord);
  showForm.value = true;
}

function toggleIntangibleAssets() {
  intangibleClosed.value = !intangibleClosed.value;
  ElMessage.success(
    intangibleClosed.value ? '已隐藏无形资产' : '已显示无形资产',
  );
}

function clearFilters() {
  query.keyword = '';
  query.categoryId = '';
  query.assetStatus = 1;
  intangibleClosed.value = false;
  reload();
}

function buildExportRows(sourceRows: AssetRecord[]) {
  return sourceRows.map((row) => {
    const out: Record<string, any> = {};
    assetColumns.forEach((column) => {
      out[column.key] =
        column.key === 'asset_status'
          ? getAssetStatusLabel(row[column.key])
          : column.key === 'entry_period'
            ? formatDateValue(row[column.key], true)
            : column.key === 'purchase_date' || column.key === 'begin_date'
              ? formatDateValue(row[column.key])
              : row[column.key];
    });
    return out;
  });
}

function setSheetStyle(worksheet: ExcelJS.Worksheet) {
  worksheet.getRow(1).height = 24;
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      fgColor: { argb: 'D9EAF7' },
      pattern: 'solid',
      type: 'pattern',
    };
  });

  for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    worksheet.getRow(rowIndex).eachCell((cell, columnNumber) => {
      const column = assetColumns[columnNumber - 1];
      cell.border = {
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
        top: { style: 'thin' },
      };
      cell.alignment = {
        horizontal: column?.align || 'left',
        vertical: 'middle',
      };
      if (column?.align === 'right') cell.numFmt = '#,##0.00';
    });
  }
}

async function exportRows(sourceRows: AssetRecord[], fileName: string) {
  if (sourceRows.length === 0) {
    ElMessage.warning('当前没有可导出的资产数据');
    return;
  }

  exportLoading.value = true;
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('资产初始化');
    worksheet.columns = assetColumns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
    }));
    worksheet.addRows(buildExportRows(sourceRows));
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    setSheetStyle(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    downloadFileFromBlobPart({ fileName, source: blob });
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '导出失败');
  } finally {
    exportLoading.value = false;
  }
}

async function exportTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('资产初始化导入模板');
  worksheet.columns = assetColumns.map((column) => ({
    header: column.required ? `${column.header}*` : column.header,
    key: column.key,
    width: column.width,
  }));
  worksheet.addRow({
    asset_code: 'ZC001',
    asset_name: '示例资产',
    asset_status: '在用',
    begin_date: activationMonthStartDate.value,
    entry_period: activationMonth.value,
    purchase_date: activationMonthStartDate.value,
    purchase_price: 1000,
  });
  setSheetStyle(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadFileFromBlobPart({
    fileName: '资产初始化导入模板.xlsx',
    source: blob,
  });
}

function getImportValue(
  row: ExcelJS.Row,
  headerIndex: Map<string, number>,
  header: string,
) {
  const index = headerIndex.get(header) || headerIndex.get(`${header}*`);
  if (!index) return '';
  const value = row.getCell(index).value as any;
  if (value && typeof value === 'object' && 'text' in value) return value.text;
  if (value instanceof Date) return getLocalDate(value);
  return value ?? '';
}

function normalizeImportedAssetStatus(value: unknown) {
  const text = normalizeText(value);
  if (text === '在用') return 1;
  if (text === '闲置') return 2;
  if (text === '处置') return 3;
  return Number(text || 1);
}

function normalizeImportDate(value: unknown, month = false) {
  if (value instanceof Date) {
    const text = getLocalDate(value);
    return text.slice(0, month ? 7 : 10);
  }
  const text = normalizeText(value);
  if (!text) return '';
  return text.slice(0, month ? 7 : 10);
}

function escapeHtml(value: unknown) {
  return normalizeText(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildAssetFromImportRow(
  row: ExcelJS.Row,
  headerIndex: Map<string, number>,
) {
  const asset: AssetRecord = {};
  assetColumns.forEach((column) => {
    const value = getImportValue(row, headerIndex, column.header);
    if (value === '') return;
    (asset as any)[column.key] = value;
  });

  asset.asset_code = normalizeText(asset.asset_code);
  asset.asset_name = normalizeText(asset.asset_name);
  asset.asset_category_name = normalizeText(asset.asset_category_name);
  asset.asset_category_code = normalizeText(asset.asset_category_code);
  asset.asset_property = normalizeText(asset.asset_property);
  asset.model = normalizeText(asset.model);
  asset.brand = normalizeText(asset.brand);
  asset.purchase_date = normalizeImportDate(asset.purchase_date);
  asset.begin_date = normalizeImportDate(asset.begin_date);
  asset.entry_period = normalizeImportDate(asset.entry_period, true);
  asset.purchase_price = toNumberValue(asset.purchase_price);
  asset.opening_accumulated_depreciation = toNumberValue(
    asset.opening_accumulated_depreciation,
  );
  asset.opening_depreciated_months = toNumberValue(
    asset.opening_depreciated_months,
  );
  asset.accumulated_depreciation = toNumberValue(
    asset.accumulated_depreciation || asset.opening_accumulated_depreciation,
  );
  asset.net_asset_value = toNumberValue(
    asset.net_asset_value ||
      toNumberValue(asset.purchase_price) -
        toNumberValue(asset.accumulated_depreciation),
  );
  asset.depreciation_month = toNumberValue(asset.depreciation_month);
  asset.residual_rate = toNumberValue(asset.residual_rate);
  asset.month_depreciation = toNumberValue(asset.month_depreciation);
  asset.asset_status = normalizeImportedAssetStatus(asset.asset_status);

  const category = categoryOptions.value.find((item) => {
    return (
      normalizeText(item.category_code) === asset.asset_category_code ||
      normalizeText(item.category_name) === asset.asset_category_name
    );
  });
  if (category) {
    asset.asset_category_id = normalizeText(category.id || category.rowid);
    asset.asset_category_code = normalizeText(category.category_code);
    asset.asset_category_name = normalizeText(category.category_name);
    asset.asset_property =
      asset.asset_property || normalizeText(category.asset_property);
  }

  return asset;
}

async function loadCategoryOptions() {
  categoryOptions.value = await fetchAssetCategorySimpleList();
}

async function loadActivationMonth() {
  activationMonth.value = await resolveAccountSetActivationMonth();
}

async function reload() {
  loading.value = true;
  try {
    const [assetRows, depreciationList, fixedOpening, intangibleOpening] = await Promise.all([
      fetchAssetList({ ...query, assetStatus: 1 }),
      fetchAssetDepreciationList(),
      getSubjectOpeningList({ keyword: '1601' }),
      getSubjectOpeningList({ keyword: '1701' }),
    ]);
    depreciationRows.value = depreciationList;
    subjectOpeningRows.value = [
      ...((fixedOpening.list || []) as BilSubjectOpeningApi.SubjectOpening[]),
      ...((intangibleOpening.list || []) as BilSubjectOpeningApi.SubjectOpening[]),
    ];
    rows.value = assetRows.filter((row) => isInitializationAsset(row));
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function openAdd() {
  if (!ensureInitializationMaintainable('新增')) return;
  currentRow.value = {
    asset_status: 1,
    entry_period: activationMonth.value,
  };
  showForm.value = true;
}

function openEdit(row: AssetRecord) {
  if (!ensureInitializationMaintainable('修改')) return;
  if (isInitializationLocked(row)) {
    ElMessage.warning(getInitializationLockMessage(row));
    return;
  }
  currentRow.value = { ...row, id: String(row.id || row.rowid || '') };
  showForm.value = true;
}

async function onDelete(row: AssetRecord) {
  if (!ensureInitializationMaintainable('删除')) return;
  try {
    const id = getAssetKey(row);
    if (!id) {
      ElMessage.warning('未找到资产主键，无法删除');
      return;
    }
    if (isInitializationLocked(row)) {
      ElMessage.warning(getInitializationLockMessage(row));
      return;
    }

    await ElMessageBox.confirm(
      `确定删除资产 ${row.asset_code || row.asset_name || ''} 吗？`,
      '删除确认',
      { type: 'warning' },
    );
    await recordAssetDeleteChange(row, '资产初始化删除');
    await hardDeleteAsset(id, row.lingma_sys_key);
    notifyAssetBalanceRefresh();
    ElMessage.success('删除成功');
    removeLocalRows(new Set([id]));
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    console.error(error);
    ElMessage.error(error?.message || '删除失败');
  }
}

async function deleteSelectedRows() {
  if (!ensureInitializationMaintainable('删除')) return;
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择需要删除的资产');
    return;
  }

  try {
    const lockedRows = selectedRows.value.filter((row) =>
      isInitializationLocked(row),
    );
    if (lockedRows.length > 0) {
      ElMessage.warning('选中资产包含已锁定的期初资产，不能删除');
      return;
    }

    await ElMessageBox.confirm(
      `确定删除选中的 ${selectedRows.value.length} 条资产吗？`,
      '删除确认',
      { type: 'warning' },
    );
    await Promise.all(
      selectedRows.value.map(async (row) => {
        await recordAssetDeleteChange(row, '资产初始化批量删除');
        await hardDeleteAsset(String(row.id || row.rowid || ''), row.lingma_sys_key);
      }),
    );
    const deletedKeys = new Set(
      selectedRows.value.map((row) => getAssetKey(row)),
    );
    notifyAssetBalanceRefresh();
    removeLocalRows(deletedKeys);
    ElMessage.success('删除成功');
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    console.error(error);
    ElMessage.error(error?.message || '删除失败');
  }
}

function onFormSuccess(data: AssetRecord) {
  if (!isInitializationAsset(data)) {
    ElMessage.warning('资产初始化只维护启用期间以前已在用的资产');
    reload();
    return;
  }
  updateLocalRow(data);
}

async function recalculateSelectedNetValue() {
  if (!ensureInitializationMaintainable('重算')) return;
  const targets =
    selectedRows.value.length > 0 ? selectedRows.value : displayedRows.value;
  if (targets.length === 0) {
    ElMessage.warning('当前没有可重算的资产');
    return;
  }

  try {
    const lockedRows = targets.filter((row) => isInitializationLocked(row));
    if (lockedRows.length > 0) {
      ElMessage.warning('存在已锁定的期初资产，不能重算覆盖');
      return;
    }

    await Promise.all(
      targets.map(async (row) => {
        const next = {
          ...row,
          accumulated_depreciation: toNumberValue(
            row.accumulated_depreciation ||
              row.opening_accumulated_depreciation,
          ),
          net_asset_value:
            toNumberValue(row.purchase_price) -
            toNumberValue(
              row.accumulated_depreciation ||
                row.opening_accumulated_depreciation,
            ),
        };
        await saveAsset(next);
        await recordAssetRecalculateChange(row, next);
        updateLocalRow(next);
      }),
    );
    ElMessage.success('资产净值已重算');
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '重算失败');
  }
}

function triggerImport() {
  if (!ensureInitializationMaintainable('导入')) return;
  importInputRef.value?.click();
}

async function onImportFileChange(event: Event) {
  if (!ensureInitializationMaintainable('导入')) return;
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  importLoading.value = true;
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error('未读取到工作表');

    const headerIndex = new Map<string, number>();
    worksheet.getRow(1).eachCell((cell, columnNumber) => {
      const header = normalizeText(cell.value).replace(/\*$/, '');
      if (header) headerIndex.set(header, columnNumber);
    });

    const importRows: AssetRecord[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const asset = buildAssetFromImportRow(row, headerIndex);
      if (!asset.asset_code && !asset.asset_name) return;
      importRows.push(asset);
    });

    if (importRows.length === 0) {
      ElMessage.warning('未找到可导入的资产数据');
      return;
    }

    await Promise.all(
      importRows.map(async (row) => {
        const res = await saveAsset(row);
        await recordAssetImportChange({
          ...row,
          asset_code: res.asset_code || row.asset_code,
          id: res.id,
        });
      }),
    );
    ElMessage.success(`导入成功：${importRows.length} 条`);
    await reload();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '导入失败');
  } finally {
    importLoading.value = false;
  }
}

function handleExportCommand(command: string) {
  if (command === 'selected') {
    exportRows(
      selectedRows.value,
      `资产初始化_选中资产_${activationPeriod.value}.xlsx`,
    );
    return;
  }
  if (command === 'all') {
    exportRows(
      rows.value,
      `资产初始化_全部资产_${activationPeriod.value}.xlsx`,
    );
    return;
  }
  exportRows(
    displayedRows.value,
    `资产初始化_当前列表_${activationPeriod.value}.xlsx`,
  );
}

function buildPrintHtml(sourceRows: AssetRecord[], title: string) {
  const headerHtml = assetColumns
    .slice(0, showAllInfo.value ? assetColumns.length : 18)
    .map((column) => `<th>${column.header}</th>`)
    .join('');
  const bodyHtml = sourceRows
    .map((row) => {
      const cells = assetColumns
        .slice(0, showAllInfo.value ? assetColumns.length : 18)
        .map((column) => {
          const value =
            column.key === 'asset_status'
              ? getAssetStatusLabel(row[column.key])
              : column.key === 'entry_period'
                ? formatDateValue(row[column.key], true)
                : column.key === 'purchase_date' || column.key === 'begin_date'
                  ? formatDateValue(row[column.key])
                  : row[column.key];
          return `<td>${escapeHtml(value)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, "Microsoft YaHei", sans-serif; color: #111; }
    h1 { font-size: 18px; margin: 0 0 8px; text-align: center; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #999; padding: 4px 6px; white-space: nowrap; }
    th { background: #f2f3f5; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    <span>资产启用期间：${activationPeriod.value}</span>
    <span>打印时间：${new Date().toLocaleString('zh-CN')}</span>
  </div>
  <table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>
</body>
</html>`;
}

function printRows(sourceRows: AssetRecord[], title: string) {
  if (sourceRows.length === 0) {
    ElMessage.warning('当前没有可打印的资产数据');
    return;
  }

  const iframe = printFrameRef.value;
  const win = iframe?.contentWindow;
  const doc = iframe?.contentDocument || win?.document;
  if (!iframe || !win || !doc) {
    ElMessage.error('打印容器初始化失败');
    return;
  }

  printLoading.value = true;
  doc.open();
  doc.write(buildPrintHtml(sourceRows, title));
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

function handlePrintCommand(command: string) {
  if (command === 'selected') {
    printRows(selectedRows.value, '资产初始化选中资产');
    return;
  }
  printRows(displayedRows.value, '资产初始化列表');
}

function handleMoreCommand(command: string) {
  if (command === 'template') {
    exportTemplate();
    return;
  }
  if (command === 'deleteSelected') {
    deleteSelectedRows();
    return;
  }
  if (command === 'recalculate') {
    recalculateSelectedNetValue();
    return;
  }
  if (command === 'clearFilters') {
    clearFilters();
  }
}

onMounted(async () => {
  await loadActivationMonth();
  await loadCategoryOptions();
  await reload();
});
</script>

<template>
  <div class="h-full">
    <div class="flex h-full flex-col">
      <div
        class="asset-init-panel border-border bg-card min-h-0 flex-1 rounded-md border shadow-sm"
      >
        <div class="table-toolbar">
          <div class="table-toolbar__row">
            <div class="filter-item filter-item--search">
              <span class="filter-label">初始化资产</span>
              <ElInput
                v-model="query.keyword"
                class="asset-search-input"
                placeholder="资产编号/名称/类别/型号"
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
                placeholder="全部"
                @change="reload"
                @clear="reload"
              >
                <ElOption
                  v-for="item in categoryOptions"
                  :key="String(item.id || item.rowid || '')"
                  :label="String(item.category_name || '')"
                  :value="String(item.id || item.rowid || '')"
                />
              </ElSelect>
            </div>
            <div class="filter-item">
              <span class="filter-label">资产状态</span>
              <ElSelect
                v-model="query.assetStatus"
                class="status-select"
                disabled
                placeholder="全部"
              >
                <ElOption :value="1" label="在用" />
                <ElOption :value="2" label="闲置" />
                <ElOption :value="3" label="处置" />
              </ElSelect>
            </div>
            <div class="period-bar">
              <span class="period-label">资产启用期间：</span>
              <strong>{{ activationPeriod }}</strong>
            </div>
          </div>
          <div class="table-toolbar__row">
            <ElButton type="primary" @click="reload">查询</ElButton>
            <ElButton @click="toggleIntangibleAssets">
              {{ intangibleClosed ? '显示无形资产' : '关闭无形资产' }}
            </ElButton>
            <ElCheckbox v-model="showAllInfo">显示所有信息</ElCheckbox>
            <ElButton
              type="primary"
              :disabled="isOpeningInitializationFullyBalanced"
              @click="openAdd"
            >
              增加资产
            </ElButton>
            <ElButton :disabled="isOpeningInitializationFullyBalanced" @click="openCopy">复制资产</ElButton>
            <ElButton
              :disabled="isOpeningInitializationFullyBalanced"
              :loading="importLoading"
              @click="triggerImport"
            >
              导入
            </ElButton>
            <ElDropdown @command="handleExportCommand">
              <ElButton :loading="exportLoading">
                导出<span class="dropdown-arrow">▼</span>
              </ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem command="current">
                    导出当前列表
                  </ElDropdownItem>
                  <ElDropdownItem command="selected">
                    导出选中资产
                  </ElDropdownItem>
                  <ElDropdownItem command="all">导出全部资产</ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
            <ElDropdown @command="handlePrintCommand">
              <ElButton :loading="printLoading">
                打印<span class="dropdown-arrow">▼</span>
              </ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem command="current">
                    打印当前列表
                  </ElDropdownItem>
                  <ElDropdownItem command="selected">
                    打印选中资产
                  </ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
            <ElDropdown @command="handleMoreCommand">
              <ElButton> 更多<span class="dropdown-arrow">▼</span> </ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem command="template">
                    下载导入模板
                  </ElDropdownItem>
                  <ElDropdownItem
                    command="recalculate"
                    :disabled="isOpeningInitializationFullyBalanced"
                  >
                    重算资产净值
                  </ElDropdownItem>
                  <ElDropdownItem
                    command="deleteSelected"
                    :disabled="isOpeningInitializationFullyBalanced"
                  >
                    删除选中资产
                  </ElDropdownItem>
                  <ElDropdownItem command="clearFilters">
                    清空筛选
                  </ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
            <ElButton @click="reload">刷新</ElButton>
          </div>
        </div>

        <ElTable
          v-loading="loading"
          :data="displayedRows"
          border
          height="100%"
          @selection-change="onSelectionChange"
        >
          <ElTableColumn type="selection" width="44" fixed="left" />
          <ElTableColumn prop="asset_code" label="资产编号" width="140" />
          <ElTableColumn prop="asset_name" label="资产名称" min-width="170" />
          <ElTableColumn
            prop="asset_category_name"
            label="资产类别"
            width="150"
          />
          <ElTableColumn prop="entry_period" label="录入期间" width="100">
            <template #default="{ row }">
              {{ formatDateValue(row.entry_period, true) }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="purchase_date" label="购买日期" width="110">
            <template #default="{ row }">
              {{ formatDateValue(row.purchase_date) }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="begin_date" label="开始使用日期" width="120">
            <template #default="{ row }">
              {{ formatDateValue(row.begin_date) }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            v-if="showAllInfo"
            prop="model"
            label="规格型号"
            width="120"
          />
          <ElTableColumn
            v-if="showAllInfo"
            prop="brand"
            label="品牌"
            width="100"
          />
          <ElTableColumn prop="using_department" label="使用部门" width="130" />
          <ElTableColumn
            v-if="showAllInfo"
            prop="using_project"
            label="使用项目"
            width="130"
          />
          <ElTableColumn
            v-if="showAllInfo"
            prop="storage_location"
            label="存放地点"
            width="130"
          />
          <ElTableColumn
            prop="purchase_price"
            label="资产原值"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              {{ formatMoney(row.purchase_price) }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            prop="opening_accumulated_depreciation"
            label="期初累计折旧"
            width="130"
            align="right"
          >
            <template #default="{ row }">
              {{ formatMoney(row.opening_accumulated_depreciation) }}
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
          <ElTableColumn
            v-if="showAllInfo"
            prop="depreciation_method"
            label="折旧方法"
            width="130"
          />
          <ElTableColumn
            v-if="showAllInfo"
            prop="depreciation_month"
            label="折旧期限(月)"
            width="120"
          />
          <ElTableColumn
            v-if="showAllInfo"
            prop="residual_rate"
            label="残值率(%)"
            width="100"
          />
          <ElTableColumn
            v-if="showAllInfo"
            prop="month_depreciation"
            label="月折旧额"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              {{ formatMoney(row.month_depreciation) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <ElButton
                link
                type="primary"
                :disabled="isInitializationLocked(row)"
                @click="openEdit(row)"
              >
                编辑
              </ElButton>
              <ElButton
                link
                type="danger"
                :disabled="isInitializationLocked(row)"
                @click="onDelete(row)"
              >
                删除
              </ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>

      <input
        ref="importInputRef"
        class="hidden-file-input"
        type="file"
        accept=".xlsx,.xls"
        @change="onImportFileChange"
      />
      <iframe ref="printFrameRef" class="print-frame"></iframe>
        <Form
        v-model="showForm"
        :data="currentRow"
        :initialization-locked="isOpeningInitializationFullyBalanced"
        source="initialization"
        @success="onFormSuccess"
      />
    </div>
  </div>
</template>

<style scoped>
.asset-init-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.asset-init-panel :deep(.el-table th .cell),
.asset-init-panel :deep(.el-table td .cell) {
  justify-content: center;
  text-align: center !important;
}

.table-toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
}

.table-toolbar__row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.period-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin-left: auto;
}

.period-label {
  color: var(--el-text-color-regular);
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

.asset-search-input {
  flex: 1;
}

.category-select {
  width: 180px;
}

.status-select {
  width: 140px;
}

.dropdown-arrow {
  margin-left: 6px;
  font-size: 10px;
}

.hidden-file-input,
.print-frame {
  position: fixed;
  width: 0;
  height: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}
</style>
