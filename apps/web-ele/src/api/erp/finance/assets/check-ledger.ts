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

export type AssetChangeRecord = {
  after_depreciation_month?: number | string;
  after_residual_rate?: number | string;
  after_value?: number | string;
  asset_code?: string;
  asset_id?: string;
  asset_name?: string;
  before_depreciation_month?: number | string;
  before_residual_rate?: number | string;
  before_value?: number | string;
  change_amount?: number | string;
  change_date?: string;
  change_period?: string;
  change_reason?: string;
  change_type?: string;
  id?: string;
  lingma_sys_key?: string;
  remark?: string;
  rowid?: string;
  voucher_date?: string;
  voucher_generated?: number | string;
  voucher_no?: string;
};

const TABLE_NAME = 'Bil_Asset_Change';
const PRIMARY_KEY = 'id';

export type AssetChangeQuery = {
  keyword?: string;
  period?: string;
  voucherGenerated?: 0 | 1 | '';
};

function normalizeAssetChangeRow(item: any): AssetChangeRecord {
  return {
    ...item,
    id: resolveId(item),
  };
}

export async function fetchAssetChangeList(params?: AssetChangeQuery) {
  const conditions: any[] = [];
  const keyword = String(params?.keyword || '').trim();
  if (keyword) {
    conditions.push(
      or(
        cond('asset_code', 'contains', keyword),
        cond('asset_name', 'contains', keyword),
        cond('change_type', 'contains', keyword),
        cond('voucher_no', 'contains', keyword),
      ),
    );
  }
  if (params?.period) {
    conditions.push(
      cond('change_period', 'equal', String(params.period).slice(0, 7)),
    );
  }
  if (params?.voucherGenerated === 0 || params?.voucherGenerated === 1) {
    conditions.push(
      cond('voucher_generated', 'equal', params.voucherGenerated),
    );
  }

  const res = await queryAssetTable(
    TABLE_NAME,
    notDeletedFilter(...conditions),
    9999,
    1,
    PRIMARY_KEY,
  );
  return ((res.list as object[]) || []).map((item: any) =>
    normalizeAssetChangeRow(item),
  ) as AssetChangeRecord[];
}

export async function fetchAssetChange(id: string) {
  const key = String(id || '').trim();
  if (!key) return null;

  const res = await queryAssetTable(
    TABLE_NAME,
    notDeletedFilter(cond(PRIMARY_KEY, 'equal', key)),
    1,
    1,
    PRIMARY_KEY,
  );
  const item = ((res.list as object[]) || [])[0];
  return item ? normalizeAssetChangeRow(item) : null;
}

export async function saveAssetChange(data: AssetChangeRecord) {
  const currentId = resolveId(data as any);
  const isAdd = !currentId;
  const id = isAdd ? createId() : currentId;
  const rowid = String(data.rowid || id).trim();
  const row: any = defaultCommonRow({
    id,
    rowid,
    asset_id: String(data.asset_id || '').trim() || null,
    asset_code: String(data.asset_code || '').trim() || null,
    asset_name: String(data.asset_name || '').trim() || null,
    change_type: String(data.change_type || '').trim() || null,
    change_date: toDateString(data.change_date),
    change_period: toMonthString(data.change_period),
    change_reason: String(data.change_reason || '').trim() || null,
    before_value: toNumber(data.before_value),
    change_amount: toNumber(data.change_amount),
    after_value: toNumber(data.after_value),
    before_depreciation_month: toInt(data.before_depreciation_month),
    after_depreciation_month: toInt(data.after_depreciation_month),
    before_residual_rate: toNumber(data.before_residual_rate),
    after_residual_rate: toNumber(data.after_residual_rate),
    voucher_generated: Number(data.voucher_generated) === 1 ? 1 : 0,
    voucher_no: String(data.voucher_no || '').trim() || null,
    voucher_date: toDateString(data.voucher_date),
    remark: String(data.remark || '').trim() || null,
  });
  if (data.lingma_sys_key) row.lingma_sys_key = data.lingma_sys_key;

  if (!row.asset_id) throw new Error('资产不能为空');
  if (!row.change_type) throw new Error('变更类型不能为空');
  if (!row.change_date) throw new Error('变更日期不能为空');

  await saveAssetTable(
    TABLE_NAME,
    isAdd ? [row] : [],
    isAdd ? [] : [row],
    [],
    PRIMARY_KEY,
  );
  return { id, row: { ...data, ...row, id, rowid } as AssetChangeRecord };
}

export async function createAssetChange(data: AssetChangeRecord) {
  return await saveAssetChange({ ...data, id: '', rowid: '' });
}

export async function updateAssetChange(data: AssetChangeRecord) {
  if (!resolveId(data as any)) throw new Error('id is required');
  return await saveAssetChange(data);
}

export async function updateAssetChangeVoucher(
  data: AssetChangeRecord,
  voucher: {
    voucherDate: string;
    voucherGenerated: 0 | 1;
    voucherNo: string;
  },
) {
  return await updateAssetChange({
    ...data,
    voucher_date: voucher.voucherDate,
    voucher_generated: voucher.voucherGenerated,
    voucher_no: voucher.voucherNo,
  });
}

export async function deleteAssetChange(id: string, lingmaSysKey?: string) {
  const key = String(id || '').trim();
  const row: any = { id: key, rowid: key, lingma_sys_is_delete: 1 };
  if (!row.id) throw new Error('id is required');
  if (lingmaSysKey) row.lingma_sys_key = lingmaSysKey;
  await saveAssetTable(TABLE_NAME, [], [row], [], PRIMARY_KEY);
}
