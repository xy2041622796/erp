import type { PageParam } from '@vben/request';

import { generateUUID, isEmpty } from '@vben/utils';

import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';
import { createFinanceDataTable } from '../../common/account-set-scope';

/**
 * 支出结算（Bil_Expense_Settlement）
 * - status: 10=待审批，20=待付款，30=已完成（沿用收入结算的状态约定）
 */
export namespace ErpExpenseSettlementApi {
  export interface ExpenseSettlementItem {
    product_id?: string;
    product_name?: string;
    specification?: string;
    unit?: string;
    expense_category?: string;
    num?: number;
    unit_price?: number;
    discount?: number;
    tax_rate?: number;
    amount?: number;
    remark?: string;
  }

  export interface ExpenseSettlement {
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

    advance_amount?: number;
    status?: number;
    postscript?: string;
    remark?: string;
    is_advance?: number;
    pay_account?: string;
    total_amount?: number;
    is_tax_included?: number;
    tax_rate?: number;
    amount?: number;
    expense_category?: string;
    product_name?: string;
    product_id?: string;
    project_id?: string;
    depart_id?: string;
    salesman_id?: string;
    contract_id?: string;
    settlement_date?: Date | string;
    account_period?: Date | string;
    supplier_id?: string;
    settlement_no?: string;
    is_not_settlement?: number;
    settlement_type?: number;
    ticket_amount?: number;
    pay_balance?: number;
    pay_amount?: number;
    subject_type?: string | number;

    items?: ExpenseSettlementItem[];
  }
}

// 注意：此处需要替换为你们 Bil_Expense_Settlement 的真实 formkey
// 目前先沿用收入结算使用的 modelId，若实际不同请替换
export const SETTLEMENT_MODEL_ID = '13937C46A5DC359669673C54E7F62E85';
const SETTLEMENT_TABLE = 'Bil_Expense_Settlement';
const SETTLEMENT_DB = 'LMBill';
const SETTLEMENT_PK = 'rowid';

const SETTLEMENT_ITEM_TABLE = 'Bil_Settlement_Order';
const SETTLEMENT_ITEM_PK = 'id';

// Bil_Expense_Settlement 已移除 submit_id，这里显式指定查询字段，避免后端仍拼接 submit_id 到 SELECT 列表
const EXPENSE_SETTLEMENT_QUERY_FIELDS: any[] = [
  { Name: 'createtime', AsName: '', OrderType: 'descending', Order: 1, Group: 0 },
  { Name: 'postscript', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'supplier_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'status', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'expense_category', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'product_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'settlement_no', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'contract_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'total_amount', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'ticket_amount', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'is_not_settlement', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'lingma_sys_ent', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'amount', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'pay_account', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'is_advance', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'is_tax_included', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'tax_rate', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'advance_amount', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'account_period', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'salesman_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'pay_balance', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'pay_amount', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'remark', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'product_name', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'depart_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'project_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'settlement_date', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'rowid', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'settlement_type', AsName: '', OrderType: null, Order: 0, Group: 0 },
  { Name: 'subject_type', AsName: '', OrderType: null, Order: 0, Group: 0 },
];

// 注意：此处需要替换为你们“支出结算单号”的编码规则ID
// getCodeString 第二个参数实际是 menuId
const SETTLEMENT_NO_RULE_ID = 'E23AF021B8CEC59F51DB4C628157FA1F';

export async function getExpenseSettlementPage(
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
  if (params.supplier_id) {
    conditions.push(cond('supplier_id', 'equal', params.supplier_id));
  }
  if (params.project_id) {
    conditions.push(cond('project_id', 'equal', params.project_id));
  }
  if (params.contract_id) {
    conditions.push(cond('contract_id', 'equal', params.contract_id));
  }
  if (Array.isArray(params.rowids) && params.rowids.length > 0) {
    conditions.push(cond('rowid', 'in', params.rowids));
  }
  if (!isEmpty(params.status)) {
    conditions.push(cond('status', 'equal', params.status));
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
  table.Fields = EXPENSE_SETTLEMENT_QUERY_FIELDS;

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
  const items =
    resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);

  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = items;
  returnData.total = total;
  return returnData;
}

