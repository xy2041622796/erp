import type { PageParam } from '@vben/request';

import { useUserStore } from '@vben/stores';
import { buildUUID } from '@vben/utils';

import type { Staff } from '#/api/common/staff-selector';
import { getStaffById } from '#/api/common/staff-selector';
import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCurrentUserBoundDeptName } from '#/api/system/dept';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

const FORM_ID = 'F0BA18993242D85B7EF85D41BC65E030';
const TABLE_NAME = 'Bil_Customer_Follow_Record';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'rowid';
const CUSTOMER_TABLE_NAME = 'Bil_Customer_Info';
const LEAD_FORM_ID = '8FAE255B25E47CCF4A180A49750844F6';
const LEAD_TABLE_NAME = 'Bil_Customer_Lead';

export namespace CrmCustomerFollowRecordApi {
  export type BizType = 'CUSTOMER' | 'LEAD';

  export interface FollowRecord {
    id?: number | string;
    rowid?: number | string;
    bizType?: BizType | string;
    bizId?: number | string;
    bizCode?: string;
    bizName?: string;
    companyType?: number | string;
    customerId?: number | string;
    customerCode?: string;
    followTime?: string;
    followType?: string;
    followContent?: string;
    nextFollowTime?: string;
    nextFollowContent?: string;
    operatorUserId?: number | string;
    operatorUserName?: string;
    departId?: number | string;
    departName?: string;
    remark?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    accountSetId?: string;
    lingmaSysEnt?: string;
  }
}

function createFollowRecordTable() {
  const table = createFinanceDataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  table.Type = '数据库表';
  return table;
}

function createLeadTable() {
  const table = createFinanceDataTable(LEAD_FORM_ID, LEAD_TABLE_NAME, DB_NAME, PRIMARY_KEY);
  table.Type = '数据库表';
  return table;
}

function createCustomerTable() {
  const table = createFinanceDataTable(FORM_ID, CUSTOMER_TABLE_NAME, DB_NAME, PRIMARY_KEY);
  table.Type = '数据库表';
  return table;
}

function getCurrentUserInfo() {
  const userStore = useUserStore();
  const info: any = userStore.userInfo || {};
  const raw: any = info.rawUserInfo || {};
  return {
    userId: String(info.id || raw.ROWID || raw.rowid || '').trim(),
    userName: String(info.nickname || raw.UserName || raw.userName || info.username || '').trim(),
  };
}

async function getCurrentOperatorInfo() {
  const current = getCurrentUserInfo();
  let staff: null | Staff = null;
  if (current.userId) {
    try {
      staff = await getStaffById(current.userId);
    } catch (error) {
      console.error('获取当前登录人信息失败:', error);
    }
  }
  const deptName = String(staff?.DepName || '').trim() || (await getCurrentUserBoundDeptName());
  return {
    operatorUserId: current.userId,
    operatorUserName: String(staff?.UserName || current.userName || '').trim(),
    departId: String(staff?.DepID || '').trim(),
    departName: deptName,
  };
}

function mapRowToFollowRecord(item: any): CrmCustomerFollowRecordApi.FollowRecord {
  return {
    id: item.rowid,
    rowid: item.rowid,
    bizType: item.biz_type,
    bizId: item.biz_id,
    bizCode: item.biz_code,
    bizName: item.biz_name,
    companyType: item.company_type,
    customerId: item.customer_id,
    customerCode: item.customer_code,
    followTime: item.follow_time,
    followType: item.follow_type,
    followContent: item.follow_content,
    nextFollowTime: item.next_follow_time,
    nextFollowContent: item.next_follow_content,
    operatorUserId: item.operator_user_id,
    operatorUserName: item.operator_user_name,
    departId: item.depart_id,
    departName: item.depart_name,
    remark: item.remark,
    createuser: item.createuser,
    createtime: item.createtime,
    updateuser: item.updateuser,
    updatetime: item.updatetime,
    accountSetId: item.account_set_id,
    lingmaSysEnt: item.lingma_sys_ent,
  };
}

