import QB, { and, cond, DataColumn, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export namespace HrAttendanceApi {
  export interface AttendanceRecord {
    id?: string;
    attendance_code?: string | null;
    user_dj_rowid?: string;
    user_rowid?: string;
    dep_id?: string;
    job_rowid?: string;
    attendance_date?: string;
    check_in_at?: string | null;
    check_in_type?: string | null;
    check_out_at?: string | null;
    check_out_type?: string | null;
    work_minutes?: number;
    status?: string;
    remark?: string | null;
    userName?: string;
    departmentName?: string;
    jobName?: string;
    [key: string]: any;
  }

  export interface UserDjOption {
    userDjRowid: string;
    userRowid: string;
    depId: string;
    depName: string;
    jobRowid: string;
    jobName: string;
    userName: string;
    phone?: string;
    email?: string;
    isWork?: string;
  }

  export interface AttendanceQuery {
    q?: string;
    status?: string;
    date?: string;
    index?: number;
    page?: number;
  }

  export interface ScheduleRule {
    id?: string;
    rule_code?: string | null;
    rule_name?: string;
    rule_type?: string;
    flex_minutes?: number;
    status?: string;
    remark?: string | null;
    departments?: Array<{ depId: string; depName: string }>;
    segments?: Array<{ id?: string; segment_no?: number; segment_type?: string; start_time?: string; end_time?: string }>;
    [key: string]: any;
  }

  export interface ScheduleRulePayload {
    rule_code?: string | null;
    rule_name: string;
    rule_type: string;
    flex_minutes: number;
    status: string;
    remark?: string | null;
    departments: string[];
    segments: Array<{ segment_no: number; segment_type: string; start_time: string; end_time: string }>;
  }

  export interface Holiday {
    id?: string;
    name?: string;
    startDate?: string;
    endDate?: string;
    days?: number;
    isDefault?: number;
    [key: string]: any;
  }
}

const HR_MIGRATION_FORM_KEY = '847D59BE6EAA2316724038FC117CAAD6';
const ATTENDANCE_INFO_FORM_KEY = HR_MIGRATION_FORM_KEY;
const ATTENDANCE_SCHEDULE_FORM_KEY = HR_MIGRATION_FORM_KEY;
const ATTENDANCE_DB = 'LMBill';
const ATTENDANCE_TABLE = 'Bil_HR_Attendance_Records';
const ATTENDANCE_PK = 'id';
const RULE_TABLE = 'Bil_HR_Attendance_Schedule_Rules';
const RULE_DEPT_TABLE = 'Bil_HR_Attendance_Schedule_Rule_Depts';
const RULE_SEG_TABLE = 'Bil_HR_Attendance_Schedule_Rule_Segments';
const HOLIDAY_TABLE = 'Bil_HR_Attendance_Holidays';
const COMMON_PK = 'id';

const ORG_FORM_KEY = 'EFC7E7A528CC603C24CBC3ACD5D7ED68';
const DEPT_FORM_KEY = '2ED292CBED7B28C8541CF4F3E852A4A2';
const ORG_DB = 'QYVirtualPlat';

function newGuid() {
  return QB.GetNewGUID();
}

function createLocalCode(prefix: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 100_000)).padStart(5, '0');
  return `${prefix}-${year}${month}${day}-${random}`;
}

function toItems(resQuery: any) {
  const resultData = resQuery?.data?.Result?.data || resQuery?.data?.Result || resQuery?.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : resultData?.Items || resultData || [];
  return Array.isArray(items) ? items : [];
}

function stripCreatedUpdated(obj: any) {
  if (!obj || typeof obj !== 'object') return obj;
  delete obj.created_at;
  delete obj.updated_at;
  delete obj.createdAt;
  delete obj.updatedAt;
  return obj;
}

function normalizeDateTimeForSave(value?: null | string) {
  if (!value) return value;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw + ' 00:00:00';
  const normalized = raw.slice(0, 19).replace('T', ' ');
  return normalized.length === 16 ? normalized + ':00' : normalized;
}

