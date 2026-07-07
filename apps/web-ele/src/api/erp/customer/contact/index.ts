import type { PageParam } from '@vben/request';

import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

const FORM_ID = 'C09D6D36CDD6F73F782EB8BB39D34D19';
const DB_NAME = 'LMBill';
const CONTACT_TABLE_NAME = 'Bil_Customer_Contact';
const CUSTOMER_TABLE_NAME = 'Bil_Customer_Info';

export namespace CrmCustomerContactApi {
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
    isPrimary?: number;
    remark?: string;
    ownerUserId?: number | string;
    ownerUserName?: string;
    departId?: number | string;
    departName?: string;
    createTime?: string;
    updateTime?: string;
  }

  export interface PartyOption {
    id?: number | string;
    customerCode?: string;
    customerName?: string;
    companyType?: number;
    ownerUserId?: number | string;
    ownerUserName?: string;
    departId?: number | string;
    departName?: string;
  }
}

function mapRowToContact(
  item: any,
  customerMap?: Map<string, CrmCustomerContactApi.PartyOption>,
): CrmCustomerContactApi.Contact {
  const customer = customerMap?.get(String(item.customer_id || ''));
  return {
    id: item.id,
    customerId: item.customer_id,
    customerCode: item.customer_code || customer?.customerCode,
    customerName: item.customer_name || customer?.customerName,
    companyType: item.company_type ?? customer?.companyType,
    contactName: item.contact_name,
    gender: item.gender,
    mobile: item.mobile,
    phone: item.phone,
    email: item.email,
    positionName: item.position_name,
    isPrimary: item.is_primary,
    remark: item.remark,
    ownerUserId: customer?.ownerUserId,
    ownerUserName: customer?.ownerUserName,
    departId: customer?.departId,
    departName: customer?.departName,
    createTime: item.createtime,
    updateTime: item.updatetime,
  };
}

