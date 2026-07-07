import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

const DB_NAME = 'QYVirtualPlat';
export const ORGAN_FORM_ID = '2ED292CBED7B28C8541CF4F3E852A4A2';
export const STAFF_FORM_ID = '2ED292CBED7B28C8541CF4F3E852A4A2';
export const JOB_FORM_ID = '2ED292CBED7B28C8541CF4F3E852A4A2';

const DEPT_TABLE = 'Base_DepartInfo';
const DEPT_PK = 'DepID';
const JOB_TABLE = 'Base_JobInfo';
const JOB_PK = 'ID';
const JOB_USER_TABLE = 'Base_User_DJ';
const JOB_USER_PK = 'rowid';
const USER_TABLE = 'Base_UserInfo';
const USER_PK = 'ROWID';
const STAFF_VIEW = 'view_user_dj';
const STAFF_VIEW_PK = 'ROWID';
const USER_ROLE_VIEW = 'view_topnav_user_role';
const USER_ROLE_PK = 'masterId';
const USER_SEX_DICT = 'user_sex';
const USER_SEX_PK = 'rowid';
const STAFF_LM_KEY = 'AQZVMDAwMjggMzJGRjVCOUJCMEREN0NGQzY2OERFOURDOEJCRkIxQ0QaUVlWaXJ0dWFsUGxhdEB2aWV3X3VzZXJfZGoBaeBOWQ.WPU5qpgokwQJRWJWPIPgRQ';
const DEP_JOB_USER_VIEW = 'dep_job_userDJ';
const DICT_DATA_TABLE = '_Base_DictData';
const DICT_DATA_PK = 'rowid';
const JOB_DB_ID = 'EBEFF17BBB6443B185D6FB32FF69F0BB';
const JOB_LM_KEY = 'AQZVMDAwMjggMEI2OTc4QTVBMDQxODQ1ODhCRjY3Q0EyNjlGNDhFMzgaUVlWaXJ0dWFsUGxhdEBCYXNlX0pvYkluZm8BaeCDRw.96foEt6seuSBckIEjGWrAQ';
const DEP_RANK_DICT = 'pt_depRank';

export const ORGAN_DICT_TYPES = {
  jobType: 'JobType2',
  headType: 'HeadType2',
  isExclusiveJob: 'ISExclusiveJob',
  gender: 'Gender',
  leaveType: 'LeaveType',
  processStatus: 'ProcessStatus',
  deptLevel: 'DeptLevel',
} as const;

export interface OrganDept {
  [key: string]: any;
  DepID: string;
  DepName: string;
  DepCode?: string;
  Prowid?: string;
  DepLevelCode?: string;
  IsCancel?: string | number;
  DepType?: string;
  Master?: string;
  Summary?: string;
  children?: OrganDept[];
}

export interface OrganJob {
  [key: string]: any;
  JobID: string;
  JobName: string;
  JobCode?: string | number;
  JobDuty?: string;
  JobType?: string;
  HeadType?: string;
  IsExclusiveJob?: string | number;
  DepID?: string;
  DepName?: string;
  rowid?: string;
  ROWID?: string;
}

export interface OrganDictOption { label: string; value: string; raw: Record<string, any>; }
export interface OrganUser {
  [key: string]: any;
  rowid?: string; ROWID?: string; UserID?: string; UserName?: string; LoginName?: string;
  DepID?: string; DepName?: string; JobID?: string; JobName?: string; HeadType?: string;
  IsCharge?: boolean | number | string; WorkDuty?: string; Remark?: string; JobDuty?: string;
}
export interface OrganAttendance { [key: string]: any; rowid?: string; ROWID?: string; Applicant?: string; ApplicantName?: string; ApplyTime?: string; LeaveType?: string; BeginDate?: string; EndDate?: string; LeaveDays?: string | number; Reason?: string; ProcessStatus?: string; }
export interface OrganUserSaveRow { rowid?: string; UserID: string; DepID?: string; JobID?: string; HeadType?: string; IsCharge?: number; WorkDuty?: string; Remark?: string; }

