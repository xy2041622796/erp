import { and, clientData, cond } from '#/api/qyapi';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { requestClient } from '#/api/request';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';

export namespace ErpProductStockSummaryApi {
  export interface ProductStockSummary {
    id?: string;
    account_set_id?: string;
    lingma_sys_ent?: string;
    product_id?: string;
    product_code?: string;
    product_name?: string;
    product_category_id?: string;
    product_category_name?: string;
    model?: string;
    unit_name?: string;
    warehouse_id?: string;
    warehouse_name?: string;
    in_count?: number;
    in_amount?: number;
    out_count?: number;
    out_amount?: number;
    net_change_count?: number;
    ending_count?: number;
    ending_amount?: number;
    first_biz_time?: string;
    last_biz_time?: string;
  }
}

export const PRODUCT_STOCK_SUMMARY_FORM_ID = '69027B38302966CFF90D73AFD946AA9A';
export const PRODUCT_STOCK_SUMMARY_VIEW_NAME = 'v_erp_product_stock_receive_issue_summary_all';
export const PRODUCT_STOCK_SUMMARY_DB_NAME = 'LMBill';
export const PRODUCT_STOCK_SUMMARY_PK = 'id';

function createProductStockSummaryTable() {
  return createFinanceDataTableCurrent(
    PRODUCT_STOCK_SUMMARY_FORM_ID,
    PRODUCT_STOCK_SUMMARY_VIEW_NAME,
    PRODUCT_STOCK_SUMMARY_DB_NAME,
    PRODUCT_STOCK_SUMMARY_PK,
  );
}

function getNumber(value: unknown, defaultValue: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : defaultValue;
}

function getPositiveNumber(value: unknown, defaultValue: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : defaultValue;
}

function toTrimString(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeSelectValue(value: any) {
  if (value && typeof value === 'object') {
    return value.value ?? value.id ?? value.key ?? '';
  }
  return value;
}

function buildRowId(row: any, index = 0) {
  const id = [row?.account_set_id, row?.lingma_sys_ent, row?.product_id, row?.warehouse_id]
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .join('__');
  return id || row?.row_id || row?.record_row_id || row?.product_code || `summary_${index}`;
}

function pickItems(payload: any) {
  const result = payload?.Result ?? payload?.result ?? payload;
  const data = result?.data ?? result?.Data ?? result;

  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(result?.Items)) return result.Items;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(payload?.Items)) return payload.Items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(data)) return data;
  if (Array.isArray(result)) return result;
  return [];
}

function pickTotal(payload: any, itemsLength: number) {
  const result = payload?.Result ?? payload?.result ?? payload;
  const data = result?.data ?? result?.Data ?? result;
  return data?.Count ?? data?.count ?? data?.Total ?? data?.total ?? result?.Count ?? result?.total ?? itemsLength;
}

function collectCategoryOptions(tree: any[], targetId: string) {
  const ids = new Set<string>();
  const names = new Set<string>();

  function collect(node: any) {
    const nodeId = toTrimString(node?.id);
    const nodeName = toTrimString(node?.name);
    if (nodeId) ids.add(nodeId);
    if (nodeName) names.add(nodeName);
    (node?.children || []).forEach(collect);
  }

  function walk(nodes: any[]) {
    for (const node of nodes || []) {
      const nodeId = toTrimString(node?.id);
      if (nodeId === targetId) {
        collect(node);
        return true;
      }
      if (walk(node?.children || [])) return true;
    }
    return false;
  }

  walk(tree);
  if (ids.size === 0) ids.add(targetId);
  return { ids: Array.from(ids), names: Array.from(names) };
}

async function getCategoryOptions(value: any) {
  const categoryId = toTrimString(normalizeSelectValue(value));
  if (!categoryId) return null;
  const categoryTree = await getProductCategorySimpleList();
  return collectCategoryOptions(categoryTree as any[], categoryId);
}

function filterByCategory(rows: any[], categoryOptions: null | { ids: string[]; names: string[] }) {
  if (!categoryOptions) return rows;
  const idSet = new Set(categoryOptions.ids.map(toTrimString).filter(Boolean));
  const nameSet = new Set(categoryOptions.names.map(toTrimString).filter(Boolean));

  return rows.filter((row) => {
    const categoryId = toTrimString(row?.product_category_id);
    const categoryName = toTrimString(row?.product_category_name);
    return (categoryId && idSet.has(categoryId)) || (categoryName && nameSet.has(categoryName));
  });
}

function paginateRows(rows: any[], pageNo: number, pageSize: number) {
  if (pageSize === 0) return rows;
  const start = (pageNo - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

/** 查询商品收发汇总视图分页 */
export async function getProductStockSummaryPage(params: any) {
  const table = createProductStockSummaryTable();
  const filters: any[] = [];

  if (params?.product_name) {
    filters.push(cond('product_name', 'contains', params.product_name));
  }
  if (params?.product_code) {
    filters.push(cond('product_code', 'contains', params.product_code));
  }
  if (params?.product_category_name) {
    filters.push(cond('product_category_name', 'contains', params.product_category_name));
  }
  if (params?.warehouse_id) {
    filters.push(cond('warehouse_id', 'equal', normalizeSelectValue(params.warehouse_id)));
  }
  if (params?.warehouse_name) {
    filters.push(cond('warehouse_name', 'contains', params.warehouse_name));
  }

  const categoryOptions = params?.product_category_id
    ? await getCategoryOptions(params.product_category_id)
    : null;

  table.Filter = filters.length > 0 ? and(...filters) : null;

  const rawPageSize = getNumber(params?.page ?? params?.pageSize ?? params?.size, 10);
  const pageSize = rawPageSize === 0 ? 0 : getPositiveNumber(rawPageSize, 10);
  const pageNo = getPositiveNumber(params?.pageNo ?? params?.currentPage ?? params?.index, 1);
  const queryPageSize = categoryOptions ? 0 : pageSize;
  const queryPageNo = categoryOptions ? 1 : pageNo;

  const queryParam = table.getQueryParam(
    'Table',
    table.Filter,
    null,
    null,
    queryPageSize,
    queryPageNo,
  );

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  } as any);

  table.execQueryResult(resQuery);

  const payload = resQuery.data ?? {};
  const items = pickItems(payload);
  const filteredItems = filterByCategory(items, categoryOptions);
  const pagedItems = categoryOptions ? paginateRows(filteredItems, pageNo, pageSize) : filteredItems;
  const list = pagedItems.map((row: any, index: number) => ({
    ...row,
    id: row.id || buildRowId(row, index),
  }));

  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = list;
  returnData.total = categoryOptions ? filteredItems.length : pickTotal(payload, list.length);
  return returnData;
}
