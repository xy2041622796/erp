import { getProductStockSummaryPage } from '#/api/erp/stock/product-summary';

export namespace ErpInventoryCostCalculateApi {
  export interface CostCalculateRow {
    id: string;
    period?: string;
    product_id?: string;
    product_code?: string;
    product_name?: string;
    product_category_name?: string;
    warehouse_id?: string;
    warehouse_name?: string;
    opening_count?: number;
    opening_amount?: number;
    in_count?: number;
    in_amount?: number;
    out_count?: number;
    out_amount?: number;
    ending_count?: number;
    ending_amount?: number;
    unit_cost?: number;
    exception_flag?: string;
  }
}

function toNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getUnitCost(amount: unknown, count: unknown) {
  const countValue = toNumber(count);
  if (countValue === 0) return 0;
  return Number((toNumber(amount) / countValue).toFixed(6));
}

function getExceptionFlag(row: ErpInventoryCostCalculateApi.CostCalculateRow) {
  if (toNumber(row.ending_count) < 0) return '结存数量为负';
  if (toNumber(row.ending_amount) < 0) return '结存金额为负';
  if (toNumber(row.ending_count) === 0 && toNumber(row.ending_amount) !== 0) return '零数量有金额';
  if (toNumber(row.ending_count) !== 0 && toNumber(row.ending_amount) === 0) return '有数量无金额';
  if (toNumber(row.out_count) > 0 && toNumber(row.out_amount) === 0) return '出库无成本';
  if (toNumber(row.in_count) > 0 && toNumber(row.in_amount) === 0) return '入库无金额';
  return '';
}

export async function getInventoryCostCalculatePage(params: any) {
  const res = await getProductStockSummaryPage(params);
  const list = (Array.isArray(res.list) ? res.list : []).map((row: any, index: number) => {
    const item: ErpInventoryCostCalculateApi.CostCalculateRow = {
      id: row.id || `${row.product_id || row.product_code || 'product'}_${row.warehouse_id || index}`,
      period: params?.period,
      product_id: row.product_id,
      product_code: row.product_code,
      product_name: row.product_name,
      product_category_name: row.product_category_name,
      warehouse_id: row.warehouse_id,
      warehouse_name: row.warehouse_name,
      opening_count: 0,
      opening_amount: 0,
      in_count: toNumber(row.in_count),
      in_amount: toNumber(row.in_amount),
      out_count: toNumber(row.out_count),
      out_amount: toNumber(row.out_amount),
      ending_count: toNumber(row.ending_count),
      ending_amount: toNumber(row.ending_amount),
    };
    item.unit_cost = getUnitCost(item.ending_amount, item.ending_count);
    item.exception_flag = getExceptionFlag(item);
    return item;
  });
  return { ...res, list, total: res.total || list.length };
}