function setQueryFields(table: DataTable, names: string[]) {
  table.Fields = names.map((name) => {
    const column = new DataColumn();
    column.Name = name;
    return column;
  });
}

function setAttendanceFields(table: DataTable) {
  setQueryFields(table, [
    'id', 'attendance_code', 'user_dj_rowid', 'user_rowid', 'dep_id', 'job_rowid', 'attendance_date', 'check_in_at',
    'check_in_type', 'check_out_at', 'check_out_type', 'work_minutes', 'status', 'remark', 'createuser', 'createtime',
    'updateuser', 'updatetime', 'wfid', 'flowstate', 'ReportID', 'description', 'lingma_sys_is_delete', 'lingma_sys_ent',
    'source_system', 'source_table', 'source_id', 'migration_batch_no',
  ]);
}

function setScheduleFields(table: DataTable) {
  if (table.Name === RULE_TABLE) {
    setQueryFields(table, ['id', 'rule_code', 'rule_name', 'rule_type', 'flex_minutes', 'status', 'remark', 'createuser', 'createtime', 'updateuser', 'updatetime', 'wfid', 'flowstate', 'ReportID', 'description', 'lingma_sys_is_delete', 'lingma_sys_ent', 'source_system', 'source_table', 'source_id', 'migration_batch_no']);
  } else if (table.Name === RULE_DEPT_TABLE) {
    setQueryFields(table, ['id', 'rule_id', 'dep_id', 'createuser', 'createtime', 'updateuser', 'updatetime', 'wfid', 'flowstate', 'ReportID', 'description', 'lingma_sys_is_delete', 'lingma_sys_ent']);
  } else if (table.Name === RULE_SEG_TABLE) {
    setQueryFields(table, ['id', 'rule_id', 'segment_no', 'segment_type', 'start_time', 'end_time', 'createuser', 'createtime', 'updateuser', 'updatetime', 'wfid', 'flowstate', 'ReportID', 'description', 'lingma_sys_is_delete', 'lingma_sys_ent']);
  } else if (table.Name === HOLIDAY_TABLE) {
    setQueryFields(table, ['id', 'name', 'startDate', 'endDate', 'days', 'isDefault', 'createuser', 'createtime', 'updateuser', 'updatetime', 'wfid', 'flowstate', 'ReportID', 'description', 'lingma_sys_is_delete', 'lingma_sys_ent']);
  }
}

