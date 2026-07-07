import type { PageParam } from '@vben/request';

import { generateUUID, isEmpty } from '@vben/utils';

import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';

import {
  addPaymentDetails,
  deletePaymentDetails,
  queryPaymentDetails,
  updatePaymentDetails,
  type ErpPaymentDetailApi,
} from './paymentDetails';
import { createFinanceDataTable } from '../../common/account-set-scope';

export namespace ErpOtherExpenseApi {
  /** 主表：其他支出（Bil_Expense_Settlement，settlement_type = 2） */
  export interface OtherExpense {
    rowid?: string;
    createuser?: string;
    createtime?: Date | string;
    updateuser?: string;
    updatetime?: Date | string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;

    settlement_type?: number; // 0=正常 1=退款? 2=其他支出（约定）
    status?: number;

    pay_account?: string;
    total_amount?: number;
    is_tax_included?: number;
    tax_rate?: number;
    amount?: number;

    expense_category?: string;
    product_name?: string;
    product_id?: string;

    project_id?: string;
    depart_id?: string;
    salesman_id?: string;
    contract_id?: string;

    settlement_date?: Date | string;
    account_period?: Date | string;

    settlement_no?: string;
    supplier_id?: string;
    remark?: string;

    settlement_period?: string;
    ticket_amount?: number;
    pay_balance?: number;
    pay_amount?: number;

    /** 子表：收款/付款明细（在“其他支出”场景作为“支出明细”使用） */
    details?: ErpPaymentDetailApi.PaymentDetail[];
  }
}

// 与支出结算共用同一张表
// 注意：此处需要替换为你们 Bil_Expense_Settlement 的真实 formkey
const OTHER_EXPENSE_MODEL_ID = '55EF587C216C3D9B6FCF8F2C5BC40086';
const OTHER_EXPENSE_TABLE = 'Bil_Expense_Settlement';
const OTHER_EXPENSE_DB = 'LMBill';
const OTHER_EXPENSE_PK = 'rowid';

// Bil_Expense_Settlement 已移除 submit_id，这里显式指定查询字段，避免后端仍拼接 submit_id 到 SELECT 列表
const OTHER_EXPENSE_QUERY_FIELDS: any[] = [
  { Name: 'createtime', AsName: '', OrderType: 'descending', Order: 1, Group: 0 },
  { Name: 'postscript', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'supplier_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'status', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'expense_category', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'product_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'settlement_no', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'contract_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'total_amount', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'ticket_amount', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'is_not_settlement', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'lingma_sys_ent', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'amount', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'pay_account', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'is_advance', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'is_tax_included', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'tax_rate', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'advance_amount', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'account_period', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'salesman_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'pay_balance', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'pay_amount', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'remark', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'product_name', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'depart_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'project_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'settlement_date', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'rowid', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'settlement_type', AsName: '', OrderType: null, Order: 0, Group: 0 },
];

// 注意：此处需要替换为你们“其他支出单号”的编码规则ID（getCodeString 第二个参数实际是 menuId）
const OTHER_EXPENSE_NO_RULE_ID = 'E23AF021B8CEC59F51DB4C628157FA1F';

async function rollbackOtherExpense(rowid: string, detailRowids: string[]) {
  try {
    if (detailRowids.length > 0) {
      await deletePaymentDetails(detailRowids);
    }
  } finally {
    await deleteOtherExpense([rowid]);
  }
}

export async function getOtherExpensePage(params: any & PageParam): Promise<clientData> {
  const table = createFinanceDataTable(
    OTHER_EXPENSE_MODEL_ID,
    OTHER_EXPENSE_TABLE,
    OTHER_EXPENSE_DB,
    OTHER_EXPENSE_PK,
  );

  const conditions: any[] = [
    cond('lingma_sys_is_delete', 'equal', 0),
    cond('settlement_type', 'equal', 2),
  ];

  if (params.settlement_no) {
    conditions.push(cond('settlement_no', 'contains', params.settlement_no));
  }
  if (params.supplier_id) {
    conditions.push(cond('supplier_id', 'equal', params.supplier_id));
  }
  if (params.project_id) {
    conditions.push(cond('project_id', 'equal', params.project_id));
  }
  if (!isEmpty(params.status)) {
    conditions.push(cond('status', 'equal', params.status));
  }
  if (
    params.settlement_date &&
    Array.isArray(params.settlement_date) &&
    params.settlement_date.length === 2
  ) {
    conditions.push(cond('settlement_date', 'greaterthanorequal', params.settlement_date[0]));
    conditions.push(cond('settlement_date', 'lessthanorequal', params.settlement_date[1]));
  }

  table.Filter = and(...conditions);

  table.Fields = OTHER_EXPENSE_QUERY_FIELDS;

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
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);

  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = items;
  returnData.total = total;
  return returnData;
}

