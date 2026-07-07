import QB, { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export interface PerformanceCrudOptions {
  formKey: string;
  tableName: string;
  dbName?: string;
  primaryKey?: string;
  keywordFields?: string[];
  defaultStatus?: string;
  defaultValues?: Record<string, any>;
  useLingmaSysEnt?: boolean;
  datetimeFields?: string[];
  extraFilterKeys?: string[];
}

export type PerformanceQuery = {
  q?: string;
  status?: string;
} & Record<string, any>;

function newGuid() {
  return QB.GetNewGUID();
}

function toItems(resQuery: any) {
  const resultData = resQuery?.data?.Result?.data || resQuery?.data?.Result || resQuery?.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : resultData?.Items || resultData || [];
  return Array.isArray(items) ? items : [];
}

function pad(num: number) {
  return String(num).padStart(2, '0');
}

function toMySQLDateTime(value?: any) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function queryTable(table: DataTable) {
  const resQuery = await requestClient.post(table.queryUrl, { Table: [table] }, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  return toItems(resQuery);
}

async function saveTable(table: DataTable, added: any[] = [], changed: any[] = [], deleted: any[] = []) {
  const resSave = await requestClient.post(table.saveUrl, table.getSaveParam(added, changed, deleted), {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  const data = resSave.data;
  const result = data?.Result ?? data?.result;
  if (
    data?.Type === 'success'
    || data?.type === 'success'
    || data?.Code === 0
    || data?.Code === 200
    || data?.code === 0
    || data?.code === 200
    || data?.success === true
    || data?.Success === true
    || result?.Type === 'success'
    || result?.type === 'success'
    || result?.Code === 0
    || result?.Code === 200
    || result?.code === 0
    || result?.code === 200
    || result?.success === true
    || result?.Success === true
  ) return { success: true, data: result ?? data };
  console.error('[hr-performance-save-failed]', { table: table.Name, added, changed, deleted, response: data });
  return { success: false, error: data?.Message || data?.msg || result?.Message || result?.msg || JSON.stringify(data), data };
}

function normalizePayload(payload: any, options: PerformanceCrudOptions) {
  const next = { ...(payload || {}) };
  (options.datetimeFields || []).forEach((field) => {
    if (field in next && next[field]) next[field] = toMySQLDateTime(next[field]);
  });
  return next;
}

export function createPerformanceCrudApi(options: PerformanceCrudOptions) {
  const dbName = options.dbName || 'LMBill';
  const pk = options.primaryKey || 'id';

  async function list(params: PerformanceQuery = {}) {
    const table = new DataTable(options.formKey, options.tableName, dbName, pk);
    const filters: any[] = [];

    if (params.status && params.status !== 'all') filters.push(cond('status', 'equal', params.status));

    (options.extraFilterKeys || []).forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') filters.push(cond(key, 'equal', value));
    });

    if (params.q) {
      const q = String(params.q).trim();
      if (q) {
        const keywordFields = options.keywordFields?.length ? options.keywordFields : [pk, 'name'];
        filters.push(or(...keywordFields.map((field) => cond(field, 'contains', q))) as any);
      }
    }

    if (filters.length === 1) table.Filter = filters[0] as any;
    else if (filters.length > 1) table.Filter = and(...filters) as any;

    return queryTable(table);
  }

  async function create(payload: any) {
    const table = new DataTable(options.formKey, options.tableName, dbName, pk);
    await queryTable(table);
    const normalized = normalizePayload(payload, options);
    const row: any = {
      [pk]: normalized?.[pk] || newGuid(),
      status: options.defaultStatus || '草稿',
      ...(options.defaultValues || {}),
      ...normalized,
      updateTime: normalized?.updateTime || toMySQLDateTime(),
    };
    // if (options.useLingmaSysEnt && !row.lingma_sys_ent) row.lingma_sys_ent = 'swdata';
    const res = await saveTable(table, [row], [], []);
    if (!res.success) throw new Error(res.error);
    return row;
  }

  async function update(id: string, payload: any) {
    const table = new DataTable(options.formKey, options.tableName, dbName, pk);
    await queryTable(table);
    const normalized = normalizePayload(payload, options);
    const patch: any = {
      [pk]: id,
      ...normalized,
      updateTime: normalized?.updateTime || toMySQLDateTime(),
    };
    // if (options.useLingmaSysEnt && !patch.lingma_sys_ent) patch.lingma_sys_ent = 'swdata';
    const res = await saveTable(table, [], [patch], []);
    if (!res.success) throw new Error(res.error);
    return patch;
  }

  async function remove(id: string) {
    const table = new DataTable(options.formKey, options.tableName, dbName, pk);
    await queryTable(table);
    const res = await saveTable(table, [], [], [{ [pk]: id }]);
    if (!res.success) throw new Error(res.error);
    return true;
  }

  return { list, create, update, remove, PrimaryKeyFields: pk };
}
