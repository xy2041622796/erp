import type { PageParam } from '@vben/request';

import { and, clientData, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createProjectDataTable } from '#/api/erp/project/_account-set';

const PROJECT_MODEL_ID = '9b5g1c4d3e6f7a8b9c0d1e2f3a4b5c6d';
const PROJECT_TABLE = 'Bil_Project_Info';
const PROJECT_DB = 'LMBill';
const PROJECT_PK = 'rowid';

export namespace ErpProjectManageCreateApi {
  export interface Project {
    rowid?: string;
    createuser?: string;
    createtime?: Date | string;
    updateuser?: string;
    updatetime?: Date | string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;
    account_set_id?: string;

    project_group?: string;
    customer_id?: string;
    project_type?: string;
    project_participant?: string;
    project_depart?: string;
    project_depart_id?: string;
    project_Manager?: string;
    project_manager_id?: string;
    project_status?: number;
    project_end_date?: Date | string;
    project_start_date?: Date | string;
    actual_end_date?: Date | string;
    project_amount?: number;
    project_description?: string;
    project_name?: string;
    project_code?: string;
    progress?: number;
    priority?: string;
    location?: string;
    contract_id?: string;
  }

  export type SourceStatus = 'planning' | 'in_progress' | 'completed' | 'paused';
}

function createProjectTable() {
  return createProjectDataTable(
    PROJECT_MODEL_ID,
    PROJECT_TABLE,
    PROJECT_DB,
    PROJECT_PK,
  );
}

function normalizeDateString(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  if (!str || str === 'null' || str === 'undefined') return undefined;
  return str.includes('T') ? str.split('T')[0] : str;
}

function normalizeNullableString(value: unknown) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str ? str : null;
}

function normalizeProgress(value: unknown) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.min(100, Math.max(0, Math.round(num)));
}

export function mapSourceStatusToTarget(status?: ErpProjectManageCreateApi.SourceStatus | number | string) {
  if (status === 0 || status === '0' || status === 'planning') return 0;
  if (status === 1 || status === '1' || status === 'in_progress') return 1;
  if (status === 2 || status === '2' || status === 'completed') return 2;
  if (status === 3 || status === '3' || status === 'paused') return 3;
  return undefined;
}

export function mapTargetStatusToSource(status?: number | string): ErpProjectManageCreateApi.SourceStatus | undefined {
  const num = Number(status);
  if (num === 0) return 'planning';
  if (num === 1) return 'in_progress';
  if (num === 2) return 'completed';
  if (num === 3) return 'paused';
  return undefined;
}

function normalizeProjectPayload(data: ErpProjectManageCreateApi.Project & { source_status?: ErpProjectManageCreateApi.SourceStatus | number | string }) {
  const payload: Record<string, any> = { ...data };
  delete payload.source_status;
  delete payload.project_period;
  delete payload.attachment;

  payload.project_start_date = normalizeDateString(payload.project_start_date);
  payload.project_end_date = normalizeDateString(payload.project_end_date);
  payload.actual_end_date = normalizeDateString(payload.actual_end_date);
  payload.progress = normalizeProgress(payload.progress);
  payload.priority = normalizeNullableString(payload.priority) || 'normal';
  payload.location = normalizeNullableString(payload.location);
  payload.contract_id = normalizeNullableString(payload.contract_id);
  payload.project_manager_id = normalizeNullableString(payload.project_manager_id);
  payload.project_depart_id = normalizeNullableString(payload.project_depart_id);
  payload.lingma_sys_is_delete = Number(payload.lingma_sys_is_delete ?? 0);

  const mappedStatus = mapSourceStatusToTarget(data?.source_status ?? payload.project_status);
  if (mappedStatus !== undefined) {
    payload.project_status = mappedStatus;
  }

  return payload;
}

