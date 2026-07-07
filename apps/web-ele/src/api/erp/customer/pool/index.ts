import type { PageParam } from '@vben/request';

import type { Staff } from '#/api/common/staff-selector';

import { useUserStore } from '@vben/stores';
import { buildUUID } from '@vben/utils';

import { exportExcelByConfig } from '#/api/common/import-export';
import { getStaffById } from '#/api/common/staff-selector';
import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCurrentUserBoundDeptInfo } from '#/api/system/dept';

import { createFinanceDataTable } from '../../finance/common/account-set-scope';
import { getParticipantLeadIds } from '../lead/participant';

export const LEAD_FORM_ID = '8FAE255B25E47CCF4A180A49750844F6';
export const POOL_FORM_ID = '0513E8B6E169262820843EDAAB4B7FF8';
export const DB_NAME = 'LMBill';
export const LEAD_TABLE_NAME = 'Bil_Customer_Lead';
export const POOL_LOG_TABLE_NAME = 'Bil_Customer_Lead_Pool_Log';
const LEAD_PRIMARY_KEY = 'rowid';
const POOL_LOG_PRIMARY_KEY = 'rowid';
const EXPORT_ENCODING_ID = '65220F172723157F45B4C94AAB011CD9';
const EXPORT_FILE_NAME = '线索公海导出';

export namespace CrmCustomerPoolApi {
  export type PoolOperateType =
    | 'CONVERT_TO_CUSTOMER'
    | 'DISTRIBUTE'
    | 'IN_POOL'
    | 'OUT_POOL'
    | 'RECEIVE'
    | 'TRANSFER';

  export interface PoolLead {
    id?: number | string;
    rowid?: number | string;
    leadId?: number | string;
    leadCode?: string;
    leadName?: string;
    customerName?: string;
    contactName?: string;
    mobile?: string;
    phone?: string;
    email?: string;
    sourceChannel?: string;
    region?: string;
    regionCode?: string;
    intentLevel?: number | string;
    leadStatus?: number | string;
    isPool?: number;
    poolTime?: string;
    poolReason?: string;
    lastFollowTime?: string;
    nextFollowTime?: string;
    lastFollowContent?: string;
    ownerUserId?: number | string;
    ownerUserName?: string;
    departId?: number | string;
    departName?: string;
    beforeOwnerUserId?: number | string;
    beforeOwnerUserName?: string;
    beforeDepartId?: number | string;
    beforeDepartName?: string;
    customerId?: number | string;
    customerCode?: string;
    convertTime?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    lingmaSysEnt?: string;
    accountSetId?: string;
  }

  export interface PoolLog {
    id?: number | string;
    rowid?: number | string;
    leadId?: number | string;
    leadCode?: string;
    leadName?: string;
    companyType?: number | string;
    beforeOwnerUserId?: number | string;
    beforeOwnerUserName?: string;
    afterOwnerUserId?: number | string;
    afterOwnerUserName?: string;
    beforeDepartId?: number | string;
    beforeDepartName?: string;
    afterDepartId?: number | string;
    afterDepartName?: string;
    operateType?: PoolOperateType | string;
    reason?: string;
    operateTime?: string;
    operatorUserId?: number | string;
    operatorUserName?: string;
    customerId?: number | string;
    customerCode?: string;
    accountSetId?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    lingmaSysIsDelete?: number;
    lingmaSysEnt?: string;
  }

  export interface PoolOwnerUserInfo {
    ownerUserId?: number | string;
    ownerUserName?: string;
    departId?: number | string;
    departName?: string;
  }

  export interface PutLeadsToPoolReqVO {
    ids: Array<number | string>;
    reason?: string;
    poolTime?: string;
  }
}

function createLeadSideLeadTable() {
  const table = createFinanceDataTable(
    LEAD_FORM_ID,
    LEAD_TABLE_NAME,
    DB_NAME,
    LEAD_PRIMARY_KEY,
  );
  table.Type = '数据库表';
  return table;
}