export async function getOtherExpense(rowid: string) {
  const table = createFinanceDataTable(
    OTHER_EXPENSE_MODEL_ID,
    OTHER_EXPENSE_TABLE,
    OTHER_EXPENSE_DB,
    OTHER_EXPENSE_PK,
  );

  table.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond('settlement_type', 'equal', 2),
    cond(OTHER_EXPENSE_PK, 'equal', rowid),
  );

  table.Fields = OTHER_EXPENSE_QUERY_FIELDS;

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const main = (resultData.Items && resultData.Items[0]) || null;

  if (main) {
    const resDetails = await queryPaymentDetails({ business_doc_id: main.rowid });
    main.details = resDetails.list || [];
  }

  return main;
}

export async function createOtherExpense(
  data: ErpOtherExpenseApi.OtherExpense,
  options?: { codeMenuId?: string; codeRuleId?: string },
) {
  const table = createFinanceDataTable(
    OTHER_EXPENSE_MODEL_ID,
    OTHER_EXPENSE_TABLE,
    OTHER_EXPENSE_DB,
    OTHER_EXPENSE_PK,
  );

  const uid = generateUUID();

  const details = Array.isArray(data?.details) ? data.details : [];
  const newDetails = details.map((d: any) => ({
    ...d,
    rowid: d.rowid || generateUUID(),
    business_doc_id: uid,
    lingma_sys_is_delete: 0,
  }));

  const detailRowids = newDetails.map((d: any) => String(d.rowid)).filter(Boolean);

  const { details: _details, ...rest } = data as any;
  const payload = {
    ...rest,
    rowid: uid,
    settlement_type: 2,
    lingma_sys_is_delete: 0,
  };

  const saveParam = table.getSaveParam([payload], [], []);
  let res: any;

  try {
    if (newDetails.length > 0) {
      await addPaymentDetails(newDetails);
    }

    res = await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });

    const codeMenuId = options?.codeMenuId ?? options?.codeRuleId ?? OTHER_EXPENSE_NO_RULE_ID;

    if (codeMenuId) {
      const codeRes = await getCodeString(uid, codeMenuId, table.getRequestHeader());
      if (codeRes.Code === 200 && codeRes.Message) {
        await updateOtherExpense({ rowid: uid, settlement_no: codeRes.Message });
        return { ...res, rowid: uid, settlement_no: codeRes.Message };
      }

      await rollbackOtherExpense(uid, detailRowids);
      return Promise.reject(new Error(codeRes.Message || '获取编码失败'));
    }

    return { ...res, rowid: uid };
  } catch (error) {
    await rollbackOtherExpense(uid, detailRowids);
    throw error;
  }
}

export async function updateOtherExpense(data: ErpOtherExpenseApi.OtherExpense) {
  const table = createFinanceDataTable(
    OTHER_EXPENSE_MODEL_ID,
    OTHER_EXPENSE_TABLE,
    OTHER_EXPENSE_DB,
    OTHER_EXPENSE_PK,
  );

  const rowid = data.rowid;
  if (!rowid) {
    throw new Error('缺少 rowid，无法更新');
  }

  // 子表：按 rowid 分流（新增/更新/删除）
  if (Array.isArray(data.details)) {
    const oldDetailsRes = await queryPaymentDetails({ business_doc_id: rowid });
    const oldDetails = (oldDetailsRes.list || []) as any[];
    const oldDetailMap = new Map(oldDetails.map((d: any) => [d.rowid, d]));

    const incoming = data.details as any[];
    const incomingIds = new Set();

    const toAdd: any[] = [];
    const toUpdate: any[] = [];

    for (const d of incoming) {
      if (d.rowid && oldDetailMap.has(d.rowid)) {
        incomingIds.add(d.rowid);
        toUpdate.push({
          ...d,
          business_doc_id: rowid,
          lingma_sys_is_delete: d.lingma_sys_is_delete ?? 0,
        });
      } else {
        const newId = generateUUID();
        toAdd.push({
          ...d,
          rowid: newId,
          business_doc_id: rowid,
          lingma_sys_is_delete: 0,
        });
      }
    }

    const toDelete = oldDetails.filter((d) => !incomingIds.has(d.rowid)).map((d) => d.rowid);

    if (toDelete.length > 0) {
      await deletePaymentDetails(toDelete);
    }
    if (toAdd.length > 0) {
      await addPaymentDetails(toAdd);
    }
    if (toUpdate.length > 0) {
      await updatePaymentDetails(toUpdate);
    }
  }

  const { details: _details, ...rest } = data as any;
  const saveParam = table.getSaveParam([], [rest], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateOtherExpenseStatus(rowid: string, status: number) {
  return updateOtherExpense({ rowid, status });
}

export async function deleteOtherExpense(rowids: string[]) {
  const table = createFinanceDataTable(
    OTHER_EXPENSE_MODEL_ID,
    OTHER_EXPENSE_TABLE,
    OTHER_EXPENSE_DB,
    OTHER_EXPENSE_PK,
  );

  const deleteList = rowids.map((id) => ({
    [OTHER_EXPENSE_PK]: id,
    lingma_sys_is_delete: 1,
  }));

  const saveParam = table.getSaveParam([], [], deleteList as any);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
