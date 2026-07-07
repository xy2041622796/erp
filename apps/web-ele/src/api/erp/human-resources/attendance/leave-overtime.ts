import QB, { and, cond, DataColumn, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

import { listUserDjOptions } from './index';

export namespace HrLeaveOvertimeApi {
  export interface LeaveOvertime {
    id?: string;
    apply_no?: string | null;
    user_dj_rowid?: string;
    user_rowid?: string;
    dep_id?: string;
    job_rowid?: string;
    request_type?: string;
    start_at?: string;
    end_at?: string;
    duration_minutes?: number;
    reason?: string | null;
    status?: string;
    approve_user_rowid?: string | null;
    approve_at?: string | null;
    remark?: string | null;
    userName?: string;
    departmentName?: string;
    jobName?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    status?: string;
    type?: string;
  }
}

const HR_MIGRATION_FORM_KEY = '847D59BE6EAA2316724038FC117CAAD6';
const LEAVE_OVERTIME_FORM_KEY = HR_MIGRATION_FORM_KEY;
const DB_NAME = 'LMBill';
const TABLE_NAME = 'Bil_HR_Attendance_Leave_Overtime';
const PK = 'id';

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

async function queryTable(table: DataTable) {
  setQueryFields(table, [
    'id',
    'apply_no',
    'user_dj_rowid',
    'user_rowid',
    'dep_id',
    'job_rowid',
    'request_type',
    'start_at',
    'end_at',
    'duration_minutes',
    'reason',
    'status',
    'approve_user_rowid',
    'approve_at',
    'remark',
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
    'source_system',
    'source_table',
    'source_id',
    'migration_batch_no',
  ]);
  const req = table.getQueryParam('Table', table.Filter, [], [], 0, 0);
  const resQuery = await requestClient.post(table.queryUrl, req, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  return toItems(resQuery);
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
  const result = data?.Result ?? data?.result;
  return String(data?.Message || result?.Message || data?.msg || result?.msg || '').trim();
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

export async function listLeaveOvertime(params: HrLeaveOvertimeApi.QueryParams = {}) {
  const table = new DataTable(LEAVE_OVERTIME_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  const filters: any[] = [];
  if (params.status && params.status !== 'all') filters.push(cond('status', 'equal', params.status));
  if (params.type && params.type !== 'all') filters.push(cond('request_type', 'equal', params.type));
  if (params.q) {
    const q = String(params.q).trim();
    if (q) {
      // 关键词搜索全靠前端过滤
      // 后端不传过滤条件，因为人名/部门名/岗位名在后端只存 UUID
    }
  }
  if (filters.length === 1) table.Filter = filters[0] as any;
  else if (filters.length > 1) table.Filter = and(...filters) as any;

  const items = await queryTable(table);
  // 人员字典全量拉取，不随搜索关键词过滤
  const org = await listUserDjOptions({});
  const orgMap = new Map(org.map((item) => [String(item.userDjRowid), item]));
  const userRowidMap = new Map(org.map((item) => [String(item.userRowid), item]));

  // 预构建人名/部门名/岗位名匹配的 userDjRowid 集合
  let matchedUserDjRowids: Set<string> | null = null;
  let matchedApplyNos: Set<string> | null = null;

  if (params.q) {
    const q = String(params.q).trim().toLowerCase();
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
    matchedApplyNos = new Set(
      items
        .filter((item: any) => String(item.apply_no || '').toLowerCase().includes(q))
        .map((item: any) => String(item.apply_no))
    );
  }

  const enriched = items.map((item: any) => {
    const rel = orgMap.get(String(item.user_dj_rowid || ''));
    const userFallback = rel ? null : userRowidMap.get(String(item.user_rowid || ''));
    return {
      ...item,
      userName: rel?.userName || userFallback?.userName || '',
      departmentName: rel?.depName || '',
      jobName: rel?.jobName || '',
    } as HrLeaveOvertimeApi.LeaveOvertime;
  });

  // 前端过滤
  if (params.q) {
    const q = String(params.q).trim().toLowerCase();
    return enriched.filter((item) => {
      // 人名/部门名/岗位名匹配（通过预计算集合）
      const userMatch = matchedUserDjRowids?.has(String(item.user_dj_rowid || ''));
      // 申请编号匹配
      const applyMatch = matchedApplyNos?.has(String(item.apply_no || ''));
      if (userMatch || applyMatch) return true;

      // 兜底：对 reason/request_type/status 做精确匹配
      const text = [item.reason, item.request_type, item.status]
        .filter(Boolean)
        .map(String)
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }

  return enriched;
}

export async function createLeaveOvertime(payload: HrLeaveOvertimeApi.LeaveOvertime) {
  const table = new DataTable(LEAVE_OVERTIME_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await queryTable(table);

  const id = payload.id || newGuid();
  const row: HrLeaveOvertimeApi.LeaveOvertime = {
    id,
    apply_no: payload.apply_no || createLocalCode('QJJB'),
    user_dj_rowid: payload.user_dj_rowid,
    user_rowid: payload.user_rowid,
    dep_id: payload.dep_id,
    job_rowid: payload.job_rowid,
    request_type: payload.request_type,
    start_at: normalizeDateTimeForSave(payload.start_at),
    end_at: normalizeDateTimeForSave(payload.end_at),
    duration_minutes: Number(payload.duration_minutes || 0),
    reason: payload.reason || null,
    status: payload.status || '待审批',
    approve_user_rowid: payload.approve_user_rowid || null,
    approve_at: payload.approve_at || null,
    remark: payload.remark || null,
  };

  const res = await saveTable(table, [row], [], []);
  if (!res.success) throw new Error(res.error);

  return row;
}

export async function updateLeaveOvertime(id: string, payload: HrLeaveOvertimeApi.LeaveOvertime) {
  const table = new DataTable(LEAVE_OVERTIME_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await queryTable(table);
  const patch: any = { id };
  [
    'apply_no',
    'user_dj_rowid',
    'user_rowid',
    'dep_id',
    'job_rowid',
    'request_type',
    'start_at',
    'end_at',
    'duration_minutes',
    'reason',
    'status',
    'approve_user_rowid',
    'approve_at',
    'remark',
  ].forEach((key) => {
    if (key in payload) {
      if (key === 'duration_minutes') patch[key] = Number(payload[key] || 0);
      else if (key === 'start_at' || key === 'end_at' || key === 'approve_at') patch[key] = normalizeDateTimeForSave(payload[key]);
      else patch[key] = payload[key];
    }
  });
  const res = await saveTable(table, [], [patch], []);
  if (!res.success) throw new Error(res.error);
  return patch;
}

export async function deleteLeaveOvertime(id: string) {
  const table = new DataTable(LEAVE_OVERTIME_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await queryTable(table);
  const res = await saveTable(table, [], [], [{ id }]);
  if (!res.success) throw new Error(res.error);
  return true;
}
