import { createProjectSubmoduleCrudApi } from '#/api/erp/project/_submodule';
import { createProjectDataTable } from '../_account-set';

const api = createProjectSubmoduleCrudApi({
  navFormId: '7t3y9i2j1k4l5m6n7o8p9q0r1s2t3u4v',
  navigationUrl: 'statistics',
  formKey: '7t3y9i2j1k4l5m6n7o8p9q0r1s2t3u4v',
  tableName: 'project_statistics',
  dbName: 'LMBill',
  primaryKey: 'id',
  keywordFields: ["report_code","report_name","period_text","status","id"],
  defaultStatus: "已生成",
  statusField: 'status',
  datetimeFields: [],
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
