import { generateUUID } from '@vben/utils';

import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';

export namespace OpeningEntryCustomerApi {
  export interface Row {
    id?: string;
    customer_id?: string;
    customer_code?: string;
    customer_name?: string;
    salesman_id?: string;
    salesman_name?: string;
    opening_receivable?: number;
    opening_prepayment?: number;
    opening_balance?: number;
    opening_date?: string;
    remark?: string;
    status?: number;
    account_set_id?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;
    lingma_sys_ent?: string;
  }
}

export const OPENING_ENTRY_CUSTOMER_FORM_ID = '7B2D5E8A1C4F9B3E6D8A2C5F1B4E7A9D';
export const OPENING_ENTRY_CUSTOMER_TABLE_NAME = 'biz_opening_customer_ar';
export const OPENING_ENTRY_CUSTOMER_DB_NAME = 'LMBill';
export const OPENING_ENTRY_CUSTOMER_PK = 'id';

function createOpeningEntryCustomerTable(formId = OPENING_ENTRY_CUSTOMER_FORM_ID) {
  return createFinanceDataTableCurrent(
    formId,
    OPENING_ENTRY_CUSTOMER_TABLE_NAME,
    OPENING_ENTRY_CUSTOMER_DB_NAME,
    OPENING_ENTRY_CUSTOMER_PK,
  );
}

function extractListAndTotal(raw: any) {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? items.length;
  return { items, total };
}

export async function getOpeningEntryCustomerPage(params: {
  keyword?: string;
  customer_id?: string;
  pageNo?: number;
  page?: number;
}) {
  const table = createOpeningEntryCustomerTable();
  const conditions: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  if (params.customer_id) conditions.push(cond('customer_id', 'equal', params.customer_id));
  if (params.keyword) {
    conditions.push(
      and(
        cond('customer_name', 'contains', params.keyword),
      ),
    );
  }
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

export async function createOpeningEntryCustomer(data: OpeningEntryCustomerApi.Row) {
  const table = createOpeningEntryCustomerTable();
  const payload = {
    ...data,
    id: data.id || generateUUID(),
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
    status: data?.status ?? 10,
    opening_balance:
      data?.opening_balance ??
      Number(
        ((Number(data?.opening_receivable || 0) - Number(data?.opening_prepayment || 0))).toFixed(2),
      ),
  };
  const saveParam = table.getSaveParam([payload], [], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function updateOpeningEntryCustomer(data: OpeningEntryCustomerApi.Row) {
  if (!data.id) throw new Error('缺少 id');
  const table = createOpeningEntryCustomerTable();
  const payload = {
    ...data,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
    opening_balance:
      data?.opening_balance ??
      Number(
        ((Number(data?.opening_receivable || 0) - Number(data?.opening_prepayment || 0))).toFixed(2),
      ),
  };
  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function updateOpeningEntryCustomerStatus(id: string, status: number) {
  const table = createOpeningEntryCustomerTable();
  const saveParam = table.getSaveParam([], [{ id, status }], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function deleteOpeningEntryCustomer(id: string) {
  return await updateOpeningEntryCustomer({ id, lingma_sys_is_delete: 1 });
}
