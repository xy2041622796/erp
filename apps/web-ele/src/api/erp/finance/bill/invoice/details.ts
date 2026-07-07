import { generateUUID } from '@vben/utils';

import {
  and,
  clientData as ClientData,
  cond,
  DataTable,
  or,
} from '#/api/qyapi';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';
import { requestClient } from '#/api/request';

// Bil_Invoice_Detail（开票明细表）
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

    /** 价税合计 */
    total_amount?: number;
    /** 税额 */
    tax_amount?: number;
    /** 税率(%) */
    tax_rate?: number;
    /** 未税开票金额 */
    invoice_amount?: number;
    /** 开票内容（商品/服务名称） */
    invoice_content?: string;

    /** 发票/申请ID（外键） */
    invoice_id?: string;
    /** 企业 */
    lingma_sys_ent?: string;

    price?: number;
    /** 商品ID */
    product_id?: string;
    /** 开票商品数量 */
    product_num?: number;
  }
}

export async function queryInvoiceDetails(params: { invoice_id: string }) {
  const table = createFinanceDataTable(
    INVOICE_DETAIL_MODEL_ID,
    INVOICE_DETAIL_TABLE,
    INVOICE_DETAIL_DB,
    INVOICE_DETAIL_PK,
  );

  table.Filter = and(
    cond('invoice_id', 'equal', params.invoice_id),
    cond('lingma_sys_is_delete', 'notequal', 1),
  );

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

  const returnData = new ClientData();
  returnData.dataTable = table;
  returnData.list = items;
  return returnData;
}

export async function saveInvoiceDetails(payload: {
  add?: BilInvoiceDetailApi.InvoiceDetail[];
  removeRowIds?: string[];
  update?: BilInvoiceDetailApi.InvoiceDetail[];
}) {
  const table = createFinanceDataTable(
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

/** 根据多个开票申请 ID 查询明细 */
export async function queryInvoiceDetailsByInvoiceIds(invoiceIds: string[]) {
  const table = createFinanceDataTable(
    INVOICE_DETAIL_MODEL_ID,
    INVOICE_DETAIL_TABLE,
    INVOICE_DETAIL_DB,
    INVOICE_DETAIL_PK,
  );

  const ids = invoiceIds.filter((id) => id && id.length > 0);
  if (ids.length === 0) {
    return [];
  }

  // 构建 IN 查询 (OR 条件)
  const idConds = ids.map((id) => cond('invoice_id', 'equal', id));
  table.Filter = or(...idConds);

  const queryParam = {
    Table: [table],
    PageParam: { page: 1000, index: 1 },
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

  return items;
}
