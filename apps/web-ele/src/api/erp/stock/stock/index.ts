import { exportExcelByConfig } from '#/api/common/import-export';
import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';
import { getWarehouseIdentityKeys, normalizeWarehouseIdToRowid } from '#/api/erp/stock/warehouse';

export namespace ErpStockApi {
  export interface Stock {
    rowid: string;
    product_id: string;
    product_name?: string;
    warehouse_id: string;
    warehouse_name?: string;
    count: number;
    unit_id?: string;
    unit_name?: string;
    category_id?: string;
    category_name?: string;
    creator?: string;
    create_time?: string;
    updater?: string;
    update_time?: string;
    remark?: string;
    description?: string;
    deleted?: number;
    tenant_id?: number;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    lingma_sys_is_delete?: number;
    lingma_sys_ent?: string;
  }
}
export const STOCK_MODEL_ID = '9E2B5D8A1C4F7B3E6D9A2C5F8B1E4A7D';
export const STOCK_TABLE_NAME = 'erp_stock';
export const STOCK_DB_NAME = 'LMBill';
export const STOCK_PK = 'rowid';

export function createStockTable(formKey = STOCK_MODEL_ID) {
  return createFinanceDataTableCurrent(formKey, STOCK_TABLE_NAME, STOCK_DB_NAME, STOCK_PK);
}

export const STOCK_TABLE = createStockTable();

/** 查询产品库存（分页/不分页） */
export async function getStockPage(params: any, formKey = STOCK_MODEL_ID) {
  const table = createStockTable(formKey);
  const conditions: any[] = [];
  if (params.product_id) {
    conditions.push(cond('product_id', 'equal', params.product_id));
  }
  if (params.warehouse_id) {
    const warehouseKeys = await getWarehouseIdentityKeys(params.warehouse_id);
    conditions.push(
      warehouseKeys.length > 1
        ? or(...warehouseKeys.map((key) => cond('warehouse_id', 'equal', key)))
        : cond('warehouse_id', 'equal', params.warehouse_id),
    );
  }
  table.Filter = conditions.length > 0 ? and(...conditions) : null;
  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };
  if (params.page && params.pageNo) {
    queryParam.PageParam = {
      page: params.page,
      index: params.pageNo,
    };
  }
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const resData = resQuery.data.Result.data;
  const returnData = new clientData();
  returnData.dataTable = table;
  if (params.page && params.pageNo) {
    returnData.list = resData.Items;
    returnData.total = resData.Count;
  } else if (resData.Items.length > 0) {
    returnData.list = resData.Items;
    returnData.total = resData.Count;
  }
  return returnData;
}

/** 获得产品库存数量 */
export async function getStockCount(
  productId: string,
  warehouseId?: string,
  formKey = STOCK_MODEL_ID,
) {
  const table = createStockTable(formKey);
  const conditions: any[] = [cond('product_id', 'equal', productId)];
  if (warehouseId !== undefined) {
    const warehouseKeys = await getWarehouseIdentityKeys(warehouseId);
    conditions.push(
      warehouseKeys.length > 1
        ? or(...warehouseKeys.map((key) => cond('warehouse_id', 'equal', key)))
        : cond('warehouse_id', 'equal', warehouseId),
    );
  }
  table.Filter = and(...conditions);

  const queryParam = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const resData = resQuery.data.Result.data;

  const items = resData.Items || [];
  const total = items.reduce(
    (sum: number, item: any) => sum + (item.count || 0),
    0,
  );
  return total;
}

export function exportStock(params: any, encodingId?: string) {
  if (encodingId) {
    return exportExcelByConfig({
      formId: STOCK_MODEL_ID,
      tableName: STOCK_TABLE_NAME,
      dbName: STOCK_DB_NAME,
      primaryKey: STOCK_PK,
      fileName: '产品库存',
      encodingId,
      extraData: params,
    });
  }

  return requestClient.download('/erp/stock/export-excel', {
    params,
  });
}

/** 获取库存数量 */
export function getWarehouseStockCount(
  params: any,
  formKey = STOCK_MODEL_ID,
) {
  return getStockCount(params.product_id, params.warehouse_id, formKey);
}

/** 批量新增产品库存 */
export async function addStockList(
  list: Partial<ErpStockApi.Stock>[],
  formKey = STOCK_MODEL_ID,
) {
  const table = createStockTable(formKey);
  const normalizedList = await Promise.all(
    (Array.isArray(list) ? list : []).map(async (row: any) => ({
      ...row,
      warehouse_id: row?.warehouse_id
        ? await normalizeWarehouseIdToRowid(row.warehouse_id)
        : row?.warehouse_id,
    })),
  );
  const saveParam = table.getSaveParam(normalizedList, [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 批量更新产品库存 */
export async function updateStockList(
  list: Partial<ErpStockApi.Stock>[],
  formKey = STOCK_MODEL_ID,
) {
  const table = createStockTable(formKey);
  const normalizedList = await Promise.all(
    (Array.isArray(list) ? list : []).map(async (row: any) => ({
      ...row,
      warehouse_id: row?.warehouse_id
        ? await normalizeWarehouseIdToRowid(row.warehouse_id)
        : row?.warehouse_id,
    })),
  );
  const saveParam = table.getSaveParam([], normalizedList, []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 批量删除产品库存 */
export async function deleteStockList(
  rowids: string[] | { rowid: string }[],
  formKey = STOCK_MODEL_ID,
) {
  const table = createStockTable(formKey);
  const delArr =
    Array.isArray(rowids) && typeof rowids[0] === 'string'
      ? rowids.map((id) => ({ rowid: id }))
      : rowids;
  const saveParam = table.getSaveParam([], [], delArr);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
