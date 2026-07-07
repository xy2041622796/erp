import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

const DB_NAME = 'LMBill';
const FORM_ID = 'FE36BC713A0511F19FF2868C42717AB9';

export type HrRecruitmentTable = 'Bil_HR_Recruitment_Job_Postings' | 'Bil_HR_Recruitment_Offers';

export interface HrRecruitmentQuery {
  keyword?: string;
  status?: string;
  index?: number;
  page?: number;
}

function getItems(res: any) {
  const resultData = res?.data?.Result?.data || res?.data?.Result || res?.data;
  if (Array.isArray(resultData?.Items)) return resultData.Items as any[];
  if (Array.isArray(resultData?.items)) return resultData.items as any[];
  if (Array.isArray(resultData)) return resultData as any[];
  return [];
}

export async function getRecruitmentList(tableName: HrRecruitmentTable, params: HrRecruitmentQuery = {}) {
  const table = new DataTable(FORM_ID, tableName, DB_NAME, 'rowid');
  const filters: any[] = [];
  if (params.status && params.status !== 'all') filters.push(cond('status', 'equal', params.status));
  if (params.keyword) {
    filters.push(or(
      cond('job_code', 'contains', params.keyword),
      cond('title', 'contains', params.keyword),
      cond('offer_code', 'contains', params.keyword),
      cond('candidate_id', 'contains', params.keyword),
    ) as any);
  }
  if (filters.length) table.Filter = and(...filters);

  const res = await requestClient.post(
    table.queryUrl,
    { Table: [table], PageParam: { index: params.index || 1, size: params.page || 20 } },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );

  table.execQueryResult(res);
  return { dataTable: table, list: getItems(res) };
}
