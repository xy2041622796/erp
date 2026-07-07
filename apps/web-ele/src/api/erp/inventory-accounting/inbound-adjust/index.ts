import { clientData } from '#/api/qyapi';

const STORAGE_KEY = 'erp_inventory_inbound_cost_adjust_rows';

export namespace ErpInventoryInboundAdjustApi {
  export interface InboundAdjustRow {
    id?: string;
    no?: string;
    adjust_date?: string;
    source_no?: string;
    product_name?: string;
    warehouse_name?: string;
    original_count?: number;
    original_amount?: number;
    original_unit_cost?: number;
    adjust_amount?: number;
    adjusted_amount?: number;
    adjusted_unit_cost?: number;
    allocation_method?: string;
    remark?: string;
    status?: number;
  }
}

function readRows() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeRows(rows: ErpInventoryInboundAdjustApi.InboundAdjustRow[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function getId() {
  return `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
}

function getNo() {
  const ymd = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `RKCBTZ-${ymd}-${String(Date.now()).slice(-5)}`;
}

export async function getInventoryInboundAdjustPage(params: any) {
  const pageNo = Number(params?.pageNo || 1);
  const pageSize = Number(params?.page || 10);
  const rows = readRows().filter((row: ErpInventoryInboundAdjustApi.InboundAdjustRow) => {
    if (params?.no && !String(row.no || '').includes(params.no)) return false;
    if (params?.source_no && !String(row.source_no || '').includes(params.source_no)) return false;
    if (params?.product_name && !String(row.product_name || '').includes(params.product_name)) return false;
    return true;
  });
  const start = (pageNo - 1) * pageSize;
  const returnData = new clientData();
  returnData.list = pageSize === 0 ? rows : rows.slice(start, start + pageSize);
  returnData.total = rows.length;
  return returnData;
}

export async function createInventoryInboundAdjust(row: ErpInventoryInboundAdjustApi.InboundAdjustRow) {
  const rows = readRows();
  const originalCount = Number(row.original_count || 0);
  const originalAmount = Number(row.original_amount || 0);
  const adjustAmount = Number(row.adjust_amount || 0);
  const adjustedAmount = Number((originalAmount + adjustAmount).toFixed(2));
  const item = {
    ...row,
    id: getId(),
    no: row.no || getNo(),
    status: 10,
    original_unit_cost: originalCount === 0 ? 0 : Number((originalAmount / originalCount).toFixed(6)),
    adjusted_amount: adjustedAmount,
    adjusted_unit_cost: originalCount === 0 ? 0 : Number((adjustedAmount / originalCount).toFixed(6)),
  };
  rows.unshift(item);
  writeRows(rows);
  return item;
}

export async function updateInventoryInboundAdjustStatus(id: string, status: number) {
  const rows = readRows();
  const row = rows.find((item: ErpInventoryInboundAdjustApi.InboundAdjustRow) => item.id === id);
  if (row) row.status = status;
  writeRows(rows);
  return row;
}
