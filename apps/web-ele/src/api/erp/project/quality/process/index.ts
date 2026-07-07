import { generateIssueFromQualityRecord } from '#/api/erp/project/_business';
import { createProjectSubmoduleCrudApi } from '#/api/erp/project/_submodule';
import { createProjectDataTable } from '../../_account-set';

const api = createProjectSubmoduleCrudApi({
  navFormId: '6i2n8d1e0f3a4b5c6d7e8f9g0h1i2j3k',
  navigationUrl: 'quality/process',
  formKey: '6i2n8d1e0f3a4b5c6d7e8f9g0h1i2j3k',
  tableName: 'project_quality_process',
  dbName: 'LMBill',
  primaryKey: 'id',
  keywordFields: ["project_id","check_code","checker_name","issue_summary","id"],
  defaultStatus: "待检查",
  statusField: 'status',
  datetimeFields: ["check_date"],
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
export async function generateIssue(row: Record<string, any>, issueInput: Record<string, any> = {}) {
  return await generateIssueFromQualityRecord(row, 'process', issueInput);
}