async function queryProjectTable(table: DataTable, pageNo = 1, page = 0) {
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

export async function getProjectManageCreatePage(params: PageParam & Record<string, any>) {
  const projectTable = createProjectTable();
  const conditions: any[] = [cond('lingma_sys_is_delete', 'equal', 0)];

  if (params.project_name) conditions.push(cond('project_name', 'contains', params.project_name));
  if (params.project_code) conditions.push(cond('project_code', 'contains', params.project_code));
  if (params.customer_id) conditions.push(cond('customer_id', 'equal', params.customer_id));
  if (params.project_group) conditions.push(cond('project_group', 'equal', params.project_group));
  if (params.project_manager_id) conditions.push(cond('project_manager_id', 'equal', params.project_manager_id));
  if (params.project_depart_id) conditions.push(cond('project_depart_id', 'equal', params.project_depart_id));
  if (params.priority) conditions.push(cond('priority', 'equal', params.priority));
  if (params.contract_id) conditions.push(cond('contract_id', 'equal', params.contract_id));

  const status = mapSourceStatusToTarget(params.source_status ?? params.project_status);
  if (status !== undefined) {
    conditions.push(cond('project_status', 'equal', status));
  }

  const keyword = String(params.q ?? '').trim();
  if (keyword) {
    conditions.push(
      or(
        cond('project_name', 'contains', keyword),
        cond('project_code', 'contains', keyword),
        cond('project_Manager', 'contains', keyword),
        cond('project_depart', 'contains', keyword),
      ),
    );
  }

  projectTable.Filter = and(...conditions);
  const { table, items, total } = await queryProjectTable(
    projectTable,
    Number(params.pageNo || 1),
    Number(params.page || 0),
  );

  const result = new clientData();
  result.dataTable = table;
  result.list = items;
  result.total = total;
  return result as any;
}

export async function getProjectManageCreateSimpleList() {
  const projectTable = createProjectTable();
  projectTable.Filter = and(cond('lingma_sys_is_delete', 'equal', 0));
  const { items } = await queryProjectTable(projectTable, 1, 0);
  return items as any[];
}

export async function getProjectManageCreate(id: string) {
  const projectTable = createProjectTable();
  projectTable.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond(PROJECT_PK, 'equal', id),
  );
  const { items } = await queryProjectTable(projectTable, 1, 1);
  return items[0] || null;
}

export async function createProjectManageCreate(data: ErpProjectManageCreateApi.Project & { source_status?: ErpProjectManageCreateApi.SourceStatus | number | string }) {
  const projectTable = createProjectTable();
  const payload = normalizeProjectPayload(data);
  const saveParam = projectTable.getSaveParam([
    {
      ...payload,
      rowid: payload.rowid,
    },
  ], [], []);
  return await requestClient.post(projectTable.saveUrl, saveParam, {
    headers: projectTable.getRequestHeader(),
    responseReturn: 'raw',
  });
}

export async function updateProjectManageCreate(data: ErpProjectManageCreateApi.Project & { source_status?: ErpProjectManageCreateApi.SourceStatus | number | string }) {
  const rowid = String(data.rowid || '').trim();
  if (!rowid) throw new Error('缺少 rowid，无法修改项目');

  const projectTable = createProjectTable();
  projectTable.Filter = cond(PROJECT_PK, 'equal', rowid);
  await queryProjectTable(projectTable, 1, 1);

  const payload = normalizeProjectPayload(data);
  const saveParam = projectTable.getSaveParam([], [{ ...payload, rowid }], []);
  return await requestClient.post(projectTable.saveUrl, saveParam, {
    headers: projectTable.getRequestHeader(),
    responseReturn: 'raw',
  });
}

export async function deleteProjectManageCreate(id: string) {
  const rowid = String(id || '').trim();
  if (!rowid) throw new Error('缺少 rowid，无法删除项目');

  const projectTable = createProjectTable();
  projectTable.Filter = cond(PROJECT_PK, 'equal', rowid);
  await queryProjectTable(projectTable, 1, 1);

  const saveParam = projectTable.getSaveParam([], [], [
    { rowid, lingma_sys_is_delete: 1 } as any,
  ]);
  return await requestClient.post(projectTable.saveUrl, saveParam, {
    headers: projectTable.getRequestHeader(),
    responseReturn: 'raw',
  });
}

export const NAV_FORM_ID = '9b5g1c4d3e6f7a8b9c0d1e2f3a4b5c6d';
export const NAVIGATION_URL = 'manage/create';
