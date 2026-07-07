import { and, clientData, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { generateUUID } from '@vben/utils';

import { downloadByTableConfig, exportExcelByConfig, importExcelByConfig } from '#/api/common/import-export';
import { getCodeString } from '#/api/system/coding';
import { createIncomeSettlement } from '#/api/erp/finance/revenue/settlement';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

export namespace CrmContractApi {
  export interface Contract {
    id: number;
    name: string;
    no: string;
    customerId: number;
    customerName?: string;
    businessId: number;
    businessName: string;
    contactLastTime: Date;
    ownerUserId: number;
    ownerUserName?: string;
    ownerUserDeptName?: string;
    processInstanceId: number;
    auditStatus: number;
    orderDate: Date;
    startTime: Date;
    endTime: Date;
    totalProductPrice: number;
    discountPercent: number;
    totalPrice: number;
    totalReceivablePrice: number;
    signContactId: number;
    signContactName?: string;
    signUserId: number;
    signUserName: string;
    remark: string;
    createTime?: Date;
    creator: string;
    creatorName: string;
    updateTime?: Date;
    products?: ContractProduct[];
    contactName?: string;
    rowid?: string;
    contract_category?: number; // 0 收入合同 1 支出合同
  }

  export interface ContractProduct {
    id: number;
    productId: number;
    productName: string;
    productNo: string;
    productUnit: number;
    productPrice: number;
    contractPrice: number;
    count: number;
    totalPrice: number;
    rowid?: string;
  }

  export interface ContractOrderRow {
    rowid?: string;
    contract_id: string;

    product_id?: string;
    product_name?: string;
    specification?: string;
    unit?: string;
    num?: number;
    unit_price?: number;
    amount?: number;
    tax_rate?: number;
    remark?: string;
    ReportID?: string;
    lingma_sys_is_delete?: number;
  }

  export interface ContractSettlementPlanRow {
    rowid?: string | null;
    contract_id: string;

    plan_period?: string;
    plan_date?: string;
    plan_amount?: number;

    settlement_type?: string | number;
    is_auto?: number;
    is_overdue?: number;
    remark?: string;

    lingma_sys_is_delete?: number;
  }
}

export const CONTRACT_MODEL_ID = 'A360801B9108B34DEE305B4EE18584E7';
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

/** 查询合同列表（分页） */
export async function getContractPage(params: any) {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const filterConds = [] as any[];
  const category = params?.contract_category ?? 0;
  filterConds.push(cond('contract_category', 'equal', category));

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

/** 指定客户 */
export async function getContractPageByCustomer(params: any) {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const filterConds = [] as any[];
  const category = params?.contract_category ?? 0;
  filterConds.push(cond('contract_category', 'equal', category));
  if (params.customerId) {
    filterConds.push(
      or(
        cond('contract_party_a', 'equal', params.customerId),
        cond('contract_party_b', 'equal', params.customerId),
      ),
    );
  }
  if (params.no) filterConds.push(cond('contract_no', 'contains', params.no));
  if (filterConds.length > 0) contractTable.Filter = and(...filterConds);
  if (!contractTable.Fields || contractTable.Fields.length === 0) {
      }

  const queryParam: any = { Table: [contractTable], PageParam: { page: params.page || 0, index: params.pageNo || 1 } };
  const resQuery = await requestClient.post(contractTable.queryUrl, queryParam, { headers: contractTable.getRequestHeader(), responseReturn: 'raw' });
  contractTable.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || items.length;
  const data = new clientData();
  data.dataTable = contractTable;
  data.list = items;
  data.total = total;
  return data;
}

/** 指定商机 */
export async function getContractPageByBusiness(params: any) {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const filterConds = [] as any[];
  const category = params?.contract_category ?? 0;
  filterConds.push(cond('contract_category', 'equal', category));
  if (params.businessId) filterConds.push(cond('project_id', 'equal', params.businessId));
  if (params.no) filterConds.push(cond('contract_no', 'contains', params.no));
  if (filterConds.length > 0) contractTable.Filter = and(...filterConds);
  if (!contractTable.Fields || contractTable.Fields.length === 0) {
      }

  const queryParam: any = { Table: [contractTable], PageParam: { page: params.page || 0, index: params.pageNo || 1 } };
  const resQuery = await requestClient.post(contractTable.queryUrl, queryParam, { headers: contractTable.getRequestHeader(), responseReturn: 'raw' });
  contractTable.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || items.length;
  const data = new clientData();
  data.dataTable = contractTable;
  data.list = items;
  data.total = total;
  return data;
}

/** 列表（不分页） */
export async function getContractList(params: any) {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const filterConds = [] as any[];
  const category = params?.contract_category ?? 0;
  filterConds.push(cond('contract_category', 'equal', category));
  if (params.customerId) {
    filterConds.push(
      or(
        cond('contract_party_a', 'equal', params.customerId),
        cond('contract_party_b', 'equal', params.customerId),
      ),
    );
  }
  if (params.businessId) filterConds.push(cond('project_id', 'equal', params.businessId));
  if (filterConds.length > 0) contractTable.Filter = and(...filterConds);
  if (!contractTable.Fields || contractTable.Fields.length === 0) {
      }

  const queryParam: any = { Table: [contractTable], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(contractTable.queryUrl, queryParam, { headers: contractTable.getRequestHeader(), responseReturn: 'raw' });
  contractTable.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || items.length;
  const data = new clientData();
  data.dataTable = contractTable;
  data.list = items;
  data.total = total;
  return data;
}

/** 合同详情 */
export async function getContract(id: string) {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  contractTable.Filter = cond(CONTRACT_PK, 'equal', id);
  if (!contractTable.Fields || contractTable.Fields.length === 0) {
      }
  const queryParam = { Table: [contractTable], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(contractTable.queryUrl, queryParam, { headers: contractTable.getRequestHeader(), responseReturn: 'raw' });
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

/** 合同下拉列表 */
export async function getContractSimpleList(customerId: number, category?: number) {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const cat = category ?? 0;
  contractTable.Filter = and(
    cond('contract_category', 'equal', cat),
    or(cond('contract_party_a', 'equal', customerId), cond('contract_party_b', 'equal', customerId)),
  );
  if (!contractTable.Fields || contractTable.Fields.length === 0) {
      }
  const queryParam = { Table: [contractTable], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(contractTable.queryUrl, queryParam, { headers: contractTable.getRequestHeader(), responseReturn: 'raw' });
  contractTable.execQueryResult(resQuery.data);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return resultData.Items || [];
}

/** 新增合同主表 */
export async function createContract(data: CrmContractApi.Contract) {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const saveParam = contractTable.getSaveParam([data], [], []);
  return await requestClient.post(contractTable.saveUrl, saveParam, { headers: contractTable.getRequestHeader() });
}

/** 更新合同主表 */
export async function updateContract(data: CrmContractApi.Contract) {
  await assertContractCanDirectEdit(String((data as any).rowid ?? (data as any).row_id ?? (data as any).id ?? ''));
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const saveParam = contractTable.getSaveParam([], [data], []);
  return await requestClient.post(contractTable.saveUrl, saveParam, { headers: contractTable.getRequestHeader() });
}

/** 删除合同 */
export async function deleteContract(id: number) {
  await assertContractCanDirectEdit(id);
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const saveParam = contractTable.getSaveParam([], [], [{ [CONTRACT_PK]: id }]);
  return await requestClient.post(contractTable.saveUrl, saveParam, { headers: contractTable.getRequestHeader() });
}

/** 导出合同 */
export async function exportContract(params: any, encodingId?: string) {
  if (encodingId) {
    return exportExcelByConfig({
      formId: CONTRACT_MODEL_ID,
      tableName: CONTRACT_TABLE,
      dbName: CONTRACT_DB,
      primaryKey: CONTRACT_PK,
      fileName: '收入合同',
      encodingId,
      extraData: {
        contract_category: params?.contract_category ?? 0,
        ...params,
      },
    });
  }

  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const filterConds = [] as any[];
  const category = params?.contract_category ?? 0;
  filterConds.push(cond('contract_category', 'equal', category));
  if (params.no) filterConds.push(cond('contract_no', 'contains', params.no));
  if (params.customerId) {
    filterConds.push(
      or(
        cond('contract_party_a', 'equal', params.customerId),
        cond('contract_party_b', 'equal', params.customerId),
      ),
    );
  }
  if (filterConds.length > 0) contractTable.Filter = and(...filterConds);
  if (!contractTable.Fields || contractTable.Fields.length === 0) {
      }
  const queryParam: any = { Table: [contractTable], PageParam: { page: 0, index: 1 } };
  return await requestClient.download(contractTable.queryUrl, { method: 'post', data: queryParam, headers: contractTable.getRequestHeader() });
}

/** 导入合同（复用导出 encodingId，若后端导入/导出方案分离请替换为独立 ID） */
export async function importContract(file: File, encodingId?: string) {
  return await importExcelByConfig({
    formId: CONTRACT_MODEL_ID,
    tableName: CONTRACT_TABLE,
    dbName: CONTRACT_DB,
    primaryKey: CONTRACT_PK,
    file,
    encodingId: encodingId || '511316A8D6E66896A720FFB46D0D8993',
    customPath: 'LMBContract',
    isReplace: false,
    isCrossEnt: false,
  });
}

/** 下载合同导入模板 */
export async function downloadContractImportTemplate(): Promise<Blob> {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
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

/** 提交审核 */
export async function submitContract(id: number) {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const submitData = { [CONTRACT_PK]: id, flowstate: 1 };
  const saveParam = contractTable.getSaveParam([], [submitData], []);
  return await requestClient.post(contractTable.saveUrl, saveParam, { headers: contractTable.getRequestHeader() });
}

/** 合同转移 */
export async function transferContract(data: any) {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const transferData = { [CONTRACT_PK]: data.id, salesperson: data.targetUserId, ownerUserId: data.targetUserId };
  const saveParam = contractTable.getSaveParam([], [transferData], []);
  return await requestClient.post(contractTable.saveUrl, saveParam, { headers: contractTable.getRequestHeader() });
}

/** 待审核合同数量 */
export async function getAuditContractCount() {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  contractTable.Filter = cond('flowstate', 'equal', 0);
  if (!contractTable.Fields || contractTable.Fields.length === 0) {
      }
  const queryParam = { Table: [contractTable], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(contractTable.queryUrl, queryParam, { headers: contractTable.getRequestHeader(), responseReturn: 'raw' });
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return resultData?.Count || 0;
}

/** 提醒合同数量（示例占位） */
export async function getRemindContractCount() {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  if (!contractTable.Fields || contractTable.Fields.length === 0) {
      }
  const queryParam = { Table: [contractTable], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(contractTable.queryUrl, queryParam, { headers: contractTable.getRequestHeader(), responseReturn: 'raw' });
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return resultData?.Count || 0;
}

/** 字典：公司类型（兼容原实现） */
export async function queryCompanyType() {
  const customerTable = createFinanceDataTable(CONTRACT_MODEL_ID, 'conState', CONTRACT_DB, CONTRACT_PK);
  customerTable.Type = '字典';
  const queryParam = { Table: [customerTable], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(customerTable.queryUrl, queryParam, { headers: customerTable.getRequestHeader(), responseReturn: 'raw' });
  customerTable.execQueryResult(resQuery);
  const items = resQuery.data?.Result?.data?.Items || [];
  const dicts = items.map((item: any) => ({ value: item.val, label: item.txt, orderIndex: item.ordIdx }));
  return dicts;
}

// 子表：合同产品
const CONTRACT_ORDER_TABLE = 'Bil_Contract_Product';
const CONTRACT_ORDER_PK = 'rowid';

export async function getContractOrderList(contractId: string) {
  const orderTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_ORDER_TABLE, CONTRACT_DB, CONTRACT_ORDER_PK);
  orderTable.Filter = and(cond('contract_id', 'equal', contractId), cond('lingma_sys_is_delete', 'notequal', 1));
  if (!orderTable.Fields || orderTable.Fields.length === 0) {
    // order
  }
  const queryParam = { Table: [orderTable], PageParam: { page: 0, index: 1 } };
  const res = await requestClient.post(orderTable.queryUrl, queryParam, { headers: orderTable.getRequestHeader(), responseReturn: 'raw' });
  orderTable.execQueryResult(res);
  const resultData = res.data?.Result?.data || res.data?.Result || res.data;
  return resultData?.Items || [];
}

export async function getContractProductList(contractId: string) {
  return await getContractOrderList(contractId);
}

export async function createContractWithProducts(contract: any, productRows: CrmContractApi.ContractOrderRow[]) {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const productTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_ORDER_TABLE, CONTRACT_DB, CONTRACT_ORDER_PK);
  const reqList = [...contractTable.getSaveParam([contract], [], []), ...productTable.getSaveParam(productRows, [], [])];
  return await requestClient.post(contractTable.saveUrl, reqList, { headers: contractTable.getRequestHeader() });
}

export async function updateContractWithProducts(contract: any, productRows: CrmContractApi.ContractOrderRow[]) {
  await assertContractCanDirectEdit(String(contract?.rowid ?? contract?.row_id ?? contract?.id ?? ''));
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const productTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_ORDER_TABLE, CONTRACT_DB, CONTRACT_ORDER_PK);
  const old = await getContractOrderList(String(contract.rowid));
  const delList = (old || []).map((r: any) => ({ [CONTRACT_ORDER_PK]: r[CONTRACT_ORDER_PK] }));
  const reqList = [...contractTable.getSaveParam([], [contract], []), ...productTable.getSaveParam(productRows, [], delList)];
  return await requestClient.post(contractTable.saveUrl, reqList, { headers: contractTable.getRequestHeader() });
}

const CONTRACT_CODE_RULE_ID = '22FFD104539A47D4D6AE9ED183282C3B';
const CONTRACT_ORDER_CODE_RULE_ID = 'B54094EAC60F0B95DF6B68818CF1A5C9';

async function updateContractNo(contractId: string, contractNo: string) {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const saveParam = contractTable.getSaveParam([], [{ rowid: contractId, contract_no: contractNo }], []);
  return await requestClient.post(contractTable.saveUrl, saveParam, { headers: contractTable.getRequestHeader() });
}

async function updateContractOrderReportIds(rows: Array<{ rowid: string; ReportID: string }>) {
  if (!rows.length) return;
  const orderTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_ORDER_TABLE, CONTRACT_DB, CONTRACT_ORDER_PK);
  const saveParam = orderTable.getSaveParam([], rows as any, []);
  return await requestClient.post(orderTable.saveUrl, saveParam, { headers: orderTable.getRequestHeader() });
}

export async function createContractWithProductsAndPlans(
  contract: any,
  productRows: CrmContractApi.ContractOrderRow[],
  planRows: CrmContractApi.ContractSettlementPlanRow[],
) {
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const productTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_ORDER_TABLE, CONTRACT_DB, CONTRACT_ORDER_PK);
  const planTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_PLAN_TABLE, CONTRACT_DB, CONTRACT_PLAN_PK);

  const contractId = String(contract?.rowid || generateUUID());
  contract = { ...contract, rowid: contractId };

  const prodRows = (productRows ?? []).map((r) => ({ ...r, rowid: String((r as any).rowid || (r as any).id || generateUUID()), contract_id: contractId, lingma_sys_is_delete: (r as any).lingma_sys_is_delete ?? 0 }));
  const plans = (planRows ?? []).map((r) => ({ ...r, rowid: String((r as any).rowid || generateUUID()), contract_id: contractId }));

  const reqList = [
    ...contractTable.getSaveParam([contract], [], []),
    ...productTable.getSaveParam(prodRows, [], []),
    ...planTable.getSaveParam(plans, [], []),
  ];

  const res = await requestClient.post(contractTable.saveUrl, reqList, { headers: contractTable.getRequestHeader() });

  const contractCodeRes = await getCodeString(contractId, CONTRACT_CODE_RULE_ID, contractTable.getRequestHeader());
  if (contractCodeRes?.Code === 200 && contractCodeRes?.Message) {
    await updateContractNo(contractId, contractCodeRes.Message);
  } else {
    throw new Error(contractCodeRes?.Message || '获取合同编码失败');
  }

  if (prodRows.length > 0) {
    const updates: Array<{ rowid: string; ReportID: string }> = [];
    for (const r of prodRows) {
      const codeRes = await getCodeString(String((r as any).rowid), CONTRACT_ORDER_CODE_RULE_ID, productTable.getRequestHeader());
      if (codeRes?.Code === 200 && codeRes?.Message) {
        updates.push({ rowid: String((r as any).rowid), ReportID: codeRes.Message });
      } else {
        throw new Error(codeRes?.Message || '获取合同产品编码失败');
      }
    }
    await updateContractOrderReportIds(updates);
  }

  return res;
}

export async function updateContractWithProductsAndPlans(
  contract: any,
  productRows: CrmContractApi.ContractOrderRow[],
  planRows: CrmContractApi.ContractSettlementPlanRow[],
) {
  await assertContractCanDirectEdit(String(contract?.rowid ?? contract?.row_id ?? contract?.id ?? ''));
  const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
  const productTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_ORDER_TABLE, CONTRACT_DB, CONTRACT_ORDER_PK);
  const planTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_PLAN_TABLE, CONTRACT_DB, CONTRACT_PLAN_PK);

  const contractId = String(contract.rowid);
  const oldProducts = await getContractProductList(contractId);
  const oldPlans = await getContractPlanList(contractId);

  const oldProductIdSet = new Set((oldProducts || []).map((r: any) => String(r.rowid)));
  const incomingProducts = (productRows ?? []).map((r) => ({ ...r, contract_id: contractId, rowid: String((r as any).rowid || (r as any).id || generateUUID()), lingma_sys_is_delete: (r as any).lingma_sys_is_delete ?? 0 }));

  const productInsert = incomingProducts.filter((r) => !oldProductIdSet.has(String((r as any).rowid)));
  const productUpdate = incomingProducts.filter((r) => oldProductIdSet.has(String((r as any).rowid)));
  const productDelete = (oldProducts || [])
    .filter((r: any) => !incomingProducts.some((ip) => String((ip as any).rowid) === String(r.rowid)))
    .map((r: any) => ({ rowid: r.rowid }));

  const oldPlanIdSet = new Set((oldPlans || []).map((r: any) => String(r.rowid)));
  const incomingPlans = (planRows ?? []).map((r) => ({ ...r, contract_id: contractId }));
  const planInsert = incomingPlans
    .filter((r) => !r.rowid || !oldPlanIdSet.has(String(r.rowid)))
    .map((r) => ({ ...r, rowid: r.rowid || generateUUID() }));
  const planUpdate = incomingPlans.filter((r) => r.rowid && oldPlanIdSet.has(String(r.rowid)));
  const planDelete = (oldPlans || [])
    .filter((r: any) => !incomingPlans.some((ip) => String(ip.rowid) === String(r.rowid)))
    .map((r: any) => ({ rowid: r.rowid }));

  const reqList = [
    ...contractTable.getSaveParam([], [contract], []),
    ...productTable.getSaveParam(productInsert, productUpdate, productDelete),
    ...planTable.getSaveParam(planInsert, planUpdate, planDelete),
  ];

  return await requestClient.post(contractTable.saveUrl, reqList, { headers: contractTable.getRequestHeader() });
}

// 子表：合同收款计划
const CONTRACT_PLAN_TABLE = 'Bil_Contract_settlement_plan';
const CONTRACT_PLAN_PK = 'rowid';

export async function getContractPlanList(contractId: string) {
  const planTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_PLAN_TABLE, CONTRACT_DB, CONTRACT_PLAN_PK);
  planTable.Filter = and(cond('contract_id', 'equal', contractId), cond('lingma_sys_is_delete', 'notequal', 1));
  if (!planTable.Fields || planTable.Fields.length === 0) {
    // planTable.Fields = [{ Name: 'createtime', AsName: '', OrderType: 'descending', Order: 1, Group: 0 }];
  }
  const queryParam = { Table: [planTable], PageParam: { page: 0, index: 1 } };
  const res = await requestClient.post(planTable.queryUrl, queryParam, { headers: planTable.getRequestHeader(), responseReturn: 'raw' });
  planTable.execQueryResult(res);
  const resultData = res.data?.Result?.data || res.data?.Result || res.data;
  return resultData?.Items || [];
}