function getItems(res: any) {
  const resultData = res?.data?.Result?.data || res?.data?.Result || res?.data;
  if (Array.isArray(resultData?.Items)) return resultData.Items as any[];
  if (Array.isArray(resultData?.items)) return resultData.items as any[];
  if (Array.isArray(resultData)) return resultData as any[];
  return [];
}
function createTable(tableName: string, pk: string) { return new DataTable(ORGAN_FORM_ID, tableName, DB_NAME, pk); }
function createStaffViewTable(tableName: string, pk: string) { const table = new DataTable(STAFF_FORM_ID, tableName, DB_NAME, pk); table.Type = '数据库视图'; return table; }
function createStaffDictTable(dictName: string, pk: string) { const table = new DataTable(STAFF_FORM_ID, dictName, '', pk); table.Type = '字典'; return table; }
function normalizeId(value: unknown) { return String(value ?? '').trim(); }
function getJobRequestHeaders() { return new DataTable(JOB_FORM_ID, JOB_TABLE, DB_NAME, JOB_PK).getRequestHeader(); }
function mapDictItems(items: any[]) { return items.map((item) => ({ label: normalizeId(item.txt || item.label || item.name || item.Name), value: normalizeId(item.val || item.value || item.code || item.Code || item.txt || item.rowid), raw: item })).filter((item) => item.label || item.value) as OrganDictOption[]; }

function createJobInfoRequest(params: { deptId?: string; depLevelCode?: string } = {}) {
  const filters: any[] = [];
  const deptId = normalizeId(params.deptId);
  const depLevelCode = normalizeId(params.depLevelCode);

  if (deptId) {
    filters.push({ Type: 'cond', Field: 'Depid', Operator: 'equal', Value: null, ValueFun: { Type: 'GetConstValue', Value: deptId } });
  }
  if (depLevelCode) {
    filters.push({ Type: 'cond', Field: 'DepLevelCode', Operator: 'equal', Value: null, ValueFun: { Type: 'GetConstValue', Value: depLevelCode } });
  }

  const filterGroups = filters.length > 0 ? [{ Type: 'and', Filters: filters }] : [];
  return { Table: [{ Name: JOB_TABLE, MetaName: JOB_TABLE, Description: '岗位信息表', Type: '数据库表', DbId: JOB_DB_ID, DbName: DB_NAME, Filter: { Type: 'and', Filters: filterGroups }, Fields: [
    { Name: 'JobType', FieldType: 'char', Description: '岗位类别', IsOutput: true }, { Name: 'rowid', FieldType: 'varchar', Description: '唯一值（ID）', IsOutput: true }, { Name: 'JobDuty', FieldType: 'varchar', Description: '岗位职责', IsOutput: true }, { Name: 'jobExpNum', FieldType: 'int', Description: '预计人数', IsOutput: true }, { Name: 'DepName', FieldType: 'varchar', Description: '所属部门名称', IsOutput: true }, { Name: 'JobQualifications', FieldType: 'varchar', Description: '岗位资质', IsOutput: true }, { Name: 'Depid', FieldType: 'varchar', Description: '所属部门id', IsOutput: true }, { Name: 'Memo', FieldType: 'varchar', Description: '备注', IsOutput: true }, { Name: 'DepLevelCode', FieldType: 'varchar', Description: '部门级别编号', IsOutput: true }, { Name: 'JobCode', FieldType: 'varchar', Description: '岗位编号', IsOutput: true }, { Name: 'jonActNum', FieldType: 'int', Description: '岗位实际人数', IsOutput: true }, { Name: 'ID', FieldType: 'varchar', Description: '唯一值', IsPKey: true, IsOutput: true }, { Name: 'DepLevel', FieldType: 'varchar', Description: '部门级别', IsOutput: true }, { Name: 'JobName', FieldType: 'varchar', Description: '岗位名称', IsOutput: true }, { Name: 'JobLevel', FieldType: 'tinyint', Description: '岗位级别', IsOutput: true }], DISTINCT: true, IsBusinessMain: 1, OutputType: 'Table', ChildTables: [], JoinType: 0, RelationFilterType: 'and', _ApiInfo: { url: '/api/DataOperation/GetData', SelfRefUrl: '/api/DataOperation/GetSelfRefData', insertUrl: '/api/DataOperation/QYVirtualPlat/InsertByCRUD', updateUrl: '/api/DataOperation/QYVirtualPlat/UpdateByCRUD', deleteUrl: '/api/DataOperation/QYVirtualPlat/DeleteByCRUD', batchChangesUrl: '/api/DataOperation/BatchTableOperateRequestByCRUD', httpType: 'POST' }, partial: [], isPartial: false, inputParams: [], addApi: null, updateApi: null, deleteApi: null, cacheType: '不设置', hasCache: false, cacheData: { Added: [] }, allowAdd: true, lmKey: JOB_LM_KEY, WhereExp: '', framework: 'ej2', IsBusiness: false, isGetData: true, _CurrentRow: null, _SelectRows: [] }] };
}

