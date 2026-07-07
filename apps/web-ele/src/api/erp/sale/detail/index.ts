import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

import { createFinanceDataTable } from '../../finance/common/account-set-scope';

export namespace ErpSaleDetailApi {
  export type SaleDetailBizType = 'all' | 'sale_out' | 'sale_return';
  export type StockDirection = 'in' | 'out';

  export interface SaleDetailQueryParams {
    pageNo?: number;
    page?: number;
    biz_type?: SaleDetailBizType;
    no?: string;
    customer_id?: string | number;
    warehouse_id?: string;
    sale_user_id?: string;
    product_keyword?: string;
    bill_time?: string[];
  }

  export interface SaleDetailRow {
    id: string;
    item_id: string;
    biz_type: Exclude<SaleDetailBizType, 'all'>;
    biz_type_name: '销售出库' | '销售退货';
    stock_direction: StockDirection;
    stock_direction_name: '入库' | '出库';
    bill_id: string;
    bill_no?: string;
    bill_time?: string;
    status?: number;
    customer_id?: string | number;
    sale_user_id?: string;
    warehouse_id?: string;
    warehouse_name?: string;
    product_id?: string;
    product_name?: string;
    product_bar_code?: string;
    product_unit_id?: string;
    product_unit_name?: string;
    count?: number;
    in_count?: number;
    out_count?: number;
    product_price?: number;
    total_price?: number;
    tax_percent?: number;
    tax_price?: number;
    remark?: string;
  }
}

const SALE_DETAIL_FORM_ID = 'CCCB21C6B0C2984136B4A843611F2972';
const APPROVED_STATUS = 20;
const DB_NAME = 'LMBill';

const SALE_OUT_TABLE = 'erp_sale_out';
const SALE_OUT_ITEM_TABLE = 'erp_sale_out_items';
const SALE_RETURN_TABLE = 'erp_sale_return';
const SALE_RETURN_ITEM_TABLE = 'erp_sale_return_items';

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

function compareBillTimeDesc(a: ErpSaleDetailApi.SaleDetailRow, b: ErpSaleDetailApi.SaleDetailRow) {
  const aTime = new Date(a.bill_time || '').getTime();
  const bTime = new Date(b.bill_time || '').getTime();
  return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
}

async function queryByDataTable(tableName: string, primaryKey: string, filter: any) {
  const table = createFinanceDataTable(SALE_DETAIL_FORM_ID, tableName, DB_NAME, primaryKey);
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
  params: ErpSaleDetailApi.SaleDetailQueryParams,
  dateField: 'out_time' | 'return_time',
) {
  let filter: any = cond('status', 'equal', APPROVED_STATUS);
  if (params.no) filter = appendFilter(filter, cond('no', 'contains', params.no));
  if (params.customer_id) filter = appendFilter(filter, cond('customer_id', 'equal', params.customer_id));
  if (params.sale_user_id) filter = appendFilter(filter, cond('sale_user_id', 'equal', params.sale_user_id));
  if (Array.isArray(params.bill_time) && params.bill_time.length === 2) {
    filter = appendFilter(filter, cond(dateField, 'greaterthanorequal', params.bill_time[0]));
    filter = appendFilter(filter, cond(dateField, 'lessthanorequal', params.bill_time[1]));
  }
  return filter;
}

