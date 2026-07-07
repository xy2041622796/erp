import { and, cond, or } from '#/api/qyapi';

export interface HrKeywordQuery {
  keyword?: string;
  status?: string;
  searchFields?: string[];
}

export function getQueryItems(res: any) {
  const resultData = res?.data?.Result?.data || res?.data?.Result || res?.data;
  if (Array.isArray(resultData?.Items)) return resultData.Items as any[];
  if (Array.isArray(resultData?.items)) return resultData.items as any[];
  if (Array.isArray(resultData)) return resultData as any[];
  return [];
}

export function buildKeywordFilters(query: HrKeywordQuery, fallbackFields: string[] = []) {
  const filters: any[] = [];
  if (query.status && query.status !== 'all') filters.push(cond('status', 'equal', query.status));
  const fields = query.searchFields?.length ? query.searchFields : fallbackFields;
  if (query.keyword && fields.length) {
    filters.push(or(...fields.map((field) => cond(field, 'contains', query.keyword))) as any);
  }
  return filters.length ? and(...filters) : undefined;
}

export function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}
