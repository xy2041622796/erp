import { createProjectSubmoduleCrudApi } from '#/api/erp/project/_submodule';
import { createProjectDataTable } from '../../_account-set';

const api = createProjectSubmoduleCrudApi({
  navFormId: '1n7s3c6d5e8f9g0h1i2j3k4l5m6n7o8p',
  navigationUrl: 'resource/equipment',
  formKey: '1n7s3c6d5e8f9g0h1i2j3k4l5m6n7o8p',
  tableName: 'project_resource_equipment',
  dbName: 'LMBill',
  primaryKey: 'id',
  keywordFields: ["project_id","equipment_code","equipment_name","status","id"],
  defaultStatus: "在库",
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
