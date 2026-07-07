import { cond, or } from '#/api/qyapi';

import {
  createId,
  defaultCommonRow,
  notDeletedFilter,
  queryAssetTable,
  resolveId,
  saveAssetTable,
  toDateString,
  toInt,
  toMonthString,
  toNumber,
} from './common';

export type AssetRecord = {
  accumulated_depreciation?: number | string;
  accumulated_depreciation_subject_code?: string;
  accumulated_depreciation_subject_id?: string;
  accumulated_depreciation_subject_name?: string;
  acquisition_method?: string;
  asset_account_code?: string;
  asset_account_id?: string;
  asset_account_name?: string;
  asset_amortization_type?: 'deferred' | 'fixed' | 'intangible' | string;
  asset_category_code?: string;
  asset_category_id?: string;
  asset_category_name?: string;
  asset_code?: string;
  asset_name?: string;
  asset_property?: string;
  asset_specification?: string;
  asset_status?: number | string;
  begin_date?: string;
  brand?: string;
  current_depreciation?: number | string;
  current_period_depreciate?: number | string;
  current_year_depreciation?: number | string;
  depreciation_expense_type?: string;
  depreciation_fee_subject_code?: string;
  depreciation_fee_subject_id?: string;
  depreciation_fee_subject_name?: string;
  depreciation_method?: string;
  depreciation_month?: number | string;
  disposal_subject_code?: string;
  disposal_subject_id?: string;
  disposal_subject_name?: string;
  entry_period?: string;
  id?: string;
  lingma_sys_key?: string;
  model?: string;
  month_depreciation?: number | string;
  net_asset_value?: number | string;
  opening_accumulated_depreciation?: number | string;
  opening_depreciated_months?: number | string;
  previous_year_depreciation?: number | string;
  purchase_date?: string;
  purchase_price?: number | string;
  remaining_months?: number | string;
  remark?: string;
  residual_rate?: number | string;
  residual_value?: number | string;
  rowid?: string;
  separate_depreciation?: number | string;
  storage_location?: string;
  supplier_id?: string;
  supplier_name?: string;
  using_department?: string;
  using_person?: string;
  using_project?: string;
};

const TABLE_NAME = 'Bil_Asset';

export async function fetchAssetList(params?: {
  assetStatus?: '' | number;
  categoryId?: string;
  keyword?: string;
  usingDepartment?: string;
  amortizationType?: string;
}) {
  const conditions: any[] = [];
  const keyword = String(params?.keyword || '').trim();
  if (keyword) {
    conditions.push(
      or(
        cond('asset_code', 'contains', keyword),
        cond('asset_name', 'contains', keyword),
        cond('asset_category_name', 'contains', keyword),
        cond('model', 'contains', keyword),
        cond('using_department', 'contains', keyword),
      ),
    );
  }
  const categoryId = String(params?.categoryId || '').trim();
  if (categoryId && categoryId !== '全部') {
    conditions.push(cond('asset_category_id', 'equal', categoryId));
  }
  if (params?.usingDepartment) {
    conditions.push(cond('using_department', 'equal', params.usingDepartment));
  }
  if (params?.amortizationType) {
    conditions.push(cond('asset_amortization_type', 'equal', params.amortizationType));
  }
  if (
    params?.assetStatus !== '' &&
    params?.assetStatus !== undefined &&
    params?.assetStatus !== null
  ) {
    conditions.push(cond('asset_status', 'equal', params.assetStatus));
  }

  const res = await queryAssetTable(
    TABLE_NAME,
    notDeletedFilter(...conditions),
  );
  return ((res.list as object[]) || []).map((item: any) => ({
    ...item,
    id: resolveId(item),
  })) as AssetRecord[];
}

export async function fetchAssetSimpleList() {
  return await fetchAssetList();
}

export async function getAssetListByCodePrefix(prefix: string) {
  const value = String(prefix || '').trim();
  if (!value) return [] as AssetRecord[];

  const list = await fetchAssetList({ keyword: value });
  return list.filter((item) => String(item.asset_code || '').startsWith(value));
}

