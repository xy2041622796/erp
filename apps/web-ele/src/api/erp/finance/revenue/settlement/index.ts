import type { PageParam } from '@vben/request';

import { generateUUID, isEmpty } from '@vben/utils';

import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';
import { createFinanceDataTable } from '../../common/account-set-scope';

export namespace ErpIncomeSettlementApi {
  export interface IncomeSettlementItem {
    product_id?: string;
    product_name?: string;
    specification?: string;
    unit?: string;
    income_category?: string;
    num?: number;
    unit_price?: number;
    discount?: number;
    tax_rate?: number;
    amount?: number;
    remark?: string;
  }

  /** 收入结算（Bil_Income_Settlement） */
  export interface IncomeSettlement {
    rowid?: string;
    createuser?: string;
    createtime?: Date | string;
    updateuser?: string;
    updatetime?: Date | string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;

    settlement_type?: number;
    status?: number;
    receive_account?: string;
    total_amount?: number;
    is_tax_included?: number;
    tax_rate?: number;
    amount?: number;
    income_category?: string;
    product_name?: string;
    product_id?: string;
    project_id?: string;
    depart_id?: string;
    salesman_id?: string;
    contract_id?: string;
    settlement_date?: Date | string;
    account_period?: Date | string;
    settlement_no?: string;
    customer_id?: string;
    remark?: string;
    settlement_period?: string;
    ticket_amount?: number;
    receive_balance?: number;
    receive_amount?: number;
    subject_type?: string | number;

    items?: IncomeSettlementItem[];
  }
}

// 注意：此处需要替换为你们 Bil_Income_Settlement 的真实 formkey
export const SETTLEMENT_MODEL_ID = '0FDA7AC1358501C3456DD9ABDC97C642';
const SETTLEMENT_TABLE = 'Bil_Income_Settlement';
const SETTLEMENT_DB = 'LMBill';
const SETTLEMENT_PK = 'rowid';

// const SETTLEMENT_ITEM_TABLE = 'Bil_Contract_Order';
const SETTLEMENT_ITEM_TABLE = 'Bil_Settlement_Order';
const SETTLEMENT_ITEM_PK = 'id';
const SETTLEMENT_PLAN_REL_TABLE = 'Bil_Settlement_Plan_Rel';
const SETTLEMENT_PLAN_REL_PK = 'rowid';

// Sales Order Table Info (Sync from sale/order/index.ts)
const SALE_ORDER_MODEL_ID = '58AE739462369587E5B51B79D4C57A05';
const SALE_ORDER_TABLE = 'erp_sale_order';
const SALE_ORDER_DB = 'LMBill';
const SALE_ORDER_PK = 'id';

// 注意：此处需要替换为你们“收入结算单号”的编码规则ID
const SETTLEMENT_NO_RULE_ID = '238AFDE76F53BEF244AE4910B1E9BCE5';

async function updateIncomeSettlementNo(rowid: string, settlementNo: string) {
  const table = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_PK,
  );

  const saveParam = table.getSaveParam(
    [],
    [{ rowid, settlement_no: settlementNo } as any],
    [],
  );
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function getIncomeSettlementPage(
  params: any & PageParam,
): Promise<clientData> {
  const table = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_PK,
  );

  const conditions: any[] = [cond('lingma_sys_is_delete', 'equal', 0)];

  if (params.settlement_no) {
    conditions.push(cond('settlement_no', 'contains', params.settlement_no));
  }
  if (params.customer_id) {
    conditions.push(cond('customer_id', 'equal', params.customer_id));
  }
  if (params.project_id) {
    conditions.push(cond('project_id', 'equal', params.project_id));
  }
  if (params.contract_id) {
    conditions.push(cond('contract_id', 'equal', params.contract_id));
  }
  if (Array.isArray(params.status)) {
    if (params.status.length > 0) {
      conditions.push(cond('status', 'in', params.status));
    }
  } else if (!isEmpty(params.status)) {
    conditions.push(cond('status', 'equal', params.status));
  }
  if (params.rowids && Array.isArray(params.rowids) && params.rowids.length > 0) {
    conditions.push(cond(SETTLEMENT_PK, 'in', params.rowids));
  }
  if (Array.isArray(params.settlement_type)) {
    if (params.settlement_type.length > 0) {
      conditions.push(cond('settlement_type', 'in', params.settlement_type));
    }
  } else if (!isEmpty(params.settlement_type)) {
    conditions.push(cond('settlement_type', 'equal', params.settlement_type));
  }
  if (
    params.settlement_date &&
    Array.isArray(params.settlement_date) &&
    params.settlement_date.length === 2
  ) {
    conditions.push(
      cond('settlement_date', 'greaterthanorequal', params.settlement_date[0]),
    );
    conditions.push(
      cond('settlement_date', 'lessthanorequal', params.settlement_date[1]),
    );
  }

  table.Filter = and(...conditions);

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);

  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = items;
  returnData.total = total;
  return returnData;
}

