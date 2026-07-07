import type { PageParam } from '@vben/request';

import type { CrmCustomerApi } from '#/api/erp/customer';

import { useUserStore } from '@vben/stores';
import { buildUUID } from '@vben/utils';

import { createCustomerWithAutoCode } from '#/api/erp/customer';
import { appendPoolLog } from '#/api/erp/customer/pool';
import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';

import { createFinanceDataTable } from '../../finance/common/account-set-scope';
import { getParticipantLeadIds } from './participant';

const FORM_ID = '8FAE255B25E47CCF4A180A49750844F6';
const TABLE_NAME = 'Bil_Customer_Lead';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'rowid';
const LEAD_CODE_RULE_ID = '825B47C20DDD740235B4C74B7F5A6AC7';

export namespace CrmCustomerLeadApi {
  export interface Lead {
    id?: number | string;
    rowid?: string;
    leadCode?: string;
    leadName?: string;
    customerName?: string;
    contactName?: string;
    mobile?: string;
    phone?: string;
    email?: string;
    address?: string;
    region?: string;
    regionCode?: string;
    sourceChannel?: string;
    intentLevel?: number;
    leadStatus?: number;
    isPool?: number;
    poolTime?: string;
    poolReason?: string;
    ownerUserId?: string;
    ownerUserName?: string;
    departId?: string;
    departName?: string;
    lastFollowTime?: string;
    nextFollowTime?: string;
    lastFollowContent?: string;
    customerId?: string;
    customerCode?: string;
    contactId?: string;
    businessId?: string;
    convertTime?: string;
    companyType?: number;
    accountSetId?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    description?: string;
    lingmaSysIsDelete?: number;
    lingmaSysEnt?: string;
  }

  export interface LeadConvertReqVO {
    id: number | string;
  }

  export interface LeadDuplicateCheckResult {
    hasDuplicate: boolean;
    items: Array<{
      contactName?: string;
      customerName?: string;
      isPool?: number;
      leadCode?: string;
      leadName?: string;
      leadStatus?: number;
      mobile?: string;
      ownerUserName?: string;
      rowid?: string;
    }>;
    message: string;
  }
}

