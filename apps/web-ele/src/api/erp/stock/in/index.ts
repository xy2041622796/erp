import type { Filter } from '#/api/qyapi';

import { generateUUID } from '@vben/utils';

import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';
import { getSupplierSimpleList } from '#/api/erp/purchase/supplier';
import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export namespace ErpStockInApi {
  /** 其它入库单信息 */
  export interface StockIn {
    id?: number | string; // 入库编号
    rowid?: string;
    no?: string; // 入库单号
    supplier_id?: number | string; // 供应商编号
    supplier_name?: string; // 供应商名称
    in_time?: Date | string; // 入库时间
    total_count?: number; // 合计数量
    total_price?: number; // 合计金额，单位：元
    status?: number; // 状态
    remark?: string; // 备注
    file_url?: string; // 附件
    product_names?: string; // 产品信息
    creator_name?: string; // 创建人
    deleted?: number | string; // 是否删除
    lingma_sys_is_delete?: number | string; // 是否删除
    items?: StockInItem[]; // 入库产品清单

    // 兼容旧页面驼峰字段
    supplierId?: number | string;
    supplierName?: string;
    inTime?: Date | string;
    totalCount?: number;
    totalPrice?: number;
    fileUrl?: string;
    productNames?: string;
    creatorName?: string;
  }

  /** 其它入库单产品信息 */
  export interface StockInItem {
    id?: number | string; // 编号
    in_id?: number | string; // 入库编号
    warehouse_id?: number; // 仓库编号
    product_id?: number; // 产品编号
    product_name?: string; // 产品名称
    product_unit_id?: number; // 产品单位编号
    product_unit_name?: string; // 产品单位名称
    product_bar_code?: string; // 产品条码
    count?: number; // 数量
    product_price?: number; // 产品单价
    total_price?: number; // 总价
    stock_count?: number; // 库存数量
    remark?: string; // 备注
    deleted?: number | string; // 是否删除
    lingma_sys_is_delete?: number | string; // 是否删除

    // 兼容旧页面驼峰字段
    warehouseId?: number;
    productId?: number;
    productName?: string;
    productUnitId?: number;
    productUnitName?: string;
    productBarCode?: string;
    productPrice?: number;
    totalPrice?: number;
    stockCount?: number;
  }
}

const MODEL_ID = '3B9E68ED7DC5103EDF0F58C5269F15AE';
const TABLE_NAME = 'erp_stock_in';
const DB_NAME = 'LMBill';
const PK_FIELD = 'id';
function getTable() {
  return createFinanceDataTableCurrent(MODEL_ID, TABLE_NAME, DB_NAME, PK_FIELD);
}

function nowMysql() {
  return new Date()
    .toISOString()
    .replace('T', ' ')
    .replace('Z', '')
    .slice(0, 19);
}

function padNumber(value: number, length = 2) {
  return String(value).padStart(length, '0');
}

function buildFallbackStockInNo() {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    padNumber(now.getMonth() + 1),
    padNumber(now.getDate()),
  ].join('');
  const timePart = [
    padNumber(now.getHours()),
    padNumber(now.getMinutes()),
    padNumber(now.getSeconds()),
    padNumber(now.getMilliseconds(), 3),
  ].join('');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `QTRK-${datePart}-${timePart}${suffix}`;
}

function normalizeBitNumber(value: unknown, defaultValue = 0) {
  if (value === undefined || value === null || value === '')
    return defaultValue;
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : defaultValue;
  const text = String(value).trim();
  const bitMatch = text.match(/^b'([01])'$/i);
  if (bitMatch) return Number(bitMatch[1]);
  const numberValue = Number(text);
  return Number.isFinite(numberValue) ? numberValue : defaultValue;
}

function normalizeIntegerId(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : undefined;
  }
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return undefined;
  const numberValue = Number(text);
  return Number.isSafeInteger(numberValue) ? numberValue : undefined;
}

function removeUndefined<T extends Record<string, any>>(row: T): T {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined),
  ) as T;
}

