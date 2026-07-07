import { requestClient } from '#/api/request';
import { and, cond } from '#/api/qyapi';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';

const DIMENSION_DICT_FORM_KEY = '01B764065E2361CDD0B55EE4F9565FC4';
const DIMENSION_DB = 'LMBill';
const DIMENSION_DICT_TYPE_TABLE = 'Bil_Dimension_Dict_Type';
const DIMENSION_DICT_ITEM_TABLE = 'Bil_Dimension_Dict_Item';

export interface DimensionDictType {
  rowid: string;
  dict_type_code: string;
  dict_type_name: string;
  description?: string;
  sort_no?: number;
  status?: number;
  builtin_flag?: number;
  account_set_id?: string;
  lingma_sys_ent?: string;
  lingma_sys_is_delete?: number;
}

export interface DimensionDictItem {
  rowid: string;
  dict_type_code: string;
  item_code: string;
  item_name: string;
  item_value?: string;
  parent_code?: string;
  sort_no?: number;
  status?: number;
  builtin_flag?: number;
  description?: string;
  account_set_id?: string;
  lingma_sys_ent?: string;
  lingma_sys_is_delete?: number;
}

export interface DimensionDictItemQuery {
  dict_type_code?: string;
  keyword?: string;
  includeDisabled?: boolean;
}

export interface DimensionDictSaveOptions {
  forceCreate?: boolean;
}

function createDictTypeTable() {
  return createFinanceDataTable(DIMENSION_DICT_FORM_KEY, DIMENSION_DICT_TYPE_TABLE, DIMENSION_DB, 'rowid');
}

function createDictItemTable() {
  return createFinanceDataTable(DIMENSION_DICT_FORM_KEY, DIMENSION_DICT_ITEM_TABLE, DIMENSION_DB, 'rowid');
}

function bitToNumber(value: any) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value ? 1 : 0;
  if (value instanceof Uint8Array) return Number(value[0] || 0) ? 1 : 0;
  if (Array.isArray(value?.data)) return Number(value.data[0] || 0) ? 1 : 0;
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['1', 'true', 'yes', '\u0001'].includes(normalized) ? 1 : 0;
}

