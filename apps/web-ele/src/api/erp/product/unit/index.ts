import { generateUUID } from '@vben/utils';

import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTableCurrent } from '../../finance/common/account-set-scope';

export namespace ErpProductUnitApi {
  /** 产品单位信息 */
  export interface ProductUnit {
    id?: number | string; // 单位编号
    name: string; // 单位名字
    status: number; // 单位状态
    creator?: string; // 创建者
    create_time?: string; // 创建时间
    updater?: string; // 更新者
    update_time?: string; // 更新时间
    tenant_id?: number; // 租户编号
    createuser?: string; // 创建人
    createtime?: string; // 创建时间
    updateuser?: string; // 修改人
    updatetime?: string; // 修改时间
    wfid?: string; // 流程实例id
    flowstate?: number; // 流程状态
    ReportID?: string; // 报表id
    description?: string; // 摘要
    lingma_sys_is_delete?: number; // 是否删除
    lingma_sys_ent?: string; // 企业标识
    account_set_id?: string; // 账套id
  }
}

const FORM_ID = '808171E1BEEB39628534FFE429195F38';
const TABLE_NAME = 'erp_product_unit';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'id';

/** 查询产品单位分页 */
export async function getProductUnitPage(params: any = {}) {
  const table = createFinanceDataTableCurrent(
    FORM_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );

  const conditions: any[] = [];
  if (params.name) {
    conditions.push(cond('name', 'contains', params.name));
  }
  if (params.status !== undefined && params.status !== '') {
    conditions.push(cond('status', 'equal', params.status));
  }

  if (conditions.length > 0) {
    table.Filter = and(...conditions);
  }

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: 10,
      index: 1,
    },
  };

  if (params.page && params.pageNo) {
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

  const resData = resQuery.data.Result.data;
  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = resData.Items || [];
  returnData.total = resData.Count || 0;
  return returnData;
}

/** 查询产品单位精简列表 */
export async function getProductUnitSimpleList() {
  const res = await getProductUnitPage({ page: 0, pageNo: 1 });
  return Array.isArray(res?.list) ? res.list : [];
}

/** 查询产品单位详情 */
export async function getProductUnit(id: number | string) {
  const table = createFinanceDataTableCurrent(
    FORM_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );

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

  const items = resQuery.data.Result.data.Items;
  if (items && items.length > 0) {
    return items[0] as ErpProductUnitApi.ProductUnit;
  }
  return undefined;
}

/** 新增产品单位 */
export async function createProductUnit(data: ErpProductUnitApi.ProductUnit) {
  const table = createFinanceDataTableCurrent(
    FORM_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  const saveParam = table.getSaveParam(
    [{ ...data, id: data.id || generateUUID() }],
    [],
    [],
  );
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 修改产品单位 */
export async function updateProductUnit(data: ErpProductUnitApi.ProductUnit) {
  const table = createFinanceDataTableCurrent(
    FORM_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  const saveParam = table.getSaveParam([], [data], []);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 删除产品单位 */
export async function deleteProductUnit(id: number | string) {
  const table = createFinanceDataTableCurrent(
    FORM_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  const deleteList = [{ [PRIMARY_KEY]: id }];
  const saveParam = table.getSaveParam([], [], deleteList);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
