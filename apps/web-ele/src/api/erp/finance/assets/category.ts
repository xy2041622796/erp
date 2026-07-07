import { cond, or } from '#/api/qyapi';
import { getStoredAccountSetId } from '#/utils/accountSet';

import {
  createId,
  defaultCommonRow,
  notDeletedFilter,
  queryAssetTable,
  resolveId,
  saveAssetTable,
  toInt,
  toNumber,
} from './common';

export type AssetCategory = {
  account_set_id?: string;
  asset_property?: string;
  category_code?: string;
  category_name?: string;
  depreciation_method?: string;
  id?: string;
  lingma_sys_is_delete?: number;
  lingma_sys_key?: string;
  remark?: string;
  residual_rate?: number | string;
  rowid?: string;
  sort_no?: number | string;
  status?: number | string;
  subject_code?: string;
  subject_name?: string;
  useful_life_months?: number | string;
};

export const ASSET_CATEGORY_TABLE_NAME = 'Bil_Asset_Category';
export const ASSET_CATEGORY_PRIMARY_KEY = 'id';

const TABLE_NAME = ASSET_CATEGORY_TABLE_NAME;
const PRIMARY_KEY = ASSET_CATEGORY_PRIMARY_KEY;

function currentTimeText() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function buildDefaultAssetCategoryList(params: {
  accountSetId: string;
  createuser?: string;
  lingmaSysEnt?: string;
}) {
  const accountSetId = String(params.accountSetId || '').trim();
  if (!accountSetId) {
    throw new Error('未选择当前账套，无法初始化资产类别');
  }

  const now = currentTimeText();
  const creator = String(params.createuser || '').trim();
  const ent = String(params.lingmaSysEnt || 'NewApp').trim() || 'NewApp';
  const defaults = [
    {
      category_code: '01',
      category_name: '房屋及建筑物',
      asset_property: '固定资产',
      useful_life_months: 240,
      sort_no: 10,
    },
    {
      category_code: '02',
      category_name: '机器设备',
      asset_property: '固定资产',
      useful_life_months: 120,
      sort_no: 20,
    },
    {
      category_code: '03',
      category_name: '运输工具',
      asset_property: '固定资产',
      useful_life_months: 48,
      sort_no: 30,
    },
    {
      category_code: '04',
      category_name: '电子设备',
      asset_property: '固定资产',
      useful_life_months: 36,
      sort_no: 40,
    },
    {
      category_code: '05',
      category_name: '办公设备及家具',
      asset_property: '固定资产',
      useful_life_months: 60,
      sort_no: 50,
    },
    {
      category_code: '06',
      category_name: '无形资产',
      asset_property: '无形资产',
      subject_code: '1701',
      subject_name: '无形资产',
      useful_life_months: 120,
      sort_no: 60,
    },
    {
      category_code: '07',
      category_name: '长期待摊费用',
      asset_property: '长期待摊费用',
      subject_code: '1801',
      subject_name: '长期待摊费用',
      useful_life_months: 36,
      sort_no: 70,
    },
  ];

  return defaults.map((item) => {
    const id = createId();
    return defaultCommonRow({
      id,
      rowid: id,
      createuser: creator,
      createtime: now,
      lingma_sys_ent: ent,
      account_set_id: accountSetId,
      depreciation_method: '平均年限法',
      residual_rate: item.asset_property === '固定资产' ? 0.05 : 0,
      status: 1,
      subject_code: '1601',
      subject_name: '固定资产',
      remark: '新增账套时自动初始化，可按需修改或删除',
      ...item,
    });
  });
}

export async function initializeDefaultAssetCategories(accountSetId?: string) {
  const resolvedAccountSetId = String(
    accountSetId || getStoredAccountSetId() || '',
  ).trim();
  const rows = buildDefaultAssetCategoryList({
    accountSetId: resolvedAccountSetId,
  });
  await saveAssetTable(TABLE_NAME, rows, [], [], PRIMARY_KEY);
  return rows as AssetCategory[];
}

function sortAssetCategories(list: AssetCategory[]) {
  return list.toSorted((a, b) => {
    const sortCompare = toInt(a.sort_no) - toInt(b.sort_no);
    if (sortCompare !== 0) return sortCompare;
    return String(a.category_code || '').localeCompare(
      String(b.category_code || ''),
      'zh-Hans-CN-u-kn-true',
      { numeric: true, sensitivity: 'base' },
    );
  });
}