function getLeadTable() {
  const table = createFinanceDataTable(
    FORM_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  table.Type = '数据库表';
  return table;
}

function normalizeDateValue(value?: null | string) {
  const text = String(value || '').trim();
  return text || null;
}

function formatDateTimeForMysql(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function extractResponseErrorMessage(response: any): string {
  const candidates: any[] = [];
  const body = response?.data ?? response ?? {};
  candidates.push(
    body?.message,
    body?.Message,
    body?.msg,
    body?.error,
    body?.errMsg,
    body?.exception,
    body?.Exception,
    body?.ExceptionMessage,
    body?.Result?.message,
    body?.Result?.Message,
    body?.Result?.msg,
    body?.Result?.error,
    body?.Result?.errMsg,
    body?.Result?.Exception,
    body?.Result?.ExceptionMessage,
    body?.errors,
    body?.result?.message,
    body?.result?.Message,
  );
  for (const item of candidates) {
    const text = typeof item === 'string' ? item.trim() : '';
    if (!text) continue;
    const lower = text.toLowerCase();
    if (
      lower.includes('exception') ||
      lower.includes('error') ||
      text.includes('异常') ||
      text.includes('失败') ||
      text.includes('incorrect datetime value') ||
      text.includes('DataIntegrityViolationException') ||
      text.includes('MysqlDataTruncation')
    ) {
      return text;
    }
  }
  if (
    body?.success === false ||
    body?.Success === false ||
    body?.Result?.success === false ||
    body?.Result?.Success === false
  ) {
    return '保存失败';
  }
  return '';
}

function assertSaveResponse(response: any) {
  const errorMessage = extractResponseErrorMessage(response);
  if (errorMessage) throw new Error(errorMessage);
  return response;
}

function getCurrentUserId() {
  const userStore = useUserStore();
  const info: any = userStore.userInfo || {};
  const raw: any = info.rawUserInfo || {};
  return String(info.id || raw.ROWID || raw.rowid || '').trim();
}

function mapRowToLead(item: any): CrmCustomerLeadApi.Lead {
  return {
    id: item.rowid,
    rowid: item.rowid,
    leadCode: item.lead_code,
    leadName: item.lead_name,
    customerName: item.customer_name,
    contactName: item.contact_name,
    mobile: item.mobile,
    phone: item.phone,
    email: item.email,
    address: item.address,
    region: item.region,
    regionCode: item.regionCode,
    sourceChannel: item.source_channel,
    intentLevel: Number(item.intent_level || 0) || undefined,
    leadStatus: Number(item.lead_status || 0),
    isPool: Number(item.is_pool || 0),
    poolTime: item.pool_time,
    poolReason: item.pool_reason,
    ownerUserId: item.owner_user_id,
    ownerUserName: item.ownerUserName,
    departId: item.depart_id,
    departName: item.depart_name,
    lastFollowTime: item.last_follow_time,
    nextFollowTime: item.next_follow_time,
    lastFollowContent: item.last_follow_content,
    customerId: item.customer_id,
    customerCode: item.customer_code,
    contactId: item.contact_id,
    businessId: item.business_id,
    convertTime: item.convert_time,
    companyType: Number(item.company_type || 1) || 1,
    accountSetId: item.account_set_id,
    createuser: item.createuser,
    createtime: item.createtime,
    updateuser: item.updateuser,
    updatetime: item.updatetime,
    description: item.description,
    lingmaSysIsDelete: item.lingma_sys_is_delete,
    lingmaSysEnt: item.lingma_sys_ent,
  };
}

function mapLeadToRow(data: CrmCustomerLeadApi.Lead): any {
  const rowid = data.rowid ?? data.id;
  const row: any = {
    lead_code: data.leadCode,
    lead_name: data.leadName,
    customer_name: data.customerName,
    contact_name: data.contactName,
    mobile: data.mobile,
    phone: data.phone,
    email: data.email,
    address: data.address,
    region: data.region,
    regionCode: data.regionCode,
    source_channel: data.sourceChannel,
    intent_level: data.intentLevel,
    lead_status: data.leadStatus,
    is_pool: data.isPool ?? 0,
    pool_time: normalizeDateValue(data.poolTime),
    pool_reason: data.poolReason,
    owner_user_id: data.ownerUserId,
    ownerUserName: data.ownerUserName,
    depart_id: data.departId,
    depart_name: data.departName,
    last_follow_time: normalizeDateValue(data.lastFollowTime),
    next_follow_time: normalizeDateValue(data.nextFollowTime),
    last_follow_content: data.lastFollowContent,
    customer_id: data.customerId,
    customer_code: data.customerCode,
    contact_id: data.contactId,
    business_id: data.businessId,
    convert_time: normalizeDateValue(data.convertTime),
    company_type: data.companyType ?? 1,
    account_set_id: data.accountSetId,
    description: data.description,
    lingma_sys_is_delete: data.lingmaSysIsDelete,
    lingma_sys_ent: data.lingmaSysEnt,
  };
  if (rowid !== undefined && rowid !== null && String(rowid).trim())
    row.rowid = rowid;
  return row;
}

function buildConditions(params: any) {
  const conditions: any[] = [];
  if (params?.leadCode)
    conditions.push(cond('lead_code', 'contains', params.leadCode));
  if (params?.leadName)
    conditions.push(cond('lead_name', 'contains', params.leadName));
  if (params?.customerName)
    conditions.push(cond('customer_name', 'contains', params.customerName));
  if (params?.contactName)
    conditions.push(cond('contact_name', 'contains', params.contactName));
  if (params?.mobile)
    conditions.push(cond('mobile', 'contains', params.mobile));
  if (params?.regionCodePrefix)
    conditions.push(cond('regionCode', 'startswith', params.regionCodePrefix));
  if (params?.sourceChannel)
    conditions.push(cond('source_channel', 'contains', params.sourceChannel));
  if (params?.ownerUserName)
    conditions.push(cond('ownerUserName', 'contains', params.ownerUserName));
  if (
    params?.leadStatus !== undefined &&
    params?.leadStatus !== null &&
    params?.leadStatus !== ''
  ) {
    conditions.push(cond('lead_status', 'equal', Number(params.leadStatus)));
  }
  if (
    params?.isPool !== undefined &&
    params?.isPool !== null &&
    params?.isPool !== ''
  ) {
    conditions.push(cond('is_pool', 'equal', Number(params.isPool)));
  }
  if (Number(params?.pendingFollow || 0) === 1) {
    conditions.push(cond('next_follow_time', 'isnotnull', null));
  }
  return conditions;
}

export async function getLeadPage(params: PageParam & Record<string, any>) {
  const leadTable = getLeadTable();
  const conditions = buildConditions(params);
  const sceneType = String(params.sceneType || '1');
  const currentUserId = getCurrentUserId();

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
    conditions.push(cond('rowid', 'in', participantLeadIds));
  }

  if (conditions.length > 0) leadTable.Filter = and(...conditions);
  const queryParam: any = {
    Table: [leadTable],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };
  const resQuery = await requestClient.post(leadTable.queryUrl, queryParam, {
    headers: leadTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  leadTable.execQueryResult(resQuery);
  const ClientDataCtor = clientData as any;
  const result = new ClientDataCtor();
  result.dataTable = leadTable;
  const data = resQuery?.data?.Result?.data || {};
  const items = data?.Items || [];
  result.list = items.map((item: any) => mapRowToLead(item));
  result.total = data?.Count ?? items.length ?? 0;
  return result as any;
}

export async function getLead(id: number | string) {
  const leadTable = getLeadTable();
  leadTable.Filter = and(cond('rowid', 'equal', id));
  const queryParam = {
    Table: [leadTable],
    PageParam: { page: 0, index: 1 },
  };
  const resQuery = await requestClient.post(leadTable.queryUrl, queryParam, {
    headers: leadTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  leadTable.execQueryResult(resQuery);
  const items = leadTable.items || [];
  return items[0] ? mapRowToLead(items[0]) : null;
}

export async function createLead(data: CrmCustomerLeadApi.Lead) {
  const leadTable = getLeadTable();
  const response = await requestClient.post(
    leadTable.saveUrl,
    leadTable.getSaveParam([mapLeadToRow(data)], [], []),
    {
      headers: leadTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );
  return assertSaveResponse(response);
}

export async function createLeadWithAutoCode(data: CrmCustomerLeadApi.Lead) {
  const rowid = data.rowid ?? String(data.id || '');
  if (!rowid) throw new Error('缺少 rowid，无法新增线索');
  const payload = { ...data, isPool: data.isPool ?? 0 };
  const response = await createLead(payload);
  if (!String(payload.leadCode || '').trim() && LEAD_CODE_RULE_ID) {
    const leadTable = getLeadTable();
    const codeRes = await getCodeString(
      String(rowid),
      LEAD_CODE_RULE_ID,
      leadTable.getRequestHeader(),
    );
    if (codeRes?.Code === 200 && codeRes?.Message) {
      const updateResponse = await requestClient.post(
        leadTable.saveUrl,
        leadTable.getSaveParam(
          [],
          [{ rowid: String(rowid), lead_code: codeRes.Message }],
          [],
        ),
        {
          headers: leadTable.getRequestHeader(),
          responseReturn: 'raw',
        },
      );
      assertSaveResponse(updateResponse);
    } else {
      throw new Error(codeRes?.Message || '获取线索编码失败');
    }
  }
  return response;
}

export async function updateLead(data: CrmCustomerLeadApi.Lead) {
  const current = await getLead(String(data.rowid ?? data.id ?? ''));
  if (Number(current?.leadStatus || 0) === 2)
    throw new Error('已转客户线索不允许编辑');
  const leadTable = getLeadTable();
  const response = await requestClient.post(
    leadTable.saveUrl,
    leadTable.getSaveParam([], [mapLeadToRow(data)], []),
    {
      headers: leadTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );
  return assertSaveResponse(response);
}

export async function deleteLead(id: number | string) {
  const detail = await getLead(id);
  if (!detail) throw new Error('线索不存在');
  if (Number(detail.leadStatus || 0) === 2)
    throw new Error('已转客户线索不可删除');
  if (detail.customerId || detail.contactId || detail.businessId)
    throw new Error('当前线索已有关联转化结果，不允许删除');
  const leadTable = getLeadTable();
  const response = await requestClient.post(
    leadTable.saveUrl,
    leadTable.getSaveParam([], [], [{ rowid: id }]),
    {
      headers: leadTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );
  return assertSaveResponse(response);
}

export async function invalidateLead(id: number | string) {
  const detail = await getLead(id);
  if (!detail) throw new Error('线索不存在');
  if (Number(detail.leadStatus || 0) === 2)
    throw new Error('已转客户线索不可作废');
  const leadTable = getLeadTable();
  const response = await requestClient.post(
    leadTable.saveUrl,
    leadTable.getSaveParam([], [{ rowid: id, lead_status: 3, is_pool: 0 }], []),
    {
      headers: leadTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );
  return assertSaveResponse(response);
}

export async function checkLeadDuplicate(
  data: CrmCustomerLeadApi.Lead,
): Promise<CrmCustomerLeadApi.LeadDuplicateCheckResult> {
  const leadTable = getLeadTable();
  const filters: any[] = [];
  const currentId = String(data.rowid ?? data.id ?? '').trim();
  if (data.mobile) filters.push(cond('mobile', 'equal', data.mobile));
  if (data.leadName) filters.push(cond('lead_name', 'equal', data.leadName));
  if (filters.length === 0)
    return { hasDuplicate: false, items: [], message: '' };
  leadTable.Filter =
    filters.length === 1
      ? filters[0]
      : ({ Type: 'or', Filters: filters } as any);
  const queryParam = {
    Table: [leadTable],
    PageParam: { page: 20, index: 1 },
  } as any;
  const resQuery = await requestClient.post(leadTable.queryUrl, queryParam, {
    headers: leadTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  leadTable.execQueryResult(resQuery);
  const items = (leadTable.items || [])
    .map((item: any) => mapRowToLead(item))
    .filter(
      (item: CrmCustomerLeadApi.Lead) => String(item.rowid || '') !== currentId,
    )
    .map((item: CrmCustomerLeadApi.Lead) => ({
      rowid: item.rowid,
      leadCode: item.leadCode,
      leadName: item.leadName,
      customerName: item.customerName,
      contactName: item.contactName,
      mobile: item.mobile,
      ownerUserName: item.ownerUserName,
      leadStatus: item.leadStatus,
      isPool: item.isPool,
    }));
  return {
    hasDuplicate: items.length > 0,
    items,
    message:
      items.length > 0
        ? `检测到 ${items.length} 条可能重复的线索，确认后仍可继续保存。`
        : '',
  };
}

export async function convertLead(data: { id: number | string }) {
  const detail = await getLead(data.id);
  if (!detail) throw new Error('线索不存在');
  if (Number(detail.leadStatus || 0) === 2) throw new Error('当前线索已转客户');
  if (Number(detail.leadStatus || 0) !== 1)
    throw new Error('仅跟进中的线索允许转客户');

  const customerRowid = buildUUID();
  const finalCustomerName = String(
    detail.customerName || detail.leadName || '',
  ).trim();
  const customerPayload: CrmCustomerApi.Customer = {
    id: customerRowid,
    rowid: customerRowid,
    name: finalCustomerName,
    customerName: finalCustomerName,
    contactName: detail.contactName,
    mobile: detail.mobile,
    telephone: detail.phone,
    email: detail.email,
    detailAddress: detail.address,
    address: detail.address,
    region: detail.region,
    regionCode: detail.regionCode,
    remark: detail.description,
    companyType: 1,
    sourceLeadId: detail.rowid,
    sourceLeadCode: detail.leadCode,
    sourceLeadName: detail.leadName,
    isPool: 0,
    dealStatus: true,
    ownerUserId: detail.ownerUserId,
    ownerUserName: detail.ownerUserName,
    departId: detail.departId,
    departName: detail.departName,
    lastFollowTime: detail.lastFollowTime,
    nextFollowTime: detail.nextFollowTime,
    lastFollowContent: detail.lastFollowContent,
  };

  const createCustomerRes = await createCustomerWithAutoCode(customerPayload);
  const customerCode = createCustomerRes?.customerCode || '';

  const leadTable = getLeadTable();
  const convertTime = formatDateTimeForMysql();
  const response = await requestClient.post(
    leadTable.saveUrl,
    leadTable.getSaveParam(
      [],
      [
        {
          rowid: detail.rowid,
          customer_id: customerRowid,
          customer_code: customerCode,
          customer_name: finalCustomerName,
          convert_time: convertTime,
          lead_status: 2,
          is_pool: 0,
        },
      ],
      [],
    ),
    {
      headers: leadTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );
  assertSaveResponse(response);

  await appendPoolLog({
    leadId: detail.rowid,
    leadCode: detail.leadCode,
    leadName: detail.leadName,
    companyType: detail.companyType ?? 1,
    beforeOwnerUserId: detail.ownerUserId,
    beforeOwnerUserName: detail.ownerUserName,
    afterOwnerUserId: detail.ownerUserId,
    afterOwnerUserName: detail.ownerUserName,
    beforeDepartId: detail.departId,
    beforeDepartName: detail.departName,
    afterDepartId: detail.departId,
    afterDepartName: detail.departName,
    operateType: 'CONVERT_TO_CUSTOMER',
    reason: '线索转正式客户',
    operateTime: convertTime,
    customerId: customerRowid,
    customerCode,
    accountSetId: detail.accountSetId,
    lingmaSysEnt: detail.lingmaSysEnt,
  });

  return {
    customerId: customerRowid,
    customerCode,
    customerName: finalCustomerName,
    contactId: '',
  };
}

export {
  DB_NAME,
  FORM_ID,
  LEAD_CODE_RULE_ID,
  mapLeadToRow,
  mapRowToLead,
  PRIMARY_KEY,
  TABLE_NAME,
};
