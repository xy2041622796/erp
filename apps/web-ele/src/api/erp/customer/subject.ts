import type { PageParam } from '@vben/request';

import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';

import { createFinanceDataTable } from '../finance/common/account-set-scope';

const FORM_ID = 'F0BA18993242D85B7EF85D41BC65E030';
const TABLE_NAME = 'vw_client_customer_subject_list';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'subject_id';

export namespace CrmCustomerSubjectApi {
  export type SubjectType = 'customer' | 'lead' | 'lead_pool';

  export interface SubjectRow {
    id?: string;
    rowid?: string;
    subjectId?: string;
    originRowid?: string;
    originTable?: string;
    subjectCode?: string;
    subjectName?: string;
    subjectType?: string | SubjectType;
    subjectTypeLabel?: string;
    contactName?: string;
    mobile?: string;
    telephone?: string;
    email?: string;
    region?: string;
    regionCode?: string;
    detailAddress?: string;
    ownerUserId?: string;
    ownerUserName?: string;
    departId?: string;
    departName?: string;
    sourceLeadId?: string;
    sourceLeadCode?: string;
    sourceLeadName?: string;
    createTime?: string;
    updateTime?: string;
    remark?: string;
    isPool?: number;
    leadStatus?: number;
    companyType?: number;
    dealStatus?: number;
  }
}

function getSubjectTable() {
  const table = createFinanceDataTable(
    FORM_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  table.Type = '数据库表';
  return table;
}

function normalizeNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function mapRowToSubject(item: any): CrmCustomerSubjectApi.SubjectRow {
  const originRowid = String(item.origin_rowid || '').trim();
  return {
    id: originRowid,
    rowid: originRowid,
    subjectId: String(item.subject_id || '').trim(),
    originRowid,
    originTable: String(item.origin_table || '').trim(),
    subjectCode: item.subject_code,
    subjectName: item.subject_name,
    subjectType: item.subject_type,
    subjectTypeLabel: item.subject_type_label,
    contactName: item.contact_name,
    mobile: item.mobile,
    telephone: item.telephone,
    email: item.email,
    region: item.region,
    regionCode: item.regionCode,
    detailAddress: item.detail_address,
    ownerUserId: item.owner_user_id,
    ownerUserName: item.owner_user_name,
    departId: item.depart_id,
    departName: item.depart_name,
    sourceLeadId: item.source_lead_id,
    sourceLeadCode: item.source_lead_code,
    sourceLeadName: item.source_lead_name,
    createTime: item.create_time,
    updateTime: item.update_time,
    remark: item.remark,
    isPool: normalizeNumber(item.is_pool),
    leadStatus: normalizeNumber(item.lead_status),
    companyType: normalizeNumber(item.company_type),
    dealStatus: normalizeNumber(item.deal_status),
  };
}

export async function getCustomerSubjectPage(
  params: PageParam & Record<string, any>,
) {
  const subjectTable = getSubjectTable();
  const p = params as any;
  const pageNo = p.pageNo || p.index || 1;
  const pageSize = p.page || p.size || 10;
  const conditions: any[] = [];

  if (p.subjectCode)
    conditions.push(cond('subject_code', 'contains', p.subjectCode));
  if (p.subjectName)
    conditions.push(cond('subject_name', 'contains', p.subjectName));
  if (p.contactName)
    conditions.push(cond('contact_name', 'contains', p.contactName));
  if (p.mobile) conditions.push(cond('mobile', 'contains', p.mobile));
  if (p.telephone) conditions.push(cond('telephone', 'contains', p.telephone));
  if (p.regionCodePrefix)
    conditions.push(cond('regionCode', 'startswith', p.regionCodePrefix));
  if (p.ownerUserName)
    conditions.push(cond('owner_user_name', 'contains', p.ownerUserName));
  if (p.subjectType)
    conditions.push(cond('subject_type', 'equal', p.subjectType));
  if (p.createTimeStart)
    conditions.push(
      cond('create_time', 'greaterthanorequal', p.createTimeStart),
    );
  if (p.createTimeEnd)
    conditions.push(cond('create_time', 'lessthanorequal', p.createTimeEnd));

  if (conditions.length > 0) {
    subjectTable.Filter = and(...conditions);
  }

  const queryParam: any = {
    Table: [subjectTable],
    PageParam: { page: pageSize, index: pageNo },
  };

  const resQuery = await requestClient.post(subjectTable.queryUrl, queryParam, {
    headers: subjectTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  subjectTable.execQueryResult(resQuery);

  const ClientDataCtor = clientData as any;
  const result = new ClientDataCtor();
  result.dataTable = subjectTable;
  result.list = (resQuery?.data?.Result?.data?.Items || []).map((item: any) =>
    mapRowToSubject(item),
  );
  result.total = resQuery?.data?.Result?.data?.Count || 0;
  return result as any;
}