async function queryTable(table: DataTable, index = 1, page = 0) {
  if (table.Name === ATTENDANCE_TABLE) setAttendanceFields(table);
  else setScheduleFields(table);

  const req = table.getQueryParam('Table', table.Filter, [], [], page, index);
  const resQuery = await requestClient.post(table.queryUrl, req, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  return { table, list: toItems(resQuery) };
}

function toResponseItems(data: any): any[] {
  if (Array.isArray(data)) return data;
  const result = data?.Result ?? data?.result;
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [data, result].filter(Boolean);
}

function isSuccessItem(item: any) {
  return (
    item?.Type === 'success'
    || item?.type === 'success'
    || item?.Code === 0
    || item?.Code === 200
    || item?.code === 0
    || item?.code === 200
    || item?.success === true
    || item?.Success === true
  );
}

function isFailureItem(item: any) {
  return (
    item?.Type === 'error'
    || item?.Type === 'fail'
    || item?.type === 'error'
    || item?.type === 'fail'
    || item?.success === false
    || item?.Success === false
    || (typeof item?.Code === 'number' && item.Code !== 0 && item.Code !== 200)
    || (typeof item?.code === 'number' && item.code !== 0 && item.code !== 200)
  );
}

function isSuccessResponse(data: any) {
  const items = toResponseItems(data);
  return items.length > 0 && items.some(isSuccessItem) && !items.some(isFailureItem);
}

function getResponseMessage(data: any, fallback = '保存失败') {
  const item = toResponseItems(data).find((entry) => entry?.Message || entry?.msg || entry?.error) || data;
  return item?.Message || item?.msg || item?.error || fallback;
}

function getCodeMessage(res: any) {
  const data = res?.data ?? res;
  const item = toResponseItems(data).find((entry) => entry?.Message || entry?.msg) || data;
  return String(item?.Message || item?.msg || '').trim();
}

async function saveTable(table: DataTable, added: any[] = [], changed: any[] = [], deleted: any[] = []) {
  const payload = table.getSaveParam(
    added.map((item) => stripCreatedUpdated({ ...item })),
    changed.map((item) => stripCreatedUpdated({ ...item })),
    deleted.map((item) => stripCreatedUpdated({ ...item })),
  );
  const resSave = await requestClient.post(table.saveUrl, payload, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  const data = resSave.data;
  const result = data?.Result ?? data?.result;
  if (isSuccessResponse(data)) return { success: true, data: result ?? data };
  console.error('[hr-attendance-save-failed]', { table: table.Name, payload, response: data });
  return { success: false, error: getResponseMessage(data, JSON.stringify(data)), data };
}

async function queryOrgTable(tableName: string, pk: string, params: { q?: string; depId?: string; userRowid?: string; jobRowid?: string } = {}) {
  const table = new DataTable(ORG_FORM_KEY, tableName, ORG_DB, pk);
  const filters: any[] = [cond('lingma_sys_is_delete', 'equal', 0)];

  if (tableName === 'Base_UserInfo' && params.q) {
    const q = String(params.q).trim();
    filters.push(or(cond('UserName', 'contains', q), cond('ROWID', 'contains', q), cond('entInfoUserPhone', 'contains', q)) as any);
  }
  if (tableName === 'Base_JobInfo') {
    if (params.depId) filters.push(cond('Depid', 'equal', params.depId));
    if (params.q) {
      const q = String(params.q).trim();
      filters.push(or(cond('JobName', 'contains', q), cond('JobCode', 'contains', q), cond('DepName', 'contains', q)) as any);
    }
  }
  if (tableName === 'Base_User_DJ') {
    if (params.depId) filters.push(cond('DepID', 'equal', params.depId));
    if (params.userRowid) filters.push(cond('UserID', 'equal', params.userRowid));
    if (params.jobRowid) filters.push(cond('JobID', 'equal', params.jobRowid));
    if (params.q) {
      const q = String(params.q).trim();
      filters.push(or(cond('UserName', 'contains', q), cond('DepName', 'contains', q), cond('JobName', 'contains', q), cond('UserID', 'contains', q)) as any);
    }
  }

  table.Filter = and(...filters);
  const res = await requestClient.post(
    table.queryUrl,
    { Table: [table] },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  table.execQueryResult(res);
  return toItems(res);
}

export async function listBaseDepartInfo() {
  const table = new DataTable(DEPT_FORM_KEY, 'Base_DepartInfo', ORG_DB, 'rowid');
  table.Filter = cond('lingma_sys_is_delete', 'equal', 0);
  const res = await requestClient.post(table.queryUrl, { Table: [table] }, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(res);
  return { success: true, data: toItems(res), table };
}

export async function listBaseJobInfo() {
  const table = new DataTable(ORG_FORM_KEY, 'Base_JobInfo', ORG_DB, 'ID');
  table.Filter = cond('lingma_sys_is_delete', 'equal', 0);
  const res = await requestClient.post(
    table.queryUrl,
    { Table: [table] },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  table.execQueryResult(res);
  return { success: true, data: toItems(res) };
}

export async function listUserDjOptions(params: { q?: string; depId?: string } = {}) {
  const [rels, users, jobs] = await Promise.all([
    queryOrgTable('Base_User_DJ', 'rowid', params),
    queryOrgTable('Base_UserInfo', 'ID', params.q ? { q: params.q } : {}),
    queryOrgTable('Base_JobInfo', 'ID', params.depId ? { depId: params.depId } : {}),
  ]);

  const userMap = new Map(users.map((item: any) => [String(item.ROWID || ''), item]));
  const jobMap = new Map(jobs.map((item: any) => [String(item.rowid || item.ROWID || ''), item]));

  return rels.map((item: any) => {
    const userRowid = String(item.UserID || '');
    const jobRowid = String(item.JobID || '');
    const user = userMap.get(userRowid) || {};
    const job = jobMap.get(jobRowid) || {};
    return {
      userDjRowid: String(item.rowid || ''),
      userRowid,
      depId: String(item.DepID || ''),
      depName: String(item.DepName || job.DepName || ''),
      jobRowid,
      jobName: String(item.JobName || job.JobName || ''),
      userName: String(item.UserName || user.UserName || ''),
      phone: String(user.entInfoUserPhone || ''),
      email: String(user.mailbox || ''),
      isWork: String(item.IsWork ?? user.IsWork ?? '1'),
    } as HrAttendanceApi.UserDjOption;
  });
}

export async function listAttendanceRecords(params: HrAttendanceApi.AttendanceQuery = {}) {
  const table = new DataTable(ATTENDANCE_INFO_FORM_KEY, ATTENDANCE_TABLE, ATTENDANCE_DB, ATTENDANCE_PK);
  const filters: any[] = [];
  if (params.status && params.status !== 'all') filters.push(cond('status', 'equal', params.status));
  if (params.date) filters.push(cond('attendance_date', 'equal', params.date));
  if (params.q) {
    const q = String(params.q).trim();
    if (q) {
      // 关键词搜索分两步：
      // 1. 先在后端能搜中文的表（Base_User_DJ）里用关键词匹配出符合条件的 user_dj_rowid
      // 2. 再用这些 ID 对考勤记录做 in 过滤
      // 3. 同时后端还能搜 attendance_code，也一起 in 过滤
      // 这样即使考勤记录有几十万条，也只需要拉一次全量，前端按 user_dj_rowid 集合过滤即可
    }
  }
  if (filters.length === 1) table.Filter = filters[0] as any;
  else if (filters.length > 1) table.Filter = and(...filters) as any;

  // 全量拉取考勤记录（DataTable 不支持分页，page=0 表示不分页）
  const { list } = await queryTable(table, params.index || 1, params.page || 0);

  // 全量拉取人员任岗关系和部门/岗位字典，用于 enrichment
  const [org, depRes, jobRes] = await Promise.all([
    listUserDjOptions({}),
    listBaseDepartInfo(),
    listBaseJobInfo(),
  ]);
  const orgMap = new Map(org.map((item) => [String(item.userDjRowid), item]));
  const userRowidMap = new Map(org.map((item) => [String(item.userRowid), item]));
  const depMap = new Map((Array.isArray(depRes?.data) ? depRes.data : []).map((item: any) => [String(item.DepID || ''), String(item.DepName || '')]));
  const jobMap = new Map((Array.isArray(jobRes?.data) ? jobRes.data : []).map((item: any) => [String(item.rowid || item.ROWID || item.ID || ''), String(item.JobName || '')]));

  // 预构建人名/部门名/岗位名/考勤编号的匹配集合，供前端过滤用
  let matchedUserDjRowids: Set<string> | null = null;
  let matchedAttendanceCodes: Set<string> | null = null;

  if (params.q) {
    const q = String(params.q).trim().toLowerCase();
    // 1. 找出人名/部门名/岗位名匹配的 user_dj_rowid
    matchedUserDjRowids = new Set(
      org.filter((item) => {
        const text = [item.userName, item.depName, item.jobName]
          .filter(Boolean)
          .map(String)
          .join(' ')
          .toLowerCase();
        return text.includes(q);
      }).map((item) => item.userDjRowid)
    );
    // 2. 找出考勤编号匹配的 attendance_code
    matchedAttendanceCodes = new Set(
      list
        .filter((item: any) => String(item.attendance_code || '').toLowerCase().includes(q))
        .map((item: any) => String(item.attendance_code))
    );
  }

  const enriched = list.map((item: any) => {
    // 优先通过 user_dj_rowid 匹配，其次通过 user_rowid fallback
    const rel = orgMap.get(String(item.user_dj_rowid || ''));
    const userFallback = rel ? null : userRowidMap.get(String(item.user_rowid || ''));
    const userName = rel?.userName || userFallback?.userName || '';
    const depName = rel?.depName || userFallback?.depName || depMap.get(String(item.dep_id || '')) || '';
    const jobName = rel?.jobName || userFallback?.jobName || jobMap.get(String(item.job_rowid || '')) || '';
    return {
      ...item,
      userName,
      departmentName: depName,
      jobName,
    } as HrAttendanceApi.AttendanceRecord;
  });

  // 前端过滤
  if (params.q) {
    const q = String(params.q).trim().toLowerCase();
    return enriched.filter((item) => {
      // 先通过预计算的 userDjRowid 集合快速判断（人名/部门名/岗位名匹配）
      const userMatch = matchedUserDjRowids?.has(String(item.user_dj_rowid || ''));
      // 再检查考勤编号匹配
      const codeMatch = matchedAttendanceCodes?.has(String(item.attendance_code || ''));
      if (userMatch || codeMatch) return true;

      // 兜底：对 remark/status 做精确匹配（这些字段后端能搜，但为了统一走前端）
      const text = [item.remark, item.status]
        .filter(Boolean)
        .map(String)
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }

  return enriched;
}

export async function createAttendanceRecord(payload: HrAttendanceApi.AttendanceRecord) {
  const table = new DataTable(ATTENDANCE_INFO_FORM_KEY, ATTENDANCE_TABLE, ATTENDANCE_DB, ATTENDANCE_PK);
  await queryTable(table);

  const id = payload.id || newGuid();
  const row = {
    id,
    attendance_code: payload.attendance_code || createLocalCode('KQ'),
    user_dj_rowid: payload.user_dj_rowid,
    user_rowid: payload.user_rowid,
    dep_id: payload.dep_id,
    job_rowid: payload.job_rowid,
    attendance_date: payload.attendance_date,
    check_in_at: normalizeDateTimeForSave(payload.check_in_at) || null,
    check_in_type: payload.check_in_type || null,
    check_out_at: normalizeDateTimeForSave(payload.check_out_at) || null,
    check_out_type: payload.check_out_type || null,
    work_minutes: Number(payload.work_minutes || 0),
    status: payload.status || '正常',
    remark: payload.remark || null,
  };

  const res = await saveTable(table, [row], [], []);
  if (!res.success) throw new Error(res.error);

  return row;
}

export async function updateAttendanceRecord(id: string, payload: HrAttendanceApi.AttendanceRecord) {
  const table = new DataTable(ATTENDANCE_INFO_FORM_KEY, ATTENDANCE_TABLE, ATTENDANCE_DB, ATTENDANCE_PK);
  await queryTable(table);
  const patch: any = { id };
  [
    'attendance_code', 'user_dj_rowid', 'user_rowid', 'dep_id', 'job_rowid', 'attendance_date', 'check_in_at',
    'check_in_type', 'check_out_at', 'check_out_type', 'work_minutes', 'status', 'remark', 'description',
  ].forEach((key) => {
    if (key in payload) {
      if (key === 'work_minutes') patch[key] = Number(payload[key] || 0);
      else if (key === 'check_in_at' || key === 'check_out_at') patch[key] = normalizeDateTimeForSave(payload[key]);
      else patch[key] = payload[key];
    }
  });
  const res = await saveTable(table, [], [patch], []);
  if (!res.success) throw new Error(res.error);
  return patch;
}

export async function deleteAttendanceRecord(id: string) {
  const table = new DataTable(ATTENDANCE_INFO_FORM_KEY, ATTENDANCE_TABLE, ATTENDANCE_DB, ATTENDANCE_PK);
  await queryTable(table);
  const res = await saveTable(table, [], [], [{ id }]);
  if (!res.success) throw new Error(res.error);
  return true;
}

export async function listScheduleRules(params: { q?: string; status?: string } = {}) {
  const table = new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, RULE_TABLE, ATTENDANCE_DB, COMMON_PK);
  const filters: any[] = [];
  if (params.status && params.status !== 'all') filters.push(cond('status', 'equal', params.status));
  if (params.q) {
    const q = String(params.q).trim();
    if (q) filters.push(or(cond('rule_code', 'contains', q), cond('rule_name', 'contains', q)) as any);
  }
  if (filters.length === 1) table.Filter = filters[0] as any;
  else if (filters.length > 1) table.Filter = and(...filters) as any;

  const [rulesResult, deptResult, segmentResult, depRes] = await Promise.all([
    queryTable(table),
    queryTable(new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, RULE_DEPT_TABLE, ATTENDANCE_DB, COMMON_PK)),
    queryTable(new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, RULE_SEG_TABLE, ATTENDANCE_DB, COMMON_PK)),
    listBaseDepartInfo(),
  ]);

  const depNameMap = new Map((Array.isArray(depRes?.data) ? depRes.data : []).map((item: any) => [String(item.DepID || ''), String(item.DepName || '')]));
  return rulesResult.list.map((rule: any) => {
    const departments = deptResult.list
      .filter((dept: any) => String(dept.rule_id) === String(rule.id))
      .map((dept: any) => ({ depId: String(dept.dep_id), depName: depNameMap.get(String(dept.dep_id)) || String(dept.dep_id) }));
    const segments = segmentResult.list
      .filter((segment: any) => String(segment.rule_id) === String(rule.id))
      .sort((a: any, b: any) => Number(a.segment_no || 0) - Number(b.segment_no || 0));
    return { ...rule, departments, segments } as HrAttendanceApi.ScheduleRule;
  });
}

export async function createScheduleRule(payload: HrAttendanceApi.ScheduleRulePayload) {
  const table = new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, RULE_TABLE, ATTENDANCE_DB, COMMON_PK);
  await queryTable(table);
  const id = newGuid();
  const row: any = {
    id,
    rule_code: payload.rule_code || createLocalCode('PB'),
    rule_name: payload.rule_name,
    rule_type: payload.rule_type,
    flex_minutes: Number(payload.flex_minutes || 0),
    status: payload.status || '有效',
    remark: payload.remark || null,
    description: JSON.stringify({
      jobs: (payload as any).jobs || [],
      weekDays: (payload as any).weekDays || [],
    }),
  };

  const res = await saveTable(table, [row], [], []);
  if (!res.success) throw new Error(res.error);

  const deptTable = new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, RULE_DEPT_TABLE, ATTENDANCE_DB, COMMON_PK);
  const segmentTable = new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, RULE_SEG_TABLE, ATTENDANCE_DB, COMMON_PK);
  await Promise.all([queryTable(deptTable), queryTable(segmentTable)]);
  const deptRows = (payload.departments || []).map((depId) => ({ id: newGuid(), rule_id: id, dep_id: depId }));
  const segmentRows = (payload.segments || []).map((segment, index) => ({
    id: newGuid(),
    rule_id: id,
    segment_no: Number(segment.segment_no || index + 1),
    segment_type: segment.segment_type || 'work',
    start_time: segment.start_time,
    end_time: segment.end_time,
  }));
  if (deptRows.length) await saveTable(deptTable, deptRows, [], []);
  if (segmentRows.length) await saveTable(segmentTable, segmentRows, [], []);
  return row;
}

export async function updateScheduleRule(id: string, payload: HrAttendanceApi.ScheduleRulePayload) {
  const table = new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, RULE_TABLE, ATTENDANCE_DB, COMMON_PK);
  await queryTable(table);
  const patch: any = { id };
  ['rule_code', 'rule_name', 'rule_type', 'status', 'remark'].forEach((key) => {
    if (key in payload) patch[key] = (payload as any)[key];
  });
  if ('flex_minutes' in payload) patch.flex_minutes = Number(payload.flex_minutes || 0);
  if ((payload as any).jobs !== undefined || (payload as any).weekDays !== undefined) {
    patch.description = JSON.stringify({
      jobs: (payload as any).jobs || [],
      weekDays: (payload as any).weekDays || [],
    });
  }
  const res = await saveTable(table, [], [patch], []);
  if (!res.success) throw new Error(res.error);

  const deptTable = new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, RULE_DEPT_TABLE, ATTENDANCE_DB, COMMON_PK);
  const segmentTable = new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, RULE_SEG_TABLE, ATTENDANCE_DB, COMMON_PK);
  const [oldDepts, oldSegments] = await Promise.all([queryTable(deptTable), queryTable(segmentTable)]);
  const deletedDepts = oldDepts.list.filter((item: any) => String(item.rule_id) === String(id)).map((item: any) => ({ id: item.id }));
  const deletedSegments = oldSegments.list.filter((item: any) => String(item.rule_id) === String(id)).map((item: any) => ({ id: item.id }));
  if (deletedDepts.length) await saveTable(deptTable, [], [], deletedDepts);
  if (deletedSegments.length) await saveTable(segmentTable, [], [], deletedSegments);

  const deptRows = (payload.departments || []).map((depId) => ({ id: newGuid(), rule_id: id, dep_id: depId }));
  const segmentRows = (payload.segments || []).map((segment, index) => ({
    id: newGuid(),
    rule_id: id,
    segment_no: Number(segment.segment_no || index + 1),
    segment_type: segment.segment_type || 'work',
    start_time: segment.start_time,
    end_time: segment.end_time,
  }));
  if (deptRows.length) await saveTable(deptTable, deptRows, [], []);
  if (segmentRows.length) await saveTable(segmentTable, segmentRows, [], []);
  return patch;
}

