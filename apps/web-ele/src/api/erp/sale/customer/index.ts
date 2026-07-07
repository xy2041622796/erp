import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';

// 数据表相关参数
const CUSTOMER_MODEL_ID = '58AE739462369587E5B51B79D4C57A05';
const CUSTOMER_TABLE = 'erp_sale_order';
const CUSTOMER_DB = 'LMBill';
const CUSTOMER_PK = 'rowid';

export namespace ErpCustomerApi {
  /** 客户信息 */
  export interface Customer {
    id?: number; // 客户编号
    name: string; // 客户名称
    contact: string; // 联系人
    mobile: string; // 手机号码
    telephone: string; // 联系电话
    email: string; // 电子邮箱
    fax: string; // 传真
    remark: string; // 备注
    status: number; // 开启状态
    sort: number; // 排序
    taxNo: string; // 纳税人识别号
    taxPercent: number; // 税率
    bankName: string; // 开户行
    bankAccount: string; // 开户账号
    bankAddress: string; // 开户地址
  }
}

/** 查询客户分页 */
export async function getCustomerPage(params: any) {
  const customerTable = new DataTable(
    CUSTOMER_MODEL_ID,
    CUSTOMER_TABLE,
    CUSTOMER_DB,
    CUSTOMER_PK,
  );

  // 构建查询条件
  const filterConds = [];
  if (params.name) filterConds.push(cond('name', 'contains', params.name));
  if (params.mobile)
    filterConds.push(cond('mobile', 'contains', params.mobile));
  if (params.telephone)
    filterConds.push(cond('telephone', 'contains', params.telephone));
  if (params.status !== undefined && params.status !== null)
    filterConds.push(cond('status', 'equal', params.status));
  if (filterConds.length > 0) customerTable.Filter = and(...filterConds);

  // 分页参数
  const queryParam: any = {
    Table: [customerTable],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(
    customerTable.queryUrl,
    queryParam,
    // { ...customerTable.getRequestHeader(), responseReturn: 'raw' },
  );
  customerTable.execQueryResult(resQuery);
  const returnData = new clientData();
  returnData.dataTable = customerTable;
  if (params.page && params.pageNo) {
    returnData.list = resQuery.data.Items;
    returnData.total = resQuery.data.Count;
  } else if (resQuery.data.Items.length > 0) {
    returnData.list = resQuery.data.Items[0];
  }
  return returnData;
}

/** 查询客户精简列表 */
export async function getCustomerSimpleList() {
  const customerTable = new DataTable(
    CUSTOMER_MODEL_ID,
    CUSTOMER_TABLE,
    CUSTOMER_DB,
    CUSTOMER_PK,
  );

  const queryParam = {
    Table: [customerTable],
    PageParam: { page: 0, index: 1 },
  };

  const resQuery = await requestClient.post(
    customerTable.queryUrl,
    queryParam,
    { ...customerTable.getRequestHeader(), responseReturn: 'raw' },
  );
  customerTable.execQueryResult(resQuery);
  return resQuery.data.Items || [];
}

/** 查询客户详情 */
export async function getCustomer(id: number) {
  const customerTable = new DataTable(
    CUSTOMER_MODEL_ID,
    CUSTOMER_TABLE,
    CUSTOMER_DB,
    CUSTOMER_PK,
  );
  customerTable.Filter = cond('rowid', 'equal', id);
  const queryParam = {
    Table: [customerTable],
    PageParam: { page: 1, index: 1 },
  };
  const resQuery = await requestClient.post(
    customerTable.queryUrl,
    queryParam,
    { ...customerTable.getRequestHeader(), responseReturn: 'raw' },
  );
  customerTable.execQueryResult(resQuery);
  return resQuery.data.Items[0] || null;
}

/** 新增客户 */
export async function createCustomer(data: ErpCustomerApi.Customer) {
  const customerTable = new DataTable(
    CUSTOMER_MODEL_ID,
    CUSTOMER_TABLE,
    CUSTOMER_DB,
    CUSTOMER_PK,
  );
  const saveParam = customerTable.getSaveParam([data], [], []);
  return await requestClient.post(
    customerTable.saveUrl,
    saveParam,
    customerTable.getRequestHeader(),
  );
}

/** 修改客户 */
export async function updateCustomer(data: ErpCustomerApi.Customer) {
  const customerTable = new DataTable(
    CUSTOMER_MODEL_ID,
    CUSTOMER_TABLE,
    CUSTOMER_DB,
    CUSTOMER_PK,
  );
  const saveParam = customerTable.getSaveParam([], [data], []);
  return await requestClient.post(
    customerTable.saveUrl,
    saveParam,
    customerTable.getRequestHeader(),
  );
}

/** 删除客户 */
export async function deleteCustomer(id: number | number[] | string) {
  const customerTable = new DataTable(
    CUSTOMER_MODEL_ID,
    CUSTOMER_TABLE,
    CUSTOMER_DB,
    CUSTOMER_PK,
  );
  let delArr: any[] = [];
  if (Array.isArray(id)) {
    delArr = id.map((rowid) => ({ rowid }));
  } else if (typeof id === 'string') {
    delArr = id.split(',').map((rowid) => ({ rowid }));
  } else {
    delArr = [{ rowid: id }];
  }
  const saveParam = customerTable.getSaveParam([], [], delArr);
  return await requestClient.post(
    customerTable.saveUrl,
    saveParam,
    customerTable.getRequestHeader(),
  );
}

/** 导出客户 Excel */
export function exportCustomer(params: any) {
  return requestClient.download('/erp/customer/export-excel', { params });
}
