import type { BilInvoiceDetailApi } from './details';

import { generateUUID } from '@vben/utils';

import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

import { queryInvoiceDetails, saveInvoiceDetails } from './details';

// Bil_Invoice_Info
// 数据表相关参数（如需联调，请替换为真实 ModelId）
const INVOICE_INFO_MODEL_ID = 'B6E42E3BE77E83A2D08306F0775F64B7'; //
const INVOICE_INFO_TABLE = 'Bil_Invoice_Info';
const INVOICE_INFO_DB = 'LMBill';
const INVOICE_INFO_PK = 'rowid';

export namespace BilInvoiceInfoApi {
  export interface InvoiceInfo {
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

    is_seller_invoice?: number;
    is_red_invoice?: number;

    total_amount?: number;
    tax_amount?: number;
    invoice_amount?: number;

    invoice_content?: string;
    remark?: string;

    address?: string;
    contact_phone?: string;
    bank_account?: string;
    bank_name?: string;
    tax_number?: string;
    invoice_title?: string;

    issue_date?: Date | number | string;
    invoice_number?: string;
    is_electronic_invoice?: number;
    invoice_type?: string;

    seller_company_id?: string;
    customer_id?: string;

    details?: BilInvoiceDetailApi.InvoiceDetail[];
  }
}

function normalizeBoolFlag(value: any): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return value ? 1 : 0;
  return value ? 1 : 0;
}

/** 查询开票信息列表（分页） */
export async function getInvoiceInfoPage(params: any) {
  const table = new DataTable(
    INVOICE_INFO_MODEL_ID,
    INVOICE_INFO_TABLE,
    INVOICE_INFO_DB,
    INVOICE_INFO_PK,
  );

  const filterConds: any[] = [];

  if (params.invoice_number) {
    filterConds.push(cond('invoice_number', 'contains', params.invoice_number));
  }

  if (params.invoice_title) {
    filterConds.push(cond('invoice_title', 'contains', params.invoice_title));
  }

  if (params.tax_number) {
    filterConds.push(cond('tax_number', 'contains', params.tax_number));
  }

  if (params.customer_id) {
    filterConds.push(cond('customer_id', 'equal', params.customer_id));
  }

  if (params.invoice_type) {
    filterConds.push(cond('invoice_type', 'equal', params.invoice_type));
  }

  if (
    params.is_seller_invoice !== undefined &&
    params.is_seller_invoice !== null
  ) {
    filterConds.push(
      cond(
        'is_seller_invoice',
        'equal',
        normalizeBoolFlag(params.is_seller_invoice),
      ),
    );
  }

  if (params.is_red_invoice !== undefined && params.is_red_invoice !== null) {
    filterConds.push(
      cond('is_red_invoice', 'equal', normalizeBoolFlag(params.is_red_invoice)),
    );
  }

  if (
    params.is_electronic_invoice !== undefined &&
    params.is_electronic_invoice !== null
  ) {
    filterConds.push(
      cond(
        'is_electronic_invoice',
        'equal',
        normalizeBoolFlag(params.is_electronic_invoice),
      ),
    );
  }

  // 日期区间（issueDateRange: [start,end]）
  if (
    Array.isArray(params.issueDateRange) &&
    params.issueDateRange.length === 2
  ) {
    const [start, end] = params.issueDateRange;
    if (start)
      filterConds.push(cond('issue_date', 'greaterthanorequal', start));
    if (end) filterConds.push(cond('issue_date', 'lessthanorequal', end));
  }

  // 关键字：抬头/税号/号码/备注/内容
  if (params.keyword) {
    filterConds.push(
      or(
        cond('invoice_title', 'contains', params.keyword),
        cond('tax_number', 'contains', params.keyword),
        cond('invoice_number', 'contains', params.keyword),
        cond('invoice_content', 'contains', params.keyword),
        cond('remark', 'contains', params.keyword),
      ),
    );
  }

  if (filterConds.length > 0) table.Filter = and(...filterConds);

  if (!table.Fields || table.Fields.length === 0) {
      }

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
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
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);

  return {
    dataTable: table,
    list: items,
    total,
  };
}

