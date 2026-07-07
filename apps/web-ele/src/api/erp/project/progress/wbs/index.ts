import { getStaffByIds } from '#/api/common/staff-selector';
import { recalculateProjectProgress } from '#/api/erp/project/_business';
import { createProjectSubmoduleCrudApi } from '#/api/erp/project/_submodule';
import { createProjectDataTable } from '../../_account-set';

const WBS_STATUS_LABEL_MAP: Record<string, string> = {
  pending: '待开始',
  in_progress: '进行中',
  completed: '已完成',
  paused: '已暂停',
};

const api = createProjectSubmoduleCrudApi({
  navFormId: '2e8j4f7a6b9c0d1e2f3a4b5c6d7e8f9g',
  navigationUrl: 'progress/wbs',
  formKey: '2e8j4f7a6b9c0d1e2f3a4b5c6d7e8f9g',
  tableName: 'project_progress',
  dbName: 'LMBill',
  primaryKey: 'id',
  keywordFields: ['project_id', 'task_name', 'assignee_id', 'id'],
  defaultStatus: 'pending',
  statusField: 'status',
  datetimeFields: ['planned_start_date', 'planned_end_date', 'actual_start_date', 'actual_end_date'],
  useLingmaSysEnt: false,
  createTable: (formKey, tableName, dbName, primaryKey) => createProjectDataTable(formKey, tableName, dbName, primaryKey),
});

function getProjectId(payload: Record<string, any>) {
  return String(payload?.project_id || '').trim();
}

function normalizeDateString(value: unknown) {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (!str) return '';
  if (str.includes('T')) return str.split('T')[0];
  if (str.includes(' ')) return str.split(' ')[0];
  return str;
}

function calcPlannedDurationText(start: unknown, end: unknown) {
  const startText = normalizeDateString(start);
  const endText = normalizeDateString(end);
  if (!startText || !endText) return '-';
  const startDate = new Date(startText);
  const endDate = new Date(endText);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '-';
  const diff = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return `${Math.max(1, diff)}天`;
}

async function enrichWbsList(res: any) {
  const rows = Array.isArray(res?.list) ? res.list : [];
  if (!rows.length) return res;

  const assigneeIds = Array.from(
    new Set(rows.map((row: any) => String(row?.assignee_id || '').trim()).filter(Boolean)),
  );
  const staffList = assigneeIds.length ? await getStaffByIds(assigneeIds) : [];
  const staffMap = new Map<string, string>();
  for (const staff of Array.isArray(staffList) ? staffList : []) {
    const id = String(staff?.ROWID || '').trim();
    if (!id) continue;
    staffMap.set(id, String(staff?.UserName || staff?.LoginName || id));
  }

  rows.forEach((row: any) => {
    const assigneeId = String(row?.assignee_id || '').trim();
    const status = String(row?.status || '').trim();
    row.assignee_name = staffMap.get(assigneeId) || assigneeId || '-';
    row.status_label = WBS_STATUS_LABEL_MAP[status] || status || '-';
    row.planned_duration_text = calcPlannedDurationText(row?.planned_start_date, row?.planned_end_date);
    row.progress_value = Number(row?.progress || 0);
  });

  return res;
}

export async function listProjectTaskOptions(projectId: string, currentTaskId?: string) {
  const pid = String(projectId || '').trim();
  if (!pid) return [];
  const currentId = String(currentTaskId || '').trim();
  const res = await api.list({ pageNo: 1, page: 500, project_id: pid });
  const rows = Array.isArray(res?.list) ? res.list : [];
  return rows
    .filter((row: any) => String(row?.id || '').trim() && String(row?.id || '').trim() !== currentId)
    .map((row: any) => {
      const taskCode = String(row?.task_code || '').trim();
      const taskName = String(row?.task_name || row?.id || '').trim();
      return {
        value: String(row.id),
        label: taskCode ? `${taskName}（${taskCode}）` : taskName,
        task_name: taskName,
        task_code: taskCode,
        planned_start_date: normalizeDateString(row?.planned_start_date),
        planned_end_date: normalizeDateString(row?.planned_end_date),
        actual_start_date: normalizeDateString(row?.actual_start_date),
        actual_end_date: normalizeDateString(row?.actual_end_date),
        progress: row?.progress,
      };
    });
}

export const NAV_FORM_ID = api.NAV_FORM_ID;
export const NAVIGATION_URL = api.NAVIGATION_URL;
export const FORM_KEY = api.FORM_KEY;
export const TABLE_NAME = api.TABLE_NAME;
export const DB_NAME = api.DB_NAME;
export const PRIMARY_KEY = api.PRIMARY_KEY;
export const listData = async (params?: Record<string, any>) => enrichWbsList(await api.list(params));
export const getDetail = api.getById;
export async function createData(payload: Record<string, any>) {
  const res = await api.create(payload);
  await recalculateProjectProgress(getProjectId(payload));
  return res;
}
export async function updateData(payload: Record<string, any>) {
  const res = await api.update(payload);
  await recalculateProjectProgress(getProjectId(payload));
  return res;
}
export async function deleteData(id: string) {
  const detail = await api.getById(id);
  const res = await api.remove(id);
  await recalculateProjectProgress(getProjectId(detail || {}));
  return res;
}
export { recalculateProjectProgress };
