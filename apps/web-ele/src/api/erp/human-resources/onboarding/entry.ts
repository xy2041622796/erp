import QB, { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

import { listBaseDepartInfo } from '../attendance';

export namespace HrOnboardingEntryApi {
  export interface Entry {
    id?: string;
    entry_no?: string | null;
    candidate_id?: string | null;
    user_rowid?: string | null;
    user_dj_rowid?: string | null;
    planned_dep_id?: string;
    planned_job_rowid?: string;
    name?: string;
    phone?: string | null;
    email?: string | null;
    entry_date?: string | null;
    contract_status?: string;
    training_status?: string;
    equipment_status?: string;
    health_status?: string;
    status?: string;
    remark?: string | null;
    plannedDepName?: string;
    plannedJobName?: string;
    onboardUserName?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    status?: string;
  }

  export interface JobOption {
    depId: string;
    depName: string;
    jobRowid: string;
    jobName: string;
  }
}

const ONBOARDING_ENTRY_FORM_KEY = '8C2B5EDFBB049331DEDD6796FE4820A6';
const DB_NAME = 'LMBill';
const TABLE_NAME = 'Bil_HR_Onboarding_Entries';
const PK = 'id';

const ORG_FORM_KEY = 'EFC7E7A528CC603C24CBC3ACD5D7ED68';
const ORG_DB = 'QYVirtualPlat';

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
  console.error('[hr-onboarding-entry-save-failed]', { table: table.Name, added, changed, deleted, response: data });
  return { success: false, error: data?.Message || data?.msg || result?.Message || result?.msg || JSON.stringify(data), data };
}

export async function listBaseJobs(params: { q?: string; depId?: string } = {}) {
  const table = new DataTable(ORG_FORM_KEY, 'Base_JobInfo', ORG_DB, 'ID');
  const filters: any[] = [cond('lingma_sys_is_delete', 'equal', 0)];
  if (params.depId) filters.push(cond('Depid', 'equal', params.depId));
  if (params.q) {
    const q = String(params.q).trim();
    if (q) filters.push(or(cond('JobName', 'contains', q), cond('JobCode', 'contains', q), cond('DepName', 'contains', q)) as any);
  }
  table.Filter = and(...filters);
  const res = await requestClient.post(table.queryUrl, { Table: [table], PageParam: { index: 1, size: 1000 } }, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(res);
  return toItems(res);
}

export async function listDeptJobOptions() {
  const [depRes, jobs] = await Promise.all([listBaseDepartInfo(), listBaseJobs({})]);
  const depMap = new Map((Array.isArray(depRes?.data) ? depRes.data : []).map((item: any) => [String(item.DepID), String(item.DepName)]));
  return (jobs || []).map((job: any) => {
    const depId = String(job.Depid || job.DepID || '');
    return {
      depId,
      depName: String(job.DepName || depMap.get(depId) || ''),
      jobRowid: String(job.rowid || job.ROWID || job.ID || ''),
      jobName: String(job.JobName || ''),
    } as HrOnboardingEntryApi.JobOption;
  }).filter((item: HrOnboardingEntryApi.JobOption) => item.jobRowid && item.jobName);
}

export async function listOnboardingEntries(params: HrOnboardingEntryApi.QueryParams = {}) {
  const table = new DataTable(ONBOARDING_ENTRY_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  const filters: any[] = [];
  if (params.status && params.status !== 'all') filters.push(cond('status', 'equal', params.status));
  if (params.q) {
    const q = String(params.q).trim();
    if (q) filters.push(or(cond('entry_no', 'contains', q), cond('name', 'contains', q), cond('planned_dep_id', 'contains', q), cond('planned_job_rowid', 'contains', q)) as any);
  }
  if (filters.length === 1) table.Filter = filters[0] as any;
  else if (filters.length > 1) table.Filter = and(...filters) as any;

  const [items, depRes, jobs] = await Promise.all([queryTable(table), listBaseDepartInfo(), listBaseJobs({})]);
  const depMap = new Map((Array.isArray(depRes?.data) ? depRes.data : []).map((item: any) => [String(item.DepID), String(item.DepName)]));
  const jobMap = new Map((jobs || []).map((item: any) => [String(item.rowid || item.ROWID || item.ID || ''), String(item.JobName || '')]));

  return (items || []).map((item: any) => ({
    ...item,
    plannedDepName: depMap.get(String(item.planned_dep_id || '')) || item.planned_dep_id,
    plannedJobName: jobMap.get(String(item.planned_job_rowid || '')) || item.planned_job_rowid,
  })) as HrOnboardingEntryApi.Entry[];
}

export async function getOnboardingEntryById(id: string) {
  const table = new DataTable(ONBOARDING_ENTRY_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  table.Filter = cond('id', 'equal', id);
  const items = await queryTable(table);
  return (items?.[0] || null) as null | HrOnboardingEntryApi.Entry;
}

export async function createOnboardingEntry(payload: HrOnboardingEntryApi.Entry) {
  const table = new DataTable(ONBOARDING_ENTRY_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await queryTable(table);
  const id = payload.id || newGuid();
  const row: HrOnboardingEntryApi.Entry = {
    id,
    entry_no: payload.entry_no || createLocalCode('RZ'),
    candidate_id: payload.candidate_id || null,
    user_rowid: payload.user_rowid || null,
    user_dj_rowid: payload.user_dj_rowid || null,
    planned_dep_id: payload.planned_dep_id,
    planned_job_rowid: payload.planned_job_rowid,
    name: payload.name,
    phone: payload.phone || null,
    email: payload.email || null,
    entry_date: payload.entry_date || null,
    contract_status: payload.contract_status ?? '待签署',
    training_status: payload.training_status ?? '待安排',
    equipment_status: payload.equipment_status ?? '待领用',
    health_status: payload.health_status ?? '待提交',
    status: payload.status ?? '待入职',
    remark: payload.remark || null,
  };

  const res = await saveTable(table, [row], [], []);
  if (!res.success) throw new Error(res.error);

  return row;
}

export async function updateOnboardingEntry(id: string, payload: HrOnboardingEntryApi.Entry) {
  const table = new DataTable(ONBOARDING_ENTRY_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await queryTable(table);
  const patch: any = { id };
  [
    'entry_no', 'candidate_id', 'user_rowid', 'user_dj_rowid', 'planned_dep_id', 'planned_job_rowid', 'name', 'phone',
    'email', 'entry_date', 'contract_status', 'training_status', 'equipment_status', 'health_status', 'status', 'remark',
  ].forEach((key) => {
    if (key in payload) patch[key] = payload[key];
  });
  const res = await saveTable(table, [], [patch], []);
  if (!res.success) throw new Error(res.error);
  return patch;
}

export async function deleteOnboardingEntry(id: string) {
  const table = new DataTable(ONBOARDING_ENTRY_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await queryTable(table);
  const res = await saveTable(table, [], [], [{ id }]);
  if (!res.success) throw new Error(res.error);
  return true;
}

export async function approveOnboardingEntry(entryId: string) {
  const entry = await getOnboardingEntryById(entryId);
  if (!entry) throw new Error('入职申请不存在');
  await updateOnboardingEntry(entryId, { status: '已入职' });
  return { success: true };
}