/** 查询开票信息详情（含明细） */
export async function getInvoiceInfo(id: string) {
  const table = new DataTable(
    INVOICE_INFO_MODEL_ID,
    INVOICE_INFO_TABLE,
    INVOICE_INFO_DB,
    INVOICE_INFO_PK,
  );
  table.Filter = cond(INVOICE_INFO_PK, 'equal', id);

  if (!table.Fields || table.Fields.length === 0) {
      }

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(res);
  const resultData = res.data?.Result?.data || res.data?.Result || res.data;
  const row = (resultData.Items && resultData.Items[0]) || null;
  if (!row) return null;

  const detailRes = await queryInvoiceDetails({ invoice_id: id });
  row.details = detailRes.list || [];

  return row;
}

/** 新增开票信息（含明细） */
export async function createInvoiceInfo(data: BilInvoiceInfoApi.InvoiceInfo) {
  const table = new DataTable(
    INVOICE_INFO_MODEL_ID,
    INVOICE_INFO_TABLE,
    INVOICE_INFO_DB,
    INVOICE_INFO_PK,
  );

  const uid = generateUUID();

  const details = Array.isArray(data.details) ? data.details : [];
  if (details.length > 0) {
    await saveInvoiceDetails({
      add: details.map((item) => ({
        ...item,
        rowid: generateUUID(),
        invoice_id: uid,
        lingma_sys_is_delete: item.lingma_sys_is_delete ?? 0,
      })),
    });
  }

  const payload = {
    ...data,
    rowid: uid,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  delete (payload as any).details;

  const saveParam = table.getSaveParam([payload], [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 修改开票信息（含明细增删改） */
export async function updateInvoiceInfo(data: BilInvoiceInfoApi.InvoiceInfo) {
  if (!data.rowid) throw new Error('缺少 rowid');

  const table = new DataTable(
    INVOICE_INFO_MODEL_ID,
    INVOICE_INFO_TABLE,
    INVOICE_INFO_DB,
    INVOICE_INFO_PK,
  );

  const id = data.rowid;

  const nextDetails = Array.isArray(data.details) ? data.details : [];
  const nextRowIds = new Set(
    nextDetails
      .map((d) => d.rowid)
      .filter((v): v is string => typeof v === 'string' && v.length > 0),
  );

  const prev = await queryInvoiceDetails({ invoice_id: id });
  const prevList = Array.isArray(prev.list) ? prev.list : [];
  const prevRowIds = new Set(
    prevList
      .map((d: any) => d?.rowid)
      .filter((v: any): v is string => typeof v === 'string' && v.length > 0),
  );

  const toAdd: BilInvoiceDetailApi.InvoiceDetail[] = [];
  const toUpdate: BilInvoiceDetailApi.InvoiceDetail[] = [];

  for (const item of nextDetails) {
    const rowid = item.rowid || generateUUID();
    const normalized = {
      ...item,
      rowid,
      invoice_id: id,
      lingma_sys_is_delete: item.lingma_sys_is_delete ?? 0,
    };
    if (prevRowIds.has(rowid)) toUpdate.push(normalized);
    else toAdd.push(normalized);
  }

  const toDelete = [...prevRowIds].filter((rid) => !nextRowIds.has(rid));

  if (toAdd.length > 0 || toUpdate.length > 0 || toDelete.length > 0) {
    await saveInvoiceDetails({
      add: toAdd,
      update: toUpdate,
      removeRowIds: toDelete,
    });
  }

  const payload = {
    ...data,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  delete (payload as any).details;

  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 删除开票信息（软删） */
export async function deleteInvoiceInfo(id: string) {
  // 如果你们后端是物理删除：可以改成 getSaveParam([],[],[{rowid:id}])
  // 当前按“软删”处理，保持和其它 Bil_* 表一致
  return await updateInvoiceInfo({ rowid: id, lingma_sys_is_delete: 1 });
}

/** 物理删除开票信息（谨慎） */
export async function hardDeleteInvoiceInfo(id: string) {
  const table = new DataTable(
    INVOICE_INFO_MODEL_ID,
    INVOICE_INFO_TABLE,
    INVOICE_INFO_DB,
    INVOICE_INFO_PK,
  );

  const saveParam = table.getSaveParam([], [], [{ [INVOICE_INFO_PK]: id }]);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
