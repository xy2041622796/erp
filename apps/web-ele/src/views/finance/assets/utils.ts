import type { AssetChangeRecord } from '#/api/erp/finance/assets/check-ledger';
import type { AssetRecord } from '#/api/erp/finance/assets/manage';

import { createAssetChange } from '#/api/erp/finance/assets/check-ledger';
import { useAccountSetStore } from '#/store/account-set';
import { moneyNumber } from '#/utils/finance/decimal-money';

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function getLocalMonth(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function getLocalDate(date = new Date()) {
  return `${getLocalMonth(date)}-${pad2(date.getDate())}`;
}

export function getLocalMonthEndDate(month: string) {
  const [yearText, monthText] = String(month || getLocalMonth()).split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return getLocalDate();
  }
  return getLocalDate(new Date(year, monthIndex, 0));
}

function normalizeMonthValue(value: unknown) {
  if (value instanceof Date) return getLocalMonth(value);
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return getLocalMonth(date);
  }
  const text = String(value ?? '').trim();
  if (!text) return '';
  const matched = text.match(/^(\d{4})[-/]?(\d{1,2})/);
  if (!matched) return '';
  return matched[1] + '-' + String(Number(matched[2])).padStart(2, '0');
}

export async function resolveAccountSetActivationMonth() {
  const store = useAccountSetStore();
  const currentMonth = normalizeMonthValue(store.currentStartDate);
  if (currentMonth) return currentMonth;

  try {
    const accountSet = await store.ensureCurrentLoaded();
    return (
      normalizeMonthValue((accountSet as any)?.start_date) ||
      normalizeMonthValue((accountSet as any)?.init_date) ||
      getLocalMonth()
    );
  } catch (error) {
    console.error(error);
    return getLocalMonth();
  }
}


function toAssetAmount(value: unknown) {
  const amount = moneyNumber(value as any);
  return Number.isFinite(amount) ? amount : 0;
}

function roundAssetAmount(value: number) {
  return moneyNumber(value as any);
}

function normalizeAssetText(value: unknown) {
  return String(value ?? '').trim();
}

function getAssetRecordId(row?: AssetRecord | null) {
  return normalizeAssetText(row?.id || row?.rowid);
}

function getAssetRecordMonth(row?: AssetRecord | null) {
  const value = row?.begin_date || row?.purchase_date || row?.entry_period;
  return normalizeMonthValue(value);
}

function sameAssetText(a: unknown, b: unknown) {
  return normalizeAssetText(a) === normalizeAssetText(b);
}

function sameAssetNumber(a: unknown, b: unknown) {
  return Math.abs(roundAssetAmount(toAssetAmount(a) - toAssetAmount(b))) < 0.005;
}

function getAssetChangeLabels(before: AssetRecord, after: AssetRecord) {
  const labels: string[] = [];
  const textFields: Array<[keyof AssetRecord, string]> = [
    ['asset_category_name', '资产类别'],
    ['asset_amortization_type', '摊销类型'],
    ['asset_name', '资产名称'],
    ['asset_property', '资产属性'],
    ['model', '规格型号'],
    ['begin_date', '开始使用日期'],
    ['depreciation_method', '折旧方法'],
    ['using_department', '使用部门'],
    ['using_person', '使用人'],
    ['storage_location', '存放位置'],
    ['asset_account_code', '资产科目'],
    ['accumulated_depreciation_subject_code', '累计折旧/摊销科目'],
    ['depreciation_fee_subject_code', '折旧/摊销费用科目'],
  ];
  const numberFields: Array<[keyof AssetRecord, string]> = [
    ['purchase_price', '资产原值'],
    ['accumulated_depreciation', '累计折旧/摊销'],
    ['opening_accumulated_depreciation', '期初累计折旧/摊销'],
    ['opening_depreciated_months', '已折旧/摊销月份'],
    ['depreciation_month', '预计使用月份'],
    ['residual_rate', '残值率'],
    ['net_asset_value', '资产净值'],
  ];

  for (const [field, label] of textFields) {
    if (!sameAssetText(before[field], after[field])) labels.push(label);
  }
  for (const [field, label] of numberFields) {
    if (!sameAssetNumber(before[field], after[field])) labels.push(label);
  }

  return labels;
}