function mapContactToRow(data: CrmCustomerContactApi.Contact): any {
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

function mapRowToPartyOption(item: any): CrmCustomerContactApi.PartyOption {
  return {
    id: item.rowid,
    customerCode: item.customer_code,
    customerName: item.customer_name,
    companyType: item.company_type,
    ownerUserId: item.owner_user_id,
    ownerUserName: item.ownerUserName,
    departId: item.depart_id,
    departName: item.depart_name,
  };
}

async function queryPartyRows(params: {
  companyType?: number;
  ids?: Array<number | string>;
  keyword?: string;
  ownerUserName?: string;
  page?: number;
  pageNo?: number;
}) {
  const customerTable = createFinanceDataTable(
    FORM_ID,
    CUSTOMER_TABLE_NAME,
    DB_NAME,
    'rowid',
  );
  customerTable.Type = '数据库表';
  const conditions: any[] = [];
  if (params.companyType !== undefined && params.companyType !== null) {
    conditions.push(cond('company_type', 'equal', params.companyType));
  }
  if (params.ids && params.ids.length > 0) {
    conditions.push(cond('rowid', 'in', params.ids.map((item) => String(item))));
  }
  if (params.keyword) {
    conditions.push(
      or(
        cond('customer_name', 'contains', params.keyword),
        cond('customer_code', 'contains', params.keyword),
      ),
    );
  }
  if (params.ownerUserName) {
    conditions.push(cond('ownerUserName', 'contains', params.ownerUserName));
  }
  if (conditions.length > 0) {
    customerTable.Filter = and(...conditions);
  }

  const queryParam: any = {
    Table: [customerTable],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(customerTable.queryUrl, queryParam, {
    headers: customerTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  customerTable.execQueryResult(resQuery);
  return (resQuery?.data?.Result?.data?.Items || []) as any[];
}

async function getPartyMapByIds(ids: Array<number | string>) {
  const uniqueIds = Array.from(
    new Set(
      (ids || [])
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    ),
  );
  if (uniqueIds.length === 0) return new Map<string, CrmCustomerContactApi.PartyOption>();
  const items = await queryPartyRows({ ids: uniqueIds });
  return new Map(
    items.map((item) => [String(item.rowid || ''), mapRowToPartyOption(item)]),
  );
}

async function normalizePrimaryContact(
  customerId?: number | string,
  companyType?: number,
  excludeId?: number | string,
) {
  if (!customerId || companyType === undefined || companyType === null) {
    return;
  }
  const contactTable = createFinanceDataTable(
    FORM_ID,
    CONTACT_TABLE_NAME,
    DB_NAME,
    'id',
  );
  contactTable.Type = '数据库表';
  contactTable.Filter = and(
    cond('customer_id', 'equal', customerId),
    cond('company_type', 'equal', companyType),
    cond('is_primary', 'equal', 1),
  );

  const queryParam: any = {
    Table: [contactTable],
    PageParam: { page: 0, index: 1 },
  };
  const resQuery = await requestClient.post(contactTable.queryUrl, queryParam, {
    headers: contactTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  contactTable.execQueryResult(resQuery);
  const items = (resQuery?.data?.Result?.data?.Items || []) as any[];
  const changed = items
    .filter((item) => String(item.id || '') !== String(excludeId || ''))
    .map((item) => ({
      id: item.id,
      is_primary: 0,
    }));
  if (changed.length === 0) return;
  const saveParam = contactTable.getSaveParam([], changed, []);
  await requestClient.post(contactTable.saveUrl, saveParam, {
    headers: contactTable.getRequestHeader(),
    responseReturn: 'raw',
  });
}

export async function getContactPage(params: PageParam) {
  const p = params as any;
  let ownerCustomerIds: string[] | null = null;
  if (String(p.ownerUserName || '').trim()) {
    const ownerRows = await queryPartyRows({
      companyType: p.companyType,
      ownerUserName: String(p.ownerUserName || '').trim(),
    });
    ownerCustomerIds = ownerRows
      .map((item) => String(item.rowid || '').trim())
      .filter(Boolean);
  }

  const contactTable = createFinanceDataTable(
    FORM_ID,
    CONTACT_TABLE_NAME,
    DB_NAME,
    'id',
  );
  contactTable.Type = '数据库表';
  const conditions: any[] = [];
  if (p.companyType !== undefined && p.companyType !== null) {
    conditions.push(cond('company_type', 'equal', p.companyType));
  }
  if (p.customerCode) {
    conditions.push(cond('customer_code', 'contains', p.customerCode));
  }
  if (p.customerName) {
    conditions.push(cond('customer_name', 'contains', p.customerName));
  }
  if (p.contactName) {
    conditions.push(cond('contact_name', 'contains', p.contactName));
  }
  if (p.mobile) {
    conditions.push(cond('mobile', 'contains', p.mobile));
  }
  if (p.email) {
    conditions.push(cond('email', 'contains', p.email));
  }
  if (ownerCustomerIds) {
    if (ownerCustomerIds.length === 0) {
      conditions.push(cond('customer_id', 'equal', '__NO_MATCH__'));
    } else {
      conditions.push(cond('customer_id', 'in', ownerCustomerIds));
    }
  }
  if (conditions.length > 0) {
    contactTable.Filter = and(...conditions);
  }

  const queryParam: any = {
    Table: [contactTable],
    PageParam: {
      page: p.page || 0,
      index: p.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(contactTable.queryUrl, queryParam, {
    headers: contactTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  contactTable.execQueryResult(resQuery);

  const returnData = new clientData();
  returnData.dataTable = contactTable;

  const items = (resQuery?.data?.Result?.data?.Items || []) as any[];
  const customerMap = await getPartyMapByIds(items.map((item) => item.customer_id));
  returnData.list = items.map((item) => mapRowToContact(item, customerMap));
  returnData.total = resQuery?.data?.Result?.data?.Count || 0;
  return returnData as any;
}

export async function getContact(id: number | string) {
  const contactTable = createFinanceDataTable(
    FORM_ID,
    CONTACT_TABLE_NAME,
    DB_NAME,
    'id',
  );
  contactTable.Type = '数据库表';
  contactTable.Filter = and(cond('id', 'equal', id));
  const queryParam: any = {
    Table: [contactTable],
    PageParam: { page: 0, index: 1 },
  };
  const resQuery = await requestClient.post(contactTable.queryUrl, queryParam, {
    headers: contactTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  contactTable.execQueryResult(resQuery);
  const items = (resQuery?.data?.Result?.data?.Items || []) as any[];
  if (items.length === 0) return null as any;
  const customerMap = await getPartyMapByIds([items[0].customer_id]);
  return mapRowToContact(items[0], customerMap) as any;
}

export async function getPartyOptions(params: {
  companyType: number;
  keyword?: string;
}) {
  const items = await queryPartyRows({
    companyType: params.companyType,
    keyword: String(params.keyword || '').trim(),
    page: 20,
    pageNo: 1,
  });
  return items.map((item) => mapRowToPartyOption(item));
}

export async function createContact(data: CrmCustomerContactApi.Contact) {
  const contactTable = createFinanceDataTable(
    FORM_ID,
    CONTACT_TABLE_NAME,
    DB_NAME,
    'id',
  );
  contactTable.Type = '数据库表';
  if (Number(data.isPrimary || 0) === 1) {
    await normalizePrimaryContact(data.customerId, Number(data.companyType || 0));
  }
  const row = mapContactToRow(data);
  const saveParam = contactTable.getSaveParam([row], [], []);
  return await requestClient.post(contactTable.saveUrl, saveParam, {
    headers: contactTable.getRequestHeader(),
    responseReturn: 'raw',
  });
}

export async function updateContact(data: CrmCustomerContactApi.Contact) {
  const contactTable = createFinanceDataTable(
    FORM_ID,
    CONTACT_TABLE_NAME,
    DB_NAME,
    'id',
  );
  contactTable.Type = '数据库表';
  if (Number(data.isPrimary || 0) === 1) {
    await normalizePrimaryContact(
      data.customerId,
      Number(data.companyType || 0),
      data.id,
    );
  }
  const row = mapContactToRow(data);
  const saveParam = contactTable.getSaveParam([], [row], []);
  return await requestClient.post(contactTable.saveUrl, saveParam, {
    headers: contactTable.getRequestHeader(),
    responseReturn: 'raw',
  });
}

export async function deleteContact(id: number | string) {
  const contactTable = createFinanceDataTable(
    FORM_ID,
    CONTACT_TABLE_NAME,
    DB_NAME,
    'id',
  );
  contactTable.Type = '数据库表';
  const saveParam = contactTable.getSaveParam([], [], [{ id }]);
  return await requestClient.post(contactTable.saveUrl, saveParam, {
    headers: contactTable.getRequestHeader(),
    responseReturn: 'raw',
  });
}
