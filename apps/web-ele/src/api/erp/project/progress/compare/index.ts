import { normalizeProgressComparePayload } from '#/api/erp/project/_business';
import { createProjectSubmoduleCrudApi } from '#/api/erp/project/_submodule';
import { createProjectDataTable } from '../../_account-set';

const api = createProjectSubmoduleCrudApi({
  navFormId: '4g0l6b9c8d1e2f3a4b5c6d7e8f9g0h1i',
  navigationUrl: 'progress/compare',
  formKey: '4g0l6b9c8d1e2f3a4b5c6d7e8f9g0h1i',
  tableName: 'project_progress_compare',
  dbName: 'LMBill',
  primaryKey: 'id',
  keywordFields: ['project_id', 'period_text', 'id'],
  defaultStatus: 'normal',
  statusField: 'status',
  datetimeFields: ['planned_start_date', 'planned_end_date', 'actual_start_date', 'actual_end_date'],
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
  return await api.create(normalizeProgressComparePayload(payload));
}
export async function updateData(payload: Record<string, any>) {
  return await api.update(normalizeProgressComparePayload(payload));
}
