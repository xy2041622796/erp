import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

const DB_NAME = 'LMBill';
const FORM_ID = '847D59BE6EAA2316724038FC117CAAD6';

export interface HrMigratedTableQuery {
  keyword?: string;
  index?: number;
  page?: number;
  searchFields?: string[];
  status?: string;
}

function getItems(res: any) {
  const resultData = res?.data?.Result?.data || res?.data?.Result || res?.data;
  if (Array.isArray(resultData?.Items)) return resultData.Items as any[];
  if (Array.isArray(resultData?.items)) return resultData.items as any[];
  if (Array.isArray(resultData)) return resultData as any[];
  return [];
}

export async function queryHrMigratedTable(tableName: string, params: HrMigratedTableQuery = {}) {
  const table = new DataTable(FORM_ID, tableName, DB_NAME, 'rowid');
  const filters: any[] = [];

  if (params.status && params.status !== 'all') filters.push(cond('status', 'equal', params.status));
  if (params.keyword && params.searchFields?.length) {
    filters.push(or(...params.searchFields.map((field) => cond(field, 'contains', params.keyword))) as any);
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
