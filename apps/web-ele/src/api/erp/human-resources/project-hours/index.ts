import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

const DB_NAME = 'LMBill';
const FORM_ID = 'HR_PROJECT_HOURS_MIGRATION_FORM';
const TABLE_NAME = 'Bil_HR_Project_Resource_Hours';

export interface HrProjectHoursQuery {
  keyword?: string;
  projectId?: string;
  employeeId?: string;
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

export async function getHrProjectHoursList(params: HrProjectHoursQuery = {}) {
  const table = new DataTable(FORM_ID, TABLE_NAME, DB_NAME, 'rowid');
  const filters: any[] = [cond('lingma_sys_is_delete', 'equal', 0)];
  if (params.projectId) filters.push(cond('project_id', 'equal', params.projectId));
  if (params.employeeId) filters.push(cond('employee_id', 'equal', params.employeeId));
  if (params.status && params.status !== 'all') filters.push(cond('status', 'equal', params.status));
  if (params.keyword) {
    filters.push(or(
      cond('hours_code', 'contains', params.keyword),
      cond('employee_name', 'contains', params.keyword),
      cond('project_id', 'contains', params.keyword),
    ) as any);
  }
  table.Filter = and(...filters);

  const res = await requestClient.post(
    table.queryUrl,
    { Table: [table], PageParam: { index: params.index || 1, size: params.page || 20 } },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );

  table.execQueryResult(res);
  return { dataTable: table, list: getItems(res) };
}
