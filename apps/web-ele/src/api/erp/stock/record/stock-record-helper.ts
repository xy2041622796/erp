import { generateUUID } from '@vben/utils';

import { normalizeWarehouseIdToRowid } from '#/api/erp/stock/warehouse';

import { createStockRecordTable, STOCK_RECORD_MODEL_ID } from './index';

export function formatMySqlDateTime(d: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const date = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join(
    '-',
  );
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${date} ${time}`;
}

export function normalizeStockRecordBizTime(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatMySqlDateTime(value);
  }

  const raw = String(value ?? '').trim();
  if (!raw) return formatMySqlDateTime(new Date());

  const normalized = raw.replace('T', ' ').replace('Z', '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized} 00:00:00`;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(normalized)) {
    return normalized.slice(0, 19);
  }

  const dateValue = new Date(raw);
  return Number.isNaN(dateValue.getTime())
    ? formatMySqlDateTime(new Date())
    : formatMySqlDateTime(dateValue);
}

async function resolveWarehouseIdOrThrow(warehouseIdLike: unknown) {
  const raw = String(warehouseIdLike ?? '').trim();
  if (!raw) throw new Error('库存明细生成失败：warehouse_id 为空');
  return await normalizeWarehouseIdToRowid(raw);
}

function resolveProductIdOrThrow(productIdLike: unknown) {
  const raw = String(productIdLike ?? '').trim();
  if (!raw) throw new Error('库存明细生成失败：product_id 为空');
  return raw;
}

export interface StockRecordBizInfo {
  biz_type: number;
  biz_no: string;
  description?: string;
  biz_id?: number;
  biz_item_id?: number;
  biz_time?: Date | string;
}

export interface StockDelta {
  product_id: unknown;
  warehouse_id: unknown;
  delta: number;
  total_count: number;
}

export async function buildStockRecordAdds(
  deltas: StockDelta[],
  biz: StockRecordBizInfo,
  formKey = STOCK_RECORD_MODEL_ID,
) {
  const tb = createStockRecordTable(formKey);

  const recordTime = normalizeStockRecordBizTime(biz.biz_time);
  const now = formatMySqlDateTime(new Date());
  const base = Date.now();

  const added: any[] = [];
  for (const [i, d] of deltas.entries()) {
    const product_id = resolveProductIdOrThrow(d.product_id);
    const warehouse_id = await resolveWarehouseIdOrThrow(d.warehouse_id);

    const id = base + i;

    added.push({
      rowid: generateUUID(),
      id,
      product_id,
      warehouse_id,
      count: d.delta,
      total_count: d.total_count,
      biz_type: biz.biz_type,
      biz_id: biz.biz_id ?? id,
      biz_item_id: biz.biz_item_id ?? id,
      biz_no: biz.biz_no,
      description: biz.description,
      biz_time: recordTime,
      create_time: now,
      update_time: now,
    });
  }

  return { table: tb, adds: added };
}
