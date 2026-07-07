import type { PageParam, PageResult } from '@vben/request';

import type { CrmPermissionApi } from '#/api/crm/permission';

import { downloadByTableConfig, exportExcelByConfig, importExcelByConfig } from '#/api/common/import-export';
import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';
import { createFinanceDataTable } from '../finance/common/account-set-scope';

const FORM_ID = 'F0BA18993242D85B7EF85D41BC65E030';
const CONTACT_FORM_ID = 'C09D6D36CDD6F73F782EB8BB39D34D19';
const TABLE_NAME = 'Bil_Customer_Info';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'rowid';

const CUSTOMER_CODE_RULE_ID = '54EC19DB5426C42CA6042AF763A3AA93';
const CUSTOMER_IMPORT_ENCODING_ID = '65220F172723157F45B4C94AAB011CD9';
const CUSTOMER_EXPORT_ENCODING_ID = '65220F172723157F45B4C94AAB011CD9';
const CUSTOMER_IMPORT_CUSTOM_PATH = 'LMBCustomer';
const CUSTOMER_EXPORT_FILE_NAME = '导出文件内容';
const CUSTOMER_IMPORT_TEMPLATE_FILE_NAME = '客户模板_整行边框规则.xlsx';
const CUSTOMER_IMPORT_TEMPLATE_CUSTOM_PATH = '/NewApp/xlsxtemp';

export namespace CrmCustomerApi {
  export interface Customer {
    id?: number | string;
    name?: string;
    ownerUserId?: number | string;
    ownerUserName?: string;
    ownerUserDeptName?: string;
    lockStatus?: boolean;
    dealStatus?: boolean;
    mobile?: string;
    telephone?: string;
    email?: string;
    areaId?: number;
    areaName?: string;
    detailAddress?: string;
    region?: string;
    regionCode?: string;
    remark?: string;
    createTime?: Date | string;
    updateTime?: Date | string;

    rowid?: string;
    customerCode?: string;
    customerName?: string;
    customerGroup?: string;
    contactName?: string;
    contactMobile?: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
    bankAccountNumber?: string;
    bankName?: string;
    companyType?: number;
    departName?: string;
    invoiceAddress?: string;
    invoiceBank?: string;
    invoiceBankAccount?: string;
    invoicePhone?: string;
    invoiceTitle?: string;
    isCommonUsed?: number;
    lingmaSysEnt?: string;
    openingBranch?: string;
    taxRegistrationNumber?: string;
    departId?: number | string;
    sourceLeadId?: number | string;
    sourceLeadCode?: string;
    sourceLeadName?: string;
    isPool?: number;
    poolTime?: string;
    poolReason?: string;
    lastFollowTime?: string;
    nextFollowTime?: string;
    lastFollowContent?: string;
  }

  export interface Invoice {
    rowid?: number | string;
    customerId?: number | string;
    invoiceTitle?: string;
    taxNumber?: string;
    bankName?: string;
    address?: string;
    phone?: string;
    bankAccount?: string;
    createtime?: string;
    updatetime?: string;
    createuser?: string;
    updateuser?: string;
  }

  export interface InvoiceRowExt {
    lingma_sys_key?: string;
  }

  export interface CustomerImportReqVO {
    ownerUserId?: number | string;
    file: File;
    updateSupport?: boolean;
  }

  export interface Contact {
    id?: number | string;
    customerId?: number | string;
    customerCode?: string;
    customerName?: string;
    companyType?: number;
    contactName?: string;
    gender?: number | string;
    mobile?: string;
    phone?: string;
    email?: string;
    positionName?: string;
    isPrimary?: number | string;
    remark?: string;
    createTime?: string;
    updateTime?: string;
  }
}

