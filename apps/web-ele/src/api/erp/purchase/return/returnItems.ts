import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

const TABLE_NAME = 'erp_purchase_return_items'; // 按你实际表名改
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'id'; // 按你实际主键字段改
const DATA_MODEL_ID = '9BF89A303AED38F93A788064E37724FB'; // 按你实际 DataModelId 改

/** 查询退货明细 */
export async function queryPurchaseReturnItems(params: { return_id: string }) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);

  table.Filter = and(cond('return_id', 'equal', params.return_id));

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

/** 新增退货明细（批量） */
export async function addPurchaseReturnItems(list: any[]) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = table.getSaveParam(list, [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 更新退货明细（批量） */
export async function updatePurchaseReturnItems(list: any[]) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = table.getSaveParam([], list, []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
