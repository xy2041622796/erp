import { and, clientData, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = Number(resultData?.Count ?? items.length ?? 0);
  return { items, total };
}

export function toClientData(table: DataTable, list: any[], total?: number) {
  const result = new clientData();
  result.dataTable = table;
  result.list = list;
  result.total = Number(total ?? list.length ?? 0);
  return result;
}

export async function queryTable(table: DataTable, pageNo = 1, page = 0) {
  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: page,
      index: pageNo,
    },
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(res);
  return extractListAndTotal(res);
}

export function buildKeywordFilter(fields: string[], keyword?: string) {
  const text = String(keyword ?? '').trim();
  if (!text) return null;
  const filters = fields.map((field) => cond(field, 'contains', text));
  if (filters.length === 0) return null;
  return filters.length === 1 ? filters[0] : or(...filters);
}

export function mergeFilters(baseFilters: any[], keywordFilter?: any) {
  const filters = [...baseFilters.filter(Boolean)];
  if (keywordFilter) {
    filters.push(keywordFilter);
  }
  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];
  return and(...filters);
}
