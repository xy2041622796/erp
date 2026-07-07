import { getStaffByIds } from '#/api/common/staff-selector';
import { applyMemberChange, recalculateProjectWorkday } from '#/api/erp/project/_business';
import { getProjectManageSimpleList } from '#/api/erp/project/manage';
import { createProjectSubmoduleCrudApi } from '#/api/erp/project/_submodule';
import { createProjectDataTable } from '../../_account-set';

const PROJECT_MEMBER_FIELDS = [
  'id',
  'member_code',
  'project_id',
  'employee_id',
  'role',
  'join_date',
  'leave_date',
  'work_hours',
  'cost_rate_hour',
  'cost_rate_day',
  'created_at',
  'updated_at',
  'createuser',
  'createtime',
  'updateuser',
  'updatetime',
  'wfid',
  'flowstate',
  'ReportID',
  'description',
  'lingma_sys_is_delete',
  'lingma_sys_ent',
  'account_set_id',
] as const;

const ROLE_LABEL_MAP: Record<string, string> = {
  manager: '负责人',
  leader: '组长',
  member: '成员',
};

const MEMBER_CHANGE_FIELDS = [
  'change_type',
  'member_from',
  'member_to',
  'member_to_name',
  'role_from',
  'role_to',
  'change_date',
  'summary',
  'note',
] as const;

function hasMemberChangeFields(payload: Record<string, any> = {}) {
  return MEMBER_CHANGE_FIELDS.some((field) => payload[field] !== undefined && payload[field] !== null && payload[field] !== '');
}

function normalizeDateOnly(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const str = String(value).trim();
  if (!str || str === 'null' || str === 'undefined') return undefined;
  if (str.includes('T')) return str.split('T')[0];
  if (str.includes(' ')) return str.split(' ')[0];
  return str;
}

function pickProjectMemberPayload(payload: Record<string, any> = {}, options: { omitPrimaryKey?: boolean } = {}) {
  const next: Record<string, any> = {};

  for (const field of PROJECT_MEMBER_FIELDS) {
    if (options.omitPrimaryKey && field === 'id') continue;
    if (payload[field] !== undefined) {
      next[field] = payload[field];
    }
  }

  if (!next.employee_id && payload.member_to) {
    next.employee_id = payload.member_to;
  }
  if (!next.role && payload.role_to) {
    next.role = payload.role_to;
  }
  if (!next.join_date && payload.change_date) {
    next.join_date = payload.change_date;
  }

  next.join_date = normalizeDateOnly(next.join_date);
  next.leave_date = normalizeDateOnly(next.leave_date);
  next.role = next.role || 'member';
  next.lingma_sys_is_delete = Number(next.lingma_sys_is_delete ?? 0);
  // next.lingma_sys_ent = next.lingma_sys_ent || 'NewApp';

  if (!String(next.project_id || '').trim()) {
    delete next.project_id;
  }

  return next;
}

function ensureProjectMemberCreatePayload(payload: Record<string, any>) {
  const next = pickProjectMemberPayload(payload, { omitPrimaryKey: true });
  if (!String(next.project_id || '').trim()) {
    throw new Error('缺少 project_id，无法新增项目成员');
  }
  if (!String(next.employee_id || '').trim()) {
    throw new Error('缺少 employee_id，无法新增项目成员');
  }
  return next;
}