export async function getIncomeSettlementOrderSummaryMap(
  settlementIds: string[],
) {
  const ids = Array.from(
    new Set((settlementIds || []).map((id) => String(id || '').trim()).filter(Boolean)),
  );
  const map = new Map<string, { orderCount: number; firstOrderNo: string }>();
  if (ids.length === 0) return map;

  const table = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_ITEM_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_ITEM_PK,
  );
  table.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond('settlement_id', 'in', ids),
  );

  const queryParam = {
    Table: [table],
    PageParam: { page: 1000, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items =
    resultData && Array.isArray(resultData.Items) ? resultData.Items : [];

  items.forEach((item: any) => {
    const settlementId = String(item?.settlement_id || '').trim();
    if (!settlementId) return;
    const current = map.get(settlementId) || { orderCount: 0, firstOrderNo: '' };
    current.orderCount += 1;
    if (!current.firstOrderNo && String(item?.order_no || '').trim()) {
      current.firstOrderNo = String(item.order_no).trim();
    }
    map.set(settlementId, current);
  });

  return map;
}
export async function getIncomeSettlementItemList(rollid: string) {
  // 1. 获取关联表数据 (Bil_IncomeSettlement_Order)
  const table = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_ITEM_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_ITEM_PK,
  );
  table.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond('settlement_id', 'equal', rollid),
    cond('settlement_type', 'equal', 0),
  );

  if (!table.Fields || table.Fields.length === 0) {
      }

  const queryParam = {
    Table: [table],
    PageParam: { page: 1000, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const linkItems = (resultData.Items && Array.isArray(resultData.Items) ? resultData.Items : []);

  if (linkItems.length === 0) {
    return [];
  }

  // 2. 获取订单详情 (erp_sale_order)
  const orderIds = linkItems.map((item: any) => item.order_id).filter((id: string) => !!id);
  const uniqueOrderIds = [...new Set(orderIds)];

  let orderMap = new Map();
  if (uniqueOrderIds.length > 0) {
    const orderTable = createFinanceDataTable(
      SALE_ORDER_MODEL_ID,
      SALE_ORDER_TABLE,
      SALE_ORDER_DB,
      SALE_ORDER_PK
    );
    orderTable.Filter = and(
      cond(SALE_ORDER_PK, 'in', uniqueOrderIds)
    );

    if (!orderTable.Fields || orderTable.Fields.length === 0) {
      // orderTable.Fields = [{ Name: 'createtime', AsName: '', OrderType: 'descending', Order: 1, Group: 0 }];
    }

    const orderQueryParam = {
      Table: [orderTable],
      PageParam: { page: 1000, index: 1 },
    };

    try {
      const orderRes = await requestClient.post(orderTable.queryUrl, orderQueryParam, {
        headers: orderTable.getRequestHeader(),
        responseReturn: 'raw',
      });
      orderTable.execQueryResult(orderRes);
      const orderData = orderRes.data?.Result?.data || orderRes.data?.Result || orderRes.data;
      const orders = (orderData.Items && Array.isArray(orderData.Items) ? orderData.Items : []);
      orders.forEach((o: any) => orderMap.set(o[SALE_ORDER_PK], o));
    } catch (e) {
      console.error('Fetch sales order details failed', e);
    }
  }

  // 3. 映射回前端结构
  return linkItems.map((item: any) => {
    const order = orderMap.get(item.order_id) || {};

    const count = Number(order.total_count ?? 0);
    const amount = Number(item.settle_amount ?? 0);
    const taxAmount = Number(item.settle_tax_amount ?? 0);
    const unitPrice = count !== 0 ? amount / count : 0;

    let taxRate = 0;
    if (amount !== 0) {
      taxRate = (taxAmount / amount) * 100;
    }

    return {
      rowid: item.id, // 中间表 ID
      product_id: item.order_id,
      product_name: item.order_no,

      // UI展示字段优先取 Order，如果没有取 link item (但 link item 字段很少)
      specification: order.order_time,
      unit: undefined,
      income_category: undefined,

      num: count,
      unit_price: unitPrice,
      discount: 100,
      discount_percent: Number(order.discount_percent ?? 0),
      discount_price: Number(order.discount_price ?? 0),
      deposit_price: Number(order.deposit_price ?? 0),

      tax_rate: taxRate,
      amount: amount, // 结算金额
      total_tax_price: taxAmount,
      total_price: amount + taxAmount,

      // 参考信息
      total_product_price: Number(order.total_product_price ?? 0),
      total_count: count,

      remark: item.remark,
      file_url: order.file_url,
    } as ErpIncomeSettlementApi.IncomeSettlementItem;
  });
}

export async function getIncomeSettlement(rowid: string) {
  const table = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_PK,
  );
  table.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond(SETTLEMENT_PK, 'equal', rowid),
  );

  if (!table.Fields || table.Fields.length === 0) {
      }

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const mainData = (resultData.Items && resultData.Items[0]) || null;
  if (mainData) {
    mainData.items = await getIncomeSettlementItemList(rowid);
  }
  return mainData;
}