function buildItemFilter(
  linkField: 'out_id' | 'return_id',
  linkValue: string,
  params: ErpSaleDetailApi.SaleDetailQueryParams,
) {
  let filter: any = cond(linkField, 'equal', linkValue);
  if (params.warehouse_id) {
    filter = appendFilter(filter, cond('warehouse_id', 'equal', params.warehouse_id));
  }
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

async function querySaleOutDetailRows(params: ErpSaleDetailApi.SaleDetailQueryParams) {
  let masterFilter = buildApprovedMasterFilter(params, 'out_time');
  if (params.warehouse_id) {
    masterFilter = appendFilter(masterFilter, cond('warehouse_id', 'equal', params.warehouse_id));
  }

  const docs = await queryByDataTable(SALE_OUT_TABLE, 'id', masterFilter);
  const detailRows: ErpSaleDetailApi.SaleDetailRow[] = [];

  for (const doc of docs) {
    if (!doc?.id) continue;
    const items = await queryByDataTable(
      SALE_OUT_ITEM_TABLE,
      'id',
      buildItemFilter('out_id', String(doc.id), params),
    );
    for (const item of items) {
      const count = toNumber(item.count);
      const itemId = normalizeString(item.id || item.rowid || `${doc.id}_${item.product_id || ''}`);
      detailRows.push({
        id: `sale_out_${doc.id}_${itemId}`,
        item_id: itemId,
        biz_type: 'sale_out',
        biz_type_name: '销售出库',
        stock_direction: 'out',
        stock_direction_name: '出库',
        bill_id: String(doc.id),
        bill_no: doc.no,
        bill_time: doc.out_time,
        status: doc.status,
        customer_id: doc.customer_id,
        sale_user_id: doc.sale_user_id,
        warehouse_id: item.warehouse_id || doc.warehouse_id,
        warehouse_name: item.warehouse_name || doc.warehouse_name || doc.warehouse_outbound,
        product_id: item.product_id,
        product_name: item.product_name,
        product_bar_code: item.product_bar_code,
        product_unit_id: item.product_unit_id,
        product_unit_name: item.product_unit_name,
        count,
        in_count: 0,
        out_count: count,
        product_price: toNumber(item.product_price),
        total_price: toNumber(item.total_price),
        tax_percent: toNumber(item.tax_percent),
        tax_price: toNumber(item.tax_price),
        remark: item.remark || doc.remark,
      });
    }
  }

  return detailRows;
}

async function querySaleReturnDetailRows(params: ErpSaleDetailApi.SaleDetailQueryParams) {
  const docs = await queryByDataTable(
    SALE_RETURN_TABLE,
    'id',
    buildApprovedMasterFilter(params, 'return_time'),
  );
  const detailRows: ErpSaleDetailApi.SaleDetailRow[] = [];

  for (const doc of docs) {
    if (!doc?.id) continue;
    const items = await queryByDataTable(
      SALE_RETURN_ITEM_TABLE,
      'id',
      buildItemFilter('return_id', String(doc.id), params),
    );
    for (const item of items) {
      const count = toNumber(item.count);
      const itemId = normalizeString(item.id || item.rowid || `${doc.id}_${item.product_id || ''}`);
      detailRows.push({
        id: `sale_return_${doc.id}_${itemId}`,
        item_id: itemId,
        biz_type: 'sale_return',
        biz_type_name: '销售退货',
        stock_direction: 'in',
        stock_direction_name: '入库',
        bill_id: String(doc.id),
        bill_no: doc.no,
        bill_time: doc.return_time,
        status: doc.status,
        customer_id: doc.customer_id,
        sale_user_id: doc.sale_user_id,
        warehouse_id: item.warehouse_id,
        warehouse_name: item.warehouse_name,
        product_id: item.product_id,
        product_name: item.product_name,
        product_bar_code: item.product_bar_code,
        product_unit_id: item.product_unit_id,
        product_unit_name: item.product_unit_name,
        count,
        in_count: count,
        out_count: 0,
        product_price: toNumber(item.product_price),
        total_price: toNumber(item.total_price),
        tax_percent: toNumber(item.tax_percent),
        tax_price: toNumber(item.tax_price),
        remark: item.remark || doc.remark,
      });
    }
  }

  return detailRows;
}

export async function getSaleDetailPage(params: ErpSaleDetailApi.SaleDetailQueryParams) {
  const pageNo = Number(params.pageNo || 1);
  const page = Number(params.page || 10);
  const bizType = params.biz_type || 'all';

  const queryTasks: Promise<ErpSaleDetailApi.SaleDetailRow[]>[] = [];
  if (bizType === 'all' || bizType === 'sale_out') {
    queryTasks.push(querySaleOutDetailRows(params));
  }
  if (bizType === 'all' || bizType === 'sale_return') {
    queryTasks.push(querySaleReturnDetailRows(params));
  }

  const rows = (await Promise.all(queryTasks)).flat().sort(compareBillTimeDesc);
  const start = (pageNo - 1) * page;
  const returnData = new clientData();
  returnData.list = rows.slice(start, start + page);
  returnData.total = rows.length;
  return returnData;
}
