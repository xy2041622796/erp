import { generateUUID } from '@vben/utils';

import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';

// Bil_Invoice_Detail
// 数据表相关参数（如需联调，请替换为真实 ModelId）
const INVOICE_DETAIL_MODEL_ID = 'B6E42E3BE77E83A2D08306F0775F64B7'; // Placeholder
const INVOICE_DETAIL_TABLE = 'Bil_Invoice_Detail';
const INVOICE_DETAIL_DB = 'LMBill';
const INVOICE_DETAIL_PK = 'rowid';

export namespace BilInvoiceDetailApi {
  export interface InvoiceDetail {
    rowid?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;

    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;

    total_amount?: number;
    tax_amount?: number;
    tax_rate?: number;
    invoice_amount?: number;
    invoice_content?: string;

    invoice_id?: string;
  }
}

export async function queryInvoiceDetails(params: { invoice_id: string }) {
  const table = new DataTable(
    INVOICE_DETAIL_MODEL_ID,
    INVOICE_DETAIL_TABLE,
    INVOICE_DETAIL_DB,
    INVOICE_DETAIL_PK,
  );

  table.Filter = and(cond('invoice_id', 'equal', params.invoice_id));

  if (!table.Fields || table.Fields.length === 0) {
      }

  const queryParam = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items =
    resultData && Array.isArray(resultData.Items) ? resultData.Items : [];

  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = items;
  return returnData;
}

export async function saveInvoiceDetails(payload: {
  add?: BilInvoiceDetailApi.InvoiceDetail[];
  removeRowIds?: string[];
  update?: BilInvoiceDetailApi.InvoiceDetail[];
}) {
  const table = new DataTable(
    INVOICE_DETAIL_MODEL_ID,
    INVOICE_DETAIL_TABLE,
    INVOICE_DETAIL_DB,
    INVOICE_DETAIL_PK,
  );

  const addList = (payload.add ?? []).map((item) => ({
    ...item,
    rowid: item.rowid || generateUUID(),
    lingma_sys_is_delete: item.lingma_sys_is_delete ?? 0,
  }));

  const updateList = (payload.update ?? []).map((item) => ({
    ...item,
    lingma_sys_is_delete: item.lingma_sys_is_delete ?? 0,
  }));

  const deleteList = (payload.removeRowIds ?? []).map((id) => ({
    [INVOICE_DETAIL_PK]: id,
  }));

  const saveParam = table.getSaveParam(addList, updateList, deleteList);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
