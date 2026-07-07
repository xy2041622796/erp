import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

const DB_NAME = 'LMBill';
const FORM_ID = 'HR_PERFORMANCE_MIGRATION_FORM';

export type HrPerformanceTable =
  | 'Bil_HR_Performance_Config_Indicator'
  | 'Bil_HR_Performance_Config_Matrix'
  | 'Bil_HR_Performance_Config_Template'
  | 'Bil_HR_Performance_Strategy_Annual'
  | 'Bil_HR_Performance_Strategy_Monthly'
  | 'Bil_HR_Performance_Evaluation_Review'
  | 'Bil_HR_Performance_Evaluation_Result'
  | 'Bil_HR_Performance_Evaluation_Interview';

export interface HrPerformanceQuery {
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

export async function getPerformanceList(tableName: HrPerformanceTable, params: HrPerformanceQuery = {}) {
  const table = new DataTable(FORM_ID, tableName, DB_NAME, 'rowid');
  const filters: any[] = [];
  if (params.status && params.status !== 'all') filters.push(cond('status', 'equal', params.status));
  if (params.keyword) {
    filters.push(or(
      cond('indicatorName', 'contains', params.keyword),
      cond('templateName', 'contains', params.keyword),
      cond('employeeName', 'contains', params.keyword),
      cond('planName', 'contains', params.keyword),
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
