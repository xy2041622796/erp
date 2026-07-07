import { normalizeBudgetPayload } from '#/api/erp/project/_business';
import { createProjectSubmoduleCrudApi } from '#/api/erp/project/_submodule';
import { createProjectDataTable } from '../../_account-set';

const api = createProjectSubmoduleCrudApi({
  navFormId: '6s2x8h1i0j3k4l5m6n7o8p9q0r1s2t3u',
  navigationUrl: 'cost/view',
  formKey: '6s2x8h1i0j3k4l5m6n7o8p9q0r1s2t3u',
  tableName: 'project_budgets',
  dbName: 'LMBill',
  primaryKey: 'id',
  keywordFields: ['project_id', 'category', 'budget_code', 'project_name', 'id'],
  defaultStatus: 'active',
  statusField: 'status',
  datetimeFields: [],
  useLingmaSysEnt: false,
  createTable: (formKey, tableName, dbName, primaryKey) => createProjectDataTable(formKey, tableName, dbName, primaryKey),
});

export const NAV_FORM_ID = api.NAV_FORM_ID;
export const NAVIGATION_URL = api.NAVIGATION_URL;
export const FORM_KEY = api.FORM_KEY;
export const TABLE_NAME = api.TABLE_NAME;
export const DB_NAME = api.DB_NAME;
export const PRIMARY_KEY = api.PRIMARY_KEY;
export const listData = api.list;
export const getDetail = api.getById;
export const deleteData = api.remove;
export async function createData(payload: Record<string, any>) {
  return await api.create(normalizeBudgetPayload(payload));
}
export async function updateData(payload: Record<string, any>) {
  return await api.update(normalizeBudgetPayload(payload));
}
