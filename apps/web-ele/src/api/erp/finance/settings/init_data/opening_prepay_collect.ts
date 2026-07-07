import { generateUUID } from '@vben/utils';

import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

// biz_opening_prepay_collect（期初预收/预付）
// 注意：此处的 modelId/formkey 需要替换为你们后端实际配置
const MODEL_ID = 'A6C4A7FF1FA2802CE1D15D6C51E5E2F4';
const TABLE = 'biz_opening_prepay_collect';
const DB = 'LMBill';
const PK = 'id';

export namespace OpeningPrepayCollectApi {
  export type BusinessType = 'pre_receipt' | 'pre_payment' | string;

  export interface Record {
    id?: string;
    rowid?: string;

    createuser?: string;
    createtime?: Date | number | string;
    updateuser?: string;
    updatetime?: Date | number | string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;
    lingma_sys_ent?: string;

    salesman_id?: string;
    dept_id?: string;
    supplier_id?: string;
    project_id?: string;

    contract_no?: string;

    prepay_collect_amount?: number;
    opening_balance?: number;
    actual_balance?: number;

    remark?: string;
    status?: string;
    attachment_ids?: string;
    opening_date?: string | number;
    opening_no?: string;
    business_type?: BusinessType;
  }

  export type PageResult<T> = {
    list: T[];
    total: number;
  };
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

export async function getOpeningPrepayCollectPage(params: {
  business_type?: OpeningPrepayCollectApi.BusinessType;
  keyword?: string;
  pageNo?: number;
  page?: number;
}) {
  const table = new DataTable(MODEL_ID, TABLE, DB, PK);

  const filterConds: any[] = [];

  if (
    params?.business_type !== undefined &&
    params?.business_type !== null &&
    params?.business_type !== ''
  ) {
    filterConds.push(cond('business_type', 'equal', params.business_type));
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

export async function getOpeningPrepayCollectById(id: string) {
  const key = String(id ?? '').trim();
  if (!key) throw new Error('缺少 id');

  const table = new DataTable(MODEL_ID, TABLE, DB, PK);
  table.Filter = and(cond(PK, 'equal', key));

  const queryParam: any = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const { items } = extractListAndTotal(resQuery);
  return items?.[0];
}

export async function createOpeningPrepayCollect(data: OpeningPrepayCollectApi.Record) {
  const table = new DataTable(MODEL_ID, TABLE, DB, PK);

  const payload: any = {
    ...data,
    id: data.id || data.rowid || generateUUID(),
    opening_date: toDateOnlyString((data as any).opening_date),
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  delete payload.rowid;

  const saveParam = table.getSaveParam([payload], [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateOpeningPrepayCollect(data: OpeningPrepayCollectApi.Record) {
  if (!data.id && data.rowid) data.id = data.rowid;
  if (!data.id) throw new Error('缺少 id');

  const table = new DataTable(MODEL_ID, TABLE, DB, PK);
  const payload: any = {
    ...data,
    opening_date: toDateOnlyString((data as any).opening_date),
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  delete payload.rowid;

  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function deleteOpeningPrepayCollect(id: string) {
  return await updateOpeningPrepayCollect({ id, lingma_sys_is_delete: 1 });
}
