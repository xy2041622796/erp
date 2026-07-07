import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export namespace OpeningCustomerApi {
  export interface Row {
    rowid?: string;
    id?: string;
    customer_id?: string;
    opening_date?: string;
    opening_receivable?: number;
    opening_received?: number;
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

// TODO: 等你提供真实 formId 后替换
export const OPENING_CUSTOMER_FORM_ID = '__TODO_OPENING_CUSTOMER_FORM_ID__';
export const OPENING_CUSTOMER_TABLE_NAME = 'biz_opening_customer';
export const OPENING_CUSTOMER_DB_NAME = 'LMBill';
export const OPENING_CUSTOMER_PK = 'rowid';

function createOpeningCustomerTable(formId = OPENING_CUSTOMER_FORM_ID) {
  return new DataTable(
    formId,
    OPENING_CUSTOMER_TABLE_NAME,
    OPENING_CUSTOMER_DB_NAME,
    OPENING_CUSTOMER_PK,
  );
}

function extractListAndTotal(raw: any) {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? items.length;
  return { items, total };
}

export async function getOpeningCustomerPage(params: {
  keyword?: string;
  customer_id?: string;
  pageNo?: number;
  page?: number;
}) {
  const table = createOpeningCustomerTable();
  const conditions: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  if (params.customer_id) {
    conditions.push(cond('customer_id', 'equal', params.customer_id));
  }
  if (params.keyword) {
    conditions.push(cond('remark', 'contains', params.keyword));
  }
  table.Filter = and(...conditions);

  const queryParam = {
    Table: [table],
    PageParam: {
      page: params.page || 10,
      index: params.pageNo || 1,
    },
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

export async function getOpeningCustomer(id: string) {
  const table = createOpeningCustomerTable();
  table.Filter = and(cond(OPENING_CUSTOMER_PK, 'equal', id));
  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const { items } = extractListAndTotal(resQuery);
  return items?.[0] || null;
}

export async function createOpeningCustomer(data: OpeningCustomerApi.Row) {
  const table = createOpeningCustomerTable();
  const payload = {
    ...data,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  const saveParam = table.getSaveParam([payload], [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateOpeningCustomer(data: OpeningCustomerApi.Row) {
  const table = createOpeningCustomerTable();
  const payload = {
    ...data,
    rowid: data.rowid ?? data.id,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function deleteOpeningCustomer(id: string) {
  return await updateOpeningCustomer({ rowid: id, lingma_sys_is_delete: 1 });
}
