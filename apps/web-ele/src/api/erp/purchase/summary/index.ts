import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

import { createFinanceDataTable } from '../../finance/common/account-set-scope';

export namespace ErpPurchaseSummaryApi {
  export type PurchaseSummaryGroupType = 'product';
  export type PurchaseSummaryCondition = 'product';

  export interface PurchaseSummaryQueryParams {
    pageNo?: number;
    page?: number;
    no?: string;
    supplier_id?: string | number;
    warehouse_id?: string;
    buyer_id?: string;
    product_keyword?: string;
    bill_time?: string[];
  }

  export interface PurchaseSummaryRow {
    id: string;
    row_type: 'data' | 'subtotal' | 'total';
    group_type: PurchaseSummaryGroupType;
    summary_condition: PurchaseSummaryCondition;
    group_key: string;
    supplier_id?: string | number;
    supplier_name?: string;
    buyer_id?: string;
    buyer_name?: string;
    product_id?: string;
    product_code?: string;
    product_name?: string;
    product_category_name?: string;
    product_model?: string;
    warehouse_id?: string;
    warehouse_name?: string;
    warehouse_category_name?: string;
    product_unit_name?: string;
    in_count: number;
    return_count: number;
    net_count: number;
    in_amount: number;
    return_amount: number;
    net_amount: number;
  }
}

const PURCHASE_SUMMARY_FORM_ID = '8460A6736151729AEF517B65D9E0AB6A';
const APPROVED_STATUS = 20;
const DB_NAME = 'LMBill';

const PURCHASE_IN_TABLE = 'erp_purchase_in';
const PURCHASE_IN_ITEM_TABLE = 'erp_purchase_in_items';
const PURCHASE_RETURN_TABLE = 'erp_purchase_return';
const PURCHASE_RETURN_ITEM_TABLE = 'erp_purchase_return_items';

type SummaryField = 'buyer' | 'product' | 'supplier' | 'warehouse';

const SUMMARY_CONDITION_FIELD_MAP: Record<ErpPurchaseSummaryApi.PurchaseSummaryCondition, SummaryField[]> = {
  product: ['product', 'warehouse'],
};

function normalizeString(value: unknown) {
  return String(value ?? '').trim();
}

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function appendFilter(filter: any, nextFilter: any) {
  return filter ? and(filter, nextFilter) : nextFilter;
}

function getFieldValue(row: any, field: SummaryField) {
  if (field === 'supplier') return normalizeString(row.supplier_id || '未指定供应商');
  if (field === 'buyer') return normalizeString(row.buyer_id || '未指定采购员');
  if (field === 'warehouse') return normalizeString(row.warehouse_id || '未指定仓库');
  return normalizeString(row.product_id || '未指定产品');
}

async function queryByDataTable(tableName: string, primaryKey: string, filter: any) {
  const table = createFinanceDataTable(PURCHASE_SUMMARY_FORM_ID, tableName, DB_NAME, primaryKey);
  if (filter) table.Filter = filter;
  const queryParam = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  return (resQuery.data?.Result?.data?.Items || []) as any[];
}

function buildApprovedMasterFilter(
  params: ErpPurchaseSummaryApi.PurchaseSummaryQueryParams,
  dateField: 'in_time' | 'return_time',
) {
  let filter: any = cond('status', 'equal', APPROVED_STATUS);
  if (params.no) filter = appendFilter(filter, cond('no', 'contains', params.no));
  if (params.supplier_id) filter = appendFilter(filter, cond('supplier_id', 'equal', params.supplier_id));
  if (params.buyer_id) filter = appendFilter(filter, cond('createuser', 'equal', params.buyer_id));
  if (Array.isArray(params.bill_time) && params.bill_time.length === 2) {
    filter = appendFilter(filter, cond(dateField, 'greaterthanorequal', params.bill_time[0]));
    filter = appendFilter(filter, cond(dateField, 'lessthanorequal', params.bill_time[1]));
  }
  return filter;
}

function buildItemFilter(
  linkField: 'in_id' | 'return_id',
  linkValue: string,
  params: ErpPurchaseSummaryApi.PurchaseSummaryQueryParams,
) {
  let filter: any = cond(linkField, 'equal', linkValue);
  if (params.warehouse_id) filter = appendFilter(filter, cond('warehouse_id', 'equal', params.warehouse_id));
  if (params.product_keyword) {
    const keyword = params.product_keyword;
    filter = appendFilter(
      filter,
      or(
        cond('product_name', 'contains', keyword),
        cond('product_id', 'contains', keyword),
        cond('product_bar_code', 'contains', keyword),
      ),
    );
  }
  return filter;
}

