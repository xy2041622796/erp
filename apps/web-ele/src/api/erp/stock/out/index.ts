import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';

export namespace ErpStockOutApi {
  /** 其它出库单信息 */
  export interface StockOut {
    rowid?: string; // 主键
    id?: number; // 出库编号
    no?: string; // 出库单号
    customer_id?: number; // 客户编号
    customer_name?: string; // 客户名称
    out_time?: Date | string; // 出库时间
    total_count?: number; // 合计数量
    total_price?: number; // 合计金额，单位：元
    status?: number; // 状态
    remark?: string; // 备注
    file_url?: string; // 附件
    items?: StockOutItem[]; // 出库产品清单

    // 兼容旧页面驼峰字段
    customerId?: number;
    customerName?: string;
    outTime?: Date | string;
    totalCount?: number;
    totalPrice?: number;
    fileUrl?: string;
  }

  /** 其它出库单产品信息 */
  export interface StockOutItem {
    id?: number; // 编号
    out_id?: number; // 出库编号
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

const DATA_MODEL_ID = '5CE5FF6CC1D2E00DE80FDC3390F7BB1D';
const TABLE_NAME = 'erp_stock_out';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'rowid';

function getTable() {
  return createFinanceDataTableCurrent(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
}

function withItemAlias<T extends Record<string, any>>(row: T | null | undefined): T | null | undefined {
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
  } as T;
}

function withAlias<T extends Record<string, any>>(row: T | null | undefined): T | null | undefined {
  if (!row) return row;
  return {
    ...row,
    customerId: row.customer_id,
    customerName: row.customer_name,
    outTime: row.out_time,
    totalCount: row.total_count,
    totalPrice: row.total_price,
    fileUrl: row.file_url,
    items: Array.isArray(row.items) ? row.items.map(withItemAlias) : row.items,
  } as T;
}

function normalizeItem(item: ErpStockOutApi.StockOutItem) {
  return {
    ...item,
    warehouse_id: item.warehouse_id ?? item.warehouseId,
    product_id: item.product_id ?? item.productId,
    product_name: item.product_name ?? item.productName,
    product_unit_id: item.product_unit_id ?? item.productUnitId,
    product_unit_name: item.product_unit_name ?? item.productUnitName,
    product_bar_code: item.product_bar_code ?? item.productBarCode,
    product_price: item.product_price ?? item.productPrice,
    total_price: item.total_price ?? item.totalPrice,
    stock_count: item.stock_count ?? item.stockCount,
  };
}

function normalizeData(data: ErpStockOutApi.StockOut) {
  return {
    ...data,
    customer_id: data.customer_id ?? data.customerId,
    customer_name: data.customer_name ?? data.customerName,
    out_time: data.out_time ?? data.outTime,
    total_count: data.total_count ?? data.totalCount,
    total_price: data.total_price ?? data.totalPrice,
    file_url: data.file_url ?? data.fileUrl,
    items: Array.isArray(data.items) ? data.items.map(normalizeItem) : data.items,
  };
}

async function resolveStockOutRowId(idOrRowId: string | number) {
  const table = getTable();
  table.Filter = or(
    cond(PRIMARY_KEY, 'equal', idOrRowId),
    cond('id', 'equal', idOrRowId),
  );

  const queryParam = {
    Table: [table],
    PageParam: {
      page: 1,
      index: 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  return resQuery?.data?.Result?.data?.Items?.[0]?.[PRIMARY_KEY] || null;
}

/** 查询其它出库单分页 */
export async function getStockOutPage(params: any) {
  const table = getTable();

  const filters: any[] = [];

  if (params?.no) {
    filters.push(cond('no', 'contains', params.no));
  }
  const customerId = params?.customer_id ?? params?.customerId;
  if (customerId !== undefined && customerId !== null && customerId !== '') {
    filters.push(cond('customer_id', 'equal', customerId));
  }
  if (params?.status !== undefined && params?.status !== null && params?.status !== '') {
    filters.push(cond('status', 'equal', params.status));
  }
  const outTime = params?.out_time ?? params?.outTime;
  if (Array.isArray(outTime) && outTime.length === 2) {
    filters.push(cond('out_time', 'greaterthanorequal', outTime[0]));
    filters.push(cond('out_time', 'lessthanorequal', outTime[1]));
  }

  if (filters.length > 0) {
    table.Filter = filters.length === 1 ? filters[0] : and(...filters);
  }

  const page = params?.page || 0;
  const index = params?.pageNo || params?.page || 1;
  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: page,
      index: index,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);

  const resData = resQuery.data.Result.data;
  const returnData = new clientData();
  returnData.dataTable = table;

  const list = Array.isArray(resData?.Items) ? resData.Items.map(withAlias) : [];
  returnData.list = list;
  returnData.total = resData?.Count || list.length || 0;

  return returnData;
}

/** 查询其它出库单详情 */
export async function getStockOut(idOrRowId: number | string) {
  const table = getTable();
  table.Filter = or(
    cond(PRIMARY_KEY, 'equal', idOrRowId),
    cond('id', 'equal', idOrRowId),
  );

  const queryParam = {
    Table: [table],
    PageParam: {
      page: 1,
      index: 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);

  const resData = resQuery.data.Result.data;
  return resData.Items.length > 0 ? withAlias(resData.Items[0]) : null;
}

/** 新增其它出库单 */
export async function createStockOut(data: ErpStockOutApi.StockOut) {
  const table = getTable();
  const saveParam = table.getSaveParam([normalizeData(data)], [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 修改其它出库单 */
export async function updateStockOut(data: ErpStockOutApi.StockOut) {
  const table = getTable();
  const normalized = normalizeData(data);
  const rowid = normalized.rowid || (normalized.id ? await resolveStockOutRowId(normalized.id) : null);
  const saveParam = table.getSaveParam([], [{ ...normalized, rowid }], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 更新其它出库单的状态 */
export async function updateStockOutStatus(idOrRowId: number | string, status: number) {
  const table = getTable();
  const rowid = await resolveStockOutRowId(idOrRowId);
  const data = { [PRIMARY_KEY]: rowid, status };
  const saveParam = table.getSaveParam([], [data], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 删除其它出库单 */
export async function deleteStockOut(ids: Array<number | string>) {
  const table = getTable();
  const rowIds = (await Promise.all(ids.map((id) => resolveStockOutRowId(id)))).filter(Boolean);
  const deleteList = rowIds.map((rowid) => ({ [PRIMARY_KEY]: rowid }));
  const saveParam = table.getSaveParam([], [], deleteList);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 导出其它出库单 Excel */
export function exportStockOut(params: any) {
  return requestClient.download('/erp/stock-out/export-excel', {
    params,
  });
}