export async function getExpenseSettlementOrderSummaryMap(
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
export async function getExpenseSettlementItemList(rollid: string) {
  const table = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_ITEM_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_ITEM_PK,
  );
  table.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond('settlement_id', 'equal', rollid),
    cond('settlement_type', 'equal', 1),
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

  return linkItems.map((item: any) => {
    return {
      rowid: item.id,
      product_id: item.order_id,
      product_name: item.order_no,
      amount: Number(item.settle_amount ?? 0),
      total_tax_price: Number(item.settle_tax_amount ?? 0),
      remark: item.remark,
      // Map other fields as needed based on ExpenseSettlementItem
    } as ErpExpenseSettlementApi.ExpenseSettlementItem;
  });
}

export async function getExpenseSettlement(rowid: string) {
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

  table.Fields = EXPENSE_SETTLEMENT_QUERY_FIELDS;

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
    mainData.items = await getExpenseSettlementItemList(rowid);
  }
  return mainData;
}

export async function createExpenseSettlement(
  data: ErpExpenseSettlementApi.ExpenseSettlement,
  options?: { codeRuleId?: string; codeMenuId?: string },
) {
  const table = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_PK,
  );

  const uid = generateUUID();

  const { items, submit_id: _submitId, ...rest } = data as any;

  const payload = {
    ...rest,
    rowid: uid,
    lingma_sys_is_delete: 0,
    subject_type:
      rest.subject_type ??
      (String(rest.contract_id || '').trim() ? 'contract' : 'order'),
  };

  const itemRows = (items || []).map((item: any) => ({
    id: item.rowid || generateUUID(),
    settlement_id: uid,
    order_id: item.product_id,
    order_no: item.product_name,
    order_type: '1', // 1=Outcome? Or just use '0' if order_type is unrelated to settlement type. But let's use 1 to be safe or consistent if needed. Actually let's use settlement_type field.
    settlement_type: 1,
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

  const codeMenuId = options?.codeMenuId ?? options?.codeRuleId ?? SETTLEMENT_NO_RULE_ID;
  if (codeMenuId) {
    try {
      const codeRes = await getCodeString(uid, codeMenuId, table.getRequestHeader());
      if (codeRes.Code === 200 && codeRes.Message) {
        // 仅更新主表单号
        await updateExpenseSettlement({ rowid: uid, settlement_no: codeRes.Message });
      } else {
        await deleteExpenseSettlement([uid]);
        return Promise.reject(new Error(codeRes.Message || '获取编码失败'));
      }
    } catch (error) {
      await deleteExpenseSettlement([uid]);
      throw error;
    }
  }

  return { ...(res as any), rowid: uid };
}

export async function updateExpenseSettlement(
  data: ErpExpenseSettlementApi.ExpenseSettlement,
) {
  const hasItems = Object.prototype.hasOwnProperty.call((data as any) ?? {}, 'items');
  const table = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_PK,
  );
  const { items, submit_id: _submitId, ...rest } = data as any;
  const saveParam = [...table.getSaveParam([], [rest], [])];

  if (hasItems) {
    const itemTable = createFinanceDataTable(
      SETTLEMENT_MODEL_ID,
      SETTLEMENT_ITEM_TABLE,
      SETTLEMENT_DB,
      SETTLEMENT_ITEM_PK,
    );

    const oldItems = await getExpenseSettlementItemList(String(rest.rowid));
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
        order_type: '1',
        settlement_type: 1,
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

export async function updateExpenseSettlementStatus(rowid: string, status: number) {
  return updateExpenseSettlement({ rowid, status });
}

export async function deleteExpenseSettlement(rowids: string[]) {
  const table = createFinanceDataTable(
    SETTLEMENT_MODEL_ID,
    SETTLEMENT_TABLE,
    SETTLEMENT_DB,
    SETTLEMENT_PK,
  );

  const deleteList = rowids.map((id) => ({
    [SETTLEMENT_PK]: id,
    lingma_sys_is_delete: 1,
  }));

  const saveParam = table.getSaveParam([], [], deleteList as any);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