async function enrichMemberListDisplay(res: any) {
  const rows = Array.isArray(res?.list) ? res.list : [];
  if (!rows.length) return res;

  const projectIds = Array.from(
    new Set(rows.map((row: any) => String(row?.project_id || '').trim()).filter(Boolean)),
  );
  const employeeIds = Array.from(
    new Set(rows.map((row: any) => String(row?.employee_id || '').trim()).filter(Boolean)),
  );

  const [projects, staffList] = await Promise.all([
    projectIds.length ? getProjectManageSimpleList() : Promise.resolve([]),
    employeeIds.length ? getStaffByIds(employeeIds) : Promise.resolve([]),
  ]);

  const projectMap = new Map<string, string>();
  for (const project of Array.isArray(projects) ? projects : []) {
    const id = String(project?.rowid || '').trim();
    if (!id) continue;
    projectMap.set(id, String(project?.project_name || project?.project_code || id));
  }

  const staffMap = new Map<string, string>();
  for (const staff of Array.isArray(staffList) ? staffList : []) {
    const id = String(staff?.ROWID || '').trim();
    if (!id) continue;
    staffMap.set(id, String(staff?.UserName || staff?.LoginName || id));
  }

  rows.forEach((row: any) => {
    const projectId = String(row?.project_id || '').trim();
    const employeeId = String(row?.employee_id || '').trim();
    const role = String(row?.role || '').trim();
    row.project_name = projectMap.get(projectId) || projectId;
    row.employee_name = staffMap.get(employeeId) || employeeId;
    row.role_label = ROLE_LABEL_MAP[role] || role;
  });

  return res;
}

const changeLogApi = createProjectSubmoduleCrudApi({
  navFormId: '0c6h2d5e4f7a8b9c0d1e2f3a4b5c6d7e',
  navigationUrl: 'manage/member',
  formKey: '0c6h2d5e4f7a8b9c0d1e2f3a4b5c6d7e',
  tableName: 'project_member_change_logs',
  dbName: 'LMBill',
  primaryKey: 'id',
  keywordFields: ['change_code', 'project_name', 'member_from', 'member_to', 'summary', 'project_id'],
  defaultStatus: '已生效',
  statusField: 'status',
  useLingmaSysEnt: false,
  createTable: (formKey, tableName, dbName, primaryKey) => createProjectDataTable(formKey, tableName, dbName, primaryKey),
});

const api = createProjectSubmoduleCrudApi({
  navFormId: '0c6h2d5e4f7a8b9c0d1e2f3a4b5c6d7e',
  navigationUrl: 'manage/member',
  formKey: '0c6h2d5e4f7a8b9c0d1e2f3a4b5c6d7e',
  tableName: 'project_members',
  dbName: 'LMBill',
  primaryKey: 'id',
  keywordFields: ['project_id', 'employee_id', 'role', 'id'],
  defaultStatus: 'member',
  statusField: 'role',
  datetimeFields: ['join_date', 'leave_date'],
  useLingmaSysEnt: false,
  createTable: (formKey, tableName, dbName, primaryKey) => createProjectDataTable(formKey, tableName, dbName, primaryKey),
});

export const NAV_FORM_ID = api.NAV_FORM_ID;
export const NAVIGATION_URL = api.NAVIGATION_URL;
export const FORM_KEY = api.FORM_KEY;
export const TABLE_NAME = api.TABLE_NAME;
export const DB_NAME = api.DB_NAME;
export const PRIMARY_KEY = api.PRIMARY_KEY;
export const listData = async (params: Record<string, any> = {}) => enrichMemberListDisplay(await api.list(params));
export const listMemberChangeLogs = changeLogApi.list;
export const getDetail = api.getById;
function hasCostRateFields(payload: Record<string, any> = {}) {
  return payload.cost_rate_hour !== undefined || payload.cost_rate_day !== undefined;
}

async function recalculateMemberWorkday(payload: Record<string, any> = {}) {
  const projectId = String(payload?.project_id || '').trim();
  const userRowid = String(payload?.employee_id || '').trim();
  if (!projectId || !userRowid) return;
  await recalculateProjectWorkday({ projectId, userRowid, force: true });
}

export const createData = async (payload: Record<string, any>) => {
  if (hasMemberChangeFields(payload)) {
    return applyMemberChange(payload);
  }
  const createPayload = ensureProjectMemberCreatePayload(payload);
  const res = await api.create(createPayload);
  await recalculateMemberWorkday(createPayload);
  return res;
};
export const updateData = async (payload: Record<string, any>) => {
  const detail = payload?.id ? await api.getById(payload.id) : null;
  const updatePayload = pickProjectMemberPayload(payload);
  const res = await api.update(updatePayload);
  if (hasCostRateFields(payload)) await recalculateMemberWorkday({ ...detail, ...updatePayload });
  return res;
};
export const deleteData = api.remove;
export { applyMemberChange };
