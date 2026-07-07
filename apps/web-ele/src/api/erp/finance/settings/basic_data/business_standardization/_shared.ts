import { and, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export const MODEL_ID = 'E31199497829CDEB93998F96A8D033FE';
export const DB_NAME = 'LMBill';

export function buildTable(tableName: string, primaryKey: string) {
  return new DataTable(MODEL_ID, tableName, DB_NAME, primaryKey);
}

export function extractListAndTotal(raw: any): { list: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const count = Number(resultData?.Count ?? items.length ?? 0);
  return { list: items, total: Number.isFinite(count) ? count : 0 };
}

export { and, cond, requestClient };