function mapFollowRecordToRow(data: CrmCustomerFollowRecordApi.FollowRecord) {
  const rowid = data.rowid ?? data.id ?? buildUUID();
  return {
    rowid,
    biz_type: data.bizType,
    biz_id: data.bizId,
    biz_code: data.bizCode,
    biz_name: data.bizName,
    company_type: data.companyType,
    customer_id: data.customerId,
    customer_code: data.customerCode,
    follow_time: data.followTime,
    follow_type: data.followType,
    follow_content: data.followContent,
    next_follow_time: data.nextFollowTime || null,
    next_follow_content: data.nextFollowContent,
    operator_user_id: data.operatorUserId,
    operator_user_name: data.operatorUserName,
    depart_id: data.departId,
    depart_name: data.departName,
    remark: data.remark,
    account_set_id: data.accountSetId,
    lingma_sys_ent: data.lingmaSysEnt,
  };
}

function compareDateDesc(a?: string, b?: string) {
  const aTime = a ? new Date(a).getTime() : 0;
  const bTime = b ? new Date(b).getTime() : 0;
  return bTime - aTime;
}

function paginate<T>(list: T[], pageNo = 1, page = 20) {
  const start = Math.max(pageNo - 1, 0) * page;
  return list.slice(start, start + page);
}