export async function createIncomeSettlement(
  data: ErpIncomeSettlementApi.IncomeSettlement,
  options?: { codeRuleId?: string; codeMenuId?: string },
) {
  const table = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_PK,
  );

  const uid = generateUUID();
  const { items, ...rest } = data as any;

  const payload = {
    ...rest,
    rowid: uid,
    lingma_sys_is_delete: 0,
    status: rest.status ?? 10,
    receive_amount: rest.receive_amount ?? 0,
    receive_balance: rest.receive_balance ?? rest.total_amount ?? 0,
    ticket_amount: rest.ticket_amount ?? rest.total_amount ?? 0,
    subject_type:
      rest.subject_type ??
      (String(rest.contract_id || '').trim() ? 'contract' : 'order'),
  };

  const itemRows = (items || []).map((item: any) => ({
    id: item.rowid || generateUUID(),
    settlement_id: uid,
    order_id: item.product_id,
    order_no: item.product_name,
    order_type: '0',
    settlement_type: 0,
    settle_amount: item.amount,
    settle_tax_amount: item.total_tax_price,
    remark: item.remark,
    lingma_sys_is_delete: 0,
  }));

  const itemTable = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_ITEM_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_ITEM_PK,
  );

  const saveParam = [
    ...table.getSaveParam([payload], [], []),
    ...itemTable.getSaveParam(itemRows, [], []),
  ];

  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  // getCodeString 第二个参数实际是 menuId
  const codeMenuId = options?.codeMenuId ?? options?.codeRuleId ?? SETTLEMENT_NO_RULE_ID;
  if (codeMenuId) {
    try {
      const codeRes = await getCodeString(
        uid,
        codeMenuId,
        table.getRequestHeader(),
      );
      if (codeRes.Code === 200 && codeRes.Message) {
        // 仅更新主表单号，避免触发明细同步逻辑
        await updateIncomeSettlementNo(uid, codeRes.Message);
      } else {
        await deleteIncomeSettlement([uid]);
        return Promise.reject(new Error(codeRes.Message || '获取编码失败'));
      }
    } catch (error) {
      await deleteIncomeSettlement([uid]);
      throw error;
    }
  }

  return {
    ...(res as any),
    rowid: uid,
  };
}