function newRowId() {
  const source = `${Date.now()}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
  return source.replace(/[^a-fA-F0-9]/g, '').toUpperCase().padEnd(32, '0').slice(0, 32);
}

function extractItemsAndTotal(raw: any) {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data || {};
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = Number(resultData?.Count ?? items.length ?? 0);
  return { items, total };
}

function buildFilter(filters: any[]) {
  const effective = filters.filter(Boolean);
  if (!effective.length) return undefined;
  if (effective.length === 1) return effective[0];
  return and(...effective);
}

async function queryTableItems(table: any, page = 0, index = 1) {
  const queryParam = { Table: [table], PageParam: { page: page, index: index } };
  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(res);
  return extractItemsAndTotal(res).items || [];
}

function normalizeDictType(item: any): DimensionDictType {
  return {
    ...item,
    sort_no: Number(item?.sort_no || 0),
    status: bitToNumber(item?.status),
    builtin_flag: bitToNumber(item?.builtin_flag),
    lingma_sys_is_delete: bitToNumber(item?.lingma_sys_is_delete),
  };
}

function normalizeDictItem(item: any): DimensionDictItem {
  return {
    ...item,
    sort_no: Number(item?.sort_no || 0),
    status: bitToNumber(item?.status),
    builtin_flag: bitToNumber(item?.builtin_flag),
    lingma_sys_is_delete: bitToNumber(item?.lingma_sys_is_delete),
  };
}

export function createEmptyDimensionDictType(): DimensionDictType {
  return {
    rowid: newRowId(),
    dict_type_code: '',
    dict_type_name: '',
    description: '',
    sort_no: 1,
    status: 1,
    builtin_flag: 0,
  };
}

export function createEmptyDimensionDictItem(dictTypeCode = ''): DimensionDictItem {
  return {
    rowid: newRowId(),
    dict_type_code: dictTypeCode,
    item_code: '',
    item_name: '',
    item_value: '',
    parent_code: '',
    description: '',
    sort_no: 1,
    status: 1,
    builtin_flag: 0,
  };
}

export async function getDimensionDictTypeList(includeDisabled = true) {
  const table = createDictTypeTable();
  table.Filter = buildFilter([cond('lingma_sys_is_delete', 'notequal', 1)]);
  const items = await queryTableItems(table, 0, 1);
  return items
    .map(normalizeDictType)
    .filter((item) => includeDisabled || Number(item.status) === 1)
    .sort((a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0));
}

export async function getDimensionDictItemList(query: DimensionDictItemQuery = {}) {
  const table = createDictItemTable();
  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  const dictTypeCode = String(query.dict_type_code || '').trim();
  if (dictTypeCode) filters.push(cond('dict_type_code', 'equal', dictTypeCode));
  table.Filter = buildFilter(filters);
  const keyword = String(query.keyword || '').trim().toLowerCase();
  const items = await queryTableItems(table, 0, 1);
  return items
    .map(normalizeDictItem)
    .filter((item) => query.includeDisabled !== false || Number(item.status) === 1)
    .filter((item) => {
      if (!keyword) return true;
      return [item.dict_type_code, item.item_code, item.item_name, item.item_value, item.parent_code, item.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    })
    .sort((a, b) => {
      const typeDiff = String(a.dict_type_code || '').localeCompare(String(b.dict_type_code || ''));
      if (typeDiff !== 0) return typeDiff;
      const sortDiff = Number(a.sort_no || 0) - Number(b.sort_no || 0);
      if (sortDiff !== 0) return sortDiff;
      return String(a.item_code || '').localeCompare(String(b.item_code || ''));
    });
}

export async function saveDimensionDictType(item: DimensionDictType, options: DimensionDictSaveOptions = {}) {
  const rowid = String(item?.rowid || '').trim() || newRowId();
  const table = createDictTypeTable();
  table.Filter = and(cond('rowid', 'equal', rowid));
  const existed = await queryTableItems(table, 1, 1);
  const normalized = {
    ...item,
    rowid,
    dict_type_code: String(item?.dict_type_code || '').trim(),
    dict_type_name: String(item?.dict_type_name || '').trim(),
    description: String(item?.description || '').trim(),
    sort_no: Number(item?.sort_no || 0),
    status: Number(item?.status || 0),
    builtin_flag: Number(item?.builtin_flag || 0),
  };
  const added = options.forceCreate || !existed.length ? [normalized] : [];
  const changed = !options.forceCreate && existed.length ? [normalized] : [];
  await requestClient.post(table.saveUrl, table.getSaveParam(added, changed, []), {
    headers: table.getRequestHeader(),
  });
  return rowid;
}

export async function saveDimensionDictItem(item: DimensionDictItem, options: DimensionDictSaveOptions = {}) {
  const rowid = String(item?.rowid || '').trim() || newRowId();
  const table = createDictItemTable();
  table.Filter = and(cond('rowid', 'equal', rowid));
  const existed = await queryTableItems(table, 1, 1);
  const normalized = {
    ...item,
    rowid,
    dict_type_code: String(item?.dict_type_code || '').trim(),
    item_code: String(item?.item_code || '').trim(),
    item_name: String(item?.item_name || '').trim(),
    item_value: String(item?.item_value || '').trim(),
    parent_code: String(item?.parent_code || '').trim(),
    description: String(item?.description || '').trim(),
    sort_no: Number(item?.sort_no || 0),
    status: Number(item?.status || 0),
    builtin_flag: Number(item?.builtin_flag || 0),
  };
  const added = options.forceCreate || !existed.length ? [normalized] : [];
  const changed = !options.forceCreate && existed.length ? [normalized] : [];
  await requestClient.post(table.saveUrl, table.getSaveParam(added, changed, []), {
    headers: table.getRequestHeader(),
  });
  return rowid;
}

export async function deleteDimensionDictType(rowid: string) {
  const normalizedRowid = String(rowid || '').trim();
  if (!normalizedRowid) return;
  const table = createDictTypeTable();
  table.Filter = and(cond('rowid', 'equal', normalizedRowid));
  const existed = await queryTableItems(table, 1, 1);
  if (!existed.length) return;
  await requestClient.post(table.saveUrl, table.getSaveParam([], [], existed.map((item) => ({ rowid: item.rowid }))), {
    headers: table.getRequestHeader(),
  });
}

export async function deleteDimensionDictItem(rowid: string) {
  const normalizedRowid = String(rowid || '').trim();
  if (!normalizedRowid) return;
  const table = createDictItemTable();
  table.Filter = and(cond('rowid', 'equal', normalizedRowid));
  const existed = await queryTableItems(table, 1, 1);
  if (!existed.length) return;
  await requestClient.post(table.saveUrl, table.getSaveParam([], [], existed.map((item) => ({ rowid: item.rowid }))), {
    headers: table.getRequestHeader(),
  });
}
