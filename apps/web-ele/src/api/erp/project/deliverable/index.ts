import { checkProjectCompletionConditions } from '#/api/erp/project/_business';
import { createProjectSubmoduleCrudApi } from '#/api/erp/project/_submodule';
import { createProjectDataTable } from '../_account-set';

const api = createProjectSubmoduleCrudApi({
  navFormId: '2o8t4d7e6f9g0h1i2j3k4l5m6n7o8p9q',
  navigationUrl: 'deliverable',
  formKey: '2o8t4d7e6f9g0h1i2j3k4l5m6n7o8p9q',
  tableName: 'project_deliverables',
  dbName: 'LMBill',
  primaryKey: 'id',
  keywordFields: ["project_id","deliverable_code","deliverable_name","status","description","id"],
  defaultStatus: "待汇交",
  statusField: 'status',
  datetimeFields: ["submit_date"],
  useLingmaSysEnt: true,
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
export const createData = api.create;
export const updateData = api.update;
export const deleteData = api.remove;
export async function checkCompletion(projectId: string) {
  return await checkProjectCompletionConditions(projectId);
}
