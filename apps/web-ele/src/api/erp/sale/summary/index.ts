import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

import { createFinanceDataTable } from '../../finance/common/account-set-scope';

export namespace ErpSaleSummaryApi {
  export type SaleSummaryGroupType = 'product';
  export type SaleSummaryCondition = 'product';

  export interface SaleSummaryQueryParams {
    pageNo?: number;
    page?: number;
    no?: string;
    customer_id?: string | number;
    warehouse_id?: string;
    seller_id?: string;
    product_keyword?: string;
    bill_time?: string[];
  }

  export interface SaleSummaryRow {
    id: string;
    row_type: 'data' | 'subtotal' | 'total';
    group_type: SaleSummaryGroupType;
    summary_condition: SaleSummaryCondition;
    group_key: string;
    customer_id?: string | number;
    customer_name?: string;
    seller_id?: string;
    seller_name?: string;
    product_id?: string;
    product_code?: string;
    product_name?: string;
    product_category_name?: string;
    product_model?: string;
    warehouse_id?: string;
    warehouse_name?: string;
    warehouse_category_name?: string;
    product_unit_name?: string;
    out_count: number;
    return_count: number;
    net_count: number;
    out_amount: number;
    return_amount: number;
    net_amount: number;
  }
}

const SALE_SUMMARY_FORM_ID = '2E128EE7062079CC307C9D832A611403';
const APPROVED_STATUS = 20;
const DB_NAME = 'LMBill';

const SALE_OUT_TABLE = 'erp_sale_out';
const SALE_OUT_ITEM_TABLE = 'erp_sale_out_items';
const SALE_RETURN_TABLE = 'erp_sale_return';
const SALE_RETURN_ITEM_TABLE = 'erp_sale_return_items';

type SummaryField = 'customer' | 'product' | 'seller' | 'warehouse';

const SUMMARY_CONDITION_FIELD_MAP: Record<ErpSaleSummaryApi.SaleSummaryCondition, SummaryField[]> = {
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
  if (field === 'customer') return normalizeString(row.customer_id || '未指定客户');
  if (field === 'seller') return normalizeString(row.seller_id || '未指定销售员');
  if (field === 'warehouse') return normalizeString(row.warehouse_id || '未指定仓库');
  return normalizeString(row.product_id || '未指定产品');
}

async function queryByDataTable(tableName: string, primaryKey: string, filter: any) {
  const table = createFinanceDataTable(SALE_SUMMARY_FORM_ID, tableName, DB_NAME, primaryKey);
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
  params: ErpSaleSummaryApi.SaleSummaryQueryParams,
  dateField: 'out_time' | 'return_time',
) {
  let filter: any = cond('status', 'equal', APPROVED_STATUS);
  if (params.no) filter = appendFilter(filter, cond('no', 'contains', params.no));
  if (params.customer_id) filter = appendFilter(filter, cond('customer_id', 'equal', params.customer_id));
  if (params.seller_id) filter = appendFilter(filter, cond('sale_user_id', 'equal', params.seller_id));
  if (Array.isArray(params.bill_time) && params.bill_time.length === 2) {
    filter = appendFilter(filter, cond(dateField, 'greaterthanorequal', params.bill_time[0]));
    filter = appendFilter(filter, cond(dateField, 'lessthanorequal', params.bill_time[1]));
  }
  return filter;
}

