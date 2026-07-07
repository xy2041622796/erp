import { generateUUID } from '@vben/utils';

import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';
import { and, clientData as ClientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export const DB_NAME = 'LMBill';
export const ASSET_FORM_KEY = 'C9FCC66011786A6ACDEAF1BFD3631E31';

export function createAssetTable(tableName: string, primaryKey = 'id') {
  const table = createFinanceDataTable(
    ASSET_FORM_KEY,
    tableName,
    DB_NAME,
    primaryKey,
  );
  table.Type = '数据库表';
  return table;
}

export async function queryAssetTable(
  tableName: string,
  filter: any,
  page = 9999,
  index = 1,
  primaryKey = 'id',
) {
  const table = createAssetTable(tableName, primaryKey);
  table.Filter = filter || null;

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page,
      index,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);

  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items =
    resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);

  const out = new ClientData();
  out.dataTable = table;
  out.list = items;
  out.total = total;
  return out;
}

export async function saveAssetTable(
  tableName: string,
  added: any[],
  changed: any[],
  deleted: any[],
  primaryKey = 'id',
) {
  const table = createAssetTable(tableName, primaryKey);
  const payload = table.getSaveParam(added, changed, deleted);
  return await requestClient.post(table.saveUrl, payload, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
}

export function toNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function toInt(v: any): number {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatLocalDate(v: Date) {
  return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
}

export function toDateString(v: any): null | string {
  if (!v) return null;
  if (typeof v === 'string') return v.slice(0, 10) || null;
  if (v instanceof Date) return formatLocalDate(v);
  return String(v).slice(0, 10) || null;
}

export function toMonthString(v: any): null | string {
  if (!v) return null;
  const s = typeof v === 'string' ? v : String(v);
  return s.slice(0, 7) || null;
}

export function resolveId(data: Record<string, any>) {
  return String(data.id || data.rowid || '').trim();
}

export function createId() {
  return generateUUID();
}

export function defaultCommonRow(extra: Record<string, any> = {}) {
  return {
    lingma_sys_is_delete: 0,
    ...extra,
  };
}

export function notDeletedFilter(...conditions: any[]) {
  return and(cond('lingma_sys_is_delete', 'notequal', 1), ...conditions);
}
