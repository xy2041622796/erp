import type { PageParam as DefPageParam } from '@vben/request';

import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

const appId = 'F0BA18993242D85B7EF85D41BC65E030';
const tableName = 'Bil_Customer_Info';
const dbName = 'LMBill';
const primaryKey = 'rowid';
const supplierCompanyType = 2;

export namespace ErpSupplierApi {
  /** 供应商信息 */
  export interface Supplier {
    rowid?: string;
    id?: number | string; // 供应商编号
    name: string; // 供应商名称
    contact?: string; // 联系人
    contactName?: string; // 联系人
    mobile?: string; // 手机号码
    telephone?: string; // 联系电话
    email?: string; // 电子邮箱
    fax?: string; // 传真
    remark?: string; // 备注
    status?: number; // 开启状态
    sort?: number; // 排序
    taxNo?: string; // 纳税人识别号
    taxPercent?: number; // 税率
    bankName?: string; // 开户行
    bankAccount?: string; // 开户账号
    bankAddress?: string; // 开户地址
    customerCode?: string; // 供应商编号
    companyType?: number; // 主体类型：2=供应商
  }
}

function createSupplierTable() {
  const supplierTable = createFinanceDataTable(
    appId,
    tableName,
    dbName,
    primaryKey,
  );
  supplierTable.Type = '数据库表';
  return supplierTable;
}

function mapRowToSupplier(item: any): ErpSupplierApi.Supplier {
  return {
    ...item,
    rowid: item.rowid,
    id: item.id ?? item.rowid,
    name: item.customer_name ?? item.customerName ?? item.name,
    contact: item.contact_name ?? item.contactName ?? item.contact,
    contactName: item.contact_name ?? item.contactName ?? item.contact,
    mobile: item.contact_mobile ?? item.mobile,
    telephone: item.contact_phone ?? item.telephone,
    email: item.contact_email ?? item.email,
    remark: item.remark,
    taxNo: item.tax_registration_number ?? item.taxNo,
    bankName: item.bank_name ?? item.bankName,
    bankAccount: item.bank_account_number ?? item.bankAccount,
    customerCode: item.customer_code ?? item.customerCode,
    companyType: item.company_type ?? item.companyType,
  } as ErpSupplierApi.Supplier;
}

function mapSupplierToRow(data: ErpSupplierApi.Supplier): any {
  const row: any = {
    customer_code: data.customerCode,
    customer_name: data.name,
    contact_name: data.contactName ?? data.contact,
    contact_mobile: data.mobile,
    contact_phone: data.telephone,
    contact_email: data.email,
    remark: data.remark,
    tax_registration_number: data.taxNo,
    bank_name: data.bankName,
    bank_account_number: data.bankAccount,
    company_type: supplierCompanyType,
  };

  const rowid = data.rowid ?? data.id;
  if (rowid !== null && rowid !== undefined && String(rowid).trim()) {
    row.rowid = rowid;
  }

  return row;
}

function buildSupplierConditions(params: Partial<ErpSupplierApi.Supplier> = {}) {
  const conditions: any[] = [cond('company_type', 'equal', supplierCompanyType)];

  if (params.name) conditions.push(cond('customer_name', 'contains', params.name));
  if (params.contact || params.contactName) {
    conditions.push(
      cond('contact_name', 'contains', params.contactName ?? params.contact),
    );
  }
  if (params.mobile) conditions.push(cond('contact_mobile', 'contains', params.mobile));
  if (params.telephone) {
    conditions.push(cond('contact_phone', 'contains', params.telephone));
  }

  return conditions;
}

/** 查询供应商分页 */
export async function getSupplierPage(
  params: DefPageParam & ErpSupplierApi.Supplier,
) {
  const supplierTable = createSupplierTable();
  const { pageNo, page, ...others } = params;
  supplierTable.Filter = and(...buildSupplierConditions(others));

  const queryParam = {
    Table: [supplierTable],
    PageParam: {
      page: page || 0,
      index: pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(supplierTable.queryUrl, queryParam, {
    headers: supplierTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  supplierTable.execQueryResult(resQuery);

  const resData = resQuery.data?.Result?.data;
  const returnData = new clientData();
  returnData.dataTable = supplierTable;
  returnData.list = (resData?.Items || []).map(mapRowToSupplier);
  returnData.total = resData?.Count || 0;
  return returnData;
}

/** 获得供应商精简列表 */
export async function getSupplierSimpleList() {
  const supplierTable = createSupplierTable();
  supplierTable.Filter = and(cond('company_type', 'equal', supplierCompanyType));

  const queryParam = {
    Table: [supplierTable],
    PageParam: {
      page: 0,
      index: 1,
    },
  };

  const resQuery = await requestClient.post(supplierTable.queryUrl, queryParam, {
    headers: supplierTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  supplierTable.execQueryResult(resQuery);
  const resData = resQuery.data?.Result?.data;

  return (resData?.Items || []).map(mapRowToSupplier) as any[];
}

/** 查询供应商详情 */
export async function getSupplier(id: number | string) {
  const supplierTable = createSupplierTable();
  supplierTable.Filter = and(
    cond(primaryKey, 'equal', id),
    cond('company_type', 'equal', supplierCompanyType),
  );

  const queryParam = {
    Table: [supplierTable],
    PageParam: {
      page: 1,
      index: 1,
    },
  };

  const resQuery = await requestClient.post(supplierTable.queryUrl, queryParam, {
    headers: supplierTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  supplierTable.execQueryResult(resQuery);
  const resData = resQuery.data?.Result?.data;

  const returnData = new clientData();
  returnData.dataTable = supplierTable;
  returnData.list = (resData?.Items || []).map(mapRowToSupplier);
  return returnData;
}

/** 新增供应商 */
export async function createSupplier(data: ErpSupplierApi.Supplier) {
  const supplierTable = createSupplierTable();
  const saveParam = supplierTable.getSaveParam([mapSupplierToRow(data)], [], []);
  return await requestClient.post(supplierTable.saveUrl, saveParam, {
    headers: supplierTable.getRequestHeader(),
  });
}

/** 修改供应商 */
export async function updateSupplier(data: ErpSupplierApi.Supplier) {
  const supplierTable = createSupplierTable();
  const saveParam = supplierTable.getSaveParam([], [mapSupplierToRow(data)], []);
  return await requestClient.post(supplierTable.saveUrl, saveParam, {
    headers: supplierTable.getRequestHeader(),
  });
}

/** 删除供应商 */
export async function deleteSupplier(id: number | string) {
  const supplierTable = createSupplierTable();
  const deleteList = [{ [primaryKey]: id }];
  const saveParam = supplierTable.getSaveParam([], [], deleteList);
  return await requestClient.post(supplierTable.saveUrl, saveParam, {
    headers: supplierTable.getRequestHeader(),
  });
}

/** 导出供应商 Excel */
export function exportSupplier(params: any) {
  return requestClient.download('/erp/supplier/export-excel', { params });
}
