import type { ErpPurchaseOrderApi } from '#/api/erp/purchase/order';
import type { ErpSaleOrderApi } from '#/api/erp/sale/order';

import { getProductSimpleList } from '#/api/erp/product/product';
import { getPurchaseOrder } from '#/api/erp/purchase/order';
import { createPurchaseReturn } from '#/api/erp/purchase/return';
import { getSaleOrder } from '#/api/erp/sale/order';
import { createSaleReturn } from '#/api/erp/sale/return';

function nowDateTimeString() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function toKey(v: unknown) {
  return String(v ?? '').trim();
}

function toNumber(v: unknown) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return 0;
    const normalized = s.replaceAll(',', '');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function buildProductWarehouseMap() {
  const products = await getProductSimpleList();
  const productWarehouseMap = new Map<string, string>();
  for (const p of products || []) {
    const productKeyCandidates = [
      p?.rowid,
      p?.id,
      p?.product_id,
      p?.product_code,
    ];
    const warehouseId = p?.default_warehouse_id
      ? String(p.default_warehouse_id)
      : '';
    if (!warehouseId) continue;
    for (const key of productKeyCandidates) {
      const k = toKey(key);
      if (k) productWarehouseMap.set(k, warehouseId);
    }
  }
  return productWarehouseMap;
}

function resolveWarehouseId(
  item: any,
  productWarehouseMap: Map<string, string>,
) {
  const productKeys = [item?.product_id, item?.productId, item?.id];
  for (const k of productKeys) {
    const hit = productWarehouseMap.get(toKey(k));
    if (hit) return hit;
  }
  const fallback = toKey(item?.warehouse_id ?? item?.warehouseId);
  if (fallback) return fallback;
  throw new Error(
    `产品 ${toKey(item?.product_name ?? item?.product_id)} 未配置默认仓库`,
  );
}

function normalizeItemAmount(item: any, count: number) {
  const productPrice = toNumber(item?.product_price ?? item?.productPrice);
  const taxPercent = toNumber(item?.tax_percent ?? item?.taxPercent);
  const totalProductPrice = productPrice * count;
  const taxPrice = totalProductPrice * (taxPercent / 100);
  const totalPrice = totalProductPrice + taxPrice;

  return {
    product_price: productPrice,
    tax_percent: taxPercent,
    total_product_price: totalProductPrice,
    tax_price: taxPrice,
    total_price: totalPrice,
  };
}

function calcDocAmounts(
  items: any[],
  discountPercentRaw?: unknown,
  otherPriceRaw?: unknown,
) {
  const total_count = items.reduce((sum, it) => sum + toNumber(it?.count), 0);
  const total_product_price = items.reduce(
    (sum, it) => sum + toNumber(it?.total_product_price),
    0,
  );
  const total_tax_price = items.reduce(
    (sum, it) => sum + toNumber(it?.tax_price),
    0,
  );
  const gross = items.reduce((sum, it) => sum + toNumber(it?.total_price), 0);

  const discount_percent = toNumber(discountPercentRaw);
  const other_price = toNumber(otherPriceRaw);
  const discount_price = gross * (discount_percent / 100);
  const total_price = gross - discount_price + other_price;

  return {
    total_count,
    total_product_price,
    total_tax_price,
    discount_percent,
    discount_price,
    other_price,
    total_price,
  };
}

function getSaleReturnableCount(orderItem: any) {
  const outCount = toNumber(orderItem?.out_count ?? orderItem?.outCount);
  const returnCount = toNumber(
    orderItem?.return_count ?? orderItem?.returnCount,
  );
  const remain = outCount - returnCount;
  return Math.max(remain, 0);
}

function getPurchaseReturnableCount(orderItem: any) {
  const inCount = toNumber(orderItem?.in_count ?? orderItem?.inCount);
  const returnCount = toNumber(
    orderItem?.return_count ?? orderItem?.returnCount,
  );
  const remain = inCount - returnCount;
  return Math.max(remain, 0);
}

/**
 * 从销售订单生成销售退货单（默认：按产品默认仓库填 warehouse_id）。
 * 生成后会调用 createSaleReturn（其内部会回写订单项 return_count）。
 */