function mapRowToCustomer(item: any): CrmCustomerApi.Customer {
  return {
    id: item.rowid,
    name: item.customer_name,
    ownerUserId: item.owner_user_id,
    ownerUserName: item.ownerUserName,
    ownerUserDeptName: item.depart_name,
    departId: item.depart_id,
    lockStatus: !!item.lock_status,
    dealStatus: !!item.deal_status,
    mobile: item.contact_mobile,
    telephone: item.contact_phone,
    email: item.contact_email,
    areaName: item.address,
    detailAddress: item.address,
    region: item.region,
    regionCode: item.regionCode,
    remark: item.remark,
    createTime: item.createtime,
    updateTime: item.updatetime,
    rowid: item.rowid,
    customerCode: item.customer_code,
    customerName: item.customer_name,
    customerGroup: item.customer_group,
    contactName: item.contact_name,
    contactMobile: item.contact_mobile,
    contactPhone: item.contact_phone,
    contactEmail: item.contact_email,
    address: item.address,
    bankAccountNumber: item.bank_account_number,
    bankName: item.bank_name,
    companyType: item.company_type,
    departName: item.depart_name,
    invoiceAddress: item.invoice_address,
    invoiceBank: item.invoice_bank,
    invoiceBankAccount: item.invoice_bank_account,
    invoicePhone: item.invoice_phone,
    invoiceTitle: item.invoice_title,
    isCommonUsed: item.is_common_used,
    lingmaSysEnt: item.lingma_sys_ent,
    openingBranch: item.opening_branch,
    taxRegistrationNumber: item.tax_registration_number,
    sourceLeadId: item.source_lead_id,
    sourceLeadCode: item.source_lead_code,
    sourceLeadName: item.sourceLeadName || item.source_lead_name,
    isPool: Number(item.is_pool || 0),
    poolTime: item.pool_time,
    poolReason: item.pool_reason,
    lastFollowTime: item.last_follow_time,
    nextFollowTime: item.next_follow_time,
    lastFollowContent: item.last_follow_content,
  } as CrmCustomerApi.Customer;
}

function isUnifiedSubjectStateValid(isPool: number, dealStatus: number) {
  return (isPool === 1 && dealStatus === 0) || (isPool === 0 && dealStatus === 0) || (isPool === 0 && dealStatus === 1);
}

