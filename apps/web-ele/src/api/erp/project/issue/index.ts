import { createProjectSubmoduleCrudApi } from '#/api/erp/project/_submodule';
import { createProjectDataTable } from '../_account-set';

const api = createProjectSubmoduleCrudApi({
  navFormId: '8k4p0f3a2b5c6d7e8f9g0h1i2j3k4l5m',
  navigationUrl: 'issue',
  formKey: '8k4p0f3a2b5c6d7e8f9g0h1i2j3k4l5m',
  tableName: 'project_issues',
  dbName: 'LMBill',
  primaryKey: 'id',
  keywordFields: ["title","type","priority","status","project_id","reporter_id","assignee_id","id"],
  defaultStatus: "open",
  statusField: 'status',
  datetimeFields: ["due_date","resolved_at"],
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
export const createData = api.create;
export const updateData = api.update;
export const deleteData = api.remove;
