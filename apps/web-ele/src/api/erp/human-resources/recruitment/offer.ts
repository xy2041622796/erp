import { and, cond, DataTable } from '#/api/qyapi';

import { listBaseDepartInfo } from '../attendance';
import { listBaseJobs, listOnboardingEntries } from '../onboarding/entry';
import { createLocalCode, newGuid, querySalaryTable, saveSalaryTable } from '../salary/shared';

export namespace HrRecruitmentOfferApi {
  export interface Offer {
    id?: string;
    offer_code?: string | null;
    candidate_id?: string;
    dep_id?: string;
    job_rowid?: string;
    salary?: number | string;
    probation_salary?: number | string | null;
    probation_months?: number | string;
    start_date?: string;
    work_location?: string | null;
    status?: string;
    creator_user_rowid?: string | null;
    remark?: string | null;
    candidateName?: string;
    depName?: string;
    jobName?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    status?: string;
  }
}

export const OFFER_APPROVAL_FORM_KEY = 'FE36BC713A0511F19FF2868C42717AB9';
const DB_NAME = 'LMBill';
const TABLE_NAME = 'Bil_HR_Recruitment_Offers';
const PK = 'id';
async function metaMaps() {
  const [depRes, jobs, candidates] = await Promise.all([listBaseDepartInfo(), listBaseJobs({}), listOnboardingEntries({ status: 'all' })]);
  const depMap = new Map((Array.isArray(depRes?.data) ? depRes.data : []).map((item: any) => [String(item.DepID), String(item.DepName)]));
  const jobMap = new Map((jobs || []).map((item: any) => [String(item.rowid || item.ROWID || item.ID || ''), String(item.JobName || '')]));
  const candidateMap = new Map((candidates || []).map((item: any) => [String(item.id), String(item.name)]));
  return { depMap, jobMap, candidateMap, candidates };
}

export async function getOfferApprovalMeta() {
  const [depRes, candidates, jobs] = await Promise.all([listBaseDepartInfo(), listOnboardingEntries({ status: 'all' }), listBaseJobs({})]);
  return {
    departments: (Array.isArray(depRes?.data) ? depRes.data : []).map((item: any) => ({ id: String(item.DepID), name: String(item.DepName) })),
    candidates: (Array.isArray(candidates) ? candidates : []).map((item: any) => ({
      id: String(item.id),
      name: String(item.name),
      entryNo: String(item.entry_no || ''),
      department: String(item.plannedDepName || ''),
    })),
    jobs,
  };
}

export async function listOffersWithPerm(params: HrRecruitmentOfferApi.QueryParams = {}) {
  const table = new DataTable(OFFER_APPROVAL_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  const filters: any[] = [];
  if (params.status) filters.push(cond('status', 'equal', params.status));
  if (params.q) {
    const q = String(params.q).trim();
    if (q) filters.push(cond('job_rowid', 'contains', q));
  }
  if (filters.length === 1) table.Filter = filters[0] as any;
  else if (filters.length > 1) table.Filter = and(...filters) as any;

  const [items, maps] = await Promise.all([querySalaryTable(table), metaMaps()]);
  return {
    items: (items || []).map((item: any) => ({
      ...item,
      depName: maps.depMap.get(String(item.dep_id || '')) || item.dep_id,
      jobName: maps.jobMap.get(String(item.job_rowid || '')) || item.job_rowid,
      candidateName: maps.candidateMap.get(String(item.candidate_id || '')) || item.candidate_id,
    })) as HrRecruitmentOfferApi.Offer[],
    table,
  };
}

export async function createOffer(payload: HrRecruitmentOfferApi.Offer) {
  const table = new DataTable(OFFER_APPROVAL_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await querySalaryTable(table);
  const id = payload.id || newGuid();
  const row: any = {
    id,
    offer_code: payload.offer_code || createLocalCode('OFFER'),
    candidate_id: payload.candidate_id,
    dep_id: payload.dep_id,
    job_rowid: payload.job_rowid,
    salary: Number(payload.salary || 0),
    probation_salary: payload.probation_salary === '' || payload.probation_salary == null ? null : Number(payload.probation_salary),
    probation_months: Number(payload.probation_months ?? 3),
    start_date: payload.start_date,
    work_location: payload.work_location || null,
    status: payload.status || 'pending',
    creator_user_rowid: payload.creator_user_rowid || null,
    remark: payload.remark || null,
  };
  const res = await saveSalaryTable(table, [row], [], []);
  if (!res.success) throw new Error(res.error);

  return row as HrRecruitmentOfferApi.Offer;
}

export async function updateOffer(id: string, payload: HrRecruitmentOfferApi.Offer) {
  const table = new DataTable(OFFER_APPROVAL_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await querySalaryTable(table);
  const patch: any = { id };
  ['offer_code', 'candidate_id', 'dep_id', 'job_rowid', 'start_date', 'work_location', 'status', 'creator_user_rowid', 'remark'].forEach((key) => {
    if (key in payload) patch[key] = (payload as any)[key];
  });
  ['salary', 'probation_salary', 'probation_months'].forEach((key) => {
    if (key in payload) patch[key] = (payload as any)[key] == null || (payload as any)[key] === '' ? null : Number((payload as any)[key]);
  });
  const res = await saveSalaryTable(table, [], [patch], []);
  if (!res.success) throw new Error(res.error);
  return patch as HrRecruitmentOfferApi.Offer;
}

export async function deleteOffer(id: string) {
  const table = new DataTable(OFFER_APPROVAL_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await querySalaryTable(table);
  const res = await saveSalaryTable(table, [], [], [{ id }]);
  if (!res.success) throw new Error(res.error);
  return true;
}