function resolveAssetChangePeriod(row?: AssetRecord | null, fallback?: string) {
  return (
    normalizeMonthValue(fallback) ||
    normalizeMonthValue(row?.entry_period) ||
    normalizeMonthValue(row?.begin_date) ||
    normalizeMonthValue(row?.purchase_date) ||
    getLocalMonth()
  );
}

function isNoVoucherOperation(changeType?: string, voucherNo?: string) {
  const text = normalizeAssetText(changeType) + ' ' + normalizeAssetText(voucherNo);
  return (
    text.includes('信息变更') ||
    text.includes('初始化') ||
    text.includes('删除') ||
    text.includes('导入') ||
    text.includes('重算') ||
    text.includes('无需生成') ||
    text.includes('期初初始化')
  );
}

function dispatchAssetChangeSaved(row: AssetChangeRecord) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('finance-asset-change-saved', { detail: row }),
  );
}

type AssetOperationChangeInput = {
  after?: AssetRecord | null;
  afterValue?: number | string;
  before?: AssetRecord | null;
  beforeValue?: number | string;
  changeAmount?: number | string;
  changeDate?: string;
  changePeriod?: string;
  changeReason?: string;
  changeType: string;
  remark?: string;
  voucherGenerated?: 0 | 1;
  voucherNo?: string;
};

export async function recordAssetOperationChange(
  input: AssetOperationChangeInput,
) {
  const asset = input.after || input.before;
  const assetId = getAssetRecordId(asset);
  if (!asset || !assetId) return null;

  const beforeValue = toAssetAmount(
    input.beforeValue ?? input.before?.purchase_price ?? 0,
  );
  const afterValue = toAssetAmount(
    input.afterValue ?? input.after?.purchase_price ?? 0,
  );
  const changeAmount = roundAssetAmount(
    toAssetAmount(input.changeAmount ?? afterValue - beforeValue),
  );
  const voucherNo = normalizeAssetText(input.voucherNo);
  const voucherGenerated =
    input.voucherGenerated ??
    (isNoVoucherOperation(input.changeType, voucherNo) ? 1 : 0);

  const saved = await createAssetChange({
    after_depreciation_month:
      input.after?.depreciation_month ?? input.before?.depreciation_month,
    after_residual_rate: input.after?.residual_rate ?? input.before?.residual_rate,
    after_value: afterValue,
    asset_code: normalizeAssetText(asset.asset_code),
    asset_id: assetId,
    asset_name: normalizeAssetText(asset.asset_name),
    before_depreciation_month: input.before?.depreciation_month,
    before_residual_rate: input.before?.residual_rate,
    before_value: beforeValue,
    change_amount: changeAmount,
    change_date: input.changeDate || getLocalDate(),
    change_period: resolveAssetChangePeriod(asset, input.changePeriod),
    change_reason: input.changeReason || input.changeType,
    change_type: input.changeType,
    remark: input.remark,
    voucher_generated: voucherGenerated,
    voucher_no: voucherNo || (voucherGenerated === 1 ? '无需生成' : ''),
  });
  dispatchAssetChangeSaved(saved.row);
  return saved.row;
}

export async function isAssetInitializationOperation(row?: AssetRecord | null) {
  const assetMonth = getAssetRecordMonth(row);
  if (!assetMonth) return false;
  const activationMonth = await resolveAccountSetActivationMonth();
  return assetMonth < activationMonth;
}