function createDictRequest(dictName: string, description: string, extraFields: any[] = []) { return { Table: [{ Name: dictName, MetaName: dictName, Description: description, Type: '字典', Filter: { Type: 'and', Filters: [] }, Fields: [...extraFields, { Name: 'txt', FieldType: 'varchar', Description: '文本', IsOutput: true }, { Name: 'ordIdx', FieldType: 'int', Description: '排序字段', IsOutput: true, OrderType: 'ascending', Order: 1 }, { Name: 'val', FieldType: 'varchar', Description: '值', IsOutput: true }, { Name: 'rowid', FieldType: 'varchar', Description: '唯一值（ID）', IsPKey: true, IsOutput: true }], DISTINCT: true, IsBusinessMain: 0, OutputType: 'Table', ChildTables: [], JoinType: 0, RelationFilterType: 'and', _ApiInfo: { url: '/api/DataOperation/GetData', insertUrl: '/api/Dict/' + dictName + '/AddDictDataList', updateUrl: '/api/Dict/' + dictName + '/EditDictData', deleteUrl: '/api/Dict/' + dictName + '/DeleteDict', batchChangesUrl: '/api/Dict/' + dictName + '/BatchData', httpType: 'POST' }, framework: 'ej2', IsBusiness: false }] }; }

export async function getExactDictData(dictName: string) { const meta = ({ [DEP_RANK_DICT]: { description: '部门级别' }, [ORGAN_DICT_TYPES.isExclusiveJob]: { description: '是否专属', extraFields: [{ Name: 'exVal_4', FieldType: 'varchar', Description: '备注', IsOutput: true }] } } as Record<string, { description: string; extraFields?: any[] }>)[dictName] || { description: dictName }; const res = await requestClient.post('/api/DataOperation/GetData', createDictRequest(dictName, meta.description, meta.extraFields || []), { headers: getJobRequestHeaders(), responseReturn: 'raw' }); return mapDictItems(getItems(res)); }
export function getDeptNodeId(item: Partial<OrganDept> | null | undefined) { return normalizeId(item?.DepID || item?.rowid || item?.ROWID || item?.EnterpriseID); }
export function getDeptParentNodeId(item: Partial<OrganDept> | null | undefined) { return normalizeId(item?.Prowid || item?.LepDepID); }
export function buildDeptTree(list: OrganDept[]) { const map = new Map<string, OrganDept>(); const roots: OrganDept[] = []; list.forEach((item) => { const id = getDeptNodeId(item); if (!id) return; const normalizedItem = { ...item, DepID: normalizeId(item.DepID) || id, __deptNodeId: id, __deptParentNodeId: getDeptParentNodeId(item), children: [] } as OrganDept; map.set(id, normalizedItem); if (item.DepID) map.set(normalizeId(item.DepID), normalizedItem); if (item.rowid) map.set(normalizeId(item.rowid), normalizedItem); }); const linked = new Set<string>(); map.forEach((item) => { const id = getDeptNodeId(item); if (!id || linked.has(id)) return; const parentId = getDeptParentNodeId(item); const parent = parentId ? map.get(parentId) : null; if (parent && getDeptNodeId(parent) !== id) { parent.children ||= []; parent.children.push(item); linked.add(id); } }); map.forEach((item) => { const id = getDeptNodeId(item); if (id && !linked.has(id) && !roots.includes(item)) roots.push(item); }); return roots; }