function buildGroupKey(condition: ErpPurchaseSummaryApi.PurchaseSummaryCondition, row: any) {
  const fields = SUMMARY_CONDITION_FIELD_MAP[condition];
  return getFieldValue(row, fields[0]);
}

function buildDetailKey(condition: ErpPurchaseSummaryApi.PurchaseSummaryCondition, row: any) {
  return SUMMARY_CONDITION_FIELD_MAP[condition].map((field) => getFieldValue(row, field)).join('@@');
}

function buildSubtotalKey(condition: ErpPurchaseSummaryApi.PurchaseSummaryCondition, row: any) {
  return SUMMARY_CONDITION_FIELD_MAP[condition]
    .filter((field) => field !== 'warehouse')
    .map((field) => getFieldValue(row, field))
    .join('@@');
}

function hasSummaryField(condition: ErpPurchaseSummaryApi.PurchaseSummaryCondition, field: SummaryField) {
  return SUMMARY_CONDITION_FIELD_MAP[condition].includes(field);
}

function createEmptyRow(
  groupType: ErpPurchaseSummaryApi.PurchaseSummaryGroupType,
  condition: ErpPurchaseSummaryApi.PurchaseSummaryCondition,
  row: any,
  id: string,
): ErpPurchaseSummaryApi.PurchaseSummaryRow {
  return {
    id,
    row_type: 'data',
    group_type: groupType,
    summary_condition: condition,
    group_key: buildGroupKey(condition, row),
    supplier_id: hasSummaryField(condition, 'supplier') ? row.supplier_id : undefined,
    supplier_name: hasSummaryField(condition, 'supplier') ? row.supplier_name : undefined,
    buyer_id: hasSummaryField(condition, 'buyer') ? row.buyer_id : undefined,
    buyer_name: hasSummaryField(condition, 'buyer') ? row.buyer_name : undefined,
    product_id: hasSummaryField(condition, 'product') ? row.product_id : undefined,
    product_code: hasSummaryField(condition, 'product') ? row.product_code : undefined,
    product_name: hasSummaryField(condition, 'product') ? row.product_name : undefined,
    product_category_name: hasSummaryField(condition, 'product') ? row.product_category_name : undefined,
    product_model: hasSummaryField(condition, 'product') ? row.product_model : undefined,
    warehouse_id: hasSummaryField(condition, 'warehouse') ? row.warehouse_id : undefined,
    warehouse_name: hasSummaryField(condition, 'warehouse') ? row.warehouse_name : undefined,
    warehouse_category_name: hasSummaryField(condition, 'warehouse') ? row.warehouse_category_name : undefined,
    product_unit_name: hasSummaryField(condition, 'product') ? row.product_unit_name : undefined,
    in_count: 0,
    return_count: 0,
    net_count: 0,
    in_amount: 0,
    return_amount: 0,
    net_amount: 0,
  };
}

function addSummaryValue(target: ErpPurchaseSummaryApi.PurchaseSummaryRow, qty: number, amount: number, direction: 'in' | 'return') {
  if (direction === 'in') {
    target.in_count += qty;
    target.in_amount += amount;
  } else {
    target.return_count += qty;
    target.return_amount += amount;
  }
  target.net_count = target.in_count - target.return_count;
  target.net_amount = target.in_amount - target.return_amount;
}

async function queryPurchaseInRows(params: ErpPurchaseSummaryApi.PurchaseSummaryQueryParams) {
  let masterFilter = buildApprovedMasterFilter(params, 'in_time');
  if (params.warehouse_id) masterFilter = appendFilter(masterFilter, cond('warehouse_id', 'equal', params.warehouse_id));
  const docs = await queryByDataTable(PURCHASE_IN_TABLE, 'id', masterFilter);
  const rows: any[] = [];
  for (const doc of docs) {
    if (!doc?.id) continue;
    const items = await queryByDataTable(
      PURCHASE_IN_ITEM_TABLE,
      'rowid',
      buildItemFilter('in_id', String(doc.id), params),
    );
    for (const item of items) {
      rows.push({
        direction: 'in',
        supplier_id: doc.supplier_id,
        buyer_id: normalizeString(doc.createuser || doc.creator || doc.buyer_id || ''),
        product_id: item.product_id,
        product_code: item.product_code,
        product_name: item.product_name,
        product_category_name: item.category_name,
        product_model: item.product_model || item.model,
        warehouse_id: item.warehouse_id || doc.warehouse_id,
        warehouse_name: item.warehouse_name || doc.warehouse_name || doc.warehouse_inbound,
        warehouse_category_name: item.warehouse_category_name,
        product_unit_name: item.product_unit_name || item.unit_name,
        count: toNumber(item.count),
        amount: toNumber(item.total_price),
      });
    }
  }
  return rows;
}