export async function generateSaleReturnByOrder(orderId: string) {
  const order = (await getSaleOrder(orderId)) as ErpSaleOrderApi.SaleOrder & {
    items?: any[];
  };
  const items = Array.isArray(order?.items) ? order.items : [];

  const productWarehouseMap = await buildProductWarehouseMap();

  const returnItems: any[] = [];
  for (const item of items) {
    const remain = getSaleReturnableCount(item);
    if (!(remain > 0)) continue;

    const warehouseId = resolveWarehouseId(item, productWarehouseMap);
    const amount = normalizeItemAmount(item, remain);

    returnItems.push({
      return_id: undefined,
      order_item_id: item?.id ?? item?.rowid,
      warehouse_id: String(warehouseId),
      product_id: item?.product_id,
      product_unit_id: item?.product_unit_id,
      product_price: amount.product_price,
      count: remain,
      total_price: amount.total_price,
      tax_percent: amount.tax_percent,
      tax_price: amount.tax_price,
      remark: item?.remark,
      total_product_price: amount.total_product_price,
    });
  }

  if (returnItems.length === 0) {
    throw new Error('未找到可生成退货单的明细（需已出库且未全部退货）');
  }

  const amounts = calcDocAmounts(
    returnItems,
    (order as any)?.discount_percent,
    (order as any)?.other_price,
  );

  const payload: any = {
    order_id: (order as any)?.id ?? (order as any)?.rowid,
    order_no: (order as any)?.no,
    customer_id: (order as any)?.customer_id,
    account_id: (order as any)?.account_id,
    sale_user_id: (order as any)?.sale_user_id,
    return_time: nowDateTimeString(),
    status: 10,
    remark: (order as any)?.remark,
    total_count: amounts.total_count,
    total_product_price: amounts.total_product_price,
    total_tax_price: amounts.total_tax_price,
    discount_percent: amounts.discount_percent,
    discount_price: amounts.discount_price,
    other_price: amounts.other_price,
    total_price: amounts.total_price,
    items: returnItems.map(({ total_product_price, ...it }) => it),
  };

  await createSaleReturn(payload);
  return { created: 1 };
}

/**
 * 从采购订单生成采购退货单（默认：按产品默认仓库填 warehouse_id）。
 */
export async function generatePurchaseReturnByOrder(orderId: string) {
  const order = (await getPurchaseOrder(
    orderId,
  )) as ErpPurchaseOrderApi.PurchaseOrder & { items?: any[] };
  const items = Array.isArray(order?.items) ? order.items : [];

  const productWarehouseMap = await buildProductWarehouseMap();

  const returnItems: any[] = [];
  for (const item of items) {
    const remain = getPurchaseReturnableCount(item);
    if (!(remain > 0)) continue;

    const warehouseId = resolveWarehouseId(item, productWarehouseMap);
    const amount = normalizeItemAmount(item, remain);

    returnItems.push({
      return_id: undefined,
      order_item_id: item?.id ?? item?.rowid,
      warehouse_id: String(warehouseId),
      product_id: item?.product_id,
      product_unit_id: item?.product_unit_id,
      product_price: amount.product_price,
      count: remain,
      total_price: amount.total_price,
      tax_percent: amount.tax_percent,
      tax_price: amount.tax_price,
      remark: item?.remark,
      total_product_price: amount.total_product_price,
    });
  }

  if (returnItems.length === 0) {
    throw new Error('未找到可生成退货单的明细（需已入库且未全部退货）');
  }

  const amounts = calcDocAmounts(
    returnItems,
    (order as any)?.discount_percent,
    (order as any)?.other_price,
  );

  const payload: any = {
    order_id: (order as any)?.id ?? (order as any)?.rowid,
    order_no: (order as any)?.no,
    supplier_id: (order as any)?.supplier_id,
    account_id: (order as any)?.account_id,
    return_time: nowDateTimeString(),
    status: 10,
    remark: (order as any)?.remark,
    total_count: amounts.total_count,
    total_product_price: amounts.total_product_price,
    total_tax_price: amounts.total_tax_price,
    discount_percent: amounts.discount_percent,
    discount_price: amounts.discount_price,
    other_price: amounts.other_price,
    total_price: amounts.total_price,
    items: returnItems.map(({ total_product_price, ...it }) => it),
  };

  await createPurchaseReturn(payload);
  return { created: 1 };
}
