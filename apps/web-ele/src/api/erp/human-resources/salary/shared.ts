import QB, { and, cond, DataColumn, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export interface SalaryCrudOptions {
  formKey: string;
  tableName: string;
  dbName: string;
  primaryKey?: string;
  keywordFields?: string[];
  queryFields?: string[];
  defaultValues?: Record<string, any>;
}

export type SalaryQuery = Record<string, any>;

export function newGuid() {
  return QB.GetNewGUID();
}

export function createLocalCode(prefix: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 100_000)).padStart(5, '0');
  return `${prefix}-${year}${month}${day}-${random}`;
}

export function setQueryFields(table: DataTable, names?: string[]) {
  if (!names?.length) return;
  table.Fields = names.map((name) => {
    const column = new DataColumn();
    column.Name = name;
    return column;
  });
}

export function toItems(resQuery: any) {
  const resultData = resQuery?.data?.Result?.data || resQuery?.data?.Result || resQuery?.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : resultData?.Items || resultData || [];
  return Array.isArray(items) ? items : [];
}

export async function querySalaryTable(table: DataTable, queryFields?: string[]) {
  setQueryFields(table, queryFields);
  const req = typeof table.getQueryParam === 'function' ? table.getQueryParam('Table', table.Filter, [], [], 0, 0) : { Table: [table] };
  const resQuery = await requestClient.post(table.queryUrl, req, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  return toItems(resQuery);
}

export async function saveSalaryTable(table: DataTable, added: any[] = [], changed: any[] = [], deleted: any[] = []) {
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
    || String(data?.Code) === '200'
    || data?.code === 0
    || data?.code === 200
    || String(data?.code) === '200'
    || data?.success === true
    || data?.Success === true
    || result?.Type === 'success'
    || result?.type === 'success'
    || result?.Code === 0
    || result?.Code === 200
    || String(result?.Code) === '200'
    || result?.code === 0
    || result?.code === 200
    || String(result?.code) === '200'
    || result?.success === true
    || result?.Success === true
  ) return { success: true, data: result ?? data };
  console.error('[hr-salary-save-failed]', { table: table.Name, added, changed, deleted, response: data });
  return { success: false, error: data?.Message || data?.msg || result?.Message || result?.msg || JSON.stringify(data), data };
}

export function createSalaryCrudApi(options: SalaryCrudOptions) {
  if (!options.dbName) {
    throw new Error(`薪酬模块 API 配置缺少 dbName：${options.tableName}`);
  }

  const dbName = options.dbName;
  const pk = options.primaryKey || 'id';

  async function list(params: SalaryQuery = {}) {
    const table = new DataTable(options.formKey, options.tableName, dbName, pk);
    const filters: any[] = [];

    Object.entries(params).forEach(([key, value]) => {
      if (['q', 'keyword', 'index', 'page'].includes(key)) return;
      if (value === undefined || value === null || value === '' || value === 'all') return;
      filters.push(cond(key, 'equal', value));
    });

    const q = String(params.q || params.keyword || '').trim();
    if (q) {
      const fields = options.keywordFields?.length ? options.keywordFields : [pk];
      filters.push(or(...fields.map((field) => cond(field, 'contains', q))) as any);
    }

    if (filters.length === 1) table.Filter = filters[0] as any;
    else if (filters.length > 1) table.Filter = and(...filters) as any;

    return querySalaryTable(table, options.queryFields);
  }

  async function create(payload: any) {
    const table = new DataTable(options.formKey, options.tableName, dbName, pk);
    await querySalaryTable(table, options.queryFields);
    const row = {
      [pk]: payload?.[pk] || newGuid(),
      ...(options.defaultValues || {}),
      ...(payload || {}),
    };
    const res = await saveSalaryTable(table, [row], [], []);
    if (!res.success) throw new Error(res.error);
    return row;
  }

  async function update(id: string, payload: any) {
    const table = new DataTable(options.formKey, options.tableName, dbName, pk);
    await querySalaryTable(table, options.queryFields);
    const patch = { [pk]: id, ...(payload || {}) };
    const res = await saveSalaryTable(table, [], [patch], []);
    if (!res.success) throw new Error(res.error);
    return patch;
  }

  async function remove(id: string) {
    const table = new DataTable(options.formKey, options.tableName, dbName, pk);
    await querySalaryTable(table, options.queryFields);
    const res = await saveSalaryTable(table, [], [], [{ [pk]: id }]);
    if (!res.success) throw new Error(res.error);
    return true;
  }

  return { list, create, update, remove, PrimaryKeyFields: pk };
}