export async function recordAssetSaveChange(
  before: AssetRecord | null | undefined,
  after: AssetRecord,
) {
  const afterId = getAssetRecordId(after);
  if (!afterId) return null;

  if (!before || !getAssetRecordId(before)) {
    const isInitialization = await isAssetInitializationOperation(after);
    return await recordAssetOperationChange({
      after,
      afterValue: after.purchase_price,
      beforeValue: 0,
      changeAmount: after.purchase_price,
      changePeriod: after.entry_period,
      changeReason: isInitialization ? '资产初始化新增' : '新增资产卡片',
      changeType: isInitialization ? '资产初始化新增' : '资产新增',
      voucherGenerated: isInitialization ? 1 : 0,
      voucherNo: isInitialization ? '期初初始化' : '',
    });
  }

  const labels = getAssetChangeLabels(before, after);
  if (labels.length === 0) return null;

  const priceDiff = roundAssetAmount(
    toAssetAmount(after.purchase_price) - toAssetAmount(before.purchase_price),
  );
  const accumulatedDiff = roundAssetAmount(
    toAssetAmount(after.accumulated_depreciation) -
      toAssetAmount(before.accumulated_depreciation),
  );
  const netDiff = roundAssetAmount(
    toAssetAmount(after.net_asset_value) - toAssetAmount(before.net_asset_value),
  );
  const hasPriceChange = Math.abs(priceDiff) >= 0.005;
  const hasAccumulatedChange = Math.abs(accumulatedDiff) >= 0.005;
  const hasNetChange = Math.abs(netDiff) >= 0.005;
  const changeAmount = hasPriceChange
    ? priceDiff
    : hasAccumulatedChange
      ? accumulatedDiff
      : hasNetChange
        ? netDiff
        : 0;
  const changeType = hasPriceChange
    ? '原值调整'
    : hasAccumulatedChange
      ? '折旧/摊销调整'
      : hasNetChange
        ? '资产净值调整'
        : '资产信息变更';
  const noVoucher = Math.abs(changeAmount) < 0.005 || changeType === '资产信息变更';

  return await recordAssetOperationChange({
    after,
    before,
    afterValue: after.purchase_price,
    beforeValue: before.purchase_price,
    changeAmount,
    changePeriod: after.entry_period || before.entry_period,
    changeReason: labels.join('、'),
    changeType,
    voucherGenerated: noVoucher ? 1 : 0,
    voucherNo: noVoucher ? '无需生成' : '',
  });
}

export async function recordAssetDeleteChange(row: AssetRecord, reason = '资产删除') {
  const isInitialization = await isAssetInitializationOperation(row);
  return await recordAssetOperationChange({
    afterValue: 0,
    before: row,
    beforeValue: row.purchase_price,
    changeAmount: -toAssetAmount(row.purchase_price),
    changePeriod: row.entry_period,
    changeReason: reason,
    changeType: isInitialization ? '资产初始化删除' : '资产删除',
    voucherGenerated: 1,
    voucherNo: '无需生成',
  });
}

export async function recordAssetImportChange(row: AssetRecord) {
  return await recordAssetOperationChange({
    after: row,
    afterValue: row.purchase_price,
    beforeValue: 0,
    changeAmount: row.purchase_price,
    changePeriod: row.entry_period,
    changeReason: '资产初始化导入',
    changeType: '资产初始化导入',
    voucherGenerated: 1,
    voucherNo: '期初初始化',
  });
}

export async function recordAssetRecalculateChange(
  before: AssetRecord,
  after: AssetRecord,
) {
  const beforeNetValue = toAssetAmount(before.net_asset_value);
  const afterNetValue = toAssetAmount(after.net_asset_value);
  const diff = roundAssetAmount(afterNetValue - beforeNetValue);
  if (Math.abs(diff) < 0.005) return null;
  return await recordAssetOperationChange({
    after,
    afterValue: afterNetValue,
    before,
    beforeValue: beforeNetValue,
    changeAmount: diff,
    changePeriod: after.entry_period || before.entry_period,
    changeReason: '资产净值重算',
    changeType: '资产净值重算',
    voucherGenerated: 1,
    voucherNo: '无需生成',
  });
}
