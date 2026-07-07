import type { BilInvoiceApplyContractApi } from './contracts';

import { generateUUID } from '@vben/utils';

import {
  getSaleReturn,
  updateSaleReturnInvoiceSummary,
} from '#/api/erp/sale/return';
import {
  querySaleReturnItems,
  updateSaleReturnItems,
} from '#/api/erp/sale/return/returnItems';
import { and, cond, DataTable, or } from '#/api/qyapi';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';

import {
  queryInvoiceApplyContracts,
  saveInvoiceApplyContracts,
} from './contracts';
import {
  queryInvoiceDetails,
  queryInvoiceDetailsByInvoiceIds,
  saveInvoiceDetails,
} from './details';

// Bil_Invoice_Apply
// 数据表相关参数（如需联调，请替换为真实 ModelId）
const INVOICE_APPLY_MODEL_ID = 'E0602184B0D95667BC795AB2F41D814C'; // Placeholder
const INVOICE_APPLY_TABLE = 'Bil_Invoice_Apply';
const INVOICE_APPLY_DB = 'LMBill';
const INVOICE_APPLY_PK = 'rowid';

// 编码规则：请替换为真实 RuleId
const INVOICE_APPLY_NO_RULE_ID = '6E73BEA53031E00498A144763F411A65';

export namespace BilInvoiceApplyApi {
  export interface InvoiceApply {
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

    invoice_apply_no?: string;
    balance?: number;
    status?: number;
    recipient_email?: string;
    recipient_address?: string;
    recipient_phone?: string;
    recipient?: string;
    remark?: string;
    transfer_method?: string;
    total_amount?: number;

    address?: string;
    contact_phone?: string;
    bank_account?: string;
    bank_name?: string;
    tax_number?: string;
    invoice_title?: string;

    tax_rate?: number;
    invoice_type?: string;
    apply_date?: Date | number | string;
    is_red_invoice?: number;
    apply_department?: string;
    applicant?: string;

    contract_id?: string;
    customer_id?: string;

    /** 商品明细（Bil_Invoice_Detail） */
    details?: any[];
    /** 关联来源（历史：Bil_Invoice_Apply_contract） */
    relates?: BilInvoiceApplyContractApi.InvoiceApplyContract[];
  }
}