export async function updateIncomeSettlement(
  data: ErpIncomeSettlementApi.IncomeSettlement,
) {
  const hasItems = Object.prototype.hasOwnProperty.call((data as any) ?? {}, 'items');
  const table = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_PK,
  );
  const { items, ...rest } = data as any;

  const saveParam = [...table.getSaveParam([], [rest], [])];

  // 仅当调用方显式传入 items 时，才同步关联订单明细，避免误删
  if (hasItems) {
    const itemTable = createFinanceDataTable(
      SETTLEMENT_MODEL_ID,
      SETTLEMENT_ITEM_TABLE,
      SETTLEMENT_DB,
      SETTLEMENT_ITEM_PK,
    );

    const oldItems = await getIncomeSettlementItemList(String(rest.rowid));
    const oldItemMap = new Map();
    oldItems.forEach((item: any) => oldItemMap.set(item.rowid, item));

    const added: any[] = [];
    const changed: any[] = [];
    const deleted: any[] = [];

    const incomingItems = items || [];
    const incomingIds = new Set();

    for (const item of incomingItems) {
      const rId = item.rowid ? String(item.rowid) : generateUUID();
      incomingIds.add(rId);

      const row = {
        id: rId,
        settlement_id: rest.rowid,
        order_id: item.product_id,
        order_no: item.product_name,
        order_type: '0',
        settlement_type: 0,
        settle_amount: item.amount,
        settle_tax_amount: item.total_tax_price,
        remark: item.remark,
        lingma_sys_is_delete: 0,
      };

      if (oldItemMap.has(rId)) {
        changed.push(row);
      } else {
        added.push(row);
      }
    }

    oldItems.forEach((item: any) => {
      if (!incomingIds.has(String(item.rowid))) {
        deleted.push({ id: item.rowid, lingma_sys_is_delete: 1 });
      }
    });

    saveParam.push(...itemTable.getSaveParam(added, changed, deleted));
  }

  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateIncomeSettlementStatus(rowid: string, status: number) {
  return updateIncomeSettlement({ rowid, status });
}

async function getSettlementOrderRowsBySettlementIds(settlementIds: string[]) {
  const ids = Array.from(new Set((settlementIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
  if (ids.length === 0) return [];
  const table = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_ITEM_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_ITEM_PK,
  );
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('settlement_id', 'in', ids),
  );
  const queryParam = {
    Table: [table],
    PageParam: { page: 1000, index: 1 },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return resultData?.Items || [];
}

async function getSettlementPlanRelRowsBySettlementIds(settlementIds: string[]) {
  const ids = Array.from(new Set((settlementIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
  if (ids.length === 0) return [];
  const table = new DataTable(SETTLEMENT_MODEL_ID, SETTLEMENT_PLAN_REL_TABLE, SETTLEMENT_DB, SETTLEMENT_PLAN_REL_PK);
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('settlement_id', 'in', ids),
  );
  const queryParam = {
    Table: [table],
    PageParam: { page: 1000, index: 1 },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return resultData?.Items || [];
}

export async function deleteIncomeSettlement(rowids: string[]) {
  const ids = Array.from(new Set((rowids || []).map((id) => String(id || '').trim()).filter(Boolean)));
  if (ids.length === 0) return;

  const table = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_PK,
  );
  const itemTable = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_ITEM_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_ITEM_PK,
  );
  const planRelTable = new DataTable(SETTLEMENT_MODEL_ID, SETTLEMENT_PLAN_REL_TABLE, SETTLEMENT_DB, SETTLEMENT_PLAN_REL_PK);

  const orderRows = await getSettlementOrderRowsBySettlementIds(ids);
  const planRelRows = await getSettlementPlanRelRowsBySettlementIds(ids);

  const deleteMain = ids.map((id) => ({
    [SETTLEMENT_PK]: id,
    lingma_sys_is_delete: 1,
  }));
  const deleteOrders = orderRows.map((row: any) => ({
    [SETTLEMENT_ITEM_PK]: row?.[SETTLEMENT_ITEM_PK] ?? row?.id,
    lingma_sys_is_delete: 1,
  })).filter((row: any) => row[SETTLEMENT_ITEM_PK]);
  const deletePlanRels = planRelRows.map((row: any) => ({
    [SETTLEMENT_PLAN_REL_PK]: row?.[SETTLEMENT_PLAN_REL_PK] ?? row?.rowid,
    lingma_sys_is_delete: 1,
  })).filter((row: any) => row[SETTLEMENT_PLAN_REL_PK]);

  const saveParam = [
    ...table.getSaveParam([], [], deleteMain as any),
    ...itemTable.getSaveParam([], [], deleteOrders as any),
    ...planRelTable.getSaveParam([], deletePlanRels as any, []),
  ];

  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