function normalizeSubjectStateValue(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function mapCustomerToRow(data: CrmCustomerApi.Customer): any {
  const row: any = {
    customer_code: data.customerCode,
    customer_group: data.customerGroup,
    customer_name: data.name ?? data.customerName,
    contact_name: data.contactName,
    contact_mobile: data.mobile ?? data.contactMobile,
    contact_phone: data.telephone ?? data.contactPhone,
    contact_email: data.email ?? data.contactEmail,
    address: data.detailAddress ?? data.address ?? data.areaName,
    region: data.region,
    regionCode: data.regionCode,
    bank_account_number: data.bankAccountNumber,
    bank_name: data.bankName,
    company_type: data.companyType,
    depart_id: data.departId,
    depart_name: data.departName ?? data.ownerUserDeptName,
    owner_user_id: data.ownerUserId,
    ownerUserName: data.ownerUserName,
    invoice_address: data.invoiceAddress,
    invoice_bank: data.invoiceBank,
    invoice_bank_account: data.invoiceBankAccount,
    invoice_phone: data.invoicePhone,
    invoice_title: data.invoiceTitle,
    is_common_used: data.isCommonUsed,
    lingma_sys_ent: data.lingmaSysEnt,
    opening_branch: data.openingBranch,
    remark: data.remark,
    tax_registration_number: data.taxRegistrationNumber,
    source_lead_id: data.sourceLeadId,
    source_lead_code: data.sourceLeadCode,
    source_lead_name: data.sourceLeadName,
    is_pool: data.isPool,
    pool_time: data.poolTime,
    pool_reason: data.poolReason,
    last_follow_time: data.lastFollowTime,
    next_follow_time: data.nextFollowTime,
    last_follow_content: data.lastFollowContent,
    deal_status: data.dealStatus,
    lock_status: data.lockStatus ? 1 : 0,
  };

  const rowid = (data as any).rowid ?? data.id;
  if (rowid !== null && rowid !== undefined && String(rowid).trim()) {
    row.rowid = rowid;
  }

  return row;
}

export async function getCustomerPage(params: PageParam) {
  const customerTable = createFinanceDataTable(
    FORM_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  const p = params as any;
  const pageNo = p.pageNo || p.index || 1;
  const pageSize = p.page || p.size || 10;
  const conditions: any[] = [];
  customerTable.Type = '数据库表';
  if (p.customerCode) conditions.push(cond('customer_code', 'contains', p.customerCode));
  if (p.name) conditions.push(cond('customer_name', 'contains', p.name));
  if (p.contactName) conditions.push(cond('contact_name', 'contains', p.contactName));
  if (p.mobile) conditions.push(cond('contact_mobile', 'contains', p.mobile));
  if (p.telephone) conditions.push(cond('contact_phone', 'contains', p.telephone));
  if (p.regionCodePrefix) conditions.push(cond('regionCode', 'startswith', p.regionCodePrefix));
  if (p.ownerUserName) conditions.push(cond('ownerUserName', 'contains', p.ownerUserName));
  if (p.sourceLeadName) conditions.push(cond('source_lead_name', 'contains', p.sourceLeadName));
  if (p.createTimeStart) conditions.push(cond('createtime', 'greaterthanorequal', p.createTimeStart));
  if (p.createTimeEnd) conditions.push(cond('createtime', 'lessthanorequal', p.createTimeEnd));
  if (p.companyType) conditions.push(cond('company_type', 'equal', p.companyType));

  const explicitIsPool = normalizeSubjectStateValue(p.isPool);
  const explicitDealStatus = normalizeSubjectStateValue(p.dealStatus);
  const includeAllStates = !!p.includeAllStates;
  if (explicitIsPool !== undefined) conditions.push(cond('is_pool', 'equal', explicitIsPool));
  if (explicitDealStatus !== undefined) conditions.push(cond('deal_status', 'equal', explicitDealStatus));
  if (explicitIsPool === undefined && explicitDealStatus === undefined && !includeAllStates && Number(p.companyType || 1) === 1) {
    conditions.push(cond('is_pool', 'equal', 0));
    conditions.push(cond('deal_status', 'equal', 1));
  }

  if (conditions.length > 0) customerTable.Filter = and(...conditions);

  const queryParam: any = {
    Table: [customerTable],
    PageParam: { page: pageSize, index: pageNo },
  };

  const resQuery = await requestClient.post(customerTable.queryUrl, queryParam, {
    headers: customerTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  customerTable.execQueryResult(resQuery);
  const returnData = new clientData();
  returnData.dataTable = customerTable;
  returnData.list = (resQuery.data?.Result?.data?.Items || []).map((item: any) => mapRowToCustomer(item));
  returnData.total = resQuery.data?.Result?.data?.Count || 0;

  return returnData as any;
}

export async function getCustomer(id: number | string) {
  const customerTable = createFinanceDataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  customerTable.Filter = and(cond('rowid', 'equal', id));
  const queryParam = { Table: [customerTable], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(customerTable.queryUrl, queryParam, {
    headers: customerTable.getRequestHeader(), responseReturn: 'raw',
  });
  customerTable.execQueryResult(resQuery);
  const items = customerTable.items || [];
  if (items.length === 0) return null as any;
  return mapRowToCustomer(items[0]) as any;
}

export async function createCustomer(data: CrmCustomerApi.Customer) {
  const customerTable = createFinanceDataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const row = mapCustomerToRow(data);
  const saveParam = customerTable.getSaveParam([row], [], []);
  return await requestClient.post(customerTable.saveUrl, saveParam, {
    headers: customerTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export async function createCustomerWithAutoCode(data: CrmCustomerApi.Customer, options?: { codeRuleId?: string }) {
  const customerTable = createFinanceDataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const rowid = (data as any).rowid ?? (data as any).id;
  if (!rowid) throw new Error('缺少 rowid，无法新增客户');

  const row = mapCustomerToRow(data);
  const saveParam = customerTable.getSaveParam([row], [], []);
  const codeRuleId = options?.codeRuleId ?? CUSTOMER_CODE_RULE_ID;
  const hasCode = !!String((data as any).customerCode || '').trim();

  try {
    const createRes = await requestClient.post(customerTable.saveUrl, saveParam, {
      headers: customerTable.getRequestHeader(), responseReturn: 'raw',
    });

    if (hasCode) return { ...createRes, rowid, customerCode: (data as any).customerCode };

    const codeRes = await getCodeString(rowid, codeRuleId, customerTable.getRequestHeader());
    if (codeRes?.Code === 200 && codeRes?.Message) {
      const updateParam = customerTable.getSaveParam([], [{ rowid, customer_code: codeRes.Message }], []);
      await requestClient.post(customerTable.saveUrl, updateParam, {
        headers: customerTable.getRequestHeader(), responseReturn: 'raw',
      });
      return { ...createRes, rowid, customerCode: codeRes.Message };
    }

    const rollbackParam = customerTable.getSaveParam([], [], [{ rowid }]);
    await requestClient.post(customerTable.saveUrl, rollbackParam, {
      headers: customerTable.getRequestHeader(), responseReturn: 'raw',
    });
    return Promise.reject(new Error(codeRes?.Message || '获取编码失败'));
  } catch (error) {
    try {
      const rollbackParam = customerTable.getSaveParam([], [], [{ rowid }]);
      await requestClient.post(customerTable.saveUrl, rollbackParam, {
        headers: customerTable.getRequestHeader(), responseReturn: 'raw',
      });
    } catch {}
    throw error;
  }
}

export async function updateCustomer(data: CrmCustomerApi.Customer) {
  const customerTable = createFinanceDataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const row = mapCustomerToRow(data);
  const saveParam = customerTable.getSaveParam([], [row], []);
  return await requestClient.post(customerTable.saveUrl, saveParam, {
    headers: customerTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export async function deleteCustomer(id: number | string) {
  const customerTable = createFinanceDataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = customerTable.getSaveParam([], [], [{ rowid: id }]);
  return await requestClient.post(customerTable.saveUrl, saveParam, {
    headers: customerTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export async function exportCustomer(params: any) {
  return await exportExcelByConfig({
    formId: FORM_ID, tableName: TABLE_NAME, dbName: DB_NAME, primaryKey: PRIMARY_KEY,
    fileName: CUSTOMER_EXPORT_FILE_NAME, encodingId: CUSTOMER_EXPORT_ENCODING_ID, extraData: params,
  });
}

export function importCustomerTemplate() {
  return downloadByTableConfig({
    formId: FORM_ID, tableName: TABLE_NAME, dbName: DB_NAME, primaryKey: PRIMARY_KEY,
    url: '/crm/customer/get-import-template', method: 'GET',
  });
}

function unwrapDownloadBlob(result: any): Blob {
  if (result instanceof Blob) return result;
  if (result?.data instanceof Blob) return result.data;
  if (result?.data?.data instanceof Blob) return result.data.data;
  if (result?.data?.Result instanceof Blob) return result.data.Result;
  if (result?.data?.raw instanceof Blob) return result.data.raw;
  if (result?.Result instanceof Blob) return result.Result;
  if (result?.raw instanceof Blob) return result.raw;
  return result as Blob;
}

export async function downloadCustomerImportTemplate(): Promise<Blob> {
  const customerTable = createFinanceDataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const headers = customerTable.getRequestHeader();
  const result = await requestClient.download('/api/File/DownFile', {
    method: 'POST',
    data: {
      fileName: CUSTOMER_IMPORT_TEMPLATE_FILE_NAME,
      customPath: CUSTOMER_IMPORT_TEMPLATE_CUSTOM_PATH,
      appType: 'wwwroot',
      isCrossEnt: true,
    },
    headers,
  });
  return unwrapDownloadBlob(result);
}

export async function importCustomer(data: CrmCustomerApi.CustomerImportReqVO) {
  return await importExcelByConfig({
    formId: FORM_ID, tableName: TABLE_NAME, dbName: DB_NAME, primaryKey: PRIMARY_KEY,
    file: data.file, encodingId: CUSTOMER_IMPORT_ENCODING_ID, customPath: CUSTOMER_IMPORT_CUSTOM_PATH,
    isReplace: false, isCrossEnt: false,
    extraData: {
      ...(data.ownerUserId !== undefined ? { ownerUserId: data.ownerUserId } : {}),
      ...(data.updateSupport !== undefined ? { updateSupport: data.updateSupport } : {}),
    },
  });
}

export async function queryCompanyType() {
  const customerTable = createFinanceDataTable(FORM_ID, 'company_type', DB_NAME, PRIMARY_KEY);
  customerTable.Type = '字典';
  const queryParam = { Table: [customerTable], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(customerTable.queryUrl, queryParam, {
    headers: customerTable.getRequestHeader(), responseReturn: 'raw',
  });
  customerTable.execQueryResult(resQuery);
  const items = resQuery.data?.Result?.data?.Items || [];
  return items.map((item: any) => ({ value: item.val, label: item.txt, orderIndex: item.ordIdx }));
}

export async function getCustomerSimpleList() {
  const customerTable = createFinanceDataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const queryParam: any = { Table: [customerTable], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(customerTable.queryUrl, queryParam, {
    headers: customerTable.getRequestHeader(), responseReturn: 'raw',
  });
  customerTable.execQueryResult(resQuery.data);
  const items = resQuery.data?.Result?.data?.Items || [];
  return items
    .map((item: any) => mapRowToCustomer(item))
    .filter((item: any) => isUnifiedSubjectStateValid(Number(item.isPool || 0), Number(item.dealStatus ? 1 : 0)));
}

function mapRowToContact(item: any): CrmCustomerApi.Contact {
  return {
    id: item.id,
    customerId: item.customer_id,
    customerCode: item.customer_code,
    customerName: item.customer_name,
    companyType: item.company_type,
    contactName: item.contact_name,
    gender: item.gender,
    mobile: item.mobile,
    phone: item.phone,
    email: item.email,
    positionName: item.position_name,
    isPrimary: item.is_primary,
    remark: item.remark,
    createTime: item.createtime,
    updateTime: item.updatetime,
  } as CrmCustomerApi.Contact;
}

function mapContactToRow(data: CrmCustomerApi.Contact): any {
  return {
    id: data.id,
    customer_id: data.customerId,
    customer_code: data.customerCode,
    customer_name: data.customerName,
    company_type: data.companyType,
    contact_name: data.contactName,
    gender: data.gender,
    mobile: data.mobile,
    phone: data.phone,
    email: data.email,
    position_name: data.positionName,
    is_primary: data.isPrimary,
    remark: data.remark,
  };
}

export async function getCustomerContacts(params: { customerId?: number | string; customerCode?: string; customerName?: string; companyType?: number }) {
  const contactTable = createFinanceDataTable(CONTACT_FORM_ID, 'Bil_Customer_Contact', DB_NAME, 'id');
  contactTable.Type = '数据库表';
  const conditions: any[] = [];
  if (params?.customerId) {
    conditions.push(cond('customer_id', 'equal', params.customerId));
  } else if (params?.customerCode) {
    conditions.push(cond('customer_code', 'equal', params.customerCode));
  } else if (params?.customerName) {
    conditions.push(cond('customer_name', 'equal', params.customerName));
  }
  if (params?.companyType !== undefined && params?.companyType !== null) {
    conditions.push(cond('company_type', 'equal', params.companyType));
  }
  if (conditions.length > 0) {
    contactTable.Filter = and(...conditions);
  }
  const queryParam = { Table: [contactTable], PageParam: { page: 0, index: 1 } } as any;
  const resQuery = await requestClient.post(contactTable.queryUrl, queryParam, {
    headers: contactTable.getRequestHeader(), responseReturn: 'raw',
  });
  contactTable.execQueryResult(resQuery);
  const items = resQuery?.data?.Result?.data?.Items || [];
  return items.map((it: any) => mapRowToContact(it)) as CrmCustomerApi.Contact[];
}

export async function createCustomerContact(data: CrmCustomerApi.Contact) {
  const contactTable = createFinanceDataTable(CONTACT_FORM_ID, 'Bil_Customer_Contact', DB_NAME, 'id');
  contactTable.Type = '数据库表';
  const row = mapContactToRow(data);
  const saveParam = contactTable.getSaveParam([row], [], []);
  return await requestClient.post(contactTable.saveUrl, saveParam, {
    headers: contactTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export async function updateCustomerContact(data: CrmCustomerApi.Contact) {
  const contactTable = createFinanceDataTable(CONTACT_FORM_ID, 'Bil_Customer_Contact', DB_NAME, 'id');
  contactTable.Type = '数据库表';
  const row = mapContactToRow(data);
  const saveParam = contactTable.getSaveParam([], [row], []);
  return await requestClient.post(contactTable.saveUrl, saveParam, {
    headers: contactTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export async function deleteCustomerContact(id: number | string) {
  const contactTable = createFinanceDataTable(CONTACT_FORM_ID, 'Bil_Customer_Contact', DB_NAME, 'id');
  contactTable.Type = '数据库表';
  const saveParam = contactTable.getSaveParam([], [], [{ id }]);
  return await requestClient.post(contactTable.saveUrl, saveParam, {
    headers: contactTable.getRequestHeader(), responseReturn: 'raw',
  });
}

function mapRowToInvoice(item: any): CrmCustomerApi.Invoice {
  return {
    rowid: item.rowid,
    customerId: item.customer_id,
    invoiceTitle: item.invoice_title,
    taxNumber: item.tax_number,
    bankName: item.bank_name,
    address: item.address,
    phone: item.phone,
    bankAccount: item.bank_account,
    createtime: item.createtime,
    updatetime: item.updatetime,
    createuser: item.createuser,
    updateuser: item.updateuser,
  } as CrmCustomerApi.Invoice;
}

function mapInvoiceToRow(data: CrmCustomerApi.Invoice): any {
  return {
    rowid: data.rowid,
    customer_id: data.customerId,
    invoice_title: data.invoiceTitle,
    tax_number: data.taxNumber,
    bank_name: data.bankName,
    address: data.address,
    phone: data.phone,
    bank_account: data.bankAccount,
    ...(typeof (data as any)?.lingma_sys_key === 'string' ? { lingma_sys_key: (data as any).lingma_sys_key } : {}),
  };
}

export async function getCustomerInvoices(customerId: number | string) {
  const invoiceTable = createFinanceDataTable(FORM_ID, 'Bil_Customer_invoice', DB_NAME, PRIMARY_KEY);
  invoiceTable.Type = '数据库表';
  invoiceTable.Filter = and(cond('customer_id', 'equal', customerId));
  const queryParam = { Table: [invoiceTable], PageParam: { page: 0, index: 1 } } as any;
  const resQuery = await requestClient.post(invoiceTable.queryUrl, queryParam, {
    headers: invoiceTable.getRequestHeader(), responseReturn: 'raw',
  });
  invoiceTable.execQueryResult(resQuery);
  const items = resQuery?.data?.Result?.data?.Items || [];
  return items.map((it: any) => mapRowToInvoice(it)) as CrmCustomerApi.Invoice[];
}

export async function updateCustomerInvoice(data: CrmCustomerApi.Invoice) {
  const invoiceTable = createFinanceDataTable(FORM_ID, 'Bil_Customer_invoice', DB_NAME, PRIMARY_KEY);
  invoiceTable.Type = '数据库表';
  const row = mapInvoiceToRow(data);
  const saveParam = invoiceTable.getSaveParam([], [row], []);
  return await requestClient.post(invoiceTable.saveUrl, saveParam, {
    headers: invoiceTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export async function deleteCustomerInvoice(rowid: number | string) {
  const invoiceTable = createFinanceDataTable(FORM_ID, 'Bil_Customer_invoice', DB_NAME, PRIMARY_KEY);
  invoiceTable.Type = '数据库表';
  const saveParam = invoiceTable.getSaveParam([], [], [{ rowid }]);
  return await requestClient.post(invoiceTable.saveUrl, saveParam, {
    headers: invoiceTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export function transferCustomer(data: CrmPermissionApi.BusinessTransferReqVO) {
  return requestClient.put('/crm/customer/transfer', data);
}
export function lockCustomer(id: number, lockStatus: boolean) {
  return requestClient.put('/crm/customer/lock', { id, lockStatus });
}
export function receiveCustomer(ids: number[]) {
  return requestClient.put('/crm/customer/receive', { ids: ids.join(',') });
}
export function distributeCustomer(ids: number[], ownerUserId: number) {
  return requestClient.put('/crm/customer/distribute', { ids, ownerUserId });
}
export function putCustomerPool(id: number) {
  return requestClient.put(`/crm/customer/put-pool?id=${id}`);
}
export function updateCustomerDealStatus(id: number, dealStatus: boolean) {
  return requestClient.put(`/crm/customer/update-deal-status?id=${id}&dealStatus=${dealStatus}`);
}

export async function getSupplierSimpleList() {
  const customerTable = createFinanceDataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  customerTable.Type = '数据库表';
  customerTable.Filter = and(cond('company_type', 'equal', 2));
  const queryParam = { Table: [customerTable], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(customerTable.queryUrl, queryParam, {
    headers: customerTable.getRequestHeader(), responseReturn: 'raw',
  });
  customerTable.execQueryResult(resQuery);
  const resData = resQuery.data?.Result?.data;
  const items: any[] = resData?.Items || [];
  return items.map((it: any) => ({ ...it, id: it.id ?? it.rowid, name: it.customer_name ?? it.customerName ?? it.name })) as any[];
}

export function getPutPoolRemindCustomerPage(params: PageParam) {
  return requestClient.get<PageResult<CrmCustomerApi.Customer>>('/crm/customer/put-pool-remind-page', { params });
}
export function getPutPoolRemindCustomerCount() {
  return requestClient.get<number>('/crm/customer/put-pool-remind-count');
}
export function getTodayContactCustomerCount() {
  return requestClient.get<number>('/crm/customer/today-contact-count');
}
export function getFollowCustomerCount() {
  return requestClient.get<number>('/crm/customer/follow-count');
}

export namespace CrmCustomerApi {
  export interface CapitalAccount {
    rowid?: number | string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    wfid?: string;
    flowstate?: string;
    ReportID?: number | string;
    description?: string;
    lingma_sys_is_delete?: number;
    outflow_amount?: number | string;
    inflow_amount?: number | string;
    account_balance?: number | string;
    remark?: string;
    is_all_users?: number;
    available_staff?: string;
    usage_scope?: string;
    initial_date?: string;
    initial_amount?: number | string;
    subject_id?: string;
    account_name?: string;
    account_id?: string;
    account_type?: string;
    lingma_sys_ent?: string;
    OpeningBank?: string;
    customerId?: number | string;
  }
}

function mapRowToCapitalAccount(item: any): CrmCustomerApi.CapitalAccount {
  return {
    rowid: item.rowid,
    createuser: item.createuser,
    createtime: item.createtime,
    updateuser: item.updateuser,
    updatetime: item.updatetime,
    wfid: item.wfid,
    flowstate: item.flowstate,
    ReportID: item.ReportID,
    description: item.description,
    lingma_sys_is_delete: item.lingma_sys_is_delete,
    outflow_amount: item.outflow_amount,
    inflow_amount: item.inflow_amount,
    account_balance: item.account_balance,
    remark: item.remark,
    is_all_users: item.is_all_users,
    available_staff: item.available_staff,
    usage_scope: item.usage_scope,
    initial_date: item.initial_date,
    initial_amount: item.initial_amount,
    subject_id: item.subject_id,
    account_name: item.account_name,
    account_id: item.account_id,
    account_type: item.account_type,
    lingma_sys_ent: item.lingma_sys_ent,
    OpeningBank: item.OpeningBank,
    customerId: item.customerId,
  } as CrmCustomerApi.CapitalAccount;
}

function mapCapitalAccountToRow(data: CrmCustomerApi.CapitalAccount): any {
  return {
    rowid: data.rowid,
    customerId: data.customerId,
    subject_id: (data as any).subject_id ?? data.customerId,
    account_type: data.account_type,
    OpeningBank: data.OpeningBank,
    account_name: data.account_name,
    account_id: data.account_id,
    ...(typeof (data as any)?.lingma_sys_key === 'string' ? { lingma_sys_key: (data as any).lingma_sys_key } : {}),
  };
}

export async function getCustomerCapitalAccounts(customerId: number | string) {
  const capitalAccountTable = createFinanceDataTable(FORM_ID, 'Bil_Capital_Account', DB_NAME, PRIMARY_KEY);
  capitalAccountTable.Type = '数据库表';
  capitalAccountTable.Filter = and(cond('customerId', 'equal', customerId));
  const queryParam = { Table: [capitalAccountTable], PageParam: { page: 0, index: 1 } } as any;
  const resQuery = await requestClient.post(capitalAccountTable.queryUrl, queryParam, {
    headers: capitalAccountTable.getRequestHeader(), responseReturn: 'raw',
  });
  capitalAccountTable.execQueryResult(resQuery);
  const items = resQuery?.data?.Result?.data?.Items || [];
  return items.map((it: any) => mapRowToCapitalAccount(it)) as CrmCustomerApi.CapitalAccount[];
}

export async function updateCustomerCapitalAccount(data: CrmCustomerApi.CapitalAccount) {
  const accountTable = createFinanceDataTable(FORM_ID, 'Bil_Capital_Account', DB_NAME, PRIMARY_KEY);
  accountTable.Type = '数据库表';
  const row = mapCapitalAccountToRow(data);
  const saveParam = accountTable.getSaveParam([], [row], []);
  return await requestClient.post(accountTable.saveUrl, saveParam, {
    headers: accountTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export async function deleteCustomerCapitalAccount(rowid: number | string) {
  const accountTable = createFinanceDataTable(FORM_ID, 'Bil_Capital_Account', DB_NAME, PRIMARY_KEY);
  accountTable.Type = '数据库表';
  const saveParam = accountTable.getSaveParam([], [], [{ rowid }]);
  return await requestClient.post(accountTable.saveUrl, saveParam, {
    headers: accountTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export async function createCustomerInvoice(customerId: number | string, data: { address?: string; bankAccount?: string; bankName?: string; invoiceTitle?: string; isSeller?: number; phone?: string; sellerName?: string; taxNumber?: string; }) {
  const invoiceTable = createFinanceDataTable(FORM_ID, 'Bil_Customer_invoice', DB_NAME, PRIMARY_KEY);
  invoiceTable.Type = '数据库表';
  const row: any = {
    customer_id: customerId,
    invoice_title: data.invoiceTitle,
    tax_number: data.taxNumber,
    bank_name: data.bankName,
    address: data.address,
    phone: data.phone,
    bank_account: data.bankAccount,
    seller_name: data.sellerName,
    is_seller: data.isSeller,
    lingma_sys_is_delete: 0,
  };
  const saveParam = invoiceTable.getSaveParam([row], [], []);
  return await requestClient.post(invoiceTable.saveUrl, saveParam, {
    headers: invoiceTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export async function createCustomerCapitalAccount(customerId: number | string, data: { accountId?: string; accountName?: string; accountType?: string; openingBank?: string; }) {
  const accountTable = createFinanceDataTable(FORM_ID, 'Bil_Capital_Account', DB_NAME, PRIMARY_KEY);
  accountTable.Type = '数据库表';
  const row: any = {
    customerId,
    subject_id: customerId,
    account_type: data.accountType,
    OpeningBank: data.openingBank,
    account_name: data.accountName,
    account_id: data.accountId,
    lingma_sys_is_delete: 0,
  };
  const saveParam = accountTable.getSaveParam([row], [], []);
  return await requestClient.post(accountTable.saveUrl, saveParam, {
    headers: accountTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export namespace CrmCustomerApi {
  export interface Attachment {
    id?: number | string;
    customerId?: number | string;
    file_name?: string;
    file_path?: string;
    file_size?: number;
    file_type?: string;
    createtime?: string;
    createuser?: string;
    owner_type?: string;
  }
}

function mapRowToAttachment(item: any): CrmCustomerApi.Attachment {
  return {
    id: item.id ?? item.rowid,
    customerId: item.pid,
    file_name: item.file_name,
    file_path: item.file_path,
    file_size: item.file_size,
    file_type: item.file_type,
    createtime: item.createtime,
    createuser: item.createuser,
    owner_type: item.owner_type,
  };
}

export async function getCustomerAttachments(customerId: number | string, ownerType?: string) {
  const attachTable = createFinanceDataTable(FORM_ID, 'file_FJ', DB_NAME, PRIMARY_KEY);
  attachTable.Type = '数据库表';
  const conditions = [cond('pid', 'equal', customerId)];
  if (ownerType) conditions.push(cond('owner_type', 'equal', ownerType));
  attachTable.Filter = and(...conditions);
  const queryParam = { Table: [attachTable], PageParam: { page: 0, index: 1 } } as any;
  const resQuery = await requestClient.post(attachTable.queryUrl, queryParam, {
    headers: attachTable.getRequestHeader(), responseReturn: 'raw',
  });
  attachTable.execQueryResult(resQuery);
  const items = resQuery?.data?.Result?.data?.Items || [];
  return items.map((it: any) => mapRowToAttachment(it)) as CrmCustomerApi.Attachment[];
}

export async function createCustomerAttachment(customerId: number | string, data: { file_path?: string; fileName?: string; fileSize?: number; fileType?: string; owner_type?: string; pid?: number | string; }) {
  const attachTable = createFinanceDataTable(FORM_ID, 'file_FJ', DB_NAME, PRIMARY_KEY);
  attachTable.Type = '数据库表';
  const row: any = {
    customerId,
    file_name: data.fileName,
    file_path: data.file_path,
    file_size: data.fileSize,
    file_type: data.fileType,
    owner_type: data.owner_type || '客户信息',
    pid: data.pid || customerId,
    lingma_sys_is_delete: 0,
  };
  const saveParam = attachTable.getSaveParam([row], [], []);
  return await requestClient.post(attachTable.saveUrl, saveParam, {
    headers: attachTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export async function deleteCustomerAttachment(rowid: number | string) {
  const attachTable = createFinanceDataTable(FORM_ID, 'file_FJ', DB_NAME, PRIMARY_KEY);
  attachTable.Type = '数据库表';
  const saveParam = attachTable.getSaveParam([], [], [{ rowid, id: rowid }]);
  return await requestClient.post(attachTable.saveUrl, saveParam, {
    headers: attachTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export async function uploadCustomerAttachment(file: File, customPath = 'customer-attachment') {
  const attachTable = createFinanceDataTable(FORM_ID, 'file_FJ', DB_NAME, PRIMARY_KEY);
  const headers = attachTable.getRequestHeader();
  delete headers['Content-Type'];
  const data = { upCtrl_Input: file, customPath, appType: 'wwwroot', isReplace: 'false', isCrossEnt: 'true' };
  const res = await requestClient.upload(attachTable.uploadUrl, data, { headers });
  const first = Array.isArray(res) ? res[0] : res;
  const filePath = first?.filePath;
  const url = filePath ? `/api/${filePath}` : '';
  return { url, filePath, customPath, appType: 'wwwroot', isReplace: false, isCrossEnt: true, raw: res };
}

export async function downloadCustomerAttachment(fileName: string, filePath: string): Promise<Blob> {
  const attachTable = createFinanceDataTable(FORM_ID, 'file_FJ', DB_NAME, PRIMARY_KEY);
  const headers = attachTable.getRequestHeader();
  const result = await requestClient.download('/api/File/DownFile', {
    method: 'POST',
    data: { fileName, customPath: filePath, appType: 'wwwroot', isCrossEnt: true },
    headers,
  });
  return unwrapDownloadBlob(result);
}

export async function updateCustomerWithAutoCode(data: CrmCustomerApi.Customer, options?: { codeRuleId?: string }) {
  const customerTable = createFinanceDataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const rowid = (data as any).rowid ?? data.id;
  if (!rowid) throw new Error('缺少 rowid，无法修改客户');
  const row = mapCustomerToRow(data);
  const saveParam = customerTable.getSaveParam([], [row], []);
  const res = await requestClient.post(customerTable.saveUrl, saveParam, {
    headers: customerTable.getRequestHeader(), responseReturn: 'raw',
  });
  const hasCode = !!String((data as any).customerCode || '').trim();
  if (hasCode) return { ...res, rowid, customerCode: (data as any).customerCode };
  const codeRuleId = options?.codeRuleId ?? CUSTOMER_CODE_RULE_ID;
  const codeRes = await getCodeString(String(rowid), codeRuleId, customerTable.getRequestHeader());
  if (codeRes?.Code === 200 && codeRes?.Message) {
    const updateParam = customerTable.getSaveParam([], [{ rowid, customer_code: codeRes.Message }], []);
    await requestClient.post(customerTable.saveUrl, updateParam, {
      headers: customerTable.getRequestHeader(), responseReturn: 'raw',
    });
    return { ...res, rowid, customerCode: codeRes.Message };
  }
  throw new Error(codeRes?.Message || '获取客户编码失败');
}
