import type { DataTable } from '#/api/qyapi';

import QB, { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export interface ProjectSubmoduleCrudOptions {
  navFormId: string;
  navigationUrl: string;
  formKey: string;
  tableName: string;
  dbName?: string;
  primaryKey?: string;
  keywordFields?: string[];
  defaultStatus?: string | number;
  defaultValues?: Record<string, any>;
  statusField?: string;
  datetimeFields?: string[];
  useLingmaSysEnt?: boolean;
  createTable: (formKey: string, tableName: string, dbName: string, primaryKey: string) => DataTable;
  normalizeDateTime?: (value?: any) => any;
}

function generateUUID() {
  return QB.GetNewGUID();
}

function normalizeDateString(value: any) {
  if (value === null || value === undefined || value === '') return value;
  const str = String(value).trim();
  if (!str || str === 'null' || str === 'undefined') return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return `${str} 00:00:00`;
  return str.includes('T') ? str.replace('T', ' ') : str;
}

async function queryTable(table: DataTable, pageNo = 1, page = 0) {
  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: page,
      index: pageNo,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = Number(resultData?.Count || items.length || 0);
  return { table, items, total, raw: resQuery };
}

function normalizePayload(payload: any, options: ProjectSubmoduleCrudOptions) {
  const next = { ...(payload || {}) };
  for (const field of options.datetimeFields || []) {
    if (field in next && next[field]) {
      next[field] = options.normalizeDateTime
        ? options.normalizeDateTime(next[field])
        : normalizeDateString(next[field]);
    }
  }
  return next;
}

export function createProjectSubmoduleCrudApi(options: ProjectSubmoduleCrudOptions) {
  const dbName = options.dbName || 'LMBill';
  const primaryKey = options.primaryKey || 'id';
  const statusField = options.statusField || 'status';

  function createTable() {
    return options.createTable(options.formKey, options.tableName, dbName, primaryKey);
  }

  async function list(params: Record<string, any> = {}) {
    const table = createTable();
    const conditions: any[] = [];

    if (params.q) {
      const q = String(params.q).trim();
      if (q) {
        const keywordFields = options.keywordFields?.length ? options.keywordFields : [primaryKey];
        conditions.push(or(...keywordFields.map((field) => cond(field, 'contains', q))));
      }
    }

    if (params.status !== undefined && params.status !== null && params.status !== '') {
      conditions.push(cond(statusField, 'equal', params.status));
    }

    for (const [key, value] of Object.entries(params)) {
      if (['q', 'status', 'pageNo', 'page'].includes(key)) continue;
      if (value === undefined || value === null || value === '') continue;
      conditions.push(cond(key, 'equal', value));
    }

    if (conditions.length === 1) table.Filter = conditions[0];
    else if (conditions.length > 1) table.Filter = and(...conditions);

    const { items, total } = await queryTable(table, Number(params.pageNo || 1), Number(params.page || 0));
    const result = new clientData();
    result.dataTable = table;
    result.list = items;
    result.total = total;
    return result as any;
  }

  async function getById(id: string) {
    const table = createTable();
    table.Filter = cond(primaryKey, 'equal', id);
    const { items } = await queryTable(table, 1, 1);
    return items[0] || null;
  }

  async function create(payload: any) {
    const table = createTable();
    const row = {
      ...(options.defaultValues || {}),
      ...normalizePayload(payload, options),
    };
    if (!row[primaryKey]) {
      row[primaryKey] = generateUUID();
    }
    if (options.defaultStatus !== undefined && row[statusField] === undefined) {
      row[statusField] = options.defaultStatus;
    }
    const saveParam = table.getSaveParam([row], [], []);
    return await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    });
  }

  async function update(payload: any) {
    const id = String(payload?.[primaryKey] || '').trim();
    if (!id) throw new Error(`缺少 ${primaryKey}，无法修改数据`);
    const table = createTable();
    table.Filter = cond(primaryKey, 'equal', id);
    await queryTable(table, 1, 1);
    const saveParam = table.getSaveParam([], [normalizePayload(payload, options)], []);
    return await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    });
  }

  async function remove(id: string) {
    const rowId = String(id || '').trim();
    if (!rowId) throw new Error(`缺少 ${primaryKey}，无法删除数据`);
    const table = createTable();
    table.Filter = cond(primaryKey, 'equal', rowId);
    await queryTable(table, 1, 1);
    const saveParam = table.getSaveParam([], [], [{ [primaryKey]: rowId } as any]);
    return await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    });
  }

  return {
    NAV_FORM_ID: options.navFormId,
    NAVIGATION_URL: options.navigationUrl,
    FORM_KEY: options.formKey,
    TABLE_NAME: options.tableName,
    DB_NAME: dbName,
    PRIMARY_KEY: primaryKey,
    list,
    getById,
    create,
    update,
    remove,
  };
}
