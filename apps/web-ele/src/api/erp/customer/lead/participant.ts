import { buildUUID } from '@vben/utils';

import { and, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

const FORM_ID = '8FAE255B25E47CCF4A180A49750844F6';
const TABLE_NAME = 'Bil_Customer_Lead_Participant_Rel';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'rowid';

export namespace CrmLeadParticipantApi {
  export interface ParticipantRel {
    rowid?: string;
    id?: string;
    leadId?: number | string;
    leadCode?: string;
    leadName?: string;
    participantUserId?: number | string;
    participantUserName?: string;
    departId?: number | string;
    departName?: string;
    roleType?: string;
    remark?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    lingmaSysIsDelete?: number;
    lingmaSysEnt?: string;
  }

  export interface ParticipantQueryParams {
    leadId?: number | string;
    leadCode?: string;
    leadName?: string;
  }
}

function createParticipantTable() {
  const table = createFinanceDataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  table.Type = '数据库表';
  return table;
}

function mapRowToParticipant(item: any): CrmLeadParticipantApi.ParticipantRel {
  return {
    rowid: item.rowid,
    id: item.rowid,
    leadId: item.lead_id,
    leadCode: item.lead_code,
    leadName: item.lead_name,
    participantUserId: item.participant_user_id,
    participantUserName: item.participant_user_name,
    departId: item.depart_id,
    departName: item.depart_name,
    roleType: 'PARTICIPANT',
    remark: item.remark,
    createuser: item.createuser,
    createtime: item.createtime,
    updateuser: item.updateuser,
    updatetime: item.updatetime,
    lingmaSysIsDelete: item.lingma_sys_is_delete,
    lingmaSysEnt: item.lingma_sys_ent,
  };
}

function mapParticipantToRow(data: CrmLeadParticipantApi.ParticipantRel): any {
  return {
    rowid: String(data.rowid || data.id || buildUUID()),
    lead_id: data.leadId,
    lead_code: data.leadCode,
    lead_name: data.leadName,
    participant_user_id: data.participantUserId,
    participant_user_name: data.participantUserName,
    depart_id: data.departId,
    depart_name: data.departName,
    remark: data.remark,
    lingma_sys_is_delete: data.lingmaSysIsDelete ?? 0,
    lingma_sys_ent: data.lingmaSysEnt,
  };
}

function extractItems(table: any, resQuery: any) {
  return (table?.items || resQuery?.data?.Result?.data?.Items || []) as any[];
}

function sortByCreateTimeDesc(list: CrmLeadParticipantApi.ParticipantRel[]) {
  return [...list].sort((a, b) => {
    const aTime = a.createtime ? new Date(a.createtime).getTime() : 0;
    const bTime = b.createtime ? new Date(b.createtime).getTime() : 0;
    return bTime - aTime;
  });
}

function buildLeadIdentityCond(params: CrmLeadParticipantApi.ParticipantQueryParams) {
  const leadId = String(params.leadId || '').trim();
  const leadCode = String(params.leadCode || '').trim();
  const leadName = String(params.leadName || '').trim();

  if (leadId) return cond('lead_id', 'equal', leadId);
  if (leadCode) return cond('lead_code', 'equal', leadCode);
  if (leadName) return cond('lead_name', 'equal', leadName);
  return null;
}

export async function getLeadParticipantList(
  params: number | string | CrmLeadParticipantApi.ParticipantQueryParams,
) {
  const normalizedParams =
    typeof params === 'object'
      ? params
      : {
          leadId: params,
        };
  const identityCond = buildLeadIdentityCond(normalizedParams);
  if (!identityCond) return [] as CrmLeadParticipantApi.ParticipantRel[];

  const table = createParticipantTable();
  table.Filter = identityCond;
  const queryParam: any = { Table: [table], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const items = extractItems(table, resQuery);
  const mapped = items.map((item: any) => mapRowToParticipant(item)) as CrmLeadParticipantApi.ParticipantRel[];
  const unique = Array.from(
    new Map(mapped.map((item) => [String(item.rowid || item.id || ''), item])).values(),
  );
  return sortByCreateTimeDesc(unique);
}

export async function getParticipantLeadIds(userId: number | string) {
  const list = await getParticipantLeadListByUser(userId);
  return Array.from(new Set(list.map((item) => String(item.leadId || '')).filter(Boolean)));
}

export async function getParticipantLeadListByUser(
  userId: number | string,
  leadIds?: Array<number | string>,
) {
  const table = createParticipantTable();
  const filters: any[] = [cond('participant_user_id', 'equal', userId)];
  if (leadIds?.length) {
    filters.push(cond('lead_id', 'in', leadIds.map((item) => String(item))));
  }
  table.Filter = and(...filters);
  const queryParam: any = { Table: [table], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const items = extractItems(table, resQuery);
  return sortByCreateTimeDesc(
    items.map((item: any) => mapRowToParticipant(item)) as CrmLeadParticipantApi.ParticipantRel[],
  );
}

export async function createLeadParticipant(data: CrmLeadParticipantApi.ParticipantRel) {
  const table = createParticipantTable();
  const saveParam = table.getSaveParam([mapParticipantToRow(data)], [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
}

export async function deleteLeadParticipant(rowid: number | string) {
  const table = createParticipantTable();
  const saveParam = table.getSaveParam([], [], [{ rowid }]);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
}
