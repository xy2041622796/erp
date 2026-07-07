import { generateUUID } from '@vben/utils';

import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';

export namespace OpeningEntrySupplierApi {
  export interface Row {
    id?: string;
    supplier_id?: string;
    supplier_code?: string;
    supplier_name?: string;
    purchaser_id?: string;
    purchaser_name?: string;
    opening_payable?: number;
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

export const OPENING_ENTRY_SUPPLIER_FORM_ID = '3C6F9A2D1C5E8B4F7A9D2E5B8C1F4A7E';
export const OPENING_ENTRY_SUPPLIER_TABLE_NAME = 'biz_opening_supplier_ap';
export const OPENING_ENTRY_SUPPLIER_DB_NAME = 'LMBill';
export const OPENING_ENTRY_SUPPLIER_PK = 'id';

function createOpeningEntrySupplierTable(formId = OPENING_ENTRY_SUPPLIER_FORM_ID) {
  return createFinanceDataTableCurrent(
    formId,
    OPENING_ENTRY_SUPPLIER_TABLE_NAME,
    OPENING_ENTRY_SUPPLIER_DB_NAME,
    OPENING_ENTRY_SUPPLIER_PK,
  );
}

function extractListAndTotal(raw: any) {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? items.length;
  return { items, total };
}

export async function getOpeningEntrySupplierPage(params: {
  keyword?: string;
  supplier_id?: string;
  pageNo?: number;
  page?: number;
}) {
  const table = createOpeningEntrySupplierTable();
  const conditions: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  if (params.supplier_id) conditions.push(cond('supplier_id', 'equal', params.supplier_id));
  if (params.keyword) conditions.push(cond('supplier_name', 'contains', params.keyword));
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

export async function createOpeningEntrySupplier(data: OpeningEntrySupplierApi.Row) {
  const table = createOpeningEntrySupplierTable();
  const payload = {
    ...data,
    id: data.id || generateUUID(),
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
    status: data?.status ?? 10,
    opening_balance:
      data?.opening_balance ??
      Number(
        ((Number(data?.opening_payable || 0) - Number(data?.opening_prepayment || 0))).toFixed(2),
      ),
  };
  const saveParam = table.getSaveParam([payload], [], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function updateOpeningEntrySupplier(data: OpeningEntrySupplierApi.Row) {
  if (!data.id) throw new Error('缺少 id');
  const table = createOpeningEntrySupplierTable();
  const payload = {
    ...data,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
    opening_balance:
      data?.opening_balance ??
      Number(
        ((Number(data?.opening_payable || 0) - Number(data?.opening_prepayment || 0))).toFixed(2),
      ),
  };
  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function updateOpeningEntrySupplierStatus(id: string, status: number) {
  const table = createOpeningEntrySupplierTable();
  const saveParam = table.getSaveParam([], [{ id, status }], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function deleteOpeningEntrySupplier(id: string) {
  return await updateOpeningEntrySupplier({ id, lingma_sys_is_delete: 1 });
}
