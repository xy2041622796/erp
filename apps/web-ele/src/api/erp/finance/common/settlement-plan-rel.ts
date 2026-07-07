import { and, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export namespace ErpSettlementPlanRelApi {
  export interface SettlementPlanRel {
    id?: number;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;
    lingma_sys_ent?: number;
    contract_id?: string;
    plan_period?: string; // 冗余存储，方便查询
    plan_id?: string;
    settlement_id?: string;
    rowid?: string;
  }
}

const TABLE_NAME = 'Bil_Settlement_Plan_Rel';
const DB_NAME = 'LMBill';
const PK_FIELD = 'rowid';

/**
 * 创建结算-计划关联
 */
export async function createSettlementPlanRel(
  formId: string,
  data: ErpSettlementPlanRelApi.SettlementPlanRel,
) {
  const table = new DataTable(formId, TABLE_NAME, DB_NAME, PK_FIELD);
  const saveParam = table.getSaveParam([data], [], []);
  const result = await requestClient.post<any>(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
  return result?.Data;
}

/**
 * 根据结算ID查询关联记录
 */
export async function getRelBySettlementId(formId: string, settlementId: string) {
  if (!settlementId) return null;
  const table = new DataTable(formId, TABLE_NAME, DB_NAME, PK_FIELD);
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('settlement_id', 'equal', settlementId),
  );


  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };

  const resQuery = await requestClient.post<any>(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  return items.length > 0 ? items[0] : null;
}

/**
 * 根据合同ID查询所有关联记录（用于排除已结算计划）
 */
export async function getRelListByContractId(formId: string, contractId: string) {
  if (!contractId) return [];
  const table = new DataTable(formId, TABLE_NAME, DB_NAME, PK_FIELD);
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('contract_id', 'equal', contractId),
  );


  const queryParam = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
  };

  const resQuery = await requestClient.post<any>(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return resultData?.Items || [];
}

/**
 * 删除关联（逻辑删除）
 */
export async function deleteRel(formId: string, rowid: string) {
  const table = new DataTable(formId, TABLE_NAME, DB_NAME, PK_FIELD);
  // 逻辑删除
  const data = { [PK_FIELD]: rowid, lingma_sys_is_delete: 1 };
  const saveParam = table.getSaveParam([], [data], []);
  return requestClient.post<any>(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