async function queryPurchaseReturnRows(params: ErpPurchaseSummaryApi.PurchaseSummaryQueryParams) {
  const docs = await queryByDataTable(
    PURCHASE_RETURN_TABLE,
    'id',
    buildApprovedMasterFilter(params, 'return_time'),
  );
  const rows: any[] = [];
  for (const doc of docs) {
    if (!doc?.id) continue;
    const items = await queryByDataTable(
      PURCHASE_RETURN_ITEM_TABLE,
      'id',
      buildItemFilter('return_id', String(doc.id), params),
    );
    for (const item of items) {
      rows.push({
        direction: 'return',
        supplier_id: doc.supplier_id,
        buyer_id: normalizeString(doc.createuser || doc.creator || doc.buyer_id || ''),
        product_id: item.product_id,
        product_code: item.product_code,
        product_name: item.product_name,
        product_category_name: item.category_name,
        product_model: item.product_model || item.model,
        warehouse_id: item.warehouse_id,
        warehouse_name: item.warehouse_name,
        warehouse_category_name: item.warehouse_category_name,
        product_unit_name: item.product_unit_name,
        count: toNumber(item.count),
        amount: toNumber(item.total_price),
      });
    }
  }
  return rows;
}

function createSubtotalRow(
  row: ErpPurchaseSummaryApi.PurchaseSummaryRow,
  id: string,
  label = '小计',
  rowType: 'subtotal' | 'total' = 'subtotal',
): ErpPurchaseSummaryApi.PurchaseSummaryRow {
  const isTotal = rowType === 'total';
  return {
    ...row,
    id,
    row_type: rowType,
    supplier_id: isTotal ? undefined : row.supplier_id,
    supplier_name: isTotal ? undefined : row.supplier_name,
    buyer_id: isTotal ? undefined : row.buyer_id,
    buyer_name: isTotal ? undefined : row.buyer_name,
    product_id: isTotal ? undefined : row.product_id,
    product_name: label,
    product_code: undefined,
    product_category_name: undefined,
    product_model: undefined,
    warehouse_id: undefined,
    warehouse_name: undefined,
    warehouse_category_name: undefined,
    product_unit_name: undefined,
    in_count: 0,
    return_count: 0,
    net_count: 0,
    in_amount: 0,
    return_amount: 0,
    net_amount: 0,
  };
}

function addRowToSubtotal(
  subtotal: ErpPurchaseSummaryApi.PurchaseSummaryRow,
  row: ErpPurchaseSummaryApi.PurchaseSummaryRow,
) {
  subtotal.in_count += row.in_count;
  subtotal.return_count += row.return_count;
  subtotal.in_amount += row.in_amount;
  subtotal.return_amount += row.return_amount;
  subtotal.net_count = subtotal.in_count - subtotal.return_count;
  subtotal.net_amount = subtotal.in_amount - subtotal.return_amount;
}

function aggregateRows(sourceRows: any[]) {
  const groupType: ErpPurchaseSummaryApi.PurchaseSummaryGroupType = 'product';
  const condition: ErpPurchaseSummaryApi.PurchaseSummaryCondition = 'product';
  const dataMap = new Map<string, ErpPurchaseSummaryApi.PurchaseSummaryRow>();
  for (const row of sourceRows) {
    const key = buildDetailKey(condition, row);
    if (!dataMap.has(key)) dataMap.set(key, createEmptyRow(groupType, condition, row, `data_product_${key}`));
    addSummaryValue(dataMap.get(key)!, row.count, row.amount, row.direction);
  }

  const rows = [...dataMap.values()].sort(
    (a, b) =>
      String(a.product_id || '').localeCompare(String(b.product_id || '')) ||
      String((a as any).supplier_id || '').localeCompare(String((b as any).supplier_id || '')) ||
      String((a as any).buyer_id || '').localeCompare(String((b as any).buyer_id || '')) ||
      String(a.warehouse_id || '').localeCompare(String(b.warehouse_id || '')),
  );
  if (rows.length === 0) return { rows, summary: undefined };

  const total = createSubtotalRow(rows[0], 'total_product', '总计', 'total');
  total.group_key = 'total';
  for (const row of rows) {
    addRowToSubtotal(total, row);
  }
  return { rows, summary: total };
}

export async function getPurchaseSummaryPage(params: ErpPurchaseSummaryApi.PurchaseSummaryQueryParams) {
  const pageNo = Number(params.pageNo || 1);
  const page = Number(params.page || 10);
  const sourceRows = [...(await queryPurchaseInRows(params)), ...(await queryPurchaseReturnRows(params))];
  const { rows, summary } = aggregateRows(sourceRows);
  const start = (pageNo - 1) * page;
  const returnData = new clientData();
  returnData.list = rows.slice(start, start + page);
  returnData.total = rows.length;
  (returnData as any).summary = summary;
  return returnData;
}
