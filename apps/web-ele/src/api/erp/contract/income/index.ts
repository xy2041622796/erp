import { generateUUID } from '@vben/utils';

import { createIncomeSettlement } from '#/api/erp/finance/revenue/settlement';
import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

export namespace CrmContractApi {
  /** 合同信息 - 完全沿用原有结构，字段格式统一对齐erp风格 */
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
    rowid?: string; // 新增数据库主键字段
  }

  /** 合同产品信息 */
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
    rowid?: string; // 新增数据库主键字段
  }

  export interface ContractOrderRow {
    /** Bil_Contract_Product 主键（rowid） */
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
    rowid?: null | string;
    contract_id: string;

    plan_period?: string; // 期次（如：第1期）
    plan_date?: string; // 建议 YYYY-MM-DD
    plan_amount?: number;

    settlement_type?: number | string;
    is_auto?: number; // 0/1
    is_overdue?: number; // 0/1
    remark?: string;

    lingma_sys_is_delete?: number;
  }
}

// ===================== 合同数据表核心配置 (完全对应你的 Bil_contract_info 表) =====================
export const CONTRACT_MODEL_ID = 'A360801B9108B34DEE305B4EE18584E7'; // 复用你原有企业表的DbId，通用合同库ID
const CONTRACT_TABLE = 'Bil_contract_info'; // 你的合同物理表名
const CONTRACT_DB = 'LMBill'; // 你的合同库名
const CONTRACT_PK = 'rowid';

async function assertContractCanDirectEdit(contractId: string | number) {
  const id = String(contractId || '').trim();
  if (!id) return;
  const detail = await getContract(id);
  if (Number((detail as any)?.ConState) !== 0) {
    throw new Error('当前合同状态不允许直接编辑，请通过合同变更处理');
  }
} // 数据库主键字段

