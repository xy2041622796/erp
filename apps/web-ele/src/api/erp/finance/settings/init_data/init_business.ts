import { generateUUID } from '@vben/utils';

import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

// Bil_Init_Business（业务期初）
// 注意：此处的 modelId/formkey 需要替换为你们后端实际配置
const INIT_BUSINESS_MODEL_ID = 'A6C4A7FF1FA2802CE1D15D6C51E5E2F4';
const INIT_BUSINESS_TABLE = 'Bil_Init_Business';
const INIT_BUSINESS_DB = 'LMBill';
const INIT_BUSINESS_PK = 'id';

export namespace BilInitBusinessApi {
  export interface InitBusiness {
    id?: string;
    rowid?: string; // 兼容旧字段，后续可移除
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
    remark?: string;
    init_remark?: string;

    // 业务字段（与 Bil_Init_Business 表结构一致）
    business_type?: number | string;
    salary_id?: string;
    salesman_dept_id?: string;
    salesman_id?: string;
    init_amount?: number;
    receivable_balance?: number;
    invoiced_amount?: number;
    received_amount?: number;
    init_type?: string;
    relate_account?: string;
    project_id?: string;
    contract_id?: string;
    customer_id?: string;
    init_date?: string | number;
    init_detail_id?: string;
    init_no?: string;


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

export async function getInitBusinessPage(params: {
  business_type?: number | string;
  keyword?: string;
  pageNo?: number;
  page?: number;
}) {
  async function runQuery() {
    const table = new DataTable(
      INIT_BUSINESS_MODEL_ID,
      INIT_BUSINESS_TABLE,
      INIT_BUSINESS_DB,
      INIT_BUSINESS_PK,
    );

    const filterConds: any[] = [];

    if (params?.business_type !== undefined && params?.business_type !== null && params?.business_type !== '') {
      filterConds.push(cond('business_type', 'equal', params.business_type));
    }

    if (params?.keyword) {
      filterConds.push(
        or(
          cond('init_no', 'contains', params.keyword),
          cond('remark', 'contains', params.keyword),
          cond('init_remark', 'contains', params.keyword),
          cond('description', 'contains', params.keyword),
        ),
      );
    }

    // 默认过滤软删
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
    return {
      dataTable: table,
      list: items,
      total,
    };
  }

  return await runQuery();
}

export async function getInitBusinessById(id: string) {
  const key = String(id ?? '').trim();
  if (!key) throw new Error('缺少 id');

  const table = new DataTable(
    INIT_BUSINESS_MODEL_ID,
    INIT_BUSINESS_TABLE,
    INIT_BUSINESS_DB,
    INIT_BUSINESS_PK,
  );

  table.Filter = and(cond(INIT_BUSINESS_PK, 'equal', key));

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: 1,
      index: 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const { items } = extractListAndTotal(resQuery);
  return items?.[0];
}

export async function createInitBusiness(
  data: BilInitBusinessApi.InitBusiness,
) {
  async function runCreate(payload: any) {
    const table = new DataTable(
      INIT_BUSINESS_MODEL_ID,
      INIT_BUSINESS_TABLE,
      INIT_BUSINESS_DB,
      INIT_BUSINESS_PK,
    );
    const saveParam = table.getSaveParam([payload], [], []);
    return await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
  }


  // 日期字段处理：如为时间戳/Date，转为 yyyy-MM-dd
  let initDate: any = data.init_date as any;
  if (initDate instanceof Date) {
    const d = initDate;
    const pad = (n: number) => String(n).padStart(2, '0');
    initDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } else if (typeof initDate === 'number' || (typeof initDate === 'string' && /^\d{10,}$/.test(initDate))) {
    const n = Number(initDate);
    const ms = n < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    const pad = (x: number) => String(x).padStart(2, '0');
    initDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  const basePayload: any = {
    ...data,
    init_date: initDate,
    id: data.id || data.rowid || generateUUID(),
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  // 避免旧字段干扰
  delete basePayload.rowid;
  // 订单关系不落主表，且部分环境已无该字段
  delete (basePayload as any).order_id;
  delete (basePayload as any).items;

  try {
    return await runCreate(basePayload);
  } catch (error: any) {
    throw error;
  }
}

export async function updateInitBusiness(
  data: BilInitBusinessApi.InitBusiness,
) {
  if (!data.id && data.rowid) data.id = data.rowid;
  if (!data.id) throw new Error('缺少 id');

  async function runUpdate(payload: any) {
    const table = new DataTable(
      INIT_BUSINESS_MODEL_ID,
      INIT_BUSINESS_TABLE,
      INIT_BUSINESS_DB,
      INIT_BUSINESS_PK,
    );
    const saveParam = table.getSaveParam([], [payload], []);
    return await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
  }


  // 日期字段处理：如为时间戳/Date，转为 yyyy-MM-dd
  let initDate: any = data.init_date as any;
  if (initDate instanceof Date) {
    const d = initDate;
    const pad = (n: number) => String(n).padStart(2, '0');
    initDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } else if (typeof initDate === 'number' || (typeof initDate === 'string' && /^\d{10,}$/.test(initDate))) {
    const n = Number(initDate);
    const ms = n < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    const pad = (x: number) => String(x).padStart(2, '0');
    initDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  const basePayload: any = {
    ...data,
    init_date: initDate,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  // 避免旧字段干扰
  delete basePayload.rowid;
  // 订单关系不落主表，且部分环境已无该字段
  delete (basePayload as any).order_id;
  delete (basePayload as any).items;

  try {
    return await runUpdate(basePayload);
  } catch (error: any) {
    throw error;
  }
}

export async function deleteInitBusiness(id: string) {
  return await updateInitBusiness({ id, lingma_sys_is_delete: 1 });
}
