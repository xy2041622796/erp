import { generateUUID } from '@vben/utils';

import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { normalizeWarehouseIdToRowid } from '#/api/erp/stock/warehouse';
import {
  STOCK_RECORD_MODEL_ID,
  addStockRecordList,
  deleteStockRecordList,
  getStockRecordListByBizNo,
} from '#/api/erp/stock/record';
import { buildStockRecordAdds } from '#/api/erp/stock/record/stock-record-helper';
import {
  STOCK_MODEL_ID,
  addStockList,
  getStockPage,
  updateStockList,
} from '#/api/erp/stock/stock';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';

export namespace OpeningEntryProductStockApi {
  export interface Row {
    id?: string;
    product_id?: string;
    product_code?: string;
    product_name?: string;
    product_model?: string;
    unit_id?: string;
    unit_name?: string;
    warehouse_id?: string;
    warehouse_name?: string;
    opening_stock_qty?: number;
    opening_cost_amount?: number;
    opening_price?: number;
    opening_date?: string;
    remark?: string;
    status?: number;
    account_set_id?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;
    lingma_sys_ent?: string;
  }
}

export const OPENING_ENTRY_PRODUCT_STOCK_FORM_ID = '9E2B5D8A1C4F7B3E6D9A2C5F8B1E4A7D';
export const OPENING_ENTRY_PRODUCT_STOCK_TABLE_NAME = 'biz_opening_inventory';
export const OPENING_ENTRY_PRODUCT_STOCK_DB_NAME = 'LMBill';
export const OPENING_ENTRY_PRODUCT_STOCK_PK = 'id';
export const OPENING_ENTRY_PRODUCT_STOCK_BIZ_TYPE = 99;

function createOpeningEntryProductStockTable(
  formId = OPENING_ENTRY_PRODUCT_STOCK_FORM_ID,
) {
  return createFinanceDataTableCurrent(
    formId,
    OPENING_ENTRY_PRODUCT_STOCK_TABLE_NAME,
    OPENING_ENTRY_PRODUCT_STOCK_DB_NAME,
    OPENING_ENTRY_PRODUCT_STOCK_PK,
  );
}

function extractListAndTotal(raw: any) {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? items.length;
  return { items, total };
}

function getOpeningBizNo(id: string) {
  return `OPEN-STOCK-${id}`;
}

async function assertCanGenerateStockRecord(row: OpeningEntryProductStockApi.Row) {
  if (!row.opening_date) {
    throw new Error('审批失败：期初日期不能为空');
  }

  if (!String(row.warehouse_id ?? '').trim()) {
    throw new Error('审批失败：仓库不能为空');
  }
}

async function applyOpeningInventoryToStock(row: OpeningEntryProductStockApi.Row) {
  const stockRes = await getStockPage(
    {
      product_id: row.product_id,
      warehouse_id: await normalizeWarehouseIdToRowid(row.warehouse_id),
      pageNo: 1,
      page: 10,
    },
    STOCK_MODEL_ID,
  );

  const stockList = stockRes?.list || [];
  const currentStock = stockList[0];
  const delta = Number(row.opening_stock_qty || 0);
  let finalTotal = delta;

  if (!currentStock) {
    await addStockList(
      [
        {
          rowid: generateUUID(),
          id: generateUUID(),
          product_id: row.product_id,
          product_name: row.product_name,
          warehouse_id: await normalizeWarehouseIdToRowid(row.warehouse_id),
          warehouse_name: row.warehouse_name,
          count: delta,
          unit_id: row.unit_id || '',
          unit_name: row.unit_name || '',
          category_id: '',
          category_name: '',
          account_set_id: row.account_set_id,
          lingma_sys_is_delete: 0,
        },
      ],
      STOCK_MODEL_ID,
    );
  } else {
    finalTotal = Number(currentStock.count || 0) + delta;
    await updateStockList(
      [
        {
          rowid: currentStock.rowid,
          count: finalTotal,
        },
      ],
      STOCK_MODEL_ID,
    );
  }

  return {
    currentStock,
    finalTotal,
    delta,
  };
}

async function rollbackOpeningInventoryFromStock(
  row: OpeningEntryProductStockApi.Row,
) {
  const stockRes = await getStockPage(
    {
      product_id: row.product_id,
      warehouse_id: await normalizeWarehouseIdToRowid(row.warehouse_id),
      pageNo: 1,
      page: 10,
    },
    STOCK_MODEL_ID,
  );

  const stockList = stockRes?.list || [];
  const currentStock = stockList[0];
  if (!currentStock) {
    throw new Error('反审批失败：未找到对应库存结果记录');
  }

  const delta = Number(row.opening_stock_qty || 0);
  const nextTotal = Number(currentStock.count || 0) - delta;
  if (nextTotal < 0) {
    throw new Error('反审批失败：回滚后库存将小于 0，请先检查后续库存业务');
  }

  await updateStockList(
    [
      {
        rowid: currentStock.rowid,
        count: nextTotal,
      },
    ],
    STOCK_MODEL_ID,
  );
}

