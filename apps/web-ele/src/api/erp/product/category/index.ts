import { generateUUID, handleTree } from '@vben/utils';

import { exportExcelByConfig } from '#/api/common/import-export';
import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';

import { createFinanceDataTableCurrent } from '../../finance/common/account-set-scope';

// 数据表配置
const FORM_ID = '808171E1BEEB39628534FFE429195F38'; // 从上下文推断，若有固定ID请替换
const TABLE_NAME = 'erp_product_category';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'id';

export namespace ErpProductCategoryApi {
  /** 产品分类信息 */
  export interface ProductCategory {
    id?: string; // 分类编号
    parent_id?: string; // 父分类编号
    parentId?: string; // 父分类编号，兼容树组件默认字段
    name: string; // 分类名称
    code?: string; // 分类编码
    sort?: number; // 分类排序
    status?: number; // 开启状态
    children?: ProductCategory[]; // 子分类
    deleted?: boolean; // 是否删除
    tenant_id?: number; // 租户编号
    createuser?: string; // 创建人
    createtime?: string; // 创建时间
    createTime?: string; // 创建时间，兼容前端展示字段
    updateuser?: string; // 修改人
    updatetime?: string; // 修改时间
    updateTime?: string; // 修改时间，兼容前端展示字段
    wfid?: string; // 流程实例id
    flowstate?: number; // 流程状态
    ReportID?: string; // 报表id
    description?: string; // 摘要
    lingma_sys_is_delete?: number; // 是否删除
    lingma_sys_ent?: string; // 企业标识
    account_set_id?: string; // 账套 id
  }
}

function createCategoryTable() {
  return createFinanceDataTableCurrent(
    FORM_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
}

function normalizeParentId(value: any) {
  const parentId = String(value ?? '').trim();
  return parentId && parentId !== '0' ? parentId : '000000';
}

function normalizeStatus(value: any) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }
  return Number(value);
}

function normalizeProductCategory(
  row: any,
): ErpProductCategoryApi.ProductCategory {
  const id = String(row?.id ?? row?.rowid ?? row?.row_id ?? '').trim();
  const parentId = normalizeParentId(row?.parent_id ?? row?.parentId);
  const sort =
    row?.sort === undefined || row?.sort === null || row?.sort === ''
      ? 0
      : Number(row.sort);

  return {
    ...row,
    id: id || row?.id,
    parent_id: parentId,
    parentId,
    name: String(row?.name ?? '').trim(),
    code: String(row?.code ?? '').trim(),
    sort,
    status: normalizeStatus(row?.status),
    createTime: row?.createTime ?? row?.createtime ?? row?.create_time,
    updateTime: row?.updateTime ?? row?.updatetime ?? row?.update_time,
  };
}

function getResultData(response: any) {
  return (
    response?.data?.Result?.data ??
    response?.Result?.data ??
    response?.data?.Result ??
    response?.Result ??
    response?.data ??
    response ??
    {}
  );
}

function getResultItems(response: any) {
  const resultData = getResultData(response);
  return Array.isArray(resultData?.Items) ? resultData.Items : [];
}

function buildCategoryFilter(params?: any) {
  const conditions: any[] = [];
  if (params?.name) {
    conditions.push(cond('name', 'contains', params.name));
  }
  if (
    params?.status !== undefined &&
    params?.status !== null &&
    params?.status !== ''
  ) {
    conditions.push(cond('status', 'equal', Number(params.status)));
  }
  return conditions.length > 0 ? and(...conditions) : null;
}

function normalizeSaveData(data: ErpProductCategoryApi.ProductCategory) {
  const normalized = normalizeProductCategory({
    ...data,
    id: data.id || generateUUID(),
    parent_id: normalizeParentId(data.parent_id ?? data.parentId),
    status: normalizeStatus(data.status),
    sort: data.sort ?? 0,
  });
  const saveData: any = { ...normalized };
  delete saveData.children;
  delete saveData.createTime;
  delete saveData.parentId;
  delete saveData.updateTime;
  return saveData;
}

/** 查询产品分类列表 */
export async function getProductCategoryPage(params?: any) {
  const table = createCategoryTable();
  table.Filter = buildCategoryFilter(params);

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: 0, // 0表示查询所有
      index: 1,
    },
  };

  if (params?.page && params?.pageNo) {
    queryParam.PageParam = {
      page: params.page,
      index: params.pageNo,
    };
  }

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);

  const resData = getResultData(resQuery);
  const items = getResultItems(resQuery).map((item) =>
    normalizeProductCategory(item),
  );
  // eslint-disable-next-line new-cap
  const returnData = new clientData();
  returnData.dataTable = table;

  returnData.list = items;
  returnData.total = resData.Count ?? items.length;
  return returnData;
}

export async function getProductCategoryList(
  params?: any,
): Promise<ErpProductCategoryApi.ProductCategory[]> {
  const table = createCategoryTable();
  table.Filter = buildCategoryFilter(params);

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: 0, // 0表示查询所有
      index: 1,
    },
  };

  if (params?.page && params?.pageNo) {
    queryParam.PageParam = {
      page: params.page,
      index: params.pageNo,
    };
  }

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);

  const items = getResultItems(resQuery).map((item) =>
    normalizeProductCategory(item),
  );
  return items;
}

/** 查询产品分类精简列表 */
export async function getProductCategorySimpleList() {
  const params = {
    page: 0,
    pageNo: 1,
    status: 0, // 默认查询开启状态
  };
  const res = await getProductCategoryPage(params);
  if (!res.list || !Array.isArray(res.list)) {
    return [];
  }
  const treeList = handleTree(
    res.list.map((item) => ({ ...item, children: undefined })),
    'id',
    'parent_id',
    'children',
  ) as ErpProductCategoryApi.ProductCategory[];
  return treeList;
}

/** 查询产品分类详情 */
export async function getProductCategory(id: string) {
  const table = createCategoryTable();

  table.Filter = and(cond(PRIMARY_KEY, 'equal', id));

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);

  const items = getResultItems(resQuery);
  if (items.length > 0) {
    return normalizeProductCategory(items[0]);
  }
  return null;
}

/** 新增产品分类 */
export async function createProductCategory(
  data: ErpProductCategoryApi.ProductCategory,
) {
  const table = createCategoryTable();
  const saveData = normalizeSaveData(data);
  const saveParam = table.getSaveParam([saveData], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
  return { ...(res as any), __savedData: saveData };
}

/** 修改产品分类 */
export async function updateProductCategory(
  data: ErpProductCategoryApi.ProductCategory,
) {
  const table = createCategoryTable();
  const saveData = normalizeSaveData(data);
  const saveParam = table.getSaveParam([], [saveData], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
  return { ...(res as any), __savedData: saveData };
}

/** 删除产品分类 */
export async function deleteProductCategory(id: string) {
  const table = createCategoryTable();
  const deleteList = [{ [PRIMARY_KEY]: id }];
  const saveParam = table.getSaveParam([], [], deleteList);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 导出产品分类 Excel */
export function exportProductCategory(params: any, encodingId?: string) {
  if (encodingId) {
    return exportExcelByConfig({
      formId: FORM_ID,
      tableName: TABLE_NAME,
      dbName: DB_NAME,
      primaryKey: PRIMARY_KEY,
      fileName: '产品分类',
      encodingId,
      extraData: params,
    });
  }

  return requestClient.download('/erp/product-category/export-excel', {
    params,
  });
}
