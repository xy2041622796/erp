import { exportExcelByConfig } from '#/api/common/import-export';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';
import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export namespace ErpWarehouseApi {
  /** 仓库信息 */
  export interface Warehouse {
    id?: number; // 仓库编号
    rowid?: string; // 唯一值
    name: string; // 仓库名称
    address: string; // 仓库地址
    sort: number; // 排序
    remark: string; // 备注
    principal: string; // 负责人
    warehouse_price?: number; // 仓储费，单位：元
    truckage_price?: number; // 搬运费，单位：元
    status: number; // 开启状态
    default_status?: boolean | number; // 是否默认
    // 兼容原字段名，如果 View 层还在用驼峰
    warehousePrice?: number;
    truckagePrice?: number;
    defaultStatus?: boolean;
    tenant_id?: number;
    deleted?: number;
    creator?: string;
    create_time?: string;
    updater?: string;
    update_time?: string;
  }
}

const WAREHOUSE_MODEL_ID = 'B511CD6BEFE363890EA6DE77575D9BB5';
const WAREHOUSE_TABLE = 'erp_warehouse';
const WAREHOUSE_DB = 'LMBill';
const WAREHOUSE_PK = 'rowid';

/** 查询仓库分页 */
export async function getWarehousePage(params: any) {
  const table = createFinanceDataTableCurrent(
    WAREHOUSE_MODEL_ID,
    WAREHOUSE_TABLE,
    WAREHOUSE_DB,
    WAREHOUSE_PK,
  );
  // 构建查询条件
  const filterConds = [];
  if (params.name) filterConds.push(cond('name', 'contains', params.name));
  if (params.status !== undefined)
    filterConds.push(cond('status', 'equal', params.status));

  if (filterConds.length > 0) table.Filter = and(...filterConds);

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params.page || 10,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);

  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items =
    resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);

  // eslint-disable-next-line new-cap
  const data = new clientData();
  data.dataTable = table;
  data.list = items;
  data.total = total;
  return data;
}

/** 查询仓库精简列表 */
export async function getWarehouseSimpleList(options?: {
  includeDisabled?: boolean;
}) {
  const table = createFinanceDataTableCurrent(
    WAREHOUSE_MODEL_ID,
    WAREHOUSE_TABLE,
    WAREHOUSE_DB,
    WAREHOUSE_PK,
  );
  if (!options?.includeDisabled) {
    table.Filter = cond('status', 'equal', 0); // 0是开启状态
  }
  const queryParam: any = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery.data);
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items =
    resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  return items.map((item: any) => ({
    ...item,
    id: item.rowid ?? item.id,
  }));
}

/** 查询仓库详情 */
export async function getWarehouse(id: number | string) {
  const table = createFinanceDataTableCurrent(
    WAREHOUSE_MODEL_ID,
    WAREHOUSE_TABLE,
    WAREHOUSE_DB,
    WAREHOUSE_PK,
  );
  table.Filter = cond(WAREHOUSE_PK, 'equal', id);
  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery.data);
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return (resultData.Items && resultData.Items[0]) || null;
}

/** 新增仓库 */
export async function createWarehouse(data: ErpWarehouseApi.Warehouse) {
  const table = createFinanceDataTableCurrent(
    WAREHOUSE_MODEL_ID,
    WAREHOUSE_TABLE,
    WAREHOUSE_DB,
    WAREHOUSE_PK,
  );
  const saveParam = table.getSaveParam([data], [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 修改仓库 */
export async function updateWarehouse(data: ErpWarehouseApi.Warehouse) {
  const table = createFinanceDataTableCurrent(
    WAREHOUSE_MODEL_ID,
    WAREHOUSE_TABLE,
    WAREHOUSE_DB,
    WAREHOUSE_PK,
  );
  const saveParam = table.getSaveParam([], [data], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 修改仓库启用状态 */
export async function updateWarehouseStatus(id: string, status: number) {
  const table = createFinanceDataTableCurrent(
    WAREHOUSE_MODEL_ID,
    WAREHOUSE_TABLE,
    WAREHOUSE_DB,
    WAREHOUSE_PK,
  );
  const updateData = {
    [WAREHOUSE_PK]: id,
    status,
  };
  const saveParam = table.getSaveParam([], [updateData], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 修改仓库默认状态 */
export async function updateWarehouseDefaultStatus(
  id: string,
  defaultStatus: boolean | number,
) {
  const table = createFinanceDataTableCurrent(
    WAREHOUSE_MODEL_ID,
    WAREHOUSE_TABLE,
    WAREHOUSE_DB,
    WAREHOUSE_PK,
  );
  const updateData = {
    [WAREHOUSE_PK]: id,
    default_status: defaultStatus ? 1 : 0,
  };
  const saveParam = table.getSaveParam([], [updateData], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 删除仓库 */
export async function deleteWarehouse(ids: string | string[]) {
  const table = createFinanceDataTableCurrent(
    WAREHOUSE_MODEL_ID,
    WAREHOUSE_TABLE,
    WAREHOUSE_DB,
    WAREHOUSE_PK,
  );
  let delArr: any[] = [];
  if (Array.isArray(ids)) {
    delArr = ids.map((id) => ({ [WAREHOUSE_PK]: id }));
  } else if (typeof ids === 'string') {
    delArr = ids.split(',').map((id) => ({ [WAREHOUSE_PK]: id }));
  }
  const saveParam = table.getSaveParam([], [], delArr);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 导出仓库 Excel */
export function exportWarehouse(params: any, encodingId?: string) {
  if (encodingId) {
    return exportExcelByConfig({
      formId: WAREHOUSE_MODEL_ID,
      tableName: WAREHOUSE_TABLE,
      dbName: WAREHOUSE_DB,
      primaryKey: WAREHOUSE_PK,
      fileName: '仓库',
      encodingId,
      extraData: params,
    });
  }

  return requestClient.download('/erp/warehouse/export-excel', { params });
}

function collectWarehouseIdentityKeys(item: any) {
  return [item?.rowid, item?.id, item?.warehouse_id, item?.row_id]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
}

/**
 * 将仓库编号统一归一到仓库唯一值 rowid。
 * 兼容历史数据：调用方传 id / rowid / row_id 都能得到 rowid。
 */
export async function normalizeWarehouseIdToRowid(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const warehouses = await getWarehouseSimpleList().catch(() => []);
  const hit = (Array.isArray(warehouses) ? warehouses : []).find((item: any) =>
    collectWarehouseIdentityKeys(item).includes(raw),
  );

  return String(hit?.rowid || hit?.row_id || hit?.id || raw).trim();
}

/** 获取一个仓库可能存在的历史标识，供查询兼容 id/rowid 混用数据。 */
export async function getWarehouseIdentityKeys(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return [];

  const warehouses = await getWarehouseSimpleList().catch(() => []);
  const hit = (Array.isArray(warehouses) ? warehouses : []).find((item: any) =>
    collectWarehouseIdentityKeys(item).includes(raw),
  );

  return [
    ...new Set([raw, ...collectWarehouseIdentityKeys(hit)].filter(Boolean)),
  ];
}