export async function getOrganDeptList() { const table = createTable(DEPT_TABLE, DEPT_PK); table.Filter = and(cond('lingma_sys_is_delete', 'equal', 0)); const res = await requestClient.post(table.queryUrl, { Table: [table], PageParam: { page: 2000, index: 1 } }, { headers: table.getRequestHeader(), responseReturn: 'raw' }); table.execQueryResult(res); return getItems(res) as OrganDept[]; }
export async function saveOrganDept(row: Partial<OrganDept>, mode: 'add' | 'edit') { const table = createTable(DEPT_TABLE, DEPT_PK); const key = normalizeId(row.DepID); const saveRow = { ...row, DepID: key || undefined, DepName: normalizeId(row.DepName), DepCode: normalizeId(row.DepCode || row.DepID), Prowid: normalizeId(row.Prowid), DepLevelCode: normalizeId(row.DepLevelCode), IsCancel: row.IsCancel ?? 0 }; const payload = mode === 'add' ? table.getSaveParam([saveRow], [], []) : table.getSaveParam([], [saveRow], []); return requestClient.post(table.saveUrl, payload, { headers: table.getRequestHeader(), responseReturn: 'raw' }); }
export async function deleteOrganDept(row: Partial<OrganDept>) { const table = createTable(DEPT_TABLE, DEPT_PK); const key = normalizeId(row.DepID || row.rowid || row.ROWID); return requestClient.post(table.saveUrl, table.getSaveParam([], [], [{ ...row, DepID: key }]), { headers: table.getRequestHeader(), responseReturn: 'raw' }); }