export async function buildNextAssetCode(prefix = 'ZC') {
  const cleanPrefix = String(prefix || 'ZC').trim() || 'ZC';
  const list = await getAssetListByCodePrefix(cleanPrefix);

  let maxSeq = 0;
  for (const item of list) {
    const code = String(item.asset_code || '');
    if (!code.startsWith(cleanPrefix)) continue;

    const seqText = code.slice(cleanPrefix.length);
    if (!/^\d+$/.test(seqText)) continue;

    const seq = Number(seqText);
    if (seq > maxSeq) maxSeq = seq;
  }

  return `${cleanPrefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

export async function checkAssetCodeExists(
  assetCode?: string,
  excludeId?: string,
) {
  const code = String(assetCode || '').trim();
  if (!code) return false;

  const list = await fetchAssetList({ keyword: code });
  const normalizedExcludeId = String(excludeId || '').trim();
  return list.some((item) => {
    const sameCode = String(item.asset_code || '') === code;
    const sameRow =
      normalizedExcludeId &&
      String(item.id || item.rowid || '') === normalizedExcludeId;
    return sameCode && !sameRow;
  });
}

export async function saveAsset(data: AssetRecord) {
  const currentId = resolveId(data as any);
  const isAdd = !currentId;
  const id = isAdd ? createId() : currentId;
  let assetCode = String(data.asset_code || '').trim();
  if (!assetCode) {
    assetCode = await buildNextAssetCode();
  }
  if (await checkAssetCodeExists(assetCode, isAdd ? undefined : currentId)) {
    throw new Error('资产编号已存在，请修改后再保存');
  }
  const purchasePrice = toNumber(data.purchase_price);
  const residualRate = toNumber(data.residual_rate);
  const residualRatio = residualRate > 1 ? residualRate / 100 : residualRate;
  const residualValue = toNumber(
    data.residual_value === undefined ||
      data.residual_value === null ||
      data.residual_value === ''
      ? purchasePrice * residualRatio
      : data.residual_value,
  );
  const accumulatedDepreciation = toNumber(
    data.accumulated_depreciation || data.opening_accumulated_depreciation,
  );
  const netAssetValue = toNumber(
    data.net_asset_value === undefined ||
      data.net_asset_value === null ||
      data.net_asset_value === ''
      ? purchasePrice - accumulatedDepreciation
      : data.net_asset_value,
  );

  const row: any = defaultCommonRow({
    id,
    acquisition_method: String(data.acquisition_method || '').trim() || null,
    asset_account_code: String(data.asset_account_code || '').trim() || null,
    asset_account_id: String(data.asset_account_id || '').trim() || null,
    asset_account_name: String(data.asset_account_name || '').trim() || null,
    asset_amortization_type:
      String(data.asset_amortization_type || '').trim() || null,
    asset_code: assetCode,
    asset_name: String(data.asset_name || '').trim(),
    asset_category_id: String(data.asset_category_id || '').trim() || null,
    asset_category_code: String(data.asset_category_code || '').trim() || null,
    asset_category_name: String(data.asset_category_name || '').trim() || null,
    asset_property: String(data.asset_property || '').trim() || null,
    model: String(data.model || '').trim() || null,
    brand: String(data.brand || '').trim() || null,
    asset_specification: String(data.asset_specification || '').trim() || null,
    purchase_date: toDateString(data.purchase_date),
    begin_date: toDateString(data.begin_date),
    entry_period: toMonthString(data.entry_period),
    using_department: String(data.using_department || '').trim() || null,
    using_person: String(data.using_person || '').trim() || null,
    using_project: String(data.using_project || '').trim() || null,
    storage_location: String(data.storage_location || '').trim() || null,
    supplier_id: String(data.supplier_id || '').trim() || null,
    supplier_name: String(data.supplier_name || '').trim() || null,
    purchase_price: purchasePrice,
    opening_accumulated_depreciation: toNumber(
      data.opening_accumulated_depreciation,
    ),
    opening_depreciated_months: toInt(data.opening_depreciated_months),
    current_depreciation: toNumber(data.current_depreciation),
    current_period_depreciate:
      Number(data.current_period_depreciate) === 0 ? 0 : 1,
    accumulated_depreciation: accumulatedDepreciation,
    net_asset_value: netAssetValue,
    depreciation_method: String(data.depreciation_method || '').trim() || null,
    depreciation_month: toInt(data.depreciation_month),
    residual_rate: residualRate,
    residual_value: residualValue,
    remaining_months: toInt(data.remaining_months),
    month_depreciation: toNumber(data.month_depreciation),
    current_year_depreciation: toNumber(data.current_year_depreciation),
    previous_year_depreciation: toNumber(data.previous_year_depreciation),
    depreciation_expense_type:
      String(data.depreciation_expense_type || '').trim() || null,
    accumulated_depreciation_subject_code:
      String(data.accumulated_depreciation_subject_code || '').trim() || null,
    accumulated_depreciation_subject_id:
      String(data.accumulated_depreciation_subject_id || '').trim() || null,
    accumulated_depreciation_subject_name:
      String(data.accumulated_depreciation_subject_name || '').trim() || null,
    depreciation_fee_subject_code:
      String(data.depreciation_fee_subject_code || '').trim() || null,
    depreciation_fee_subject_id:
      String(data.depreciation_fee_subject_id || '').trim() || null,
    depreciation_fee_subject_name:
      String(data.depreciation_fee_subject_name || '').trim() || null,
    disposal_subject_code:
      String(data.disposal_subject_code || '').trim() || null,
    disposal_subject_id: String(data.disposal_subject_id || '').trim() || null,
    disposal_subject_name:
      String(data.disposal_subject_name || '').trim() || null,
    separate_depreciation: Number(data.separate_depreciation) === 1 ? 1 : 0,
    asset_status:
      data.asset_status === undefined ||
      data.asset_status === null ||
      data.asset_status === ''
        ? 1
        : Number(data.asset_status),
    remark: String(data.remark || '').trim() || null,
  });
  if (!isAdd && data.rowid) row.rowid = data.rowid;
  if (data.lingma_sys_key) row.lingma_sys_key = data.lingma_sys_key;

  if (!row.asset_name) throw new Error('资产名称不能为空');

  await saveAssetTable(TABLE_NAME, isAdd ? [row] : [], isAdd ? [] : [row], []);
  return { asset_code: assetCode, id };
}

export async function deleteAsset(id: string, lingmaSysKey?: string) {
  const row: any = { lingma_sys_is_delete: 1 };
  const key = String(id || '').trim();
  if (!key) throw new Error('id is required');
  row.id = key;
  row.rowid = key;
  if (lingmaSysKey) row.lingma_sys_key = lingmaSysKey;
  await saveAssetTable(TABLE_NAME, [], [row], []);
}

export async function hardDeleteAsset(id: string, lingmaSysKey?: string) {
  const row: any = {};
  const key = String(id || '').trim();
  if (!key) throw new Error('id is required');
  row.id = key;
  row.rowid = key;
  if (lingmaSysKey) row.lingma_sys_key = lingmaSysKey;
  await saveAssetTable(TABLE_NAME, [], [], [row]);
}
