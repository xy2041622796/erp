import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

const DB_NAME = 'LMBill';
const FORM_ID = '1C2CB281FAA14E151C78CA17F47DF4E1';

export type HrOnboardingTable = 'Bil_HR_Onboarding_Applications' | 'Bil_HR_Onboarding_Entries' | 'Bil_HR_Resignation_Requests';

export interface HrOnboardingQuery {
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

export async function getOnboardingList(tableName: HrOnboardingTable, params: HrOnboardingQuery = {}) {
  const table = new DataTable(FORM_ID, tableName, DB_NAME, 'rowid');
  const filters: any[] = [];
  if (params.status && params.status !== 'all') filters.push(cond('status', 'equal', params.status));
  if (params.keyword) {
    filters.push(or(
      cond('entry_no', 'contains', params.keyword),
      cond('resign_no', 'contains', params.keyword),
      cond('name', 'contains', params.keyword),
      cond('user_rowid', 'contains', params.keyword),
      cond('employee_id', 'contains', params.keyword),
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
