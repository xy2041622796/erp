import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';
import { createFinanceDataTableCurrent } from '../../finance/common/account-set-scope';

export namespace OpeningProductStockApi {
  export interface Row {
    rowid?: string;
    id?: string;
    opening_date?: string;
    warehouse_id?: string;
    product_id?: string;
    unit_name?: string;
    qty?: number;
    price?: number;
    amount?: number;
    remark?: string;
    status?: number;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    lingma_sys_is_delete?: number;
    lingma_sys_ent?: string;
  }
}

export const OPENING_PRODUCT_STOCK_FORM_ID = '__TODO_OPENING_PRODUCT_STOCK_FORM_ID__';
export const OPENING_PRODUCT_STOCK_TABLE_NAME = 'biz_opening_product_stock';
export const OPENING_PRODUCT_STOCK_DB_NAME = 'LMBill';
export const OPENING_PRODUCT_STOCK_PK = 'rowid';

function createOpeningProductStockTable(formId = OPENING_PRODUCT_STOCK_FORM_ID) {
  return createFinanceDataTableCurrent(
    formId,
    OPENING_PRODUCT_STOCK_TABLE_NAME,
    OPENING_PRODUCT_STOCK_DB_NAME,
    OPENING_PRODUCT_STOCK_PK,
  );
}

function extractListAndTotal(raw: any) {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? items.length;
  return { items, total };
}

export async function getOpeningProductStockPage(params: {
  keyword?: string;
  product_id?: string;
  warehouse_id?: string;
  pageNo?: number;
  page?: number;
}) {
  const table = createOpeningProductStockTable();
  const conditions: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  if (params.product_id) conditions.push(cond('product_id', 'equal', params.product_id));
  if (params.warehouse_id) conditions.push(cond('warehouse_id', 'equal', params.warehouse_id));
  if (params.keyword) conditions.push(cond('remark', 'contains', params.keyword));
  table.Filter = and(...conditions);

  const queryParam = {
    Table: [table],
    PageParam: { page: params.page || 10, index: params.pageNo || 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const { items, total } = extractListAndTotal(resQuery);
  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = items;
  returnData.total = total;
  return returnData;
}

export async function getOpeningProductStock(id: string) {
  const table = createOpeningProductStockTable();
  table.Filter = and(cond(OPENING_PRODUCT_STOCK_PK, 'equal', id));
  const queryParam = { Table: [table], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(), responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const { items } = extractListAndTotal(resQuery);
  return items?.[0] || null;
}

export async function createOpeningProductStock(data: OpeningProductStockApi.Row) {
  const table = createOpeningProductStockTable();
  const payload = { ...data, lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0 };
  const saveParam = table.getSaveParam([payload], [], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function updateOpeningProductStock(data: OpeningProductStockApi.Row) {
  const table = createOpeningProductStockTable();
  const payload = {
    ...data,
    rowid: data.rowid ?? data.id,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function deleteOpeningProductStock(id: string) {
  return await updateOpeningProductStock({ rowid: id, lingma_sys_is_delete: 1 });
}
