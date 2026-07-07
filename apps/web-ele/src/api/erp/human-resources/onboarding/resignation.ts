import QB, { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

import { listUserDjOptions } from '../attendance';

export namespace HrResignationApi {
  export interface ResignationRequest {
    id?: string;
    resign_no?: string | null;
    user_rowid?: string;
    user_dj_rowid?: string;
    dep_id?: string;
    job_rowid?: string;
    apply_date?: string | null;
    last_day?: string | null;
    handover_status?: string;
    salary_status?: string;
    certificate_issued?: boolean | number;
    status?: string;
    resign_type?: string | null;
    resign_reason?: string | null;
    remark?: string | null;
    userName?: string;
    departmentName?: string;
    jobName?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    status?: string;
  }
}

const RESIGNATION_FORM_KEY = '847D59BE6EAA2316724038FC117CAAD6';
const DB_NAME = 'LMBill';
const TABLE_NAME = 'Bil_HR_Resignation_Requests';
const PK = 'id';

function newGuid() {
  return QB.GetNewGUID();
}

function createLocalCode(prefix: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 100_000)).padStart(5, '0');
  return `${prefix}-${year}${month}${day}-${random}`;
}

function toItems(resQuery: any) {
  const resultData = resQuery?.data?.Result?.data || resQuery?.data?.Result || resQuery?.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : resultData?.Items || resultData || [];
  return Array.isArray(items) ? items : [];
}

async function queryTable(table: DataTable) {
  const resQuery = await requestClient.post(table.queryUrl, { Table: [table] }, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  return toItems(resQuery);
}

async function saveTable(table: DataTable, added: any[] = [], changed: any[] = [], deleted: any[] = []) {
  const resSave = await requestClient.post(table.saveUrl, table.getSaveParam(added, changed, deleted), {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  const data = resSave.data;
  const result = data?.Result ?? data?.result;
  if (
    data?.Type === 'success'
    || data?.type === 'success'
    || data?.Code === 0
    || data?.Code === 200
    || data?.code === 0
    || data?.code === 200
    || data?.success === true
    || data?.Success === true
    || result?.Type === 'success'
    || result?.type === 'success'
    || result?.Code === 0
    || result?.Code === 200
    || result?.code === 0
    || result?.code === 200
    || result?.success === true
    || result?.Success === true
  ) return { success: true, data: result ?? data };
  console.error('[hr-resignation-save-failed]', { table: table.Name, added, changed, deleted, response: data });
  return { success: false, error: data?.Message || data?.msg || result?.Message || result?.msg || JSON.stringify(data), data };
}

export async function listResignationRequests(params: HrResignationApi.QueryParams = {}) {
  const table = new DataTable(RESIGNATION_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  const filters: any[] = [];
  if (params.status && params.status !== 'all') filters.push(cond('status', 'equal', params.status));
  if (params.q) {
    const q = String(params.q).trim();
    if (q) filters.push(or(cond('resign_no', 'contains', q), cond('user_rowid', 'contains', q), cond('dep_id', 'contains', q), cond('job_rowid', 'contains', q)) as any);
  }
  if (filters.length === 1) table.Filter = filters[0] as any;
  else if (filters.length > 1) table.Filter = and(...filters) as any;

  const items = await queryTable(table);
  const rels = await listUserDjOptions(params.q ? { q: params.q } : {});
  const map = new Map(rels.map((item) => [String(item.userDjRowid), item]));

  return (items || []).map((item: any) => {
    const rel = map.get(String(item.user_dj_rowid || '')) || ({} as any);
    return {
      ...item,
      userName: rel.userName || item.user_rowid,
      departmentName: rel.depName || item.dep_id,
      jobName: rel.jobName || item.job_rowid,
    } as HrResignationApi.ResignationRequest;
  });
}

export async function getResignationRequestById(id: string) {
  const table = new DataTable(RESIGNATION_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  table.Filter = cond('id', 'equal', id);
  const items = await queryTable(table);
  return (items?.[0] || null) as HrResignationApi.ResignationRequest | null;
}

export async function createResignationRequest(payload: HrResignationApi.ResignationRequest) {
  const table = new DataTable(RESIGNATION_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await queryTable(table);
  const id = payload.id || newGuid();
  const row: HrResignationApi.ResignationRequest = {
    id,
    resign_no: payload.resign_no || createLocalCode('LZ'),
    user_rowid: payload.user_rowid,
    user_dj_rowid: payload.user_dj_rowid,
    dep_id: payload.dep_id,
    job_rowid: payload.job_rowid,
    apply_date: payload.apply_date || null,
    last_day: payload.last_day || null,
    handover_status: payload.handover_status ?? '待开始',
    salary_status: payload.salary_status ?? '待结算',
    certificate_issued: payload.certificate_issued ? 1 : 0,
    status: payload.status ?? '待审批',
    resign_type: payload.resign_type || null,
    resign_reason: payload.resign_reason || null,
    remark: payload.remark || null,
  };

  const res = await saveTable(table, [row], [], []);
  if (!res.success) throw new Error(res.error);

  return row;
}

export async function updateResignationRequest(id: string, payload: HrResignationApi.ResignationRequest) {
  const table = new DataTable(RESIGNATION_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await queryTable(table);
  const patch: any = { id };
  [
    'resign_no',
    'user_rowid',
    'user_dj_rowid',
    'dep_id',
    'job_rowid',
    'apply_date',
    'last_day',
    'handover_status',
    'salary_status',
    'certificate_issued',
    'status',
    'resign_type',
    'resign_reason',
    'remark',
  ].forEach((key) => {
    if (key in payload) patch[key] = key === 'certificate_issued' ? (payload[key] ? 1 : 0) : payload[key];
  });
  const res = await saveTable(table, [], [patch], []);
  if (!res.success) throw new Error(res.error);
  return patch;
}

export async function deleteResignationRequest(id: string) {
  const table = new DataTable(RESIGNATION_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await queryTable(table);
  const res = await saveTable(table, [], [], [{ id }]);
  if (!res.success) throw new Error(res.error);
  return true;
}

export async function approveResignationRequest(reqId: string) {
  await updateResignationRequest(reqId, { status: '已离职' });
  return { success: true };
}
