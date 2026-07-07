import { generateUUID } from '@vben/utils';

import { and, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../common/account-set-scope';

// biz_opening_income_expense_settle（期初收入/支出结算）
// 注意：此处的 modelId/formkey 需要替换为你们后端实际配置
const MODEL_ID = 'A6C4A7FF1FA2802CE1D15D6C51E5E2F4';
const TABLE = 'biz_opening_income_expense_settle';
const DB = 'LMBill';
const PK = 'id';

export namespace OpeningIncomeExpenseSettleApi {
  export interface Record {
    id?: string;
    rowid?: string;

    opening_no?: string;
    opening_date?: string | number;

    project_id?: string;
    contract_id?: string;
    contract_no?: string;
    customer_id?: string;

    payment_term?: string;
    salesman_id?: string;
    dept_id?: string;

    opening_balance?: number;
    opening_received_paid_amount?: number;
    opening_invoiced_amount?: number;

    receive_pay_account_id?: string;
    remark?: string;
    status?: number;
    attachment_ids?: string;

    biz_type?: string;
    account_set_id?: string;

    tax_rate?: number;
    tax_amount?: number;
    amount?: number;
    total_amount?: number;

    lingma_sys_ent?: string;
    updateuser?: string;
    updatetime?: Date | number | string;
    lingma_sys_is_delete?: number;
    flowstate?: number;
    createtime?: Date | number | string;
    wfid?: string;
    description?: string;
    createuser?: string;
    ReportID?: string;
  }
}

function createOpeningIncomeExpenseSettleTable() {
  return createFinanceDataTable(MODEL_ID, TABLE, DB, PK);
}

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? (Array.isArray(items) ? items.length : 0);
  return { items, total };
}

function toDateOnlyString(v: any): any {
  if (!v) return v;
  if (v instanceof Date) {
    const d = v;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  if (typeof v === 'number' || (typeof v === 'string' && /^\d{10,}$/.test(v))) {
    const n = Number(v);
    const ms = n < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    const pad = (x: number) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return v;
}

export async function getOpeningIncomeExpenseSettlePage(params: {
  biz_type?: string;
  keyword?: string;
  pageNo?: number;
  page?: number;
}) {
  const table = createOpeningIncomeExpenseSettleTable();

  const filterConds: any[] = [];
  if (
    params?.biz_type !== undefined &&
    params?.biz_type !== null &&
    String(params?.biz_type).trim() !== ''
  ) {
    filterConds.push(cond('biz_type', 'equal', params.biz_type));
  }

  if (params?.keyword) {
    filterConds.push(
      or(
        cond('opening_no', 'contains', params.keyword),
        cond('contract_no', 'contains', params.keyword),
        cond('remark', 'contains', params.keyword),
        cond('description', 'contains', params.keyword),
      ),
    );
  }

  filterConds.push(cond('lingma_sys_is_delete', 'notequal', 1));
  if (filterConds.length > 0) table.Filter = and(...filterConds);

  const queryParam: any = {
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
  return { list: items, total };
}

export async function getOpeningIncomeExpenseSettleById(id: string) {
  const key = String(id ?? '').trim();
  if (!key) throw new Error('缺少 id');

  const table = createOpeningIncomeExpenseSettleTable();
  table.Filter = and(cond(PK, 'equal', key));

  const queryParam: any = { Table: [table], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const { items } = extractListAndTotal(resQuery);
  return items?.[0];
}

export async function createOpeningIncomeExpenseSettle(data: OpeningIncomeExpenseSettleApi.Record) {
  const table = createOpeningIncomeExpenseSettleTable();
  const payload: any = {
    ...data,
    id: data.id || data.rowid || generateUUID(),
    opening_date: toDateOnlyString((data as any).opening_date),
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  delete payload.rowid;
  // 防御：避免旧表单字段导致后端拼 SQL 报 Unknown column
  delete payload.order_id;
  delete payload.items;

  const saveParam = table.getSaveParam([payload], [], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function updateOpeningIncomeExpenseSettle(data: OpeningIncomeExpenseSettleApi.Record) {
  if (!data.id && data.rowid) data.id = data.rowid;
  if (!data.id) throw new Error('缺少 id');

  const table = createOpeningIncomeExpenseSettleTable();
  const payload: any = {
    ...data,
    opening_date: toDateOnlyString((data as any).opening_date),
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  delete payload.rowid;
  // 防御：避免旧表单字段导致后端拼 SQL 报 Unknown column
  delete payload.order_id;
  delete payload.items;

  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function deleteOpeningIncomeExpenseSettle(id: string) {
  return await updateOpeningIncomeExpenseSettle({ id, lingma_sys_is_delete: 1 });
}
