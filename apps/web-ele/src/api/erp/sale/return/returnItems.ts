import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

const TABLE_NAME = 'erp_sale_return_items';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'id';
const DATA_MODEL_ID = '900EB04B14073B3FBF036AA1B5AC62E1';

/** 查询销售退货明细 */
export async function querySaleReturnItems(params: {
  return_id: string;
}): Promise<{
  list: any[];
}> {
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

/** 新增销售退货明细（批量） */
export async function addSaleReturnItems(list: any[]) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = table.getSaveParam(list, [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 更新销售退货明细（批量） */
export async function updateSaleReturnItems(list: any[]) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = table.getSaveParam([], list, []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