function parseJsonValue(value: any): any {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text || (!text.startsWith('{') && !text.startsWith('['))) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function getQueryResultData(raw: any) {
  const responseData = parseJsonValue(raw?.data ?? raw);
  const rawBody = parseJsonValue(responseData?.raw ?? responseData);
  const result = parseJsonValue(
    responseData?.Result ?? responseData?.data ?? rawBody?.Result ?? rawBody,
  );
  return parseJsonValue(result?.data ?? result?.Data ?? result);
}

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = getQueryResultData(raw);
  let items: any[] = [];
  if (Array.isArray(resultData?.Items)) {
    items = resultData.Items;
  } else if (Array.isArray(resultData?.items)) {
    items = resultData.items;
  } else if (Array.isArray(resultData)) {
    items = resultData;
  }
  const total = Number(resultData?.Count ?? resultData?.count ?? items.length);
  return { items, total: Number.isFinite(total) ? total : items.length };
}

function getSupplierLookupKeys(supplier: any) {
  return [
    supplier?.id,
    supplier?.rowid,
    supplier?.ROWID,
    supplier?.customer_id,
    supplier?.customerId,
    supplier?.ReportID,
    supplier?.customer_code,
    supplier?.customerCode,
  ]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
}

function getSupplierName(supplier: any) {
  return (
    supplier?.name ??
    supplier?.customer_name ??
    supplier?.customerName ??
    supplier?.supplier_name ??
    supplier?.supplierName
  );
}

async function normalizeSupplierFields(
  supplierIdLike: unknown,
  supplierNameLike: unknown,
) {
  const rawSupplierId = String(supplierIdLike ?? '').trim();
  const rawSupplierName = String(supplierNameLike ?? '').trim();
  const directNumericId = normalizeIntegerId(rawSupplierId);

  if (!rawSupplierId) {
    return {
      supplier_id: undefined,
      supplier_name: rawSupplierName || undefined,
    };
  }

  const suppliers = await getSupplierSimpleList().catch(() => []);
  const supplier = (Array.isArray(suppliers) ? suppliers : []).find(
    (item: any) => getSupplierLookupKeys(item).includes(rawSupplierId),
  );
  const supplierName = String(
    getSupplierName(supplier) ?? rawSupplierName,
  ).trim();
  const numericId =
    directNumericId ??
    normalizeIntegerId(supplier?.id) ??
    normalizeIntegerId(supplier?.customer_id) ??
    normalizeIntegerId(supplier?.customerId) ??
    normalizeIntegerId(supplier?.ReportID);

  return {
    supplier_id: numericId,
    supplier_name: supplierName || undefined,
  };
}

function withItemAlias<T extends Record<string, any>>(
  row: null | T | undefined,
): null | T | undefined {
  if (!row) return row;
  return {
    ...row,
    warehouseId: row.warehouse_id,
    productId: row.product_id,
    productName: row.product_name,
    productUnitId: row.product_unit_id,
    productUnitName: row.product_unit_name,
    productBarCode: row.product_bar_code,
    productPrice: row.product_price,
    totalPrice: row.total_price,
    stockCount: row.stock_count,
    deleted: normalizeBitNumber(row.deleted),
    lingma_sys_is_delete: normalizeBitNumber(row.lingma_sys_is_delete),
  } as T;
}

function withAlias<T extends Record<string, any>>(
  row: null | T | undefined,
): null | T | undefined {
  if (!row) return row;
  return {
    ...row,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    inTime: row.in_time,
    totalCount: row.total_count,
    totalPrice: row.total_price,
    fileUrl: row.file_url,
    productNames: row.product_names,
    creatorName: row.creator_name,
    deleted: normalizeBitNumber(row.deleted),
    lingma_sys_is_delete: normalizeBitNumber(row.lingma_sys_is_delete),
    items: Array.isArray(row.items)
      ? row.items.map((item) => withItemAlias(item))
      : row.items,
  } as T;
}