export async function deleteScheduleRule(id: string) {
  const deptTable = new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, RULE_DEPT_TABLE, ATTENDANCE_DB, COMMON_PK);
  const segmentTable = new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, RULE_SEG_TABLE, ATTENDANCE_DB, COMMON_PK);
  const [oldDepts, oldSegments] = await Promise.all([queryTable(deptTable), queryTable(segmentTable)]);
  const deletedDepts = oldDepts.list.filter((item: any) => String(item.rule_id) === String(id)).map((item: any) => ({ id: item.id }));
  const deletedSegments = oldSegments.list.filter((item: any) => String(item.rule_id) === String(id)).map((item: any) => ({ id: item.id }));
  if (deletedDepts.length) await saveTable(deptTable, [], [], deletedDepts);
  if (deletedSegments.length) await saveTable(segmentTable, [], [], deletedSegments);

  const table = new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, RULE_TABLE, ATTENDANCE_DB, COMMON_PK);
  await queryTable(table);
  const res = await saveTable(table, [], [], [{ id }]);
  if (!res.success) throw new Error(res.error);
  return true;
}

export async function listHolidays() {
  const { list } = await queryTable(new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, HOLIDAY_TABLE, ATTENDANCE_DB, COMMON_PK));
  return list as HrAttendanceApi.Holiday[];
}

export async function createHoliday(payload: HrAttendanceApi.Holiday) {
  const table = new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, HOLIDAY_TABLE, ATTENDANCE_DB, COMMON_PK);
  await queryTable(table);
  const row = {
    id: payload.id || newGuid(),
    name: payload.name,
    startDate: payload.startDate,
    endDate: payload.endDate,
    days: payload.days,
    isDefault: payload.isDefault ?? 0,
  };
  const res = await saveTable(table, [row], [], []);
  if (!res.success) throw new Error(res.error);
  return row;
}

export async function deleteHoliday(id: string) {
  const table = new DataTable(ATTENDANCE_SCHEDULE_FORM_KEY, HOLIDAY_TABLE, ATTENDANCE_DB, COMMON_PK);
  await queryTable(table);
  const res = await saveTable(table, [], [], [{ id }]);
  if (!res.success) throw new Error(res.error);
  return true;
}