async function queryFollowRows(params: Record<string, any>) {
  const table = createFollowRecordTable();
  const conditions: any[] = [];
  if (params.bizType) conditions.push(cond('biz_type', 'equal', params.bizType));
  if (params.bizId) conditions.push(cond('biz_id', 'equal', params.bizId));
  if (params.customerId) conditions.push(cond('customer_id', 'equal', params.customerId));
  if (params.customerCode) conditions.push(cond('customer_code', 'equal', params.customerCode));
  if (params.followType) conditions.push(cond('follow_type', 'contains', params.followType));
  if (params.operatorUserName) conditions.push(cond('operator_user_name', 'contains', params.operatorUserName));
  if (params.followTimeStart) conditions.push(cond('follow_time', 'greaterthanorequal', params.followTimeStart));
  if (params.followTimeEnd) conditions.push(cond('follow_time', 'lessthanorequal', params.followTimeEnd));
  if (conditions.length > 0) table.Filter = and(...conditions);
  const queryParam: any = { Table: [table], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const items = (resQuery?.data?.Result?.data?.Items || []).map((item: any) => mapRowToFollowRecord(item));
  items.sort((a: CrmCustomerFollowRecordApi.FollowRecord, b: CrmCustomerFollowRecordApi.FollowRecord) => compareDateDesc(a.followTime, b.followTime));
  return { table, items };
}

async function syncLeadFollowSummary(leadId?: number | string) {
  const normalizedLeadId = String(leadId || '').trim();
  if (!normalizedLeadId) return;
  const latest = (await queryFollowRows({ bizType: 'LEAD', bizId: normalizedLeadId })).items[0];
  const table = createLeadTable();
  const saveParam = table.getSaveParam([], [{
    rowid: normalizedLeadId,
    last_follow_time: latest?.followTime || null,
    next_follow_time: latest?.nextFollowTime || null,
    last_follow_content: latest?.followContent || '',
  }], []);
  await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
}

async function syncCustomerFollowSummary(customerId?: number | string) {
  const normalizedCustomerId = String(customerId || '').trim();
  if (!normalizedCustomerId) return;
  const latest = (await queryFollowRows({ bizType: 'CUSTOMER', bizId: normalizedCustomerId })).items[0];
  const table = createCustomerTable();
  const saveParam = table.getSaveParam([], [{
    rowid: normalizedCustomerId,
    last_follow_time: latest?.followTime || null,
    next_follow_time: latest?.nextFollowTime || null,
    last_follow_content: latest?.followContent || '',
  }], []);
  await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
}

async function syncFollowSummaryByRecord(record?: CrmCustomerFollowRecordApi.FollowRecord | null) {
  if (!record) return;
  const bizType = String(record.bizType || '').trim();
  if (bizType === 'LEAD') {
    await syncLeadFollowSummary(record.bizId || record.customerId);
    return;
  }
  if (bizType === 'CUSTOMER') {
    await syncCustomerFollowSummary(record.bizId || record.customerId);
  }
}

export async function getFollowRecordPage(params: PageParam & Record<string, any>) {
  const { table, items } = await queryFollowRows(params);
  const returnData = new clientData();
  returnData.dataTable = table;
  const pageNo = Number(params.pageNo || 1);
  const page = Number(params.page || items.length || 20);
  returnData.list = paginate(items, pageNo, page);
  returnData.total = items.length;
  return returnData as any;
}

export async function getSubjectFollowTimelinePage(params: {
  leadId?: number | string;
  customerId?: number | string;
  customerCode?: string;
  pageNo?: number;
  page?: number;
}) {
  const leadList = params.leadId ? (await queryFollowRows({ bizType: 'LEAD', bizId: params.leadId })).items : [];
  const customerList = params.customerId
    ? (await queryFollowRows({ bizType: 'CUSTOMER', bizId: params.customerId, customerId: params.customerId, customerCode: params.customerCode })).items
    : [];
  const merged = [...leadList, ...customerList].sort((a, b) => compareDateDesc(a.followTime, b.followTime));
  const pageNo = Number(params.pageNo || 1);
  const page = Number(params.page || 20);
  return {
    list: paginate(merged, pageNo, page),
    total: merged.length,
    hasMore: merged.length > pageNo * page,
  };
}

export async function getFollowRecord(id: number | string) {
  const table = createFollowRecordTable();
  table.Filter = and(cond('rowid', 'equal', id));
  const queryParam: any = { Table: [table], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const items = resQuery?.data?.Result?.data?.Items || [];
  return items[0] ? mapRowToFollowRecord(items[0]) : null;
}

export async function createFollowRecord(data: CrmCustomerFollowRecordApi.FollowRecord) {
  const operator = await getCurrentOperatorInfo();
  const payload: CrmCustomerFollowRecordApi.FollowRecord = {
    ...data,
    bizType: String(data.bizType || 'CUSTOMER').trim() as any,
    bizId: data.bizId || data.customerId,
    bizCode: data.bizCode || data.customerCode,
    bizName: data.bizName,
    customerId: data.customerId || (String(data.bizType || 'CUSTOMER') === 'CUSTOMER' ? data.bizId : undefined),
    customerCode: data.customerCode,
    operatorUserId: data.operatorUserId || operator.operatorUserId,
    operatorUserName: data.operatorUserName || operator.operatorUserName,
    departId: data.departId || operator.departId,
    departName: data.departName || operator.departName,
  };
  const table = createFollowRecordTable();
  const saveParam = table.getSaveParam([mapFollowRecordToRow(payload)], [], []);
  const response = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  await syncFollowSummaryByRecord(payload);
  return response;
}

export async function updateFollowRecord(data: CrmCustomerFollowRecordApi.FollowRecord) {
  const previous = data.rowid || data.id ? await getFollowRecord(String(data.rowid || data.id)) : null;
  const table = createFollowRecordTable();
  const saveParam = table.getSaveParam([], [mapFollowRecordToRow(data)], []);
  const response = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  await syncFollowSummaryByRecord(previous);
  await syncFollowSummaryByRecord(data);
  return response;
}

export async function deleteFollowRecord(id: number | string) {
  const previous = await getFollowRecord(id);
  const table = createFollowRecordTable();
  const saveParam = table.getSaveParam([], [], [{ rowid: id }]);
  const response = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  await syncFollowSummaryByRecord(previous);
  return response;
}
