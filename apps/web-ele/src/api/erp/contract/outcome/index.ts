import { downloadByTableConfig, exportExcelByConfig, importExcelByConfig } from '#/api/common/import-export';
import { and, clientData, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { generateUUID } from '@vben/utils';
import { getCodeString } from '#/api/system/coding';
import type { CrmContractApi } from '../income';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

// 支出合同专用
const OUTCOME_CONTRACT_MODEL_ID = 'B1DC3404A2E11F00881224E1945BB74A';
const CONTRACT_TABLE = 'Bil_contract_info';
const CONTRACT_DB = 'LMBill';
const CONTRACT_PK = 'rowid';

async function assertContractCanDirectEdit(contractId: string | number) {
  const id = String(contractId || '').trim();
  if (!id) return;
  const detail = await getContract(id);
  if (Number((detail as any)?.ConState) !== 0) {
    throw new Error('当前合同状态不允许直接编辑，请通过合同变更处理');
  }
}

const CONTRACT_ORDER_TABLE = 'Bil_Contract_Product';
const CONTRACT_ORDER_PK = 'rowid';

const CONTRACT_PLAN_TABLE = 'Bil_Contract_settlement_plan';
const CONTRACT_PLAN_PK = 'rowid';

const CONTRACT_CODE_RULE_ID = '22FFD104539A47D4D6AE9ED183282C3B';
const CONTRACT_ORDER_CODE_RULE_ID = 'B54094EAC60F0B95DF6B68818CF1A5C9';

/** 查询支出合同列表 */
export async function getContractPage(params: any) {
  const contractTable = createFinanceDataTable(
    OUTCOME_CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  const filterConds = [] as any[];
  filterConds.push(cond('contract_category', 'equal', 1));

  const contractNo = params.contract_no ?? params.no;
  if (contractNo) filterConds.push(cond('contract_no', 'contains', contractNo));

  const contractName = params.contract_name;
  if (contractName) filterConds.push(cond('contract_name', 'contains', contractName));

  const customerId = params.contract_party_b ?? params.customerId;
  if (customerId) {
    filterConds.push(
      or(
        cond('contract_party_a', 'equal', customerId),
        cond('contract_party_b', 'equal', customerId),
      ),
    );
  }
  if (params.businessId) filterConds.push(cond('project_id', 'equal', params.businessId));
  if (params.ownerUserId) filterConds.push(cond('salesperson', 'equal', params.ownerUserId));
  if (params.ConState !== undefined) filterConds.push(cond('ConState', 'equal', params.ConState));
  if (filterConds.length > 0) contractTable.Filter = and(...filterConds);
  if (!contractTable.Fields || contractTable.Fields.length === 0) {
      }

  const queryParam: any = {
    Table: [contractTable],
    PageParam: { page: params.page || 0, index: params.pageNo || 1 },
  };

  const resQuery = await requestClient.post(contractTable.queryUrl, queryParam, {
    headers: contractTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  contractTable.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);
  const data = new clientData();
  data.dataTable = contractTable;
  data.list = items;
  data.total = total;
  return data;
}

/** 删除支出合同 */
export async function deleteContract(id: number | string) {
  await assertContractCanDirectEdit(id);
  const contractTable = createFinanceDataTable(
    OUTCOME_CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  const pk = typeof id === 'number' ? id : String(id);
  const saveParam = contractTable.getSaveParam([], [], [{ [CONTRACT_PK]: pk }]);
  return await requestClient.post(contractTable.saveUrl, saveParam, {
    headers: contractTable.getRequestHeader(),
  });
}

/** 合同订单列表（按合同ID） */
export async function getContractOrderList(contractId: string) {
  const orderTable = createFinanceDataTable(
    OUTCOME_CONTRACT_MODEL_ID,
    CONTRACT_ORDER_TABLE,
    CONTRACT_DB,
    CONTRACT_ORDER_PK,
  );
  orderTable.Filter = and(
    cond('contract_id', 'equal', contractId),
    cond('lingma_sys_is_delete', 'notequal', 1),
  );
  if (!orderTable.Fields || orderTable.Fields.length === 0) {
    // order
  }

  const queryParam = {
    Table: [orderTable],
    PageParam: { page: 0, index: 1 },
  };

  const res = await requestClient.post(orderTable.queryUrl, queryParam, {
    headers: orderTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  orderTable.execQueryResult(res);
  const resultData = res.data?.Result?.data || res.data?.Result || res.data;
  return resultData?.Items || [];
}

export async function getContractProductList(contractId: string) {
  return await getContractOrderList(contractId);
}

/** 收款计划列表（按合同ID） */
export async function getContractPlanList(contractId: string) {
  const planTable = createFinanceDataTable(
    OUTCOME_CONTRACT_MODEL_ID,
    CONTRACT_PLAN_TABLE,
    CONTRACT_DB,
    CONTRACT_PLAN_PK
  );

  planTable.Filter = and(
    cond('contract_id', 'equal', contractId),
    cond('lingma_sys_is_delete', 'notequal', 1),
  );

  if (!planTable.Fields || planTable.Fields.length === 0) {
    // plan
  }

  const queryParam = {
    Table: [planTable],
    PageParam: { page: 0, index: 1 },
  };

  const res = await requestClient.post(planTable.queryUrl, queryParam, {
    headers: planTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  planTable.execQueryResult(res);
  const resultData = res.data?.Result?.data || res.data?.Result || res.data;
  const items = resultData?.Items || [];

  return [...items].sort((a: any, b: any) => {
    const aPeriod = Number(String(a?.plan_period ?? '').replace(/[^0-9]/g, '')) || 0;
    const bPeriod = Number(String(b?.plan_period ?? '').replace(/[^0-9]/g, '')) || 0;
    return aPeriod - bPeriod;
  });
}

/** 查询合同详情 */
export async function getContract(id: string) {
  const contractTable = createFinanceDataTable(
    OUTCOME_CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  contractTable.Filter = cond(CONTRACT_PK, 'equal', id);
  if (!contractTable.Fields || contractTable.Fields.length === 0) {
      }
  const queryParam = {
    Table: [contractTable],
    PageParam: { page: 1, index: 1 },
  };
  const resQuery = await requestClient.post(
    contractTable.queryUrl,
    queryParam,
    { headers: contractTable.getRequestHeader(), responseReturn: 'raw' },
  );
  contractTable.execQueryResult(resQuery.data);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const detail = (resultData?.Items && resultData.Items[0]) || null;

  if (!detail) return null;

  const productItems = await getContractProductList(String(id));
  (detail as any).product_items = productItems;
  (detail as any).products = productItems;
  const planItems = await getContractPlanList(String(id));
  (detail as any).plan_items = planItems;

  return detail;
}

async function updateContractNo(contractId: string, contractNo: string) {
  const contractTable = createFinanceDataTable(OUTCOME_CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const saveParam = contractTable.getSaveParam([], [{ rowid: contractId, contract_no: contractNo }], []);
  return await requestClient.post(contractTable.saveUrl, saveParam, {
    headers: contractTable.getRequestHeader(),
  });
}

async function updateContractOrderReportIds(rows: Array<{ rowid: string; ReportID: string }>) {
  if (!rows.length) return;
  const orderTable = createFinanceDataTable(OUTCOME_CONTRACT_MODEL_ID, CONTRACT_ORDER_TABLE, CONTRACT_DB, CONTRACT_ORDER_PK);
  const saveParam = orderTable.getSaveParam([], rows as any, []);
  return await requestClient.post(orderTable.saveUrl, saveParam, {
    headers: orderTable.getRequestHeader(),
  });
}

/** 新增合同（含：产品子表 + 收款计划子表） */
export async function createContractWithProductsAndPlans(
  contract: any,
  productRows: CrmContractApi.ContractOrderRow[],
  planRows: CrmContractApi.ContractSettlementPlanRow[],
) {
  const contractTable = createFinanceDataTable(OUTCOME_CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const productTable = createFinanceDataTable(OUTCOME_CONTRACT_MODEL_ID, CONTRACT_ORDER_TABLE, CONTRACT_DB, CONTRACT_ORDER_PK);
  const planTable = createFinanceDataTable(OUTCOME_CONTRACT_MODEL_ID, CONTRACT_PLAN_TABLE, CONTRACT_DB, CONTRACT_PLAN_PK);

  const contractId = String(contract?.rowid || generateUUID());
  contract = { ...contract, rowid: contractId };

  const prodRows = (productRows ?? []).map((r) => ({
    ...r,
    rowid: String((r as any).rowid || (r as any).id || generateUUID()),
    contract_id: contractId,
    lingma_sys_is_delete: (r as any).lingma_sys_is_delete ?? 0,
  }));

  const plans = (planRows ?? []).map((r) => ({
    ...r,
    rowid: String((r as any).rowid || generateUUID()),
    contract_id: contractId,
  }));

  const reqList = [
    ...contractTable.getSaveParam([contract], [], []),
    ...productTable.getSaveParam(prodRows, [], []),
    ...planTable.getSaveParam(plans, [], []),
  ];

  const res = await requestClient.post(contractTable.saveUrl, reqList, {
    headers: contractTable.getRequestHeader(),
  });

  const contractCodeRes = await getCodeString(
    contractId,
    CONTRACT_CODE_RULE_ID,
    contractTable.getRequestHeader(),
  );
  if (contractCodeRes?.Code === 200 && contractCodeRes?.Message) {
    await updateContractNo(contractId, contractCodeRes.Message);
  } else {
    console.error('获取合同编码失败', contractCodeRes);
  }

  if (prodRows.length > 0) {
    const updates: Array<{ rowid: string; ReportID: string }> = [];
    for (const r of prodRows) {
      const codeRes = await getCodeString(
        String((r as any).rowid),
        CONTRACT_ORDER_CODE_RULE_ID,
        productTable.getRequestHeader(),
      );
      if (codeRes?.Code === 200 && codeRes.Message) {
        updates.push({ rowid: String((r as any).rowid), ReportID: codeRes.Message });
      }
    }
    await updateContractOrderReportIds(updates);
  }

  return res;
}

/** 更新合同（含：产品子表 + 收款计划子表） */
export async function updateContractWithProductsAndPlans(
  contract: any,
  productRows: CrmContractApi.ContractOrderRow[],
  planRows: CrmContractApi.ContractSettlementPlanRow[],
) {
  await assertContractCanDirectEdit(String(contract?.rowid ?? contract?.row_id ?? contract?.id ?? ''));
  const contractTable = createFinanceDataTable(OUTCOME_CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const productTable = createFinanceDataTable(OUTCOME_CONTRACT_MODEL_ID, CONTRACT_ORDER_TABLE, CONTRACT_DB, CONTRACT_ORDER_PK);
  const planTable = createFinanceDataTable(OUTCOME_CONTRACT_MODEL_ID, CONTRACT_PLAN_TABLE, CONTRACT_DB, CONTRACT_PLAN_PK);

  const contractId = String(contract.rowid);

  const oldProducts = await getContractProductList(contractId);
  const oldPlans = await getContractPlanList(contractId);

  const oldProductIdSet = new Set((oldProducts || []).map((r: any) => String(r.rowid)));
  const incomingProducts = (productRows ?? []).map((r) => ({
    ...r,
    contract_id: contractId,
    rowid: String((r as any).rowid || (r as any).id || generateUUID()),
    lingma_sys_is_delete: (r as any).lingma_sys_is_delete ?? 0,
  }));

  const productInsert = incomingProducts.filter(r => !oldProductIdSet.has(String((r as any).rowid)));
  const productUpdate = incomingProducts.filter(r => oldProductIdSet.has(String((r as any).rowid)));
  const productDelete = (oldProducts || [])
    .filter((r: any) => !incomingProducts.some(ip => String((ip as any).rowid) === String(r.rowid)))
    .map((r: any) => ({ rowid: r.rowid }));

  const oldPlanIdSet = new Set((oldPlans || []).map((r: any) => String(r.rowid)));
  const incomingPlans = (planRows ?? []).map((r) => ({ ...r, contract_id: contractId }));

  const planInsert = incomingPlans.filter(r => !r.rowid || !oldPlanIdSet.has(String(r.rowid))).map(r => ({...r, rowid: r.rowid || generateUUID()}));
  const planUpdate = incomingPlans.filter(r => r.rowid && oldPlanIdSet.has(String(r.rowid)));
  const planDelete = (oldPlans || []).filter((r: any) => !incomingPlans.some(ip => String(ip.rowid) === String(r.rowid))).map((r: any) => ({ rowid: r.rowid }));

  const reqList = [
    ...contractTable.getSaveParam([], [contract], []),
    ...productTable.getSaveParam(productInsert, productUpdate, productDelete),
    ...planTable.getSaveParam(planInsert, planUpdate, planDelete),
  ];

  const res = await requestClient.post(contractTable.saveUrl, reqList, {
    headers: contractTable.getRequestHeader(),
  });

  if (productInsert.length > 0) {
    const updates: Array<{ rowid: string; ReportID: string }> = [];
    for (const r of productInsert) {
      const codeRes = await getCodeString(
        String((r as any).rowid),
        CONTRACT_ORDER_CODE_RULE_ID,
        productTable.getRequestHeader(),
      );
      if (codeRes?.Code === 200 && codeRes.Message) {
        updates.push({ rowid: String((r as any).rowid), ReportID: codeRes.Message });
      }
    }
    await updateContractOrderReportIds(updates);
  }

  return res;
}


/** 导出支出合同 */
export function exportContract(params: any, encodingId?: string) {
  if (encodingId) {
    return exportExcelByConfig({
      formId: OUTCOME_CONTRACT_MODEL_ID,
      tableName: CONTRACT_TABLE,
      dbName: CONTRACT_DB,
      primaryKey: CONTRACT_PK,
      fileName: '支出合同',
      encodingId,
      extraData: {
        contract_category: params?.contract_category ?? 1,
        ...params,
      },
    });
  }

  const contractTable = createFinanceDataTable(
    OUTCOME_CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  const filterConds = [] as any[];
  filterConds.push(cond('contract_category', 'equal', 1));
  if (params.no) filterConds.push(cond('contract_no', 'contains', params.no));
  if (params.customerId) {
    filterConds.push(
      or(
        cond('contract_party_a', 'equal', params.customerId),
        cond('contract_party_b', 'equal', params.customerId),
      ),
    );
  }
  if (params.businessId) filterConds.push(cond('project_id', 'equal', params.businessId));
  if (params.ownerUserId) filterConds.push(cond('salesperson', 'equal', params.ownerUserId));
  if (params.ConState !== undefined) filterConds.push(cond('ConState', 'equal', params.ConState));
  if (filterConds.length > 0) contractTable.Filter = and(...filterConds);

  const queryParam: any = {
    Table: [contractTable],
    PageParam: { page: 0, index: 1 },
  };

  return requestClient.download(contractTable.queryUrl, {
    method: 'post',
    data: queryParam,
    headers: contractTable.getRequestHeader(),
  });
}

/** 导入支出合同（复用导出 encodingId，若后端导入/导出方案分离请替换为独立 ID） */
export async function importContract(file: File, encodingId?: string) {
  return await importExcelByConfig({
    formId: OUTCOME_CONTRACT_MODEL_ID,
    tableName: CONTRACT_TABLE,
    dbName: CONTRACT_DB,
    primaryKey: CONTRACT_PK,
    file,
    encodingId: encodingId || 'AEB03F2B6455023C9087DDE83D42A092',
    customPath: 'LMBContract',
    isReplace: false,
    isCrossEnt: false,
  });
}

/** 下载支出合同导入模板 */
export async function downloadContractImportTemplate(): Promise<Blob> {
  const contractTable = createFinanceDataTable(OUTCOME_CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const headers = contractTable.getRequestHeader();
  const result = await requestClient.download('/api/File/DownFile', {
    method: 'POST',
    data: {
      fileName: '合同导入模板.xlsx',
      customPath: '/NewApp/xlsxtemp',
      appType: 'wwwroot',
      isCrossEnt: true,
    },
    headers,
  });
  return result as Blob;
}