// ===================== 所有接口方法 - 完全复刻 ErpSaleOrderApi 格式 =====================
/** 查询合同列表（分页） */
/** 查询合同列表（分页） */
export async function getContractPage(params: any) {
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  console.log('getContractPage');
  // 构建查询条件
  const filterConds = [];
  // ✅ 收入合同：查询始终限定合同类别=0
  filterConds.push(cond('contract_category', 'equal', 0));

  const contractNo = params.contract_no ?? params.no;
  if (contractNo) filterConds.push(cond('contract_no', 'contains', contractNo));

  const contractName = params.contract_name;
  if (contractName) filterConds.push(cond('contract_name', 'contains', contractName));

  const customerId = params.contract_party_b ?? params.customerId;
  if (customerId) filterConds.push(cond('customerId', 'equal', customerId));

  if (params.businessId)
    filterConds.push(cond('project_id', 'equal', params.businessId));
  // if (params.auditStatus) filterConds.push(cond('flowstate', 'equal', params.auditStatus)); // 注释无用条件
  if (params.ownerUserId)
    filterConds.push(cond('salesperson', 'equal', params.ownerUserId));
  if (params.ConState !== undefined)
    filterConds.push(cond('ConState', 'equal', params.ConState)); // ✅新增ConState条件
  if (filterConds.length > 0) contractTable.Filter = and(...filterConds);
  if (!contractTable.Fields || contractTable.Fields.length === 0) {

  }
  const queryParam: any = {
    Table: [contractTable],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(
    contractTable.queryUrl,
    queryParam,
    {
      headers: contractTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  contractTable.execQueryResult(resQuery);

  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items =
    resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);
  const contractData = new clientData();
  contractData.dataTable = contractTable;
  contractData.list = items;
  contractData.total = total;
  return contractData;
}

/** 查询合同列表，基于指定客户 */
export async function getContractPageByCustomer(params: any) {
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  // 客户维度过滤
  const filterConds = [];
  // ✅ 收入合同：查询始终限定合同类别=0
  filterConds.push(cond('contract_category', 'equal', 0));
  if (params.customerId)
    filterConds.push(cond('customerId', 'equal', params.customerId));
  if (params.no) filterConds.push(cond('contract_no', 'contains', params.no));
  if (filterConds.length > 0) contractTable.Filter = and(...filterConds);
  if (!contractTable.Fields || contractTable.Fields.length === 0) {

  }

  const queryParam: any = {
    Table: [contractTable],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(
    contractTable.queryUrl,
    queryParam,
    {
      headers: contractTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  contractTable.execQueryResult(resQuery);
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items =
    resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || items.length;
  const contractData = new clientData();
  contractData.dataTable = contractTable;
  contractData.list = items;
  contractData.total = total;
  return contractData;
}

/** 查询合同列表，基于指定商机 */
export async function getContractPageByBusiness(params: any) {
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  // 商机维度过滤 (商机ID对应 project_id)
  const filterConds = [];
  // ✅ 收入合同：查询始终限定合同类别=0
  filterConds.push(cond('contract_category', 'equal', 0));
  if (params.businessId)
    filterConds.push(cond('project_id', 'equal', params.businessId));
  if (params.no) filterConds.push(cond('contract_no', 'contains', params.no));
  if (filterConds.length > 0) contractTable.Filter = and(...filterConds);
  if (!contractTable.Fields || contractTable.Fields.length === 0) {

  }

  const queryParam: any = {
    Table: [contractTable],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(
    contractTable.queryUrl,
    queryParam,
    {
      headers: contractTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  contractTable.execQueryResult(resQuery);
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items =
    resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || items.length;
  const contractData = new clientData();
  contractData.dataTable = contractTable;
  contractData.list = items;
  contractData.total = total;
  return contractData;
}

/** 查询合同详情 */
export async function getContract(id: string) {
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
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
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const detail = (resultData?.Items && resultData.Items[0]) || null;

  if (!detail) return null;

  // ✅ 补充子表：合同产品
  const productItems = await getContractProductList(String(id));
  (detail as any).product_items = productItems;
  (detail as any).products = productItems;
  const planItems = await getContractPlanList(String(id));
  (detail as any).plan_items = planItems;

  return detail;
}

/** 查询合同下拉列表 */
export async function getContractSimpleList(customerId: number) {
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  contractTable.Filter = and(
    cond('contract_category', 'equal', 0),
    cond('customerId', 'equal', customerId),
  );
  if (!contractTable.Fields || contractTable.Fields.length === 0) {

  }
  const queryParam = {
    Table: [contractTable],
    PageParam: { page: 0, index: 1 },
  };
  const resQuery = await requestClient.post(
    contractTable.queryUrl,
    queryParam,
    {
      headers: contractTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );
  contractTable.execQueryResult(resQuery.data);
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return resultData.Items || [];
}

/** 新增合同 */
export async function createContract(data: CrmContractApi.Contract) {
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  const saveParam = contractTable.getSaveParam([data], [], []);
  return await requestClient.post(contractTable.saveUrl, saveParam, {
    headers: contractTable.getRequestHeader(),
  });
}

/** 修改合同 */
export async function updateContract(data: CrmContractApi.Contract) {
  await assertContractCanDirectEdit(String((data as any).rowid ?? (data as any).row_id ?? (data as any).id ?? ''));
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  const saveParam = contractTable.getSaveParam([], [data], []);
  return await requestClient.post(contractTable.saveUrl, saveParam, {
    headers: contractTable.getRequestHeader(),
  });
}

/** 删除合同 */
export async function deleteContract(id: number) {
  await assertContractCanDirectEdit(id);
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  const saveParam = contractTable.getSaveParam([], [], [{ [CONTRACT_PK]: id }]);
  return await requestClient.post(contractTable.saveUrl, saveParam, {
    headers: contractTable.getRequestHeader(),
  });
}

/** 导出合同 */
export async function exportContract(params: any) {
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  const filterConds = [];
  // ✅ 收入合同：导出同样限定合同类别=0
  filterConds.push(cond('contract_category', 'equal', 0));
  if (params.no) filterConds.push(cond('contract_no', 'contains', params.no));
  if (params.customerId)
    filterConds.push(cond('customerId', 'equal', params.customerId));
  if (filterConds.length > 0) contractTable.Filter = and(...filterConds);
  if (!contractTable.Fields || contractTable.Fields.length === 0) {

  }

  const queryParam: any = {
    Table: [contractTable],
    PageParam: { page: 0, index: 1 },
  };

  return await requestClient.download(contractTable.queryUrl, {
    method: 'post',
    data: queryParam,
    headers: contractTable.getRequestHeader(),
  });
}

/** 提交审核 */
export async function submitContract(id: number) {
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  const submitData = {
    [CONTRACT_PK]: id,
    flowstate: 1, // 提交审核=流转中状态码
  };
  const saveParam = contractTable.getSaveParam([], [submitData], []);
  return await requestClient.post(contractTable.saveUrl, saveParam, {
    headers: contractTable.getRequestHeader(),
  });
}

/** 合同转移 */
export async function transferContract(data: any) {
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  const transferData = {
    [CONTRACT_PK]: data.id,
    salesperson: data.targetUserId, // 负责人转移=业务员字段赋值
    ownerUserId: data.targetUserId,
  };
  const saveParam = contractTable.getSaveParam([], [transferData], []);
  return await requestClient.post(contractTable.saveUrl, saveParam, {
    headers: contractTable.getRequestHeader(),
  });
}

/** 获得待审核合同数量 */
export async function getAuditContractCount() {
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  contractTable.Filter = cond('flowstate', 'equal', 0); // 待审核状态码
  if (!contractTable.Fields || contractTable.Fields.length === 0) {

  }
  const queryParam = {
    Table: [contractTable],
    PageParam: { page: 0, index: 1 },
  };
  const resQuery = await requestClient.post(
    contractTable.queryUrl,
    queryParam,
    {
      headers: contractTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return resultData?.Count || 0;
}

/** 获得即将到期（提醒）的合同数量 */
export async function getRemindContractCount() {
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  // contractTable.Filter = cond('contract_end_date', 'lt', new Date()); // 结束日期小于当前=即将到期/已到期
  if (!contractTable.Fields || contractTable.Fields.length === 0) {

  }
  const queryParam = {
    Table: [contractTable],
    PageParam: { page: 0, index: 1 },
  };
  const resQuery = await requestClient.post(
    contractTable.queryUrl,
    queryParam,
    {
      headers: contractTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return resultData?.Count || 0;
}

export async function queryCompanyType() {
  const customerTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    'conState',
    CONTRACT_DB,
    CONTRACT_PK,
  );
  customerTable.Type = '字典';

  const queryParam = {
    Table: [customerTable],
    PageParam: {
      page: 0,
      index: 1,
    },
  };

  const resQuery = await requestClient.post(
    customerTable.queryUrl,
    queryParam,
    {
      headers: customerTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  // 使用后端返回的原始数据执行权限解析
  customerTable.execQueryResult(resQuery);

  // 提取数据
  const items = resQuery.data?.Result?.data?.Items || [];
  if (items.length === 0) {
    return []; // 如果没有数据，返回空数组
  }

  // 映射为前端使用的对象结构
  const dicts = items.map((item: any) => ({
    value: item.val, // 对应后端的 "val"
    label: item.txt, // 对应后端的 "txt"
    orderIndex: item.ordIdx, // 对应后端的 "ordIdx"
  }));

  return dicts; // 返回所有数据
}

// 子表：合同产品
const CONTRACT_ORDER_TABLE = 'Bil_Contract_Product';
const CONTRACT_ORDER_PK = 'rowid';

/** 合同订单列表（按合同ID） */
export async function getContractOrderList(contractId: string) {
  const orderTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_ORDER_TABLE,
    CONTRACT_DB,
    CONTRACT_ORDER_PK,
  );
  orderTable.Filter = and(
    cond('contract_id', 'equal', contractId),
    cond('lingma_sys_is_delete', 'notequal', 1),
  );
  if (!orderTable.Fields || orderTable.Fields.length === 0) {
    orderTable.Fields = [
      // {
      //   Name: 'createtime',
      //   AsName: '',
      //   OrderType: 'descending',
      //   Order: 1,
      //   Group: 0,
      // },
    ];
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

/** 兼容旧调用：原“合同产品”接口改为返回合同订单 */
export async function getContractProductList(contractId: string) {
  return await getContractOrderList(contractId);
}

/** 新增合同（含产品子表） */
export async function createContractWithProducts(
  contract: any,
  productRows: CrmContractApi.ContractOrderRow[],
) {
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  const productTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_ORDER_TABLE,
    CONTRACT_DB,
    CONTRACT_ORDER_PK,
  );

  const reqList = [
    ...contractTable.getSaveParam([contract], [], []),
    ...productTable.getSaveParam(productRows, [], []),
  ];

  return await requestClient.post(contractTable.saveUrl, reqList, {
    headers: contractTable.getRequestHeader(),
  });
}

/** 更新合同（含产品子表：采用“先删后插”替换策略，最稳） */
export async function updateContractWithProducts(
  contract: any,
  productRows: CrmContractApi.ContractOrderRow[],
) {
  await assertContractCanDirectEdit(String(contract?.rowid ?? contract?.row_id ?? contract?.id ?? ''));
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  const productTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_ORDER_TABLE,
    CONTRACT_DB,
    CONTRACT_ORDER_PK,
  );

  // 1) 查出旧子表，全部删除（或做软删也行，这里用 delete 列表）
  const old = await getContractOrderList(String(contract.rowid));
  const delList = (old || []).map((r: any) => ({
    [CONTRACT_ORDER_PK]: r[CONTRACT_ORDER_PK],
  }));

  // ✅ 同样拼成数组
  const reqList = [
    ...contractTable.getSaveParam([], [contract], []),
    ...productTable.getSaveParam(productRows, [], delList),
  ];

  return await requestClient.post(contractTable.saveUrl, reqList, {
    headers: contractTable.getRequestHeader(),
  });
}

// ✅ 子表：合同收款计划
const CONTRACT_PLAN_TABLE = 'Bil_Contract_settlement_plan';
const CONTRACT_PLAN_PK = 'rowid';
/** 收款计划列表（按合同ID） */
export async function getContractPlanList(contractId: string) {
  const planTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_PLAN_TABLE,
    CONTRACT_DB,
    CONTRACT_PLAN_PK,
  );

  planTable.Filter = and(
    cond('contract_id', 'equal', contractId),
    cond('lingma_sys_is_delete', 'notequal', 1),
  );

  if (!planTable.Fields || planTable.Fields.length === 0) {
    planTable.Fields = [
      // {
      //   Name: 'createtime',
      //   AsName: '',
      //   OrderType: 'descending',
      //   Order: 1,
      //   Group: 0,
      // },
    ];
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
  return resultData?.Items || [];
}

/**
 * ✅ 新增合同（含：产品子表 + 收款计划子表）
 * 说明：保持你现有 createContractWithProducts 的模式，但加上 plans
 */
// export async function createContractWithProductsAndPlans(
//   contract: any,
//   productRows: CrmContractApi.ContractProductRow[],
//   planRows: CrmContractApi.ContractSettlementPlanRow[],
// ) {
//   const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
//   const productTable = createFinanceDataTable(CONTRACT_MODEL_ID, 'Bil_Contract_Product', CONTRACT_DB, 'rowid');
//   const planTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_PLAN_TABLE, CONTRACT_DB, CONTRACT_PLAN_PK);

//   const reqList = [
//     ...contractTable.getSaveParam([contract], [], []),
//     ...productTable.getSaveParam(productRows ?? [], [], []),
//     ...planTable.getSaveParam(planRows ?? [], [], []),
//   ];

//   return await requestClient.post(contractTable.saveUrl, reqList, {
//     headers: contractTable.getRequestHeader(),
//   });
// }

/**
 * ✅ 更新合同（含：产品子表 + 收款计划子表）
 * 策略：先查旧子表 -> delete -> 再 insert 新子表（最稳、最像采购模板）
 */
// export async function updateContractWithProductsAndPlans(
//   contract: any,
//   productRows: CrmContractApi.ContractProductRow[],
//   planRows: CrmContractApi.ContractSettlementPlanRow[],
// ) {
//   const contractTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_TABLE, CONTRACT_DB, CONTRACT_PK);
//   const productTable = createFinanceDataTable(CONTRACT_MODEL_ID, 'Bil_Contract_Product', CONTRACT_DB, 'rowid');
//   const planTable = createFinanceDataTable(CONTRACT_MODEL_ID, CONTRACT_PLAN_TABLE, CONTRACT_DB, CONTRACT_PLAN_PK);

//   const oldProducts = await getContractProductList(String(contract.rowid));
//   const delProducts = (oldProducts || []).map((r: any) => ({ rowid: r.rowid }));

//   const oldPlans = await getContractPlanList(String(contract.rowid));
//   const delPlans = (oldPlans || []).map((r: any) => ({ rowid: r.rowid }));

//   const reqList = [
//     ...contractTable.getSaveParam([], [contract], []),
//     ...productTable.getSaveParam(productRows ?? [], [], delProducts),
//     ...planTable.getSaveParam(planRows ?? [], [], delPlans),
//   ];

//   return await requestClient.post(contractTable.saveUrl, reqList, {
//     headers: contractTable.getRequestHeader(),
//   });
// }

const CONTRACT_CODE_RULE_ID = '22FFD104539A47D4D6AE9ED183282C3B';
const CONTRACT_ORDER_CODE_RULE_ID = 'B54094EAC60F0B95DF6B68818CF1A5C9';
// ✅ 更新合同编码（写 contract_no）
async function updateContractNo(contractId: string, contractNo: string) {
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  const saveParam = contractTable.getSaveParam(
    [],
    [{ rowid: contractId, contract_no: contractNo }],
    [],
  );
  return await requestClient.post(contractTable.saveUrl, saveParam, {
    headers: contractTable.getRequestHeader(),
  });
}

// ✅ 批量回写合同产品行编码（写 ReportID，主键为 rowid）
async function updateContractOrderReportIds(
  rows: Array<{ ReportID: string; rowid: string }>,
) {
  if (rows.length === 0) return;
  const orderTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_ORDER_TABLE,
    CONTRACT_DB,
    CONTRACT_ORDER_PK,
  );
  const saveParam = orderTable.getSaveParam([], rows as any, []);
  return await requestClient.post(orderTable.saveUrl, saveParam, {
    headers: orderTable.getRequestHeader(),
  });
}

export async function createContractWithProductsAndPlans(
  contract: any,
  productRows: CrmContractApi.ContractOrderRow[],
  planRows: CrmContractApi.ContractSettlementPlanRow[],
) {
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  const productTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_ORDER_TABLE,
    CONTRACT_DB,
    CONTRACT_ORDER_PK,
  );
  const planTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_PLAN_TABLE,
    CONTRACT_DB,
    CONTRACT_PLAN_PK,
  );

  // ✅ 确保主表 rowid 存在（新增时用同一个ID给子表 contract_id）
  const contractId = String(contract?.rowid || generateUUID());
  contract = { ...contract, rowid: contractId };

  // ✅ 产品子表：确保行有 rowid
  const prodRows = (productRows ?? []).map((r) => ({
    ...r,
    rowid: String((r as any).rowid || (r as any).id || generateUUID()),
    contract_id: contractId,
    lingma_sys_is_delete: (r as any).lingma_sys_is_delete ?? 0,
  }));

  // ✅ 确保计划子表每行都有 rowid
  const plans = (planRows ?? []).map((r) => ({
    ...r,
    rowid: String((r as any).rowid || generateUUID()),
    contract_id: contractId,
  }));

  // 1) 一次性保存：主表 + 产品子表 + 计划子表
  const reqList = [
    ...contractTable.getSaveParam([contract], [], []),
    ...productTable.getSaveParam(prodRows, [], []),
    ...planTable.getSaveParam(plans, [], []),
  ];

  const res = await requestClient.post(contractTable.saveUrl, reqList, {
    headers: contractTable.getRequestHeader(),
  });

  // 2) 保存成功后：获取“合同编码”并回写到 contract_no
  const contractCodeRes = await getCodeString(
    contractId,
    CONTRACT_CODE_RULE_ID,
    contractTable.getRequestHeader(),
  );
  if (contractCodeRes?.Code === 200 && contractCodeRes?.Message) {
    await updateContractNo(contractId, contractCodeRes.Message);
  } else {
    // 可选：失败时你想回滚（删除主表/子表）的话再补，这里先直接抛错
    throw new Error(contractCodeRes?.Message || '获取合同编码失败');
  }

  // 3) 获取“合同产品行编码”并批量回写到 Bil_Contract_Product.ReportID
  if (prodRows.length > 0) {
    const updates: Array<{ ReportID: string; rowid: string }> = [];

    for (const r of prodRows) {
      const codeRes = await getCodeString(
        String((r as any).rowid),
        CONTRACT_ORDER_CODE_RULE_ID,
        productTable.getRequestHeader(),
      );
      if (codeRes?.Code === 200 && codeRes?.Message) {
        updates.push({
          rowid: String((r as any).rowid),
          ReportID: codeRes.Message,
        });
      } else {
        throw new Error(codeRes?.Message || '获取合同产品编码失败');
      }
    }

    await updateContractOrderReportIds(updates);
  }

  // 4) 新增收入合同时，自动创建对应的收入结算单
  const settlementData = {
    contract_id: contractId,
    customer_id: contract.contract_party_b,
    project_id: contract.project_id,
    salesman_id: contract.salesperson,
    depart_id: contract.deptid,
    product_name:
      prodRows.length > 0
        ? String((prodRows[0] as any)?.product_name || '') || ''
        : '',
    amount: contract.contract_amount,
    total_amount: contract.contract_total_amount,
    tax_rate: contract.contract_tax_rate,
    status: 0, // 草稿
    settlement_type: 0, // 正常
    lingma_sys_is_delete: 0,
    flowstate: 0,
    createuser: contract.createuser || 'system', // 默认系统
  };
  await createIncomeSettlement(settlementData);

  return res;
}

/**
 * ✅ 更新合同（含：产品子表 + 收款计划子表）
 * 策略：精准分流（新增行insert / 修改行update / 删除行delete）
 */
export async function updateContractWithProductsAndPlans(
  contract: any,
  productRows: CrmContractApi.ContractOrderRow[],
  planRows: CrmContractApi.ContractSettlementPlanRow[],
) {
  await assertContractCanDirectEdit(String(contract?.rowid ?? contract?.row_id ?? contract?.id ?? ''));
  const contractTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_TABLE,
    CONTRACT_DB,
    CONTRACT_PK,
  );
  const productTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_ORDER_TABLE,
    CONTRACT_DB,
    CONTRACT_ORDER_PK,
  );
  const planTable = createFinanceDataTable(
    CONTRACT_MODEL_ID,
    CONTRACT_PLAN_TABLE,
    CONTRACT_DB,
    CONTRACT_PLAN_PK,
  );

  const contractId = String(contract.rowid);

  // --- 1. 获取旧数据 ---
  const oldProducts = await getContractProductList(contractId);
  const oldPlans = await getContractPlanList(contractId);

  // --- 2. 产品子表分流逻辑 ---
  const oldProductIdSet = new Set(
    (oldProducts || []).map((r: any) => String(r.rowid)),
  );
  const incomingProducts = (productRows ?? []).map((r) => ({
    ...r,
    contract_id: contractId,
    rowid: String((r as any).rowid || (r as any).id || generateUUID()),
    lingma_sys_is_delete: (r as any).lingma_sys_is_delete ?? 0,
  }));

  const productInsert = incomingProducts.filter(
    (r) => !oldProductIdSet.has(String((r as any).rowid)),
  );
  const productUpdate = incomingProducts.filter((r) =>
    oldProductIdSet.has(String((r as any).rowid)),
  );
  const productDelete = (oldProducts || [])
    .filter(
      (r: any) =>
        !incomingProducts.some(
          (ip) => String((ip as any).rowid) === String(r.rowid),
        ),
    )
    .map((r: any) => ({ rowid: r.rowid }));

  // --- 3. 计划子表分流逻辑 ---
  const oldPlanIdSet = new Set(
    (oldPlans || []).map((r: any) => String(r.rowid)),
  );
  const incomingPlans = (planRows ?? []).map((r) => ({
    ...r,
    contract_id: contractId,
  }));

  const planInsert = incomingPlans
    .filter((r) => !r.rowid || !oldPlanIdSet.has(String(r.rowid)))
    .map((r) => ({ ...r, rowid: r.rowid || generateUUID() }));
  const planUpdate = incomingPlans.filter(
    (r) => r.rowid && oldPlanIdSet.has(String(r.rowid)),
  );
  const planDelete = (oldPlans || [])
    .filter(
      (r: any) =>
        !incomingPlans.some((ip) => String(ip.rowid) === String(r.rowid)),
    )
    .map((r: any) => ({ rowid: r.rowid }));

  // --- 4. 组装请求 ---
  const reqList = [
    ...contractTable.getSaveParam([], [contract], []),
    ...productTable.getSaveParam(productInsert, productUpdate, productDelete),
    ...planTable.getSaveParam(planInsert, planUpdate, planDelete),
  ];

  return await requestClient.post(contractTable.saveUrl, reqList, {
    headers: contractTable.getRequestHeader(),
  });
}
