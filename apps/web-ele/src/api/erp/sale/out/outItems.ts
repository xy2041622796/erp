import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

// TODO: 确认表名
const TABLE_NAME = 'erp_sale_out_items';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'id';
const DATA_MODEL_ID = '57728102F41B537F6795ABA7EC258F36';

/** 查询销售出库明细 */
export async function querySaleOutItems(params: { out_id: string }) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);

  // 这里假设关联字段是 out_id
  table.Filter = and(cond('out_id', 'equal', params.out_id));

  const queryParam = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);

  const resData = resQuery.data.Result.data;
  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = resData.Items || [];
  return returnData;
}

/** 新增销售出库明细（批量） */
export async function addSaleOutItems(list: any[]) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = table.getSaveParam(list, [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 更新销售出库明细（批量） */
export async function updateSaleOutItems(list: any[]) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = table.getSaveParam([], list, []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}


/**
 * 查询一条销售出库明细权限模板。
 * 新增销售出库时没有 out_id 和明细行，不能从当前明细判断字段权限；
 * 这里显式查询明细项表，读取后端随行返回的 lingma_sys_params 作为金额列权限来源。
 */
export async function getSaleOutItemPermissionTemplate() {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return Array.isArray(resData?.Items) ? (resData.Items[0] || null) : null;
}
