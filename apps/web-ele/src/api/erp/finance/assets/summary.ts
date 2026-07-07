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

export type AssetDepreciationRecord = {
  accumulated_depreciation?: number | string;
  asset_code?: string;
  asset_id?: string;
  asset_name?: string;
  current_depreciation?: number | string;
  depreciated_months?: number | string;
  depreciation_date?: string;
  depreciation_method?: string;
  depreciation_month?: number | string;
  depreciation_period?: string;
  depreciation_status?: number | string;
  id?: string;
  lingma_sys_key?: string;
  net_asset_value?: number | string;
  opening_accumulated_depreciation?: number | string;
  original_value?: number | string;
  remaining_months?: number | string;
  remark?: string;
  residual_value?: number | string;
  rowid?: string;
  voucher_date?: string;
  voucher_generated?: number | string;
  voucher_no?: string;
};

const TABLE_NAME = 'Bil_Asset_Depreciation';

export async function fetchAssetDepreciationList(params?: {
  keyword?: string;
  period?: string;
  status?: '' | number;
}) {
  const conditions: any[] = [];
  const keyword = String(params?.keyword || '').trim();
  if (keyword) {
    conditions.push(
      or(
        cond('asset_code', 'contains', keyword),
        cond('asset_name', 'contains', keyword),
        cond('voucher_no', 'contains', keyword),
      ),
    );
  }
  if (params?.period) {
    conditions.push(
      cond('depreciation_period', 'equal', String(params.period).slice(0, 7)),
    );
  }
  if (
    params?.status !== '' &&
    params?.status !== undefined &&
    params?.status !== null
  ) {
    conditions.push(cond('depreciation_status', 'equal', params.status));
  }

  const res = await queryAssetTable(
    TABLE_NAME,
    notDeletedFilter(...conditions),
  );
  return ((res.list as object[]) || []).map((item: any) => ({
    ...item,
    id: resolveId(item),
  })) as AssetDepreciationRecord[];
}

export async function saveAssetDepreciation(data: AssetDepreciationRecord) {
  const currentId = resolveId(data as any);
  const isAdd = !currentId;
  const id = isAdd ? createId() : currentId;
  const row: any = defaultCommonRow({
    id,
    asset_id: String(data.asset_id || '').trim() || null,
    asset_code: String(data.asset_code || '').trim() || null,
    asset_name: String(data.asset_name || '').trim() || null,
    depreciation_period: toMonthString(data.depreciation_period),
    depreciation_date: toDateString(data.depreciation_date),
    depreciation_method: String(data.depreciation_method || '').trim() || null,
    original_value: toNumber(data.original_value),
    opening_accumulated_depreciation: toNumber(
      data.opening_accumulated_depreciation,
    ),
    current_depreciation: toNumber(data.current_depreciation),
    accumulated_depreciation: toNumber(data.accumulated_depreciation),
    net_asset_value: toNumber(data.net_asset_value),
    residual_value: toNumber(data.residual_value),
    depreciation_month: toInt(data.depreciation_month),
    depreciated_months: toInt(data.depreciated_months),
    remaining_months: toInt(data.remaining_months),
    voucher_generated: Number(data.voucher_generated) === 1 ? 1 : 0,
    voucher_no: String(data.voucher_no || '').trim() || null,
    voucher_date: toDateString(data.voucher_date),
    depreciation_status:
      data.depreciation_status === undefined ||
      data.depreciation_status === null ||
      data.depreciation_status === ''
        ? 0
        : Number(data.depreciation_status),
    remark: String(data.remark || '').trim() || null,
  });
  if (!isAdd && data.rowid) row.rowid = data.rowid;
  if (data.lingma_sys_key) row.lingma_sys_key = data.lingma_sys_key;

  if (!row.asset_id) throw new Error('资产不能为空');
  if (!row.depreciation_period) throw new Error('折旧期间不能为空');

  await saveAssetTable(TABLE_NAME, isAdd ? [row] : [], isAdd ? [] : [row], []);
  return { id };
}

export async function deleteAssetDepreciation(
  id: string,
  lingmaSysKey?: string,
) {
  const row: any = { lingma_sys_is_delete: 1 };
  const key = String(id || '').trim();
  if (!key) throw new Error('id is required');
  row.id = key;
  row.rowid = key;
  if (lingmaSysKey) row.lingma_sys_key = lingmaSysKey;
  await saveAssetTable(TABLE_NAME, [], [row], []);
}