async function applyOpeningInventoryToStockRecord(
  row: OpeningEntryProductStockApi.Row,
  finalTotal: number,
) {
  const bizNo = getOpeningBizNo(String(row.id || ''));
  const bizBaseId = Date.now();

  const { adds } = await buildStockRecordAdds(
    [
      {
        product_id: row.product_id,
        warehouse_id: await normalizeWarehouseIdToRowid(row.warehouse_id),
        delta: Number(row.opening_stock_qty || 0),
        total_count: finalTotal,
      },
    ],
    {
      biz_type: OPENING_ENTRY_PRODUCT_STOCK_BIZ_TYPE,
      biz_id: bizBaseId,
      biz_item_id: bizBaseId,
      biz_no: bizNo,
      description: `库存期初审批：${row.product_name || ''}`,
      biz_time: (row as any).audit_time ?? (row as any).create_time ?? (row as any).createtime,
    },
  );

  const payload = adds.map((item: any) => ({
    ...item,
    account_set_id: row.account_set_id,
    lingma_sys_is_delete: 0,
  }));

  await addStockRecordList(payload, STOCK_RECORD_MODEL_ID);
}

async function rollbackOpeningInventoryFromStockRecord(
  row: OpeningEntryProductStockApi.Row,
) {
  const bizNo = getOpeningBizNo(String(row.id || ''));
  const recordList = await getStockRecordListByBizNo(
    OPENING_ENTRY_PRODUCT_STOCK_BIZ_TYPE,
    bizNo,
    STOCK_RECORD_MODEL_ID,
  );

  if (!recordList.length) return;

  await deleteStockRecordList(
    recordList.map((item: any) => item.rowid).filter(Boolean),
    STOCK_RECORD_MODEL_ID,
  );
}

export async function getOpeningEntryProductStockPage(params: {
  keyword?: string;
  product_id?: string;
  warehouse_id?: string;
  pageNo?: number;
  page?: number;
}) {
  const table = createOpeningEntryProductStockTable();
  const conditions: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  if (params.product_id)
    conditions.push(cond('product_id', 'equal', params.product_id));
  if (params.warehouse_id)
    conditions.push(cond('warehouse_id', 'equal', params.warehouse_id));
  if (params.keyword)
    conditions.push(cond('product_name', 'contains', params.keyword));
  table.Filter = and(...conditions);

  const queryParam = {
    Table: [table],
    PageParam: { page: params.page || 10, index: params.pageNo || 1 },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const { items, total } = extractListAndTotal(resQuery);
  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = items;
  returnData.total = total;
  return returnData;
}

export async function getOpeningEntryProductStock(id: string) {
  const table = createOpeningEntryProductStockTable();
  table.Filter = and(cond(OPENING_ENTRY_PRODUCT_STOCK_PK, 'equal', id));

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData = resQuery?.data?.Result?.data || {};
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  return items[0] || null;
}

export async function createOpeningEntryProductStock(
  data: OpeningEntryProductStockApi.Row,
) {
  const table = createOpeningEntryProductStockTable();
  const payload = {
    ...data,
    id: data.id || generateUUID(),
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
    status: data?.status ?? 10,
    opening_cost_amount:
      data?.opening_cost_amount ??
      Number(
        (Number(data?.opening_stock_qty || 0) * Number(data?.opening_price || 0)).toFixed(2),
      ),
  };
  const saveParam = table.getSaveParam([payload], [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateOpeningEntryProductStock(
  data: OpeningEntryProductStockApi.Row,
) {
  if (!data.id) throw new Error('缺少 id');
  const table = createOpeningEntryProductStockTable();
  const payload = {
    ...data,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
    opening_cost_amount:
      data?.opening_cost_amount ??
      Number(
        (Number(data?.opening_stock_qty || 0) * Number(data?.opening_price || 0)).toFixed(2),
      ),
  };
  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateOpeningEntryProductStockStatus(
  id: string,
  status: number,
) {
  const table = createOpeningEntryProductStockTable();
  const row = await getOpeningEntryProductStock(id);
  if (!row) {
    throw new Error('未找到库存期初记录');
  }

  const currentStatus = Number(row.status || 10);
  if (currentStatus === status) {
    return true;
  }

  if (status === 20) {
    await assertCanGenerateStockRecord(row);
    const { finalTotal } = await applyOpeningInventoryToStock(row);
    try {
      await applyOpeningInventoryToStockRecord(row, finalTotal);
    } catch (error) {
      await rollbackOpeningInventoryFromStock(row);
      throw error;
    }

    const saveParam = table.getSaveParam([], [{ id, status: 20 }], []);
    return await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
  }

  if (status === 10) {
    await rollbackOpeningInventoryFromStockRecord(row);
    await rollbackOpeningInventoryFromStock(row);

    const saveParam = table.getSaveParam([], [{ id, status: 10 }], []);
    return await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
  }

  throw new Error(`不支持的状态变更：${status}`);
}

export async function deleteOpeningEntryProductStock(id: string) {
  return await updateOpeningEntryProductStock({ id, lingma_sys_is_delete: 1 });
}