function normalizeItem(item: ErpStockInApi.StockInItem) {
  const normalized = {
    id: item.id,
    in_id: item.in_id,
    warehouse_id: item.warehouse_id ?? item.warehouseId,
    product_id: item.product_id ?? item.productId,
    product_name: item.product_name ?? item.productName,
    product_unit_id: item.product_unit_id ?? item.productUnitId,
    product_unit_name: item.product_unit_name ?? item.productUnitName,
    product_bar_code: item.product_bar_code ?? item.productBarCode,
    count: item.count,
    product_price: item.product_price ?? item.productPrice,
    total_price: item.total_price ?? item.totalPrice,
    stock_count: item.stock_count ?? item.stockCount,
    remark: item.remark,
    deleted: normalizeBitNumber(item.deleted),
    lingma_sys_is_delete: normalizeBitNumber(item.lingma_sys_is_delete),
  };

  return {
    ...normalized,
    total_price:
      normalized.total_price ??
      Number(normalized.count || 0) * Number(normalized.product_price || 0),
  };
}

async function normalizeData(data: ErpStockInApi.StockIn) {
  const items = Array.isArray(data.items)
    ? data.items.map((item) => normalizeItem(item))
    : data.items;
  const totalCount = Array.isArray(items)
    ? items.reduce((sum, item) => sum + Number(item?.count || 0), 0)
    : (data.total_count ?? data.totalCount);
  const totalPrice = Array.isArray(items)
    ? items.reduce((sum, item) => sum + Number(item?.total_price || 0), 0)
    : (data.total_price ?? data.totalPrice);

  const productNames = Array.isArray(items)
    ? items
        .map((item) => item.product_name)
        .filter((name) => name && String(name).trim())
        .join('、')
    : (data.product_names ?? data.productNames);

  const supplier = await normalizeSupplierFields(
    data.supplier_id ?? data.supplierId,
    data.supplier_name ?? data.supplierName,
  );

  return removeUndefined({
    id: data.id,
    rowid: data.rowid,
    no: data.no,
    supplier_id: supplier.supplier_id,
    supplier_name: supplier.supplier_name,
    in_time: data.in_time ?? data.inTime,
    total_count: totalCount,
    total_price: totalPrice,
    status: data.status ?? 10,
    remark: data.remark,
    file_url: data.file_url ?? data.fileUrl,
    product_names: productNames,
    creator_name: data.creator_name ?? data.creatorName,
    deleted: normalizeBitNumber(data.deleted),
    lingma_sys_is_delete: normalizeBitNumber(data.lingma_sys_is_delete),
    items,
  });
}

function getPositiveNumber(value: unknown, defaultValue: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : defaultValue;
}

function getSortableTime(row: any) {
  const text = String(
    row?.createtime ??
      row?.create_time ??
      row?.in_time ??
      row?.updatetime ??
      '',
  ).trim();
  if (!text) return 0;
  const time = new Date(text.replace(' ', 'T')).getTime();
  return Number.isFinite(time) ? time : 0;
}

function compareStockInDesc(a: any, b: any) {
  const timeDiff = getSortableTime(b) - getSortableTime(a);
  if (timeDiff !== 0) return timeDiff;

  const idDiff = Number(b?.id || 0) - Number(a?.id || 0);
  if (Number.isFinite(idDiff) && idDiff !== 0) return idDiff;

  return String(b?.no || '').localeCompare(String(a?.no || ''));
}

function buildQueryParam(table: ReturnType<typeof getTable>, page = 0, index = 1) {
  const queryParam: any = {
    Table: [table],
  };

  if (page > 0) {
    queryParam.PageParam = {
      page,
      index,
    };
  }

  return queryParam;
}

async function resolveStockInRowId(idOrRowId: number | string) {
  const table = getTable();
  const rowFilters: any[] = [cond(PK_FIELD, 'equal', idOrRowId)];
  if (PK_FIELD !== 'rowid') {
    rowFilters.push(cond('rowid', 'equal', idOrRowId));
  }
  table.Filter =
    rowFilters.length === 1
      ? rowFilters[0]
      : { Type: 'or', Filters: rowFilters };

  const queryParam = buildQueryParam(table, 1, 1);

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  } as any);

  table.execQueryResult(resQuery);
  return extractListAndTotal(resQuery).items?.[0]?.rowid || null;
}

