import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';
import { createFinanceDataTableCurrent } from '../../finance/common/account-set-scope';

export namespace OpeningSupplierApi {
  export interface Row {
    rowid?: string;
    id?: string;
    supplier_id?: string;
    opening_date?: string;
    opening_payable?: number;
    opening_paid?: number;
    opening_balance?: number;
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

export const OPENING_SUPPLIER_FORM_ID = '__TODO_OPENING_SUPPLIER_FORM_ID__';
export const OPENING_SUPPLIER_TABLE_NAME = 'biz_opening_supplier';
export const OPENING_SUPPLIER_DB_NAME = 'LMBill';
export const OPENING_SUPPLIER_PK = 'rowid';

function createOpeningSupplierTable(formId = OPENING_SUPPLIER_FORM_ID) {
  return createFinanceDataTableCurrent(
    formId,
    OPENING_SUPPLIER_TABLE_NAME,
    OPENING_SUPPLIER_DB_NAME,
    OPENING_SUPPLIER_PK,
  );
}

function extractListAndTotal(raw: any) {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? items.length;
  return { items, total };
}

export async function getOpeningSupplierPage(params: {
  keyword?: string;
  supplier_id?: string;
  pageNo?: number;
  page?: number;
}) {
  const table = createOpeningSupplierTable();
  const conditions: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  if (params.supplier_id) conditions.push(cond('supplier_id', 'equal', params.supplier_id));
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

export async function getOpeningSupplier(id: string) {
  const table = createOpeningSupplierTable();
  table.Filter = and(cond(OPENING_SUPPLIER_PK, 'equal', id));
  const queryParam = { Table: [table], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(), responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const { items } = extractListAndTotal(resQuery);
  return items?.[0] || null;
}

export async function createOpeningSupplier(data: OpeningSupplierApi.Row) {
  const table = createOpeningSupplierTable();
  const payload = { ...data, lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0 };
  const saveParam = table.getSaveParam([payload], [], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function updateOpeningSupplier(data: OpeningSupplierApi.Row) {
  const table = createOpeningSupplierTable();
  const payload = {
    ...data,
    rowid: data.rowid ?? data.id,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function deleteOpeningSupplier(id: string) {
  return await updateOpeningSupplier({ rowid: id, lingma_sys_is_delete: 1 });
}
