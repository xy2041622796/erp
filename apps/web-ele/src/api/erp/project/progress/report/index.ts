import { syncReportProgressToProject } from '#/api/erp/project/_business';
import { createProjectSubmoduleCrudApi } from '#/api/erp/project/_submodule';
import { createProjectDataTable } from '../../_account-set';

const api = createProjectSubmoduleCrudApi({
  navFormId: '3f9k5a8b7c0d1e2f3a4b5c6d7e8f9g0h',
  navigationUrl: 'progress/report',
  formKey: '3f9k5a8b7c0d1e2f3a4b5c6d7e8f9g0h',
  tableName: 'project_progress_report',
  dbName: 'LMBill',
  primaryKey: 'id',
  keywordFields: ['report_code', 'project_id', 'report_type', 'reporter_name', 'reporter_id', 'id'],
  defaultStatus: '草稿',
  statusField: 'status',
  datetimeFields: ['report_date'],
  useLingmaSysEnt: true,
  createTable: (formKey, tableName, dbName, primaryKey) =>
    createProjectDataTable(formKey, tableName, dbName, primaryKey),
});

export const NAV_FORM_ID = api.NAV_FORM_ID;
export const NAVIGATION_URL = api.NAVIGATION_URL;
export const FORM_KEY = api.FORM_KEY;
export const TABLE_NAME = api.TABLE_NAME;
export const DB_NAME = api.DB_NAME;
export const PRIMARY_KEY = api.PRIMARY_KEY;
export const listData = api.list;
export const getDetail = api.getById;
export const createData = api.create;
export const updateData = api.update;
export const deleteData = api.remove;
export async function syncProgressToProject(report: Record<string, any>) {
  return await syncReportProgressToProject(report);
}
