import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

const DB_NAME = 'LMBill';
const FORM_ID = '847D59BE6EAA2316724038FC117CAAD6';

export type HrAttendanceExtendTable =
  | 'Bil_HR_Attendance_Records'
  | 'Bil_HR_Attendance_Leave_Overtime'
  | 'Bil_HR_Attendance_Leave_Applications'
  | 'Bil_HR_Attendance_Holidays'
  | 'Bil_HR_Attendance_Schedule_Rules';

export interface HrAttendanceExtendQuery {
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

export async function getAttendanceExtendList(tableName: HrAttendanceExtendTable, params: HrAttendanceExtendQuery = {}) {
  const table = new DataTable(FORM_ID, tableName, DB_NAME, 'rowid');
  const filters: any[] = [];
  if (params.status && params.status !== 'all') filters.push(cond('status', 'equal', params.status));
  if (params.keyword) {
    filters.push(or(
      cond('attendance_code', 'contains', params.keyword),
      cond('apply_no', 'contains', params.keyword),
      cond('rule_code', 'contains', params.keyword),
      cond('rule_name', 'contains', params.keyword),
      cond('user_rowid', 'contains', params.keyword),
      cond('employee_id', 'contains', params.keyword),
      cond('name', 'contains', params.keyword),
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