function createLeadSidePoolLogTable() {
  const table = createFinanceDataTable(
    LEAD_FORM_ID,
    POOL_LOG_TABLE_NAME,
    DB_NAME,
    POOL_LOG_PRIMARY_KEY,
  );
  table.Type = '数据库表';
  return table;
}

function createPoolLeadTable() {
  const table = createFinanceDataTable(
    POOL_FORM_ID,
    LEAD_TABLE_NAME,
    DB_NAME,
    LEAD_PRIMARY_KEY,
  );
  table.Type = '数据库表';
  return table;
}

function createPoolLogTable() {
  const table = createFinanceDataTable(
    POOL_FORM_ID,
    POOL_LOG_TABLE_NAME,
    DB_NAME,
    POOL_LOG_PRIMARY_KEY,
  );
  table.Type = '数据库表';
  return table;
}

function formatDateTimeValue(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  const second = `${date.getSeconds()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function normalizeIds(ids: Array<number | string>) {
  return [
    ...new Set(
      (ids || []).map((item) => String(item ?? '').trim()).filter(Boolean),
    ),
  ];
}

function getUserNameFallback() {
  const userStore = useUserStore();
  const info: any = userStore.userInfo || {};
  const raw: any = info.rawUserInfo || {};
  return String(
    info.nickname || raw.UserName || raw.userName || info.username || '',
  ).trim();
}

function getCurrentUserId() {
  const userStore = useUserStore();
  const info: any = userStore.userInfo || {};
  const raw: any = info.rawUserInfo || {};
  return String(info.id || raw.ROWID || raw.rowid || '').trim();
}

async function getCurrentOwnerUserInfo(): Promise<CrmCustomerPoolApi.PoolOwnerUserInfo> {
  const currentUserId = getCurrentUserId();
  const fallbackName = getUserNameFallback();
  let staff: null | Staff = null;
  if (currentUserId) {
    try {
      staff = await getStaffById(currentUserId);
    } catch (error) {
      console.error('获取当前登录人信息失败:', error);
    }
  }
  const deptInfo = await getCurrentUserBoundDeptInfo();
  const deptName = String(staff?.DepName || '').trim() || deptInfo.deptName;
  return {
    ownerUserId: currentUserId,
    ownerUserName: String(staff?.UserName || fallbackName || '').trim(),
    departId: String(staff?.DepID || deptInfo.deptId || '').trim(),
    departName: String(deptName || '').trim(),
  };
}

async function normalizeOwnerUserInfo(
  ownerUserInfo?: CrmCustomerPoolApi.PoolOwnerUserInfo,
) {
  const userId = String(ownerUserInfo?.ownerUserId ?? '').trim();
  let staff: null | Staff = null;
  if (userId) {
    try {
      staff = await getStaffById(userId);
    } catch (error) {
      console.error('获取负责人信息失败:', error);
    }
  }
  return {
    ownerUserId: userId,
    ownerUserName: String(
      ownerUserInfo?.ownerUserName || staff?.UserName || '',
    ).trim(),
    departId: String(ownerUserInfo?.departId || staff?.DepID || '').trim(),
    departName: String(
      ownerUserInfo?.departName || staff?.DepName || '',
    ).trim(),
  } as CrmCustomerPoolApi.PoolOwnerUserInfo;
}

function buildLeadOwnerUserInfo(
  item: any,
): CrmCustomerPoolApi.PoolOwnerUserInfo {
  return {
    ownerUserId: String(item?.owner_user_id || item?.ownerUserId || '').trim(),
    ownerUserName: String(
      item?.ownerUserName || item?.owner_user_name || '',
    ).trim(),
    departId: String(item?.depart_id || item?.departId || '').trim(),
    departName: String(item?.depart_name || item?.departName || '').trim(),
  };
}

function hasOwnerUserInfo(ownerInfo?: CrmCustomerPoolApi.PoolOwnerUserInfo) {
  return !!String(ownerInfo?.ownerUserId || '').trim();
}

export function mapRowToPoolLead(item: any): CrmCustomerPoolApi.PoolLead {
  return {
    id: item.rowid,
    rowid: item.rowid,
    leadId: item.rowid,
    leadCode: item.lead_code,
    leadName: item.lead_name,
    customerName: item.customer_name,
    contactName: item.contact_name,
    mobile: item.mobile,
    phone: item.phone,
    email: item.email,
    sourceChannel: item.source_channel,
    region: item.region,
    regionCode: item.regionCode,
    intentLevel: item.intent_level,
    leadStatus: item.lead_status,
    isPool: Number(item.is_pool || 0),
    poolTime: item.pool_time,
    poolReason: item.pool_reason,
    lastFollowTime: item.last_follow_time,
    nextFollowTime: item.next_follow_time,
    lastFollowContent: item.last_follow_content,
    ownerUserId: item.owner_user_id,
    ownerUserName: item.ownerUserName,
    departId: item.depart_id,
    departName: item.depart_name,
    beforeOwnerUserId: item.owner_user_id,
    beforeOwnerUserName: item.ownerUserName,
    beforeDepartId: item.depart_id,
    beforeDepartName: item.depart_name,
    customerId: item.customer_id,
    customerCode: item.customer_code,
    convertTime: item.convert_time,
    createuser: item.createuser,
    createtime: item.createtime,
    updateuser: item.updateuser,
    updatetime: item.updatetime,
    lingmaSysEnt: item.lingma_sys_ent,
    accountSetId: item.account_set_id,
  };
}

export function mapPoolLogToRow(data: CrmCustomerPoolApi.PoolLog): any {
  return {
    rowid: data.rowid ?? data.id ?? buildUUID(),
    lead_id: data.leadId,
    lead_code: data.leadCode,
    lead_name: data.leadName,
    company_type: data.companyType ?? 1,
    before_owner_user_id: data.beforeOwnerUserId,
    before_owner_user_name: data.beforeOwnerUserName,
    after_owner_user_id: data.afterOwnerUserId,
    after_owner_user_name: data.afterOwnerUserName,
    before_depart_id: data.beforeDepartId,
    before_depart_name: data.beforeDepartName,
    after_depart_id: data.afterDepartId,
    after_depart_name: data.afterDepartName,
    operate_type: data.operateType,
    reason: data.reason,
    operate_time: data.operateTime,
    operator_user_id: data.operatorUserId,
    operator_user_name: data.operatorUserName,
    customer_id: data.customerId,
    customer_code: data.customerCode,
    account_set_id: data.accountSetId,
    createuser: data.createuser,
    createtime: data.createtime,
    updateuser: data.updateuser,
    updatetime: data.updatetime,
    lingma_sys_is_delete: data.lingmaSysIsDelete ?? 0,
    lingma_sys_ent: data.lingmaSysEnt,
  };
}

function buildPoolSearchConditions(params: any) {
  const conditions: any[] = [
    cond('is_pool', 'equal', 1),
    cond('lead_status', 'equal', 1),
  ];
  if (params.leadCode)
    conditions.push(cond('lead_code', 'contains', params.leadCode));
  if (params.leadName)
    conditions.push(cond('lead_name', 'contains', params.leadName));
  if (params.customerName)
    conditions.push(cond('customer_name', 'contains', params.customerName));
  if (params.contactName)
    conditions.push(cond('contact_name', 'contains', params.contactName));
  if (params.regionCodePrefix)
    conditions.push(cond('regionCode', 'startswith', params.regionCodePrefix));
  if (params.ownerUserName)
    conditions.push(cond('ownerUserName', 'contains', params.ownerUserName));
  if (params.poolReason)
    conditions.push(cond('pool_reason', 'contains', params.poolReason));
  if (params.poolTimeStart)
    conditions.push(
      cond('pool_time', 'greaterthanorequal', params.poolTimeStart),
    );
  if (params.poolTimeEnd)
    conditions.push(cond('pool_time', 'lessthanorequal', params.poolTimeEnd));
  if (params.lastFollowTimeStart)
    conditions.push(
      cond(
        'last_follow_time',
        'greaterthanorequal',
        params.lastFollowTimeStart,
      ),
    );
  if (params.lastFollowTimeEnd)
    conditions.push(
      cond('last_follow_time', 'lessthanorequal', params.lastFollowTimeEnd),
    );
  return conditions;
}

async function queryLeadSideLeadsByIds(ids: Array<number | string>) {
  const normalizedIds = normalizeIds(ids);
  if (normalizedIds.length === 0)
    return { items: [] as any[], table: createLeadSideLeadTable() };
  const leadTable = createLeadSideLeadTable();
  leadTable.Filter = and(cond('rowid', 'in', normalizedIds));
  const queryParam = {
    Table: [leadTable],
    PageParam: { page: 0, index: 1 },
  } as any;
  const resQuery = await requestClient.post(leadTable.queryUrl, queryParam, {
    headers: leadTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  leadTable.execQueryResult(resQuery);
  const items = (resQuery?.data?.Result?.data?.Items || []) as any[];
  return { items, table: leadTable };
}

async function queryPoolLeadsByIds(ids: Array<number | string>) {
  const normalizedIds = normalizeIds(ids);
  if (normalizedIds.length === 0)
    return { items: [] as any[], table: createPoolLeadTable() };
  const leadTable = createPoolLeadTable();
  leadTable.Filter = and(cond('rowid', 'in', normalizedIds));
  const queryParam = {
    Table: [leadTable],
    PageParam: { page: 0, index: 1 },
  } as any;
  const resQuery = await requestClient.post(leadTable.queryUrl, queryParam, {
    headers: leadTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  leadTable.execQueryResult(resQuery);
  const items = (resQuery?.data?.Result?.data?.Items || []) as any[];
  return { items, table: leadTable };
}

function ensureSameCount(expected: string[], actual: any[]) {
  if (actual.length !== expected.length)
    throw new Error('存在不存在的线索记录，操作已中止');
}

async function createLeadSidePoolLogEntries(
  logs: CrmCustomerPoolApi.PoolLog[],
) {
  if (logs.length === 0) return;
  const poolLogTable = createLeadSidePoolLogTable();
  const saveParam = poolLogTable.getSaveParam(
    logs.map((item) => mapPoolLogToRow(item)),
    [],
    [],
  );
  await requestClient.post(poolLogTable.saveUrl, saveParam, {
    headers: poolLogTable.getRequestHeader(),
    responseReturn: 'raw',
  });
}

async function createPoolLogEntries(logs: CrmCustomerPoolApi.PoolLog[]) {
  if (logs.length === 0) return;
  const poolLogTable = createPoolLogTable();
  const saveParam = poolLogTable.getSaveParam(
    logs.map((item) => mapPoolLogToRow(item)),
    [],
    [],
  );
  await requestClient.post(poolLogTable.saveUrl, saveParam, {
    headers: poolLogTable.getRequestHeader(),
    responseReturn: 'raw',
  });
}

async function saveLeadSideLeadChanges(leadTable: any, changedRows: any[]) {
  if (changedRows.length === 0) return;
  const saveParam = leadTable.getSaveParam([], changedRows, []);
  await requestClient.post(leadTable.saveUrl, saveParam, {
    headers: leadTable.getRequestHeader(),
    responseReturn: 'raw',
  });
}

async function savePoolLeadChanges(leadTable: any, changedRows: any[]) {
  if (changedRows.length === 0) return;
  const saveParam = leadTable.getSaveParam([], changedRows, []);
  await requestClient.post(leadTable.saveUrl, saveParam, {
    headers: leadTable.getRequestHeader(),
    responseReturn: 'raw',
  });
}

export async function appendPoolLog(log: CrmCustomerPoolApi.PoolLog) {
  await createLeadSidePoolLogEntries([log]);
}

export async function getPoolOwnerDefaultByIds(ids: Array<number | string>) {
  const normalizedIds = normalizeIds(ids);
  const currentOwner = await getCurrentOwnerUserInfo();
  if (normalizedIds.length === 0) return currentOwner;

  const { items } = await queryPoolLeadsByIds(normalizedIds);
  if (items.length === 0) return currentOwner;

  const ownerInfos = items
    .map((item) => buildLeadOwnerUserInfo(item))
    .filter((ownerInfo) => hasOwnerUserInfo(ownerInfo));
  if (ownerInfos.length === 0) return currentOwner;

  if (normalizedIds.length === 1) {
    return await normalizeOwnerUserInfo(ownerInfos[0]);
  }

  const firstOwnerId = String(ownerInfos[0].ownerUserId || '').trim();
  const sameOwner = ownerInfos.every(
    (item) => String(item.ownerUserId || '').trim() === firstOwnerId,
  );
  if (!sameOwner) return currentOwner;

  return await normalizeOwnerUserInfo(ownerInfos[0]);
}

export async function getPoolCustomerPage(
  params: PageParam & Record<string, any>,
) {
  const leadTable = createPoolLeadTable();
  const currentUserId = getCurrentUserId();
  const sceneType = String(params.sceneType || '1');
  const baseConditions = buildPoolSearchConditions(params as any);

  if (sceneType === '2') {
    if (!currentUserId) {
      const ClientDataCtor = clientData as any;
      const empty = new ClientDataCtor();
      empty.dataTable = leadTable;
      empty.list = [];
      empty.total = 0;
      return empty as any;
    }
    const participantLeadIds = await getParticipantLeadIds(currentUserId);
    if (participantLeadIds.length === 0) {
      const ClientDataCtor = clientData as any;
      const empty = new ClientDataCtor();
      empty.dataTable = leadTable;
      empty.list = [];
      empty.total = 0;
      return empty as any;
    }
    baseConditions.push(cond('rowid', 'in', participantLeadIds));
  }

  leadTable.Filter = and(...baseConditions);
  const queryParam: any = {
    Table: [leadTable],
    PageParam: {
      page: (params as any).page || 0,
      index: (params as any).pageNo || 1,
    },
  };
  const resQuery = await requestClient.post(leadTable.queryUrl, queryParam, {
    headers: leadTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  leadTable.execQueryResult(resQuery);
  const ClientDataCtor = clientData as any;
  const returnData = new ClientDataCtor();
  returnData.dataTable = leadTable;
  returnData.list = (resQuery?.data?.Result?.data?.Items || []).map(
    (item: any) => mapRowToPoolLead(item),
  );
  returnData.total = resQuery?.data?.Result?.data?.Count || 0;
  return returnData as any;
}

export async function exportPoolCustomers(params: any) {
  return await exportExcelByConfig({
    formId: POOL_FORM_ID,
    tableName: LEAD_TABLE_NAME,
    dbName: DB_NAME,
    primaryKey: LEAD_PRIMARY_KEY,
    fileName: EXPORT_FILE_NAME,
    encodingId: EXPORT_ENCODING_ID,
    extraData: {
      is_pool: 1,
      lead_status: 1,
      leadCode: params?.leadCode,
      leadName: params?.leadName,
      customerName: params?.customerName,
      contactName: params?.contactName,
      ownerUserName: params?.ownerUserName,
      poolReason: params?.poolReason,
      poolTimeStart: params?.poolTimeStart,
      poolTimeEnd: params?.poolTimeEnd,
      lastFollowTimeStart: params?.lastFollowTimeStart,
      lastFollowTimeEnd: params?.lastFollowTimeEnd,
    },
  });
}

export async function receivePoolCustomers(ids: Array<number | string>) {
  const normalizedIds = normalizeIds(ids);
  if (normalizedIds.length === 0) throw new Error('请选择线索公海数据');
  const { items, table } = await queryPoolLeadsByIds(normalizedIds);
  ensureSameCount(normalizedIds, items);
  const currentPoolItems = items.filter(
    (item) =>
      Number(item.is_pool || 0) === 1 && Number(item.lead_status || 0) === 1,
  );
  if (currentPoolItems.length !== normalizedIds.length)
    throw new Error('仅线索公海数据允许领取');
  const currentOwner = await getCurrentOwnerUserInfo();
  if (!currentOwner.ownerUserId || !currentOwner.ownerUserName)
    throw new Error('未获取到当前登录人信息，无法领取');
  const operateTime = formatDateTimeValue();
  await savePoolLeadChanges(
    table,
    currentPoolItems.map((item) => ({
      rowid: item.rowid,
      is_pool: 0,
      lead_status: 1,
      owner_user_id: currentOwner.ownerUserId,
      ownerUserName: currentOwner.ownerUserName,
      depart_id: currentOwner.departId,
      depart_name: currentOwner.departName,
    })),
  );
  await createPoolLogEntries(
    currentPoolItems.map((item) => ({
      leadId: item.rowid,
      leadCode: item.lead_code,
      leadName: item.lead_name,
      companyType: item.company_type,
      beforeOwnerUserId: item.owner_user_id,
      beforeOwnerUserName: item.ownerUserName,
      afterOwnerUserId: currentOwner.ownerUserId,
      afterOwnerUserName: currentOwner.ownerUserName,
      beforeDepartId: item.depart_id,
      beforeDepartName: item.depart_name,
      afterDepartId: currentOwner.departId,
      afterDepartName: currentOwner.departName,
      operateType: 'RECEIVE',
      reason: '领取线索公海',
      operateTime,
      operatorUserId: currentOwner.ownerUserId,
      operatorUserName: currentOwner.ownerUserName,
      customerId: item.customer_id,
      customerCode: item.customer_code,
      accountSetId: item.account_set_id,
      lingmaSysEnt: item.lingma_sys_ent,
    })),
  );
}

export async function distributePoolCustomers(
  ids: Array<number | string>,
  ownerUserInfo: CrmCustomerPoolApi.PoolOwnerUserInfo,
) {
  const normalizedIds = normalizeIds(ids);
  if (normalizedIds.length === 0) throw new Error('请选择线索公海数据');
  const { items, table } = await queryPoolLeadsByIds(normalizedIds);
  ensureSameCount(normalizedIds, items);
  const currentPoolItems = items.filter(
    (item) =>
      Number(item.is_pool || 0) === 1 && Number(item.lead_status || 0) === 1,
  );
  if (currentPoolItems.length !== normalizedIds.length)
    throw new Error('仅线索公海数据允许分配');
  const targetOwner = await normalizeOwnerUserInfo(ownerUserInfo);
  if (!targetOwner.ownerUserId || !targetOwner.ownerUserName)
    throw new Error('请选择负责人');
  const operatorInfo = await getCurrentOwnerUserInfo();
  const operateTime = formatDateTimeValue();
  await savePoolLeadChanges(
    table,
    currentPoolItems.map((item) => ({
      rowid: item.rowid,
      is_pool: 0,
      lead_status: 1,
      owner_user_id: targetOwner.ownerUserId,
      ownerUserName: targetOwner.ownerUserName,
      depart_id: targetOwner.departId,
      depart_name: targetOwner.departName,
    })),
  );
  await createPoolLogEntries(
    currentPoolItems.map((item) => ({
      leadId: item.rowid,
      leadCode: item.lead_code,
      leadName: item.lead_name,
      companyType: item.company_type,
      beforeOwnerUserId: item.owner_user_id,
      beforeOwnerUserName: item.ownerUserName,
      afterOwnerUserId: targetOwner.ownerUserId,
      afterOwnerUserName: targetOwner.ownerUserName,
      beforeDepartId: item.depart_id,
      beforeDepartName: item.depart_name,
      afterDepartId: targetOwner.departId,
      afterDepartName: targetOwner.departName,
      operateType: 'DISTRIBUTE',
      reason: '分配线索公海并移出公海',
      operateTime,
      operatorUserId: operatorInfo.ownerUserId,
      operatorUserName: operatorInfo.ownerUserName,
      customerId: item.customer_id,
      customerCode: item.customer_code,
      accountSetId: item.account_set_id,
      lingmaSysEnt: item.lingma_sys_ent,
    })),
  );
}

export async function putCustomersToPool(
  data: CrmCustomerPoolApi.PutLeadsToPoolReqVO,
) {
  const normalizedIds = normalizeIds(data.ids);
  if (normalizedIds.length === 0) throw new Error('请选择线索');
  const { items, table } = await queryLeadSideLeadsByIds(normalizedIds);
  ensureSameCount(normalizedIds, items);
  const invalidItems = items.filter(
    (item) => Number(item.lead_status || 0) !== 1,
  );
  if (invalidItems.length > 0) throw new Error('仅跟进中的线索允许进入公海');
  const operatorInfo = await getCurrentOwnerUserInfo();
  const operateTime =
    String(data.poolTime || '').trim() || formatDateTimeValue();
  const poolReason =
    String(data.reason || '').trim() || '跟进不了，转入线索公海';
  await saveLeadSideLeadChanges(
    table,
    items.map((item) => ({
      rowid: item.rowid,
      is_pool: 1,
      lead_status: 1,
      pool_time: operateTime,
      pool_reason: poolReason,
    })),
  );
  await createLeadSidePoolLogEntries(
    items.map((item) => ({
      leadId: item.rowid,
      leadCode: item.lead_code,
      leadName: item.lead_name,
      companyType: item.company_type,
      beforeOwnerUserId: item.owner_user_id,
      beforeOwnerUserName: item.ownerUserName,
      afterOwnerUserId: item.owner_user_id,
      afterOwnerUserName: item.ownerUserName,
      beforeDepartId: item.depart_id,
      beforeDepartName: item.depart_name,
      afterDepartId: item.depart_id,
      afterDepartName: item.depart_name,
      operateType: 'IN_POOL',
      reason: poolReason,
      operateTime,
      operatorUserId: operatorInfo.ownerUserId,
      operatorUserName: operatorInfo.ownerUserName,
      customerId: item.customer_id,
      customerCode: item.customer_code,
      accountSetId: item.account_set_id,
      lingmaSysEnt: item.lingma_sys_ent,
    })),
  );
}

export async function getCustomerPoolLogPage(params: {
  customerId?: number | string;
  leadId?: number | string;
  pageNo?: number;
  page?: number;
}) {
  const poolLogTable = createPoolLogTable();
  const leadId = String(params.leadId || params.customerId || '').trim();
  poolLogTable.Filter = and(cond('lead_id', 'equal', leadId));
  const queryParam = {
    Table: [poolLogTable],
    PageParam: {
      page: params.page || 10,
      index: params.pageNo || 1,
    },
  } as any;
  const resQuery = await requestClient.post(poolLogTable.queryUrl, queryParam, {
    headers: poolLogTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  poolLogTable.execQueryResult(resQuery);
  const ClientDataCtor = clientData as any;
  const returnData = new ClientDataCtor();
  returnData.dataTable = poolLogTable;
  returnData.list = (resQuery?.data?.Result?.data?.Items || []).map(
    (item: any) => ({
      id: item.rowid,
      rowid: item.rowid,
      leadId: item.lead_id,
      leadCode: item.lead_code,
      leadName: item.lead_name,
      companyType: item.company_type,
      beforeOwnerUserId: item.before_owner_user_id,
      beforeOwnerUserName: item.before_owner_user_name,
      afterOwnerUserId: item.after_owner_user_id,
      afterOwnerUserName: item.after_owner_user_name,
      beforeDepartId: item.before_depart_id,
      beforeDepartName: item.before_depart_name,
      afterDepartId: item.after_depart_id,
      afterDepartName: item.after_depart_name,
      operateType: item.operate_type,
      reason: item.reason,
      operateTime: item.operate_time,
      operatorUserId: item.operator_user_id,
      operatorUserName: item.operator_user_name,
      customerId: item.customer_id,
      customerCode: item.customer_code,
      accountSetId: item.account_set_id,
      createuser: item.createuser,
      createtime: item.createtime,
      updateuser: item.updateuser,
      updatetime: item.updatetime,
      lingmaSysIsDelete: item.lingma_sys_is_delete,
      lingmaSysEnt: item.lingma_sys_ent,
    }),
  );
  returnData.total = resQuery?.data?.Result?.data?.Count || 0;
  return returnData as any;
}