export async function getOrganJobList(params: { deptId?: string; depLevelCode?: string; keyword?: string; jobType?: string; index?: number; page?: number } = {}) { const payload = createJobInfoRequest({ deptId: params.deptId, depLevelCode: params.depLevelCode }); const res = await requestClient.post('/api/DataOperation/GetData', { ...payload, PageParam: { index: params.index || 1, size: params.page || 20 } }, { headers: getJobRequestHeaders(), responseReturn: 'raw' }); return { dataTable: payload.Table[0], list: getItems(res) as OrganJob[] }; }
export async function saveOrganJob(row: Partial<OrganJob>, mode: 'add' | 'edit') { const table = createTable(JOB_TABLE, JOB_PK); const key = normalizeId(row.ID || row.JobID || row.rowid || row.ROWID); const saveRow = { ...row, ID: key || undefined }; const payload = mode === 'add' ? table.getSaveParam([saveRow], [], []) : table.getSaveParam([], [saveRow], []); return requestClient.post(table.saveUrl, payload, { headers: table.getRequestHeader(), responseReturn: 'raw' }); }
export async function deleteOrganJob(row: Partial<OrganJob>) { const table = createTable(JOB_TABLE, JOB_PK); const key = normalizeId(row.ID || row.JobID || row.rowid || row.ROWID); return requestClient.post(table.saveUrl, table.getSaveParam([], [], [{ ...row, ID: key }]), { headers: table.getRequestHeader(), responseReturn: 'raw' }); }
export async function getOrganUserList(jobId: string) { const table = createTable(DEP_JOB_USER_VIEW, JOB_USER_PK); table.Filter = and(cond('lingma_sys_is_delete', 'equal', 0), cond('JobID', 'equal', jobId)); const res = await requestClient.post(table.queryUrl, { Table: [table], PageParam: { page: 1000, index: 1 } }, { headers: table.getRequestHeader(), responseReturn: 'raw' }); table.execQueryResult(res); return getItems(res) as OrganUser[]; }
export async function getAllOrganUsers(keyword = '') { const table = createTable(USER_TABLE, USER_PK); const filters = [cond('lingma_sys_is_delete', 'equal', 0)]; if (keyword) filters.push(or(cond('UserName', 'contains', keyword), cond('LoginName', 'contains', keyword)) as any); table.Filter = and(...filters); const res = await requestClient.post(table.queryUrl, { Table: [table], PageParam: { page: 1000, index: 1 } }, { headers: table.getRequestHeader(), responseReturn: 'raw' }); table.execQueryResult(res); return getItems(res) as OrganUser[]; }
export async function saveOrganJobUsers(rows: OrganUserSaveRow[]) { const table = createTable(JOB_USER_TABLE, JOB_USER_PK); const changed = rows.filter((item) => item.rowid); const added = rows.filter((item) => !item.rowid); return requestClient.post(table.saveUrl, table.getSaveParam(added, changed, []), { headers: table.getRequestHeader(), responseReturn: 'raw' }); }
export async function deleteOrganJobUser(row: Partial<OrganUser>) { const table = createTable(JOB_USER_TABLE, JOB_USER_PK); const key = normalizeId(row.rowid || row.ROWID); return requestClient.post(table.saveUrl, table.getSaveParam([], [], [{ ...row, rowid: key }]), { headers: table.getRequestHeader(), responseReturn: 'raw' }); }
export async function getOrganDictData(dictType: string) { if (dictType === DEP_RANK_DICT || dictType === ORGAN_DICT_TYPES.isExclusiveJob) return getExactDictData(dictType); const table = createTable(DICT_DATA_TABLE, DICT_DATA_PK); table.Filter = and(cond('typeid', 'equal', dictType)); const res = await requestClient.post(table.queryUrl, { Table: [table], PageParam: { page: 1000, index: 1 } }, { headers: table.getRequestHeader(), responseReturn: 'raw' }); table.execQueryResult(res); return mapDictItems(getItems(res)); }
export async function getOrganSexDictData() { const table = createStaffDictTable(USER_SEX_DICT, USER_SEX_PK); const res = await requestClient.post(table.queryUrl, { Table: [table] }, { headers: table.getRequestHeader(), responseReturn: 'raw' }); table.execQueryResult(res); return getItems(res).map((item) => ({ label: normalizeId(item.txt || item.label || item.name || item.Name), value: normalizeId(item.val || item.value || item.code || item.Code || item.txt), raw: item })).filter((item) => item.label || item.value) as OrganDictOption[]; }
export async function getOrganDictMap() { const [jobType, headType, isExclusiveJob, gender, deptLevel] = await Promise.all([getOrganDictData(ORGAN_DICT_TYPES.jobType), getOrganDictData(ORGAN_DICT_TYPES.headType), getExactDictData(ORGAN_DICT_TYPES.isExclusiveJob), getOrganSexDictData(), getExactDictData(DEP_RANK_DICT)]); return { jobType, headType, isExclusiveJob, gender, deptLevel }; }
export async function getUserNavigationRoleMap() { const table = createStaffViewTable(USER_ROLE_VIEW, USER_ROLE_PK); const res = await requestClient.post(table.queryUrl, { Table: [table] }, { headers: table.getRequestHeader(), responseReturn: 'raw' }); table.execQueryResult(res); return getItems(res).reduce<Record<string, string[]>>((map, item) => { const userId = normalizeId(item.userid || item.UserID || item.masterId); const funName = normalizeId(item.FunName); if (!userId || !funName) return map; if (!map[userId]) map[userId] = []; if (!map[userId].includes(funName)) map[userId].push(funName); return map; }, {}); }
export async function getOrganStaffList(keyword = '') { const table = createStaffViewTable(STAFF_VIEW, STAFF_VIEW_PK); table.lmKey = STAFF_LM_KEY; const filters = [cond('lingma_sys_is_delete', 'equal', 0)]; if (keyword) filters.push(or(cond('UserName', 'contains', keyword), cond('LoginName', 'contains', keyword)) as any); table.Filter = and(...filters); const [res, roleMap] = await Promise.all([requestClient.post(table.queryUrl, { Table: [table], PageParam: { index: 1, size: 1000 } }, { headers: table.getRequestHeader(), responseReturn: 'raw' }), getUserNavigationRoleMap().catch(() => ({} as Record<string, string[]>))]); table.execQueryResult(res); const list = (getItems(res) as OrganUser[]).map((item) => { const userId = normalizeId(item.ID || item.UserID || item.userid || item.ROWID || item.rowid); return { ...item, RoleNames: normalizeId(item.user_roles || item.RoleNames || item.Roles), JobName: normalizeId(item.user_jobs || item.JobName), AuthNames: (roleMap[userId] || []).join('、') }; }); return { dataTable: table, list }; }
export async function saveOrganStaff(row: Partial<OrganUser>, mode: 'add' | 'edit') { const table = createStaffViewTable(STAFF_VIEW, STAFF_VIEW_PK); table.lmKey = STAFF_LM_KEY; const key = normalizeId(row.ROWID || row.rowid || row.ID || row.UserID); const saveRow = { ...row, ROWID: key || undefined, Sex: (row as any).Sex || (row as any).Gender }; delete (saveRow as any).Gender; const payload = mode === 'add' ? table.getSaveParam([saveRow], [], []) : table.getSaveParam([], [saveRow], []); return requestClient.post(table.saveUrl, payload, { headers: table.getRequestHeader(), responseReturn: 'raw' }); }
export async function deleteOrganStaff(row: Partial<OrganUser>) { const table = createStaffViewTable(STAFF_VIEW, STAFF_VIEW_PK); table.lmKey = STAFF_LM_KEY; const key = normalizeId(row.ROWID || row.rowid || row.ID || row.UserID); return requestClient.post(table.saveUrl, table.getSaveParam([], [], [{ ...row, ROWID: key }]), { headers: table.getRequestHeader(), responseReturn: 'raw' }); }
export async function getOrganAttendanceList() { const table = createTable('Base_Attendance', 'rowid'); table.Filter = and(cond('lingma_sys_is_delete', 'equal', 0)); const res = await requestClient.post(table.queryUrl, { Table: [table], PageParam: { page: 1000, index: 1 } }, { headers: table.getRequestHeader(), responseReturn: 'raw' }); table.execQueryResult(res); return { dataTable: table, list: getItems(res) as OrganAttendance[] }; }
export async function saveOrganAttendance(row: Partial<OrganAttendance>, mode: 'add' | 'edit') { const table = createTable('Base_Attendance', 'rowid'); const key = normalizeId(row.rowid || row.ROWID); const saveRow = { ...row, rowid: key || undefined }; const payload = mode === 'add' ? table.getSaveParam([saveRow], [], []) : table.getSaveParam([], [saveRow], []); return requestClient.post(table.saveUrl, payload, { headers: table.getRequestHeader(), responseReturn: 'raw' }); }
export async function deleteOrganAttendance(row: Partial<OrganAttendance>) { const table = createTable('Base_Attendance', 'rowid'); const key = normalizeId(row.rowid || row.ROWID); return requestClient.post(table.saveUrl, table.getSaveParam([], [], [{ ...row, rowid: key }]), { headers: table.getRequestHeader(), responseReturn: 'raw' }); }
