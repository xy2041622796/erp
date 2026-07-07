import { and, cond, DataTable, or } from '#/api/qyapi';

import { listBaseDepartInfo } from '../attendance';
import { listBaseJobs } from '../onboarding/entry';
import { createLocalCode, newGuid, querySalaryTable, saveSalaryTable } from '../salary/shared';

export namespace HrRecruitmentJobPostingApi {
  export interface JobPosting {
    id?: string;
    job_code?: string | null;
    title?: string;
    dep_id?: string;
    job_rowid?: string;
    headcount?: number | string;
    salary_min?: number | string | null;
    salary_max?: number | string | null;
    requirements?: string | null;
    responsibilities?: string | null;
    status?: string;
    published_at?: string | null;
    deadline?: string | null;
    creator_user_rowid?: string | null;
    depName?: string;
    jobName?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    status?: string;
  }
}

export const JOB_POSTING_FORM_KEY = '847D59BE6EAA2316724038FC117CAAD6';
const DB_NAME = 'LMBill';
const TABLE_NAME = 'Bil_HR_Recruitment_Job_Postings';
const PK = 'id';
async function orgMaps() {
  const [depRes, jobs] = await Promise.all([listBaseDepartInfo(), listBaseJobs({})]);
  const depMap = new Map((Array.isArray(depRes?.data) ? depRes.data : []).map((item: any) => [String(item.DepID), String(item.DepName)]));
  const jobMap = new Map((jobs || []).map((item: any) => [String(item.rowid || item.ROWID || item.ID || ''), String(item.JobName || '')]));
  return { depMap, jobMap };
}

export async function listJobPostingsWithPerm(params: HrRecruitmentJobPostingApi.QueryParams = {}) {
  const table = new DataTable(JOB_POSTING_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  const filters: any[] = [];
  if (params.status) filters.push(cond('status', 'equal', params.status));
  if (params.q) {
    const q = String(params.q).trim();
    if (q) filters.push(or(cond('job_code', 'contains', q), cond('title', 'contains', q), cond('job_rowid', 'contains', q), cond('dep_id', 'contains', q)) as any);
  }
  if (filters.length === 1) table.Filter = filters[0] as any;
  else if (filters.length > 1) table.Filter = and(...filters) as any;

  const [items, maps] = await Promise.all([querySalaryTable(table), orgMaps()]);
  return {
    items: (items || []).map((item: any) => ({
      ...item,
      depName: maps.depMap.get(String(item.dep_id || '')) || item.dep_id,
      jobName: maps.jobMap.get(String(item.job_rowid || '')) || item.job_rowid,
    })) as HrRecruitmentJobPostingApi.JobPosting[],
    table,
  };
}

export async function createJobPosting(payload: HrRecruitmentJobPostingApi.JobPosting) {
  const table = new DataTable(JOB_POSTING_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await querySalaryTable(table);
  const id = payload.id || newGuid();
  const row: any = {
    id,
    job_code: payload.job_code || createLocalCode('ZPZW'),
    title: payload.title,
    dep_id: payload.dep_id,
    job_rowid: payload.job_rowid,
    headcount: Number(payload.headcount ?? 1),
    salary_min: payload.salary_min === '' || payload.salary_min == null ? null : Number(payload.salary_min),
    salary_max: payload.salary_max === '' || payload.salary_max == null ? null : Number(payload.salary_max),
    requirements: payload.requirements || null,
    responsibilities: payload.responsibilities || null,
    status: payload.status || 'open',
    published_at: payload.published_at || null,
    deadline: payload.deadline || null,
    creator_user_rowid: payload.creator_user_rowid || null,
  };
  const res = await saveSalaryTable(table, [row], [], []);
  if (!res.success) throw new Error(res.error);

  return row as HrRecruitmentJobPostingApi.JobPosting;
}

export async function updateJobPosting(id: string, payload: HrRecruitmentJobPostingApi.JobPosting) {
  const table = new DataTable(JOB_POSTING_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await querySalaryTable(table);
  const patch: any = { id };
  ['job_code', 'title', 'dep_id', 'job_rowid', 'requirements', 'responsibilities', 'status', 'published_at', 'deadline', 'creator_user_rowid'].forEach((key) => {
    if (key in payload) patch[key] = (payload as any)[key];
  });
  ['headcount', 'salary_min', 'salary_max'].forEach((key) => {
    if (key in payload) patch[key] = (payload as any)[key] == null || (payload as any)[key] === '' ? null : Number((payload as any)[key]);
  });
  const res = await saveSalaryTable(table, [], [patch], []);
  if (!res.success) throw new Error(res.error);
  return patch as HrRecruitmentJobPostingApi.JobPosting;
}

export async function deleteJobPosting(id: string) {
  const table = new DataTable(JOB_POSTING_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await querySalaryTable(table);
  const res = await saveSalaryTable(table, [], [], [{ id }]);
  if (!res.success) throw new Error(res.error);
  return true;
}
