import { recalculateProjectWorkday } from '#/api/erp/project/_business';
import { createProjectSubmoduleCrudApi } from '#/api/erp/project/_submodule';
import { createProjectDataTable } from '../../_account-set';

const api = createProjectSubmoduleCrudApi({
  navFormId: '0m6r2b5c4d7e8f9g0h1i2j3k4l5m6n7o',
  navigationUrl: 'resource/hours',
  formKey: '0m6r2b5c4d7e8f9g0h1i2j3k4l5m6n7o',
  tableName: 'project_resource_hours',
  dbName: 'LMBill',
  primaryKey: 'id',
  keywordFields: ['project_id', 'user_name', 'user_rowid', 'id'],
  defaultStatus: 'submitted',
  statusField: 'status',
  datetimeFields: ['work_date'],
  useLingmaSysEnt: false,
  createTable: (formKey, tableName, dbName, primaryKey) => createProjectDataTable(formKey, tableName, dbName, primaryKey),
});

function getMonthText(value: any) {
  const text = String(value || '').trim();
  return text ? text.slice(0, 7) : undefined;
}

export const NAV_FORM_ID = api.NAV_FORM_ID;
export const NAVIGATION_URL = api.NAVIGATION_URL;
export const FORM_KEY = api.FORM_KEY;
export const TABLE_NAME = api.TABLE_NAME;
export const DB_NAME = api.DB_NAME;
export const PRIMARY_KEY = api.PRIMARY_KEY;
export const listData = api.list;
export const getDetail = api.getById;
function buildRecalculateInput(row: Record<string, any> = {}) {
  return {
    projectId: String(row?.project_id || ''),
    monthText: getMonthText(row?.work_date),
    userRowid: String(row?.user_rowid || ''),
    force: true,
  };
}

export async function createData(payload: Record<string, any>) {
  const res = await api.create(payload);
  await recalculateProjectWorkday(buildRecalculateInput(payload));
  return res;
}
export async function updateData(payload: Record<string, any>) {
  const detail = payload?.id ? await api.getById(payload.id) : null;
  const res = await api.update(payload);
  if (detail?.project_id) await recalculateProjectWorkday(buildRecalculateInput(detail));
  await recalculateProjectWorkday(buildRecalculateInput({ ...detail, ...payload }));
  return res;
}
export async function deleteData(id: string) {
  const detail = await api.getById(id);
  const res = await api.remove(id);
  await recalculateProjectWorkday(buildRecalculateInput(detail));
  return res;
}
export { recalculateProjectWorkday };