export async function fetchAssetCategoryList(params?: {
  keyword?: string;
  status?: 0 | 1 | '';
}) {
  const conditions: any[] = [];
  const keyword = String(params?.keyword || '').trim();
  if (keyword) {
    conditions.push(
      or(
        cond('category_code', 'contains', keyword),
        cond('category_name', 'contains', keyword),
        cond('subject_name', 'contains', keyword),
      ),
    );
  }
  if (params?.status === 0 || params?.status === 1) {
    conditions.push(cond('status', 'equal', params.status));
  }

  const res = await queryAssetTable(
    TABLE_NAME,
    notDeletedFilter(...conditions),
    9999,
    1,
    PRIMARY_KEY,
  );
  let list = (res.list || []) as AssetCategory[];
  if (
    !keyword &&
    params?.status !== 0 &&
    params?.status !== 1 &&
    list.length === 0
  ) {
    await initializeDefaultAssetCategories();
    const seededRes = await queryAssetTable(
      TABLE_NAME,
      notDeletedFilter(...conditions),
      9999,
      1,
      PRIMARY_KEY,
    );
    list = (seededRes.list || []) as AssetCategory[];
  }
  const normalizedList = list.map((item: any) => ({
    ...item,
    id: resolveId(item),
  }));
  return sortAssetCategories(normalizedList);
}

export async function fetchAssetCategorySimpleList() {
  return await fetchAssetCategoryList();
}

export async function saveAssetCategory(data: AssetCategory) {
  const currentId = resolveId(data as any);
  const isAdd = !currentId;
  const id = isAdd ? createId() : currentId;
  const rowid = String(data.rowid || id).trim();
  const row: any = defaultCommonRow({
    id,
    rowid,
    category_code: String(data.category_code || '').trim(),
    category_name: String(data.category_name || '').trim(),
    depreciation_method: String(data.depreciation_method || '').trim() || null,
    asset_property: String(data.asset_property || '').trim() || null,
    subject_code: String(data.subject_code || '').trim() || null,
    subject_name: String(data.subject_name || '').trim() || null,
    useful_life_months: toInt(data.useful_life_months),
    residual_rate: toNumber(data.residual_rate),
    remark: String(data.remark || '').trim() || null,
    sort_no: toInt(data.sort_no),
    status: Number(data.status) === 0 ? 0 : 1,
    account_set_id: String(data.account_set_id || '').trim() || null,
  });
  if (data.lingma_sys_key) row.lingma_sys_key = data.lingma_sys_key;

  if (!row.category_code) throw new Error('资产类别编码不能为空');
  if (!row.category_name) throw new Error('资产类别名称不能为空');

  await saveAssetTable(
    TABLE_NAME,
    isAdd ? [row] : [],
    isAdd ? [] : [row],
    [],
    PRIMARY_KEY,
  );
  return { id, row: { ...data, ...row, id, rowid } as AssetCategory };
}

export async function deleteAssetCategory(
  data: AssetCategory | string,
  lingmaSysKey?: string,
) {
  const id =
    typeof data === 'string' ? String(data || '').trim() : resolveId(data);
  const rowid = typeof data === 'string' ? id : String(data.rowid || id).trim();
  const row: any = {
    id,
    lingma_sys_is_delete: 1,
    rowid,
  };
  if (!row.id) throw new Error('id is required');
  const rowLingmaSysKey =
    typeof data === 'string' ? lingmaSysKey : data.lingma_sys_key;
  if (rowLingmaSysKey) row.lingma_sys_key = rowLingmaSysKey;
  await saveAssetTable(TABLE_NAME, [], [], [row], PRIMARY_KEY);
}

export async function toggleAssetCategoryStatus(params: {
  id?: string;
  lingmaSysKey?: string;
  rowid?: string;
  status: boolean;
}) {
  const id = String(params.id || params.rowid || '').trim();
  const rowid = String(params.rowid || id).trim();
  const row: any = {
    id,
    rowid,
    status: params.status ? 1 : 0,
  };
  if (!row.id) throw new Error('id is required');
  if (params.lingmaSysKey) row.lingma_sys_key = params.lingmaSysKey;
  await saveAssetTable(TABLE_NAME, [], [row], [], PRIMARY_KEY);
}