/** 仅更新开票申请主表字段（不会触发 contracts/details 的 diff） */
export async function updateInvoiceApplyBase(
  data: Partial<BilInvoiceApplyApi.InvoiceApply> & { rowid: string },
) {
  const table = createFinanceDataTable(
    INVOICE_APPLY_MODEL_ID,
    INVOICE_APPLY_TABLE,
    INVOICE_APPLY_DB,
    INVOICE_APPLY_PK,
  );

  const saveParam = table.getSaveParam([], [data as any], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 获取开票申请编码（invoice_apply_no） */
export async function getInvoiceApplyNoCode(rowid: string) {
  if (!INVOICE_APPLY_NO_RULE_ID) {
    throw new Error('未配置开票申请编码规则 INVOICE_APPLY_NO_RULE_ID');
  }

  const table = createFinanceDataTable(
    INVOICE_APPLY_MODEL_ID,
    INVOICE_APPLY_TABLE,
    INVOICE_APPLY_DB,
    INVOICE_APPLY_PK,
  );
  return await getCodeString(
    rowid,
    INVOICE_APPLY_NO_RULE_ID,
    table.getRequestHeader(),
  );
}

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function syncSaleReturnInvoiceSummaryFromInvoiceApply(
  data: any,
  currentDetails: any[] = [],
) {
  const saleReturnId = String(data?.contract_id || data?.id || '').trim();
  const currentId = String(data?.rowid || '').trim();

  if (!saleReturnId) return;

  // 1. 获取该退货单关联的所有有效开票申请（ID列表）
  // 排除已删除的
  const applyTable = createFinanceDataTable(
    INVOICE_APPLY_MODEL_ID,
    INVOICE_APPLY_TABLE,
    INVOICE_APPLY_DB,
    INVOICE_APPLY_PK,
  );
  applyTable.Filter = and(
    cond('contract_id', 'equal', saleReturnId),
    cond('lingma_sys_is_delete', 'notequal', 1),
  );
  const applyParams = {
    Table: [applyTable],
    PageParam: { page: 500, index: 1 },
  };
  const applyRes = await requestClient.post(applyTable.queryUrl, applyParams, {
    headers: applyTable.getRequestHeader(),
    responseReturn: 'raw',
  });


  applyTable.execQueryResult(applyRes);
  const applyList = applyRes.data?.Result?.data?.Items || [];
  // 过滤：拿到所有历史单据 ID（排除当前正在保存的 currentId）
  const historyApplyIds = applyList
    .map((item: any) => item.rowid)
    .filter((id: any) => id && id !== currentId);

  // 2. 汇总所有明细（当前 + 历史）
  let allDetails: any[] = [...currentDetails];

  if (historyApplyIds.length > 0) {
    const historyDetails =
      await queryInvoiceDetailsByInvoiceIds(historyApplyIds);
    allDetails = allDetails.concat(historyDetails);
  }

  // 3. 统计各商品的总已开票数、总已开票金额
  // Map<product_id, { count, amount, taxAmount }>
  const productStats = new Map<
    string,
    { amount: number; count: number; taxAmount: number }
  >();

  for (const d of allDetails) {
    const pid = d.product_id;
    if (!pid) continue;

    const current = productStats.get(pid) || {
      count: 0,
      amount: 0,
      taxAmount: 0,
    };
    current.count += toNumber(d.product_num);
    current.amount += toNumber(d.invoice_amount);
    current.taxAmount += toNumber(d.tax_amount);
    productStats.set(pid, current);
  }

  // 4. 计算退货单主表汇总数据
  let totalInvoiceQty = 0;
  let totalInvoicedAmount = 0;
  let totalInvoicedTotalAmount = 0; // 价税合计

  for (const stats of productStats.values()) {
    totalInvoiceQty += stats.count;
    totalInvoicedAmount += stats.amount;
    totalInvoicedTotalAmount += stats.amount + stats.taxAmount;
  }

  // 获取退货单原始总数/总金额（作为基准）
  // 先尝试从 data 拿（如果是退货单对象），否则查库
  let returnTotalCount = toNumber(data?.total_count, Number.NaN);
  let returnTotalPrice = toNumber(data?.total_price, Number.NaN);

  if (
    !Number.isFinite(returnTotalCount) ||
    !Number.isFinite(returnTotalPrice)
  ) {
    const saleReturn = await getSaleReturn(saleReturnId);
    returnTotalCount = toNumber(saleReturn?.total_count, 0);
    returnTotalPrice = toNumber(saleReturn?.total_price, 0);
  }

  const unInvoiceQty = Math.max(0, returnTotalCount - totalInvoiceQty);
  const unInvoiceAmount = Math.max(
    0,
    returnTotalPrice - totalInvoicedTotalAmount,
  );

  // 状态判定：10=未开票，20=部分开票，30=已全部入库
  const eps = 1e-6;
  let invoiceStatus = 20;
  if (totalInvoiceQty <= eps) {
    invoiceStatus = 10;
  } else if (unInvoiceQty <= eps && unInvoiceAmount <= eps) {
    invoiceStatus = 50;
  }

  // 更新退货单主表
  await updateSaleReturnInvoiceSummary(saleReturnId, {
    invoice_status: invoiceStatus,
    invoice_qty: Number(totalInvoiceQty.toFixed(6)),
    invoiced_amount: Number(totalInvoicedAmount.toFixed(2)),
    uninvoice_qty: Number(unInvoiceQty.toFixed(6)),
    uninvoice_amount: Number(unInvoiceAmount.toFixed(2)),
  });

  // 5. 更新退货单明细项的已开票数量 (invoice_qty)
  try {
    const resItems = await querySaleReturnItems({ return_id: saleReturnId });
    const returnItems = resItems?.list || [];

    if (returnItems.length > 0) {
      const updates: any[] = [];
      for (const rItem of returnItems) {
        if (!rItem.product_id) continue;

        // 根据 product_id 找到累计开票数量
        const stats = productStats.get(rItem.product_id);
        const qty = stats ? stats.count : 0;

        // 仅当数量有变化时才更新（可选优化）
        updates.push({
          id: rItem.id,
          invoice_qty: toNumber(qty),
        });
      }

      if (updates.length > 0) {
        await updateSaleReturnItems(updates);
      }
    }
  } catch (error) {
    console.warn('同步退货单明细开票数量失败', error);
  }
}

function normalizeBoolFlag(value: any): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return value ? 1 : 0;
  return value ? 1 : 0;
}

/** 查询开票申请列表（分页） */
export async function getInvoiceApplyPage(params: any) {
  const table = createFinanceDataTable(
    INVOICE_APPLY_MODEL_ID,
    INVOICE_APPLY_TABLE,
    INVOICE_APPLY_DB,
    INVOICE_APPLY_PK,
  );

  const filterConds: any[] = [];

  // 默认：不查已删除
  if (params.lingma_sys_is_delete === undefined) {
    filterConds.push(cond('lingma_sys_is_delete', 'notequal', 1));
  }

  if (params.invoice_apply_no) {
    filterConds.push(
      cond('invoice_apply_no', 'contains', params.invoice_apply_no),
    );
  }

  if (params.customer_id) {
    filterConds.push(cond('customer_id', 'equal', params.customer_id));
  }

  if (params.applicant) {
    filterConds.push(cond('applicant', 'contains', params.applicant));
  }

  if (params.apply_department) {
    filterConds.push(
      cond('apply_department', 'contains', params.apply_department),
    );
  }

  if (
    params.status !== undefined &&
    params.status !== null &&
    params.status !== ''
  ) {
    filterConds.push(cond('status', 'equal', params.status));
  }

  if (params.is_red_invoice !== undefined && params.is_red_invoice !== null) {
    filterConds.push(
      cond('is_red_invoice', 'equal', normalizeBoolFlag(params.is_red_invoice)),
    );
  }

  if (
    Array.isArray(params.applyDateRange) &&
    params.applyDateRange.length === 2
  ) {
    const [start, end] = params.applyDateRange;
    if (start)
      filterConds.push(cond('apply_date', 'greaterthanorequal', start));
    if (end) filterConds.push(cond('apply_date', 'lessthanorequal', end));
  }

  if (params.keyword) {
    filterConds.push(
      or(
        cond('invoice_apply_no', 'contains', params.keyword),
        cond('invoice_title', 'contains', params.keyword),
        cond('tax_number', 'contains', params.keyword),
        cond('remark', 'contains', params.keyword),
      ),
    );
  }

  if (filterConds.length > 0) table.Filter = and(...filterConds);

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

/** 查询开票申请详情（含关联合同） */
export async function getInvoiceApply(id: string) {
  const table = createFinanceDataTable(
    INVOICE_APPLY_MODEL_ID,
    INVOICE_APPLY_TABLE,
    INVOICE_APPLY_DB,
    INVOICE_APPLY_PK,
  );
  table.Filter = cond(INVOICE_APPLY_PK, 'equal', id);

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

  const contractRes = await queryInvoiceApplyContracts({
    invoice_apply_id: id,
  });
  row.relates = contractRes.list || [];
  // 兼容旧页面字段名
  row.contracts = row.relates;

  const detailRes = await queryInvoiceDetails({ invoice_id: id });
  row.details = detailRes.list || [];

  return row;
}

async function diffAndSaveInvoiceDetails(params: {
  invoiceId: string;
  nextDetails: any[];
}) {
  const invoiceId = params.invoiceId;
  const next = Array.isArray(params.nextDetails) ? params.nextDetails : [];

  const prev = await queryInvoiceDetails({ invoice_id: invoiceId });
  const prevList = Array.isArray(prev.list) ? prev.list : [];

  const prevRowIds = new Set(
    prevList
      .map((d: any) => d?.rowid)
      .filter((v: any): v is string => typeof v === 'string' && v.length > 0),
  );

  const nextRowIds = new Set(
    next
      .map((d: any) => d?.rowid)
      .filter((v: any): v is string => typeof v === 'string' && v.length > 0),
  );

  const toAdd: any[] = [];
  const toUpdate: any[] = [];

  for (const item of next) {
    const rowid = item.rowid || generateUUID();
    const normalized = {
      ...item,
      rowid,
      invoice_id: invoiceId,
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
}

/** 新增开票申请（含关联合同） */
export async function createInvoiceApply(
  data: BilInvoiceApplyApi.InvoiceApply & {
    id: string;
  },
) {
  const table = createFinanceDataTable(
    INVOICE_APPLY_MODEL_ID,
    INVOICE_APPLY_TABLE,
    INVOICE_APPLY_DB,
    INVOICE_APPLY_PK,
  );
  const uid = data.rowid || generateUUID();

  const payload: any = {
    ...data,
    rowid: uid,
    contract_id: data?.id,
  };
  delete payload.contracts;
  delete payload.details;
  delete payload.relates;

  // 1) 先写主表，避免子表孤儿数据
  const saveParam = table.getSaveParam([payload], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  // 1.5) 生成并回写编码（可选：配置了规则才执行）
  if (res && INVOICE_APPLY_NO_RULE_ID) {
    try {
      const codeRes = await getCodeString(
        uid,
        INVOICE_APPLY_NO_RULE_ID,
        table.getRequestHeader(),
      );
      if (codeRes.Code === 200 && codeRes.Message) {
        await updateInvoiceApplyBase({
          rowid: uid,
          invoice_apply_no: codeRes.Message,
        });
      } else {
        await updateInvoiceApplyBase({ rowid: uid, lingma_sys_is_delete: 1 });
        throw new Error(codeRes.Message || '获取编码失败');
      }
    } catch (error) {
      await updateInvoiceApplyBase({ rowid: uid, lingma_sys_is_delete: 1 });
      throw error;
    }
  }

  // 2) 写“关联合同/结算单”等来源（历史实现）
  const contracts = Array.isArray(data.relates) ? data.relates : [];
  if (contracts.length > 0) {
    await saveInvoiceApplyContracts({
      add: contracts.map((item) => ({
        ...item,
        rowid: item.rowid || generateUUID(),
        invoice_apply_id: uid,
      })),
    });
  }

  // 3) 写商品明细（Bil_Invoice_Detail）
  await diffAndSaveInvoiceDetails({
    invoiceId: uid,
    nextDetails: Array.isArray(data.details) ? data.details : [],
  });

  // 4) 同步回写：销售退货开票汇总（仅 saleReturn 模式回填了 id 时生效）
  try {
    await syncSaleReturnInvoiceSummaryFromInvoiceApply(
      data as any,
      data.details,
    );
  } catch (error) {
    await updateInvoiceApplyBase({ rowid: uid, lingma_sys_is_delete: 1 });
    throw error;
  }

  return res;
}

/** 修改开票申请（含关联合同增删改） */
export async function updateInvoiceApply(
  data: BilInvoiceApplyApi.InvoiceApply,
) {
  if (!data.rowid) throw new Error('缺少 rowid');

  const table = createFinanceDataTable(
    INVOICE_APPLY_MODEL_ID,
    INVOICE_APPLY_TABLE,
    INVOICE_APPLY_DB,
    INVOICE_APPLY_PK,
  );

  const id = data.rowid;

  const nextContracts = Array.isArray(data.relates) ? data.relates : [];
  const nextRowIds = new Set(
    nextContracts
      .map((d) => d.rowid)
      .filter((v): v is string => typeof v === 'string' && v.length > 0),
  );

  const prev = await queryInvoiceApplyContracts({ invoice_apply_id: id });
  const prevList = Array.isArray(prev.list) ? prev.list : [];
  const prevRowIds = new Set(
    prevList
      .map((d: any) => d?.rowid)
      .filter((v: any): v is string => typeof v === 'string' && v.length > 0),
  );

  const toAdd: BilInvoiceApplyContractApi.InvoiceApplyContract[] = [];
  const toUpdate: BilInvoiceApplyContractApi.InvoiceApplyContract[] = [];

  for (const item of nextContracts) {
    const rowid = item.rowid || generateUUID();
    const normalized = {
      ...item,
      rowid,
      invoice_apply_id: id,
      lingma_sys_is_delete: item.lingma_sys_is_delete ?? 0,
    };
    if (prevRowIds.has(rowid)) toUpdate.push(normalized);
    else toAdd.push(normalized);
  }

  const toDelete = [...prevRowIds].filter((rid) => !nextRowIds.has(rid));

  if (toAdd.length > 0 || toUpdate.length > 0 || toDelete.length > 0) {
    await saveInvoiceApplyContracts({
      add: toAdd,
      update: toUpdate,
      removeRowIds: toDelete,
    });
  }

  const payload: any = {
    ...data,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  delete payload.contracts;
  delete payload.details;
  delete payload.relates;

  const saveParam = table.getSaveParam([], [payload], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  await diffAndSaveInvoiceDetails({
    invoiceId: id,
    nextDetails: Array.isArray(data.details) ? data.details : [],
  });

  // 同步回写：销售退货开票汇总
  await syncSaleReturnInvoiceSummaryFromInvoiceApply(
    data as any,
    data.details || [],
  );

  return res;
}

/** 删除开票申请（软删） */
export async function deleteInvoiceApply(id: string) {
  return await updateInvoiceApply({ rowid: id, lingma_sys_is_delete: 1 });
}
