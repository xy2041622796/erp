import { createPurchaseIn, type ErpPurchaseInApi } from '#/api/erp/purchase/in';
import {
  getPurchaseOrder,
  type ErpPurchaseOrderApi,
} from '#/api/erp/purchase/order';
import { getProductSimpleList } from '#/api/erp/product/product';
import { createSaleOut, type ErpSaleOutApi } from '#/api/erp/sale/out';
import { getSaleOrder, type ErpSaleOrderApi } from '#/api/erp/sale/order';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';

export type WarehouseSplitGroup = {
  warehouseId: string;
  warehouseName: string;
  productCount: number;
};

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
  return String(v ?? '');
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

function getItemRemainCountForSaleOut(item: any) {
  const totalCount = toNumber(
    item?.count ??
      item?.qty ??
      item?.quantity ??
      item?.total_count ??
      item?.totalCount,
  );
  const outCount = toNumber(
    item?.out_count ?? item?.outCount ?? item?.out_qty ?? item?.outQty,
  );
  const returnCount = toNumber(
    item?.return_count ??
      item?.returnCount ??
      item?.return_qty ??
      item?.returnQty,
  );
  return totalCount - outCount + returnCount;
}

function normalizeItemAmount(item: any, count: number) {
  const taxPercent = toNumber(item?.tax_percent ?? item?.taxPercent);
  const sourceCount = toNumber(
    item?.count ?? item?.qty ?? item?.quantity ?? item?.total_count ?? item?.totalCount,
  );
  const explicitProductPrice = toNumber(item?.product_price ?? item?.productPrice);
  const explicitTotalProductPrice = toNumber(
    item?.total_product_price ?? item?.totalProductPrice,
  );
  const explicitTaxPrice = toNumber(item?.tax_price ?? item?.taxPrice);
  const explicitTotalPrice = toNumber(item?.total_price ?? item?.totalPrice);

  let totalProductPrice = 0;
  let taxPrice = 0;
  let totalPrice = 0;
  let productPrice = 0;

  // 优先使用订单明细里真实落库的 total_price / tax_price 反推。
  if (sourceCount > 0 && count > 0 && (explicitTotalPrice !== 0 || explicitTaxPrice !== 0)) {
    const ratio = count / sourceCount;
    totalPrice = explicitTotalPrice * ratio;
    taxPrice = explicitTaxPrice * ratio;
    totalProductPrice = totalPrice - taxPrice;
    productPrice = totalProductPrice / count;
  } else if (sourceCount > 0 && count > 0 && explicitTotalProductPrice !== 0) {
    const ratio = count / sourceCount;
    totalProductPrice = explicitTotalProductPrice * ratio;
    taxPrice = explicitTaxPrice * ratio;
    totalPrice = totalProductPrice + taxPrice;
    productPrice = totalProductPrice / count;
  } else {
    productPrice = explicitProductPrice;
    totalProductPrice = productPrice * count;
    taxPrice = totalProductPrice * (taxPercent / 100);
    totalPrice = totalProductPrice + taxPrice;
  }

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
  const total_product_price = items.reduce((sum, it) => {
    const explicit = toNumber(it?.total_product_price);
    if (explicit) return sum + explicit;
    return sum + toNumber(it?.product_price) * toNumber(it?.count);
  }, 0);
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

async function buildRefs() {
  const [products, warehouses] = await Promise.all([
    getProductSimpleList(),
    getWarehouseSimpleList(),
  ]);

  const productWarehouseMap = new Map<string, string>();
  for (const p of products || []) {
    const productKeyCandidates = [p?.rowid, p?.id, p?.product_id, p?.product_code];
    const warehouseId = p?.default_warehouse_id ? String(p.default_warehouse_id) : '';
    if (!warehouseId) continue;
    for (const key of productKeyCandidates) {
      const k = toKey(key);
      if (k) productWarehouseMap.set(k, warehouseId);
    }
  }

  const warehouseNameMap = new Map<string, string>();
  for (const w of warehouses || []) {
    const key = toKey(w?.rowid ?? w?.id);
    if (key) warehouseNameMap.set(key, w?.name || key);
  }

  return { productWarehouseMap, warehouseNameMap };
}

function resolveWarehouseId(
  item: any,
  productWarehouseMap: Map<string, string>,
): string {
  const productKeys = [item?.product_id, item?.productId, item?.id];
  for (const k of productKeys) {
    const hit = productWarehouseMap.get(toKey(k));
    if (hit) return hit;
  }
  const fallback = toKey(item?.warehouse_id ?? item?.warehouseId);
  if (fallback) return fallback;
  throw new Error(`产品 ${toKey(item?.product_name ?? item?.product_id)} 未配置默认仓库`);
}

export async function previewSaleOutSplit(orderIds: string[]) {
  const { productWarehouseMap, warehouseNameMap } = await buildRefs();
  const groupCountMap = new Map<string, number>();

  for (const orderId of orderIds) {
    const order = (await getSaleOrder(orderId)) as ErpSaleOrderApi.SaleOrder & {
      items?: any[];
    };
    const items = Array.isArray(order?.items) ? order.items : [];

    for (const item of items) {
      const remain = getItemRemainCountForSaleOut(item);
      if (!(remain > 0)) continue;

      const warehouseId = resolveWarehouseId(item, productWarehouseMap);
      groupCountMap.set(warehouseId, (groupCountMap.get(warehouseId) || 0) + 1);
    }
  }

  const groups: WarehouseSplitGroup[] = Array.from(groupCountMap.entries()).map(
    ([warehouseId, productCount]) => ({
      warehouseId,
      warehouseName: warehouseNameMap.get(warehouseId) || warehouseId,
      productCount,
    }),
  );

  return groups;
}

export async function previewPurchaseInSplit(
  orderIds: string[],
  purchaseOrderFormKey?: string,
) {
  const { productWarehouseMap, warehouseNameMap } = await buildRefs();
  const groupCountMap = new Map<string, number>();

  for (const orderId of orderIds) {
    const order = (await getPurchaseOrder(
      orderId,
      purchaseOrderFormKey,
      purchaseOrderFormKey,
    )) as ErpPurchaseOrderApi.PurchaseOrder & {
      items?: any[];
    };
    const items = Array.isArray(order?.items) ? order.items : [];

    for (const item of items) {
      const totalCount = Number(item?.count ?? 0);
      const inCount = Number(item?.in_count ?? item?.inCount ?? 0);
      const returnCount = Number(item?.return_count ?? item?.returnCount ?? 0);
      const remain = totalCount - inCount + returnCount;
      if (!(remain > 0)) continue;

      const warehouseId = resolveWarehouseId(item, productWarehouseMap);
      groupCountMap.set(warehouseId, (groupCountMap.get(warehouseId) || 0) + 1);
    }
  }

  const groups: WarehouseSplitGroup[] = Array.from(groupCountMap.entries()).map(
    ([warehouseId, productCount]) => ({
      warehouseId,
      warehouseName: warehouseNameMap.get(warehouseId) || warehouseId,
      productCount,
    }),
  );

  return groups;
}

export async function generateSaleOutByOrders(orderIds: string[]) {
  const { productWarehouseMap } = await buildRefs();
  let created = 0;

  for (const orderId of orderIds) {
    const order = (await getSaleOrder(orderId)) as ErpSaleOrderApi.SaleOrder & {
      items?: any[];
    };
    const items = Array.isArray(order?.items) ? order.items : [];

    const grouped = new Map<string, any[]>();
    for (const item of items) {
      const remain = getItemRemainCountForSaleOut(item);
      if (!(remain > 0)) continue;

      const warehouseId = resolveWarehouseId(item, productWarehouseMap);
      const amount = normalizeItemAmount(item, remain);
      const normalized = {
        out_id: undefined,
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
        _total_product_price: amount.total_product_price,
      };

      const rows = grouped.get(warehouseId) || [];
      rows.push(normalized);
      grouped.set(warehouseId, rows);
    }

    for (const [warehouseId, groupItems] of grouped.entries()) {
      const amounts = calcDocAmounts(
        groupItems.map((it) => ({
          ...it,
          total_product_price: it?._total_product_price,
        })),
        order.discount_percent,
        (order as any).other_price,
      );
      const payload: ErpSaleOutApi.SaleOut & { warehouse_outbound?: string } = {
        order_id: (order as any)?.id ?? (order as any)?.rowid,
        order_no: (order as any)?.no,
        customer_id: (order as any)?.customer_id,
        account_id: (order as any)?.account_id,
        sale_user_id: (order as any)?.sale_user_id,
        out_time: nowDateTimeString() as any,
        remark: (order as any)?.remark,
        total_count: amounts.total_count,
        total_product_price: amounts.total_product_price,
        total_tax_price: amounts.total_tax_price,
        discount_percent: amounts.discount_percent,
        discount_price: amounts.discount_price,
        other_price: amounts.other_price,
        total_price: amounts.total_price,
        receipt_price: toNumber((order as any)?.deposit_price),
        file_url: (order as any)?.file_url,
        warehouse_outbound: String(warehouseId),
        items: groupItems.map(({ _total_product_price, ...it }) => it),
      };
      await createSaleOut(payload);
      created += 1;
    }
  }

  return { created };
}

export async function generatePurchaseInByOrders(
  orderIds: string[],
  purchaseOrderFormKey?: string,
) {
  const { productWarehouseMap } = await buildRefs();
  let created = 0;

  for (const orderId of orderIds) {
    const order = (await getPurchaseOrder(
      orderId,
      purchaseOrderFormKey,
      purchaseOrderFormKey,
    )) as ErpPurchaseOrderApi.PurchaseOrder & {
      items?: any[];
    };
    const items = Array.isArray(order?.items) ? order.items : [];

    const grouped = new Map<string, any[]>();
    for (const item of items) {
      const totalCount = Number(item?.count ?? 0);
      const inCount = Number(item?.in_count ?? item?.inCount ?? 0);
      const returnCount = Number(item?.return_count ?? item?.returnCount ?? 0);
      const remain = totalCount - inCount + returnCount;
      if (!(remain > 0)) continue;

      const warehouseId = resolveWarehouseId(item, productWarehouseMap);
      const amount = normalizeItemAmount(item, remain);
      const normalized = {
        product_id: item.product_id,
        product_unit_id: item.product_unit_id,
        product_price: amount.product_price,
        total_product_price: amount.total_product_price,
        total_price: amount.total_price,
        tax_percent: amount.tax_percent,
        tax_price: amount.tax_price,
        remark: item.remark,
        order_item_id: item.rowid || item.id,
        count: remain,
      };

      const rows = grouped.get(warehouseId) || [];
      rows.push(normalized);
      grouped.set(warehouseId, rows);
    }

    for (const [warehouseId, groupItems] of grouped.entries()) {
      const amounts = calcDocAmounts(
        groupItems,
        order.discount_percent,
        (order as any).other_price,
      );
      const payload: ErpPurchaseInApi.PurchaseIn & { warehouse_inbound?: string } = {
        order_id: order.id as any,
        order_no: order.no,
        supplier_id: order.supplier_id,
        account_id: order.account_id as any,
        in_time: nowDateTimeString(),
        remark: order.remark,
        total_count: amounts.total_count,
        total_product_price: amounts.total_product_price,
        tax_price: amounts.total_tax_price,
        discount_percent: amounts.discount_percent,
        discount_price: amounts.discount_price,
        other_price: amounts.other_price,
        total_price: amounts.total_price,
        warehouse_inbound: String(warehouseId),
        items: groupItems,
      };
      await createPurchaseIn(payload);
      created += 1;
    }
  }

  return { created };
}