/** 查询其它入库单分页 */
export async function getStockInPage(params: any) {
  const table = getTable();
  const filters: Filter[] = [];

  if (params?.no) {
    filters.push(cond('no', 'contains', params.no));
  }
  const supplierId = params?.supplier_id ?? params?.supplierId;
  if (supplierId !== undefined && supplierId !== null && supplierId !== '') {
    filters.push(cond('supplier_id', 'equal', supplierId));
  }
  if (
    params?.status !== undefined &&
    params?.status !== null &&
    params?.status !== ''
  ) {
    filters.push(cond('status', 'equal', params.status));
  }
  const inTime = params?.in_time ?? params?.inTime;
  if (Array.isArray(inTime) && inTime.length === 2) {
    filters.push(
      cond('in_time', 'greaterthanorequal', inTime[0]),
      cond('in_time', 'lessthanorequal', inTime[1]),
    );
  }

  if (filters.length > 0) {
    table.Filter = and(...filters);
  }

  const size = getPositiveNumber(
    params?.size ?? params?.pageSize ?? params?.page,
    10,
  );
  const index = getPositiveNumber(
    params?.index ?? params?.pageNo ?? params?.currentPage,
    1,
  );

  const queryParam = buildQueryParam(table, size, index);

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  } as any);

  table.execQueryResult(resQuery);

  const ClientData = clientData;
  const returnData = new ClientData();
  returnData.dataTable = table;

  const resData = resQuery.data.Result.data;
  const list = Array.isArray(resData?.Items)
    ? resData.Items.map((item: any) => withAlias(item))
    : [];
  returnData.list = list;
  returnData.total = resData?.Count || list.length || 0;

  return returnData;
}

/** 查询其它入库单详情 */
export async function getStockIn(id: number | string) {
  const table = getTable();
  table.Filter = and(cond(PK_FIELD, 'equal', id));

  const queryParam = buildQueryParam(table, 1, 1);

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  } as any);

  table.execQueryResult(resQuery);

  const ClientData = clientData;
  const returnData = new ClientData();
  returnData.dataTable = table;

  const { items } = extractListAndTotal(resQuery);
  if (items.length > 0) {
    returnData.list = withAlias(items[0]);
  }

  return returnData;
}

/** 新增其它入库单 */
export async function createStockIn(data: ErpStockInApi.StockIn) {
  const table = getTable();
  const saveData = await normalizeData(data);
  const now = nowMysql();
  // id 是整数自增主键，由后端/数据库自动生成，不传 UUID 字符串
  saveData.rowid = saveData.rowid || generateUUID();
  saveData.no = saveData.no || buildFallbackStockInNo();
  saveData.createtime = saveData.createtime || now;
  saveData.updatetime = saveData.updatetime || now;
  if (Array.isArray(saveData.items)) {
    saveData.items = saveData.items.map((item) => ({
      ...item,
      id: item.id || generateUUID(),
      in_id: saveData.rowid,
    }));
  }
  const saveParam = table.getSaveParam([saveData], [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 修改其它入库单 */
export async function updateStockIn(data: ErpStockInApi.StockIn) {
  const table = getTable();
  const normalized = await normalizeData(data);
  normalized.updatetime = nowMysql();
  const rowid =
    normalized.rowid ||
    (normalized.id ? await resolveStockInRowId(normalized.id) : null);
  const saveParam = table.getSaveParam([], [{ ...normalized, rowid }], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 更新其它入库单的状态 */
export async function updateStockInStatus(id: number | string, status: number) {
  const table = getTable();
  const rowid = await resolveStockInRowId(id);
  const data = { rowid, [PK_FIELD]: id, status };
  const saveParam = table.getSaveParam([], [data], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 删除其它入库单 */
export async function deleteStockIn(ids: Array<number | string>) {
  const table = getTable();
  const resolvedRowIds = await Promise.all(
    ids.map((id) => resolveStockInRowId(id)),
  );
  const rowIds = resolvedRowIds.filter(Boolean);
  const deleteList = rowIds.map((rowid) => ({ rowid, [PK_FIELD]: rowid }));
  const saveParam = table.getSaveParam([], [], deleteList);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 导出其它入库单 Excel */
export function exportStockIn(params: any) {
  return requestClient.download('/erp/stock-in/export-excel', {
    params,
  });
}