function buildItemFilter(
  linkField: 'out_id' | 'return_id',
  linkValue: string,
  params: ErpSaleSummaryApi.SaleSummaryQueryParams,
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

function buildGroupKey(condition: ErpSaleSummaryApi.SaleSummaryCondition, row: any) {
  const fields = SUMMARY_CONDITION_FIELD_MAP[condition];
  return getFieldValue(row, fields[0]);
}

function buildDetailKey(condition: ErpSaleSummaryApi.SaleSummaryCondition, row: any) {
  return SUMMARY_CONDITION_FIELD_MAP[condition].map((field) => getFieldValue(row, field)).join('@@');
}

function buildSubtotalKey(condition: ErpSaleSummaryApi.SaleSummaryCondition, row: any) {
  return SUMMARY_CONDITION_FIELD_MAP[condition]
    .filter((field) => field !== 'warehouse')
    .map((field) => getFieldValue(row, field))
    .join('@@');
}

function hasSummaryField(condition: ErpSaleSummaryApi.SaleSummaryCondition, field: SummaryField) {
  return SUMMARY_CONDITION_FIELD_MAP[condition].includes(field);
}

function createEmptyRow(
  groupType: ErpSaleSummaryApi.SaleSummaryGroupType,
  condition: ErpSaleSummaryApi.SaleSummaryCondition,
  row: any,
  id: string,
): ErpSaleSummaryApi.SaleSummaryRow {
  return {
    id,
    row_type: 'data',
    group_type: groupType,
    summary_condition: condition,
    group_key: buildGroupKey(condition, row),
    customer_id: hasSummaryField(condition, 'customer') ? row.customer_id : undefined,
    customer_name: hasSummaryField(condition, 'customer') ? row.customer_name : undefined,
    seller_id: hasSummaryField(condition, 'seller') ? row.seller_id : undefined,
    seller_name: hasSummaryField(condition, 'seller') ? row.seller_name : undefined,
    product_id: hasSummaryField(condition, 'product') ? row.product_id : undefined,
    product_code: hasSummaryField(condition, 'product') ? row.product_code : undefined,
    product_name: hasSummaryField(condition, 'product') ? row.product_name : undefined,
    product_category_name: hasSummaryField(condition, 'product') ? row.product_category_name : undefined,
    product_model: hasSummaryField(condition, 'product') ? row.product_model : undefined,
    warehouse_id: hasSummaryField(condition, 'warehouse') ? row.warehouse_id : undefined,
    warehouse_name: hasSummaryField(condition, 'warehouse') ? row.warehouse_name : undefined,
    warehouse_category_name: hasSummaryField(condition, 'warehouse') ? row.warehouse_category_name : undefined,
    product_unit_name: hasSummaryField(condition, 'product') ? row.product_unit_name : undefined,
    out_count: 0,
    return_count: 0,
    net_count: 0,
    out_amount: 0,
    return_amount: 0,
    net_amount: 0,
  };
}

function addSummaryValue(target: ErpSaleSummaryApi.SaleSummaryRow, qty: number, amount: number, direction: 'out' | 'return') {
  if (direction === 'out') {
    target.out_count += qty;
    target.out_amount += amount;
  } else {
    target.return_count += qty;
    target.return_amount += amount;
  }
  target.net_count = target.out_count - target.return_count;
  target.net_amount = target.out_amount - target.return_amount;
}

async function querySaleOutRows(params: ErpSaleSummaryApi.SaleSummaryQueryParams) {
  let masterFilter = buildApprovedMasterFilter(params, 'out_time');
  if (params.warehouse_id) masterFilter = appendFilter(masterFilter, cond('warehouse_id', 'equal', params.warehouse_id));
  const docs = await queryByDataTable(SALE_OUT_TABLE, 'id', masterFilter);
  const rows: any[] = [];
  for (const doc of docs) {
    if (!doc?.id) continue;
    const items = await queryByDataTable(
      SALE_OUT_ITEM_TABLE,
      'id',
      buildItemFilter('out_id', String(doc.id), params),
    );
    for (const item of items) {
      rows.push({
        direction: 'out',
        customer_id: doc.customer_id,
        seller_id: normalizeString(doc.sale_user_id || doc.createuser || ''),
        product_id: item.product_id,
        product_code: item.product_code,
        product_name: item.product_name,
        product_category_name: item.category_name,
        product_model: item.product_model || item.model,
        warehouse_id: item.warehouse_id || doc.warehouse_id,
        warehouse_name: item.warehouse_name || doc.warehouse_name || doc.warehouse_outbound,
        warehouse_category_name: item.warehouse_category_name,
        product_unit_name: item.product_unit_name || item.unit_name,
        count: toNumber(item.count),
        amount: toNumber(item.total_price),
      });
    }
  }
  return rows;
}

async function querySaleReturnRows(params: ErpSaleSummaryApi.SaleSummaryQueryParams) {
  const docs = await queryByDataTable(
    SALE_RETURN_TABLE,
    'id',
    buildApprovedMasterFilter(params, 'return_time'),
  );
  const rows: any[] = [];
  for (const doc of docs) {
    if (!doc?.id) continue;
    const items = await queryByDataTable(
      SALE_RETURN_ITEM_TABLE,
      'id',
      buildItemFilter('return_id', String(doc.id), params),
    );
    for (const item of items) {
      rows.push({
        direction: 'return',
        customer_id: doc.customer_id,
        seller_id: normalizeString(doc.sale_user_id || doc.createuser || ''),
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
  row: ErpSaleSummaryApi.SaleSummaryRow,
  id: string,
  label = '小计',
  rowType: 'subtotal' | 'total' = 'subtotal',
): ErpSaleSummaryApi.SaleSummaryRow {
  const isTotal = rowType === 'total';
  return {
    ...row,
    id,
    row_type: rowType,
    customer_id: isTotal ? undefined : row.customer_id,
    customer_name: isTotal ? undefined : row.customer_name,
    seller_id: isTotal ? undefined : row.seller_id,
    seller_name: isTotal ? undefined : row.seller_name,
    product_id: isTotal ? undefined : row.product_id,
    product_name: label,
    product_code: undefined,
    product_category_name: undefined,
    product_model: undefined,
    warehouse_id: undefined,
    warehouse_name: undefined,
    warehouse_category_name: undefined,
    product_unit_name: undefined,
    out_count: 0,
    return_count: 0,
    net_count: 0,
    out_amount: 0,
    return_amount: 0,
    net_amount: 0,
  };
}

function addRowToSubtotal(
  subtotal: ErpSaleSummaryApi.SaleSummaryRow,
  row: ErpSaleSummaryApi.SaleSummaryRow,
) {
  subtotal.out_count += row.out_count;
  subtotal.return_count += row.return_count;
  subtotal.out_amount += row.out_amount;
  subtotal.return_amount += row.return_amount;
  subtotal.net_count = subtotal.out_count - subtotal.return_count;
  subtotal.net_amount = subtotal.out_amount - subtotal.return_amount;
}

function aggregateRows(sourceRows: any[]) {
  const groupType: ErpSaleSummaryApi.SaleSummaryGroupType = 'product';
  const condition: ErpSaleSummaryApi.SaleSummaryCondition = 'product';
  const dataMap = new Map<string, ErpSaleSummaryApi.SaleSummaryRow>();
  for (const row of sourceRows) {
    const key = buildDetailKey(condition, row);
    if (!dataMap.has(key)) dataMap.set(key, createEmptyRow(groupType, condition, row, `data_product_${key}`));
    addSummaryValue(dataMap.get(key)!, row.count, row.amount, row.direction);
  }

  const rows = [...dataMap.values()].sort(
    (a, b) =>
      String(a.product_id || '').localeCompare(String(b.product_id || '')) ||
      String((a as any).customer_id || '').localeCompare(String((b as any).customer_id || '')) ||
      String((a as any).seller_id || '').localeCompare(String((b as any).seller_id || '')) ||
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

export async function getSaleSummaryPage(params: ErpSaleSummaryApi.SaleSummaryQueryParams) {
  const pageNo = Number((params as any).pageNo || (params as any).index || 1);
  const page = Number((params as any).page || (params as any).size || 10);
  const sourceRows = [...(await querySaleOutRows(params)), ...(await querySaleReturnRows(params))];
  const { rows, summary } = aggregateRows(sourceRows);
  const start = (pageNo - 1) * page;
  const returnData = new clientData();
  returnData.list = rows.slice(start, start + page);
  returnData.total = rows.length;
  (returnData as any).summary = summary;
  return returnData;
}
