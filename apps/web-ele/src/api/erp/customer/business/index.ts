import type { PageParam } from '@vben/request';

import { useUserStore } from '@vben/stores';
import { buildUUID } from '@vben/utils';

import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getStaffByIds, getStaffList } from '#/api/common/staff-selector';
import { getCustomerContacts, getCustomerSimpleList } from '#/api/erp/customer';
import { FORM_ID as LEAD_FORM_ID } from '#/api/erp/customer/lead';
import { getSimpleDeptList } from '#/api/system/dept';
import { getCodeString } from '#/api/system/coding';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

export const FORM_ID = '46417C2537A3A78DA2D790307AF360A4';
export const DB_NAME = 'LMBill';
export const BUSINESS_TABLE_NAME = 'Bil_Business_Chance';
export const BUSINESS_CONTACT_REL_TABLE_NAME = 'Bil_Business_Contact_Rel';
export const BUSINESS_PRODUCT_REL_TABLE_NAME = 'Bil_Business_Product_Rel';
export const BUSINESS_PRIMARY_KEY = 'rowid';
export const BUSINESS_CODE_RULE_ID = 'BD1258D04B4B46048E45D038A8FABCB2';

const LEAD_TABLE_NAME = 'Bil_Customer_Lead';

export namespace CrmCustomerBusinessApi {
  export interface Business {
    id?: number | string;
    rowid?: string;
    businessCode?: string;
    businessName?: string;
    customerId?: number | string;
    customerCode?: string;
    customerName?: string;
    companyType?: number;
    primaryContactId?: number | string;
    primaryContactName?: string;
    amount?: number | string;
    totalProductPrice?: number | string;
    discountPercent?: number | string;
    expectedSignDate?: string;
    successRate?: number;
    businessStage?: number;
    businessStatus?: number;
    sourceLeadId?: number | string;
    sourceLeadName?: string;
    ownerUserId?: number | string;
    ownerUserName?: string;
    departId?: number | string;
    departName?: string;
    lastFollowTime?: string;
    nextFollowTime?: string;
    lastFollowContent?: string;
    lostReason?: string;
    remark?: string;
    accountSetId?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    description?: string;
    lingmaSysIsDelete?: number;
    lingmaSysEnt?: string;
    contactRelations?: BusinessContactRel[];
    participantContacts?: BusinessContactRel[];
    participantContactIds?: Array<number | string>;
    items?: BusinessProductItem[];
  }

  export interface BusinessProductItem {
    rowid?: string;
    businessId?: number | string;
    businessCode?: string;
    businessName?: string;
    customerId?: number | string;
    customerCode?: string;
    customerName?: string;
    productId?: number | string;
    productCode?: string;
    productName?: string;
    productBarCode?: string;
    productUnitId?: number | string;
    productUnitName?: string;
    sortNo?: number;
    productPrice?: number | string;
    salePrice?: number | string;
    productCount?: number | string;
    totalPrice?: number | string;
    remark?: string;
    accountSetId?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    description?: string;
    lingmaSysIsDelete?: number;
    lingmaSysEnt?: string;
  }

  export interface BusinessContactRel {
    rowid?: string;
    businessId?: number | string;
    businessCode?: string;
    businessName?: string;
    customerId?: number | string;
    customerCode?: string;
    contactId?: number | string;
    contactName?: string;
    companyType?: number;
    isPrimary?: number;
    contactRole?: string;
    accountSetId?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    description?: string;
    lingmaSysIsDelete?: number;
    lingmaSysEnt?: string;
  }

  export interface BusinessContactSelection {
    contactId?: number | string;
    contactName?: string;
    contactRole?: string;
    isPrimary?: number;
  }

  export interface BusinessSavePayload {
    business: Business;
    contacts?: BusinessContactSelection[];
    items?: BusinessProductItem[];
  }

  export interface BusinessStatusUpdateReqVO {
    id: number | string;
    businessStatus: number;
    lostReason?: string;
  }

  export interface BusinessDuplicateCheckResult {
    hasDuplicate: boolean;
    items: Array<{
      rowid?: string;
      businessCode?: string;
      businessName?: string;
      customerId?: string;
      customerName?: string;
      ownerUserName?: string;
      businessStatus?: number;
      businessStage?: number;
    }>;
    message: string;
  }

  export interface LeadOption {
    id?: number | string;
    leadCode?: string;
    leadName?: string;
    contactName?: string;
    leadStatus?: number;
  }

  export interface ContactOption {
    id?: number | string;
    customerId?: number | string;
    customerCode?: string;
    customerName?: string;
    contactName?: string;
    mobile?: string;
    email?: string;
    isPrimary?: number;
  }

  export interface OwnerOption {
    id?: number | string;
    name?: string;
    departId?: number | string;
    departName?: string;
  }
}

function toNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function roundAmount(value: number, precision = 2) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(precision));
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function getUnifiedSubjectStageLabel(item: any) {
  const isPool = Number(item.isPool || 0);
  const dealStatus = Number(item.dealStatus ? 1 : 0);
  if (isPool === 1 && dealStatus === 0) return '公海资源';
  if (isPool === 0 && dealStatus === 0) return '已领取资源';
  if (isPool === 0 && dealStatus === 1) return '正式客户';
  return '主体资源';
}

function getCurrentUserInfo() {
  const userStore = useUserStore();
  const userInfo: any = userStore.userInfo || {};
  return {
    userId: normalizeText(userInfo.id || userInfo.ID || userInfo.ROWID),
    userName: normalizeText(userInfo.nickname || userInfo.UserName || userInfo.username || userInfo.LoginName),
  };
}

function buildDeptChildrenIndex(depts: any[]) {
  const childrenMap = new Map<string, any[]>();
  for (const dept of depts || []) {
    const parentId = normalizeText(dept.parentId || dept.Prowid || dept.pId);
    const list = childrenMap.get(parentId) || [];
    list.push(dept);
    childrenMap.set(parentId, list);
  }
  return childrenMap;
}

function collectDeptAndDescendantIds(depts: any[], rootDepId: string) {
  const rootId = normalizeText(rootDepId);
  if (!rootId) return [] as string[];
  const childrenMap = buildDeptChildrenIndex(depts);
  const visited = new Set<string>();
  const queue = [rootId];
  const result: string[] = [];
  while (queue.length > 0) {
    const current = normalizeText(queue.shift());
    if (!current || visited.has(current)) continue;
    visited.add(current);
    result.push(current);
    const children = childrenMap.get(current) || [];
    children.forEach((item) => {
      const childId = normalizeText(item.id || item.DepID);
      if (childId && !visited.has(childId)) queue.push(childId);
    });
  }
  return result;
}

async function resolveSceneOwnerIds(sceneType?: number | string) {
  const currentUser = getCurrentUserInfo();
  if (!currentUser.userId) return [] as string[];
  const normalizedSceneType = normalizeText(sceneType);
  if (!normalizedSceneType || normalizedSceneType === '1') {
    return [currentUser.userId];
  }
  if (normalizedSceneType === '3') {
    const currentStaff = await getStaffByIds([currentUser.userId]);
    const currentDeptId = normalizeText(currentStaff?.[0]?.DepID);
    if (!currentDeptId) return [currentUser.userId];
    const deptList = await getSimpleDeptList();
    const deptIds = collectDeptAndDescendantIds(deptList as any[], currentDeptId);
    if (deptIds.length === 0) return [currentUser.userId];
    const allStaff = await getStaffList();
    const ownerIds = Array.from(
      new Set(
        (allStaff || [])
          .filter((item) => deptIds.includes(normalizeText(item.DepID)))
          .map((item) => normalizeText(item.ROWID))
          .filter(Boolean),
      ),
    );
    return ownerIds.length > 0 ? ownerIds : [currentUser.userId];
  }
  return [] as string[];
}

function getBusinessTable() {
  const table = createFinanceDataTable(FORM_ID, BUSINESS_TABLE_NAME, DB_NAME, BUSINESS_PRIMARY_KEY);
  table.Type = '数据库表';
  return table;
}

function getBusinessContactRelTable() {
  const table = createFinanceDataTable(FORM_ID, BUSINESS_CONTACT_REL_TABLE_NAME, DB_NAME, BUSINESS_PRIMARY_KEY);
  table.Type = '数据库表';
  return table;
}

function getBusinessProductRelTable() {
  const table = createFinanceDataTable(FORM_ID, BUSINESS_PRODUCT_REL_TABLE_NAME, DB_NAME, BUSINESS_PRIMARY_KEY);
  table.Type = '数据库表';
  return table;
}

function getLeadTable() {
  const table = createFinanceDataTable(LEAD_FORM_ID, LEAD_TABLE_NAME, DB_NAME, BUSINESS_PRIMARY_KEY);
  table.Type = '数据库表';
  return table;
}

function mapRowToBusiness(item: any, leadMap?: Map<string, CrmCustomerBusinessApi.LeadOption>): CrmCustomerBusinessApi.Business {
  const lead = leadMap?.get(String(item.source_lead_id || ''));
  return {
    id: item.rowid,
    rowid: item.rowid,
    businessCode: item.business_code,
    businessName: item.business_name,
    customerId: item.customer_id,
    customerCode: item.customer_code,
    customerName: item.customer_name,
    companyType: Number(item.company_type || 1) || 1,
    primaryContactId: item.primary_contact_id,
    primaryContactName: item.primary_contact_name,
    amount: item.amount,
    totalProductPrice: item.total_product_price,
    discountPercent: item.discount_percent,
    expectedSignDate: item.expected_sign_date,
    successRate: item.success_rate === null || item.success_rate === undefined ? undefined : Number(item.success_rate),
    businessStage: Number(item.business_stage || 0),
    businessStatus: Number(item.business_status || 0),
    sourceLeadId: item.source_lead_id,
    sourceLeadName: lead?.leadName,
    ownerUserId: item.owner_user_id,
    ownerUserName: item.ownerUserName,
    departId: item.depart_id,
    departName: item.depart_name,
    lastFollowTime: item.last_follow_time,
    nextFollowTime: item.next_follow_time,
    lastFollowContent: item.last_follow_content,
    lostReason: item.lost_reason,
    remark: item.remark,
    accountSetId: item.account_set_id,
    createuser: item.createuser,
    createtime: item.createtime,
    updateuser: item.updateuser,
    updatetime: item.updatetime,
    description: item.description,
    lingmaSysIsDelete: item.lingma_sys_is_delete,
    lingmaSysEnt: item.lingma_sys_ent,
  };
}

function mapBusinessToRow(data: CrmCustomerBusinessApi.Business) {
  const rowid = normalizeText(data.rowid ?? data.id);
  const row: any = {
    business_code: data.businessCode,
    business_name: data.businessName,
    customer_id: data.customerId,
    customer_code: data.customerCode,
    customer_name: data.customerName,
    company_type: data.companyType ?? 1,
    primary_contact_id: data.primaryContactId,
    primary_contact_name: data.primaryContactName,
    amount: data.amount,
    total_product_price: data.totalProductPrice,
    discount_percent: data.discountPercent,
    expected_sign_date: data.expectedSignDate,
    success_rate: data.successRate,
    business_stage: data.businessStage ?? 0,
    business_status: data.businessStatus ?? 0,
    source_lead_id: data.sourceLeadId,
    owner_user_id: data.ownerUserId,
    ownerUserName: data.ownerUserName,
    depart_id: data.departId,
    depart_name: data.departName,
    last_follow_time: data.lastFollowTime,
    next_follow_time: data.nextFollowTime,
    last_follow_content: data.lastFollowContent,
    lost_reason: data.lostReason,
    remark: data.remark,
    account_set_id: data.accountSetId,
    description: data.description,
    lingma_sys_is_delete: data.lingmaSysIsDelete,
    lingma_sys_ent: data.lingmaSysEnt,
  };
  if (rowid) row.rowid = rowid;
  return row;
}

function mapRowToBusinessProductItem(item: any): CrmCustomerBusinessApi.BusinessProductItem {
  return {
    rowid: item.rowid,
    businessId: item.business_id,
    businessCode: item.business_code,
    businessName: item.business_name,
    customerId: item.customer_id,
    customerCode: item.customer_code,
    customerName: item.customer_name,
    productId: item.product_id,
    productCode: item.product_code,
    productName: item.product_name,
    productBarCode: item.product_bar_code,
    productUnitId: item.product_unit_id,
    productUnitName: item.product_unit_name,
    sortNo: Number(item.sort_no || 0),
    productPrice: item.product_price,
    salePrice: item.sale_price,
    productCount: item.product_count,
    totalPrice: item.total_price,
    remark: item.remark,
    accountSetId: item.account_set_id,
    createuser: item.createuser,
    createtime: item.createtime,
    updateuser: item.updateuser,
    updatetime: item.updatetime,
    description: item.description,
    lingmaSysIsDelete: item.lingma_sys_is_delete,
    lingmaSysEnt: item.lingma_sys_ent,
  };
}

function mapBusinessProductItemToRow(data: CrmCustomerBusinessApi.BusinessProductItem) {
  return {
    rowid: data.rowid,
    business_id: data.businessId,
    business_code: data.businessCode,
    business_name: data.businessName,
    customer_id: data.customerId,
    customer_code: data.customerCode,
    customer_name: data.customerName,
    product_id: data.productId,
    product_code: data.productCode,
    product_name: data.productName,
    product_bar_code: data.productBarCode,
    product_unit_id: data.productUnitId,
    product_unit_name: data.productUnitName,
    sort_no: data.sortNo ?? 0,
    product_price: data.productPrice,
    sale_price: data.salePrice,
    product_count: data.productCount,
    total_price: data.totalPrice,
    remark: data.remark,
    account_set_id: data.accountSetId,
    description: data.description,
    lingma_sys_is_delete: data.lingmaSysIsDelete,
    lingma_sys_ent: data.lingmaSysEnt,
  };
}

function mapRowToBusinessContactRel(item: any): CrmCustomerBusinessApi.BusinessContactRel {
  return {
    rowid: item.rowid,
    businessId: item.business_id,
    businessCode: item.business_code,
    businessName: item.business_name,
    customerId: item.customer_id,
    customerCode: item.customer_code,
    contactId: item.contact_id,
    contactName: item.contact_name,
    companyType: Number(item.company_type || 1) || 1,
    isPrimary: Number(item.is_primary || 0),
    contactRole: item.contact_role,
    accountSetId: item.account_set_id,
    createuser: item.createuser,
    createtime: item.createtime,
    updateuser: item.updateuser,
    updatetime: item.updatetime,
    description: item.description,
    lingmaSysIsDelete: item.lingma_sys_is_delete,
    lingmaSysEnt: item.lingma_sys_ent,
  };
}

function mapBusinessContactRelToRow(data: CrmCustomerBusinessApi.BusinessContactRel) {
  return {
    rowid: data.rowid,
    business_id: data.businessId,
    business_code: data.businessCode,
    business_name: data.businessName,
    customer_id: data.customerId,
    customer_code: data.customerCode,
    contact_id: data.contactId,
    contact_name: data.contactName,
    company_type: data.companyType ?? 1,
    is_primary: data.isPrimary ?? 0,
    contact_role: data.contactRole,
    account_set_id: data.accountSetId,
    description: data.description,
    lingma_sys_is_delete: data.lingmaSysIsDelete,
    lingma_sys_ent: data.lingmaSysEnt,
  };
}

function mapRowToLeadOption(item: any): CrmCustomerBusinessApi.LeadOption {
  return {
    id: item.rowid,
    leadCode: item.lead_code,
    leadName: item.lead_name,
    contactName: item.contact_name,
    leadStatus: Number(item.lead_status || 0),
  };
}

async function queryLeadRows(params: { ids?: Array<number | string>; keyword?: string; page?: number; pageNo?: number; }) {
  const leadTable = getLeadTable();
  const conditions: any[] = [cond('lead_status', 'notequal', 3)];
  if (params.ids && params.ids.length > 0) {
    conditions.push(cond('rowid', 'in', params.ids.map((item) => String(item))));
  }
  if (params.keyword) {
    conditions.push(or(
      cond('lead_name', 'contains', params.keyword),
      cond('lead_code', 'contains', params.keyword),
      cond('contact_name', 'contains', params.keyword),
    ));
  }
  leadTable.Filter = and(...conditions);
  const queryParam: any = {
    Table: [leadTable],
    PageParam: { page: params.page || 0, index: params.pageNo || 1 },
  };
  const resQuery = await requestClient.post(leadTable.queryUrl, queryParam, {
    headers: leadTable.getRequestHeader(), responseReturn: 'raw',
  });
  leadTable.execQueryResult(resQuery);
  return (resQuery?.data?.Result?.data?.Items || []) as any[];
}

async function getLeadMapByIds(ids: Array<number | string>) {
  const uniqueIds = Array.from(new Set(ids.map((item) => normalizeText(item)).filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, CrmCustomerBusinessApi.LeadOption>();
  const items = await queryLeadRows({ ids: uniqueIds });
  return new Map(items.map((item) => [String(item.rowid || ''), mapRowToLeadOption(item)]));
}

async function getLeadIdsByKeyword(keyword?: string) {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return [] as string[];
  const rows = await queryLeadRows({ keyword: normalizedKeyword, page: 100, pageNo: 1 });
  return rows.map((item) => normalizeText(item.rowid)).filter(Boolean);
}

function buildContactSelections(business: CrmCustomerBusinessApi.Business, contacts?: CrmCustomerBusinessApi.BusinessContactSelection[]) {
  if (contacts && contacts.length > 0) {
    const dedupMap = new Map<string, CrmCustomerBusinessApi.BusinessContactSelection>();
    contacts.forEach((item) => {
      const key = normalizeText(item.contactId);
      if (!key) return;
      const existing = dedupMap.get(key);
      dedupMap.set(key, {
        contactId: key,
        contactName: item.contactName || existing?.contactName,
        contactRole: item.contactRole || existing?.contactRole,
        isPrimary: Number(item.isPrimary || 0),
      });
    });
    return Array.from(dedupMap.values());
  }

  const relationList = business.contactRelations || [];
  const primaryId = normalizeText(business.primaryContactId);
  const relationMap = new Map<string, CrmCustomerBusinessApi.BusinessContactSelection>();

  relationList.forEach((item) => {
    const key = normalizeText(item.contactId);
    if (!key) return;
    relationMap.set(key, {
      contactId: key,
      contactName: item.contactName,
      contactRole: item.contactRole,
      isPrimary: Number(item.isPrimary || 0),
    });
  });

  if (primaryId) {
    const existing = relationMap.get(primaryId);
    relationMap.set(primaryId, {
      contactId: primaryId,
      contactName: business.primaryContactName || existing?.contactName,
      contactRole: existing?.contactRole,
      isPrimary: 1,
    });
  }

  (business.participantContactIds || []).forEach((item) => {
    const key = normalizeText(item);
    if (!key || key === primaryId) return;
    const existing = relationMap.get(key);
    relationMap.set(key, {
      contactId: key,
      contactName: existing?.contactName,
      contactRole: existing?.contactRole,
      isPrimary: 0,
    });
  });

  return Array.from(relationMap.values());
}

function buildBusinessProductItems(business: CrmCustomerBusinessApi.Business, items?: CrmCustomerBusinessApi.BusinessProductItem[]) {
  const source = items && items.length > 0 ? items : business.items || [];
  return source
    .map((item, index) => {
      const productId = normalizeText(item.productId);
      if (!productId) return null;
      const productCount = toNumber(item.productCount);
      const salePrice = roundAmount(toNumber(item.salePrice));
      const productPrice = roundAmount(toNumber(item.productPrice));
      const totalPrice = roundAmount(toNumber(item.totalPrice) || salePrice * productCount);
      return {
        ...item,
        rowid: normalizeText(item.rowid) || buildUUID(),
        businessId: business.rowid || business.id,
        businessCode: business.businessCode,
        businessName: business.businessName,
        customerId: business.customerId,
        customerCode: business.customerCode,
        customerName: business.customerName,
        sortNo: index + 1,
        productCount,
        productPrice,
        salePrice,
        totalPrice,
      } as CrmCustomerBusinessApi.BusinessProductItem;
    })
    .filter(Boolean) as CrmCustomerBusinessApi.BusinessProductItem[];
}

async function queryBusinessContactRelList(businessId: number | string) {
  const relTable = getBusinessContactRelTable();
  relTable.Filter = and(cond('business_id', 'equal', businessId));
  const queryParam = { Table: [relTable], PageParam: { page: 0, index: 1 } } as any;
  const resQuery = await requestClient.post(relTable.queryUrl, queryParam, {
    headers: relTable.getRequestHeader(), responseReturn: 'raw',
  });
  relTable.execQueryResult(resQuery);
  const items = (resQuery?.data?.Result?.data?.Items || []) as any[];
  return items.map((item) => mapRowToBusinessContactRel(item));
}

async function queryBusinessProductRelList(businessId: number | string) {
  const relTable = getBusinessProductRelTable();
  relTable.Filter = and(cond('business_id', 'equal', businessId));
  const queryParam = { Table: [relTable], PageParam: { page: 0, index: 1 } } as any;
  const resQuery = await requestClient.post(relTable.queryUrl, queryParam, {
    headers: relTable.getRequestHeader(), responseReturn: 'raw',
  });
  relTable.execQueryResult(resQuery);
  const items = (resQuery?.data?.Result?.data?.Items || []) as any[];
  return items.map((item) => mapRowToBusinessProductItem(item)).sort((a, b) => Number(a.sortNo || 0) - Number(b.sortNo || 0));
}

async function syncBusinessContactRelations(business: CrmCustomerBusinessApi.Business, contacts?: CrmCustomerBusinessApi.BusinessContactSelection[]) {
  const businessId = normalizeText(business.rowid ?? business.id);
  if (!businessId) return;
  const relTable = getBusinessContactRelTable();
  const existingList = await queryBusinessContactRelList(businessId);
  const desiredList = buildContactSelections(business, contacts);
  const existingMap = new Map(existingList.map((item) => [normalizeText(item.contactId), item]));
  const desiredMap = new Map(desiredList.map((item) => [normalizeText(item.contactId), item] as const).filter((item) => item[0]));
  const added: any[] = [];
  const changed: any[] = [];
  const deleted: any[] = [];

  desiredMap.forEach((item, key) => {
    const existing = existingMap.get(key);
    const desiredRow = mapBusinessContactRelToRow({
      rowid: existing?.rowid || buildUUID(),
      businessId,
      businessCode: business.businessCode,
      businessName: business.businessName,
      customerId: business.customerId,
      customerCode: business.customerCode,
      contactId: item.contactId,
      contactName: item.contactName,
      companyType: 1,
      isPrimary: Number(item.isPrimary || 0),
      contactRole: item.contactRole,
    });
    if (!existing) {
      added.push(desiredRow);
      return;
    }
    const shouldChange =
      normalizeText(existing.businessCode) !== normalizeText(business.businessCode) ||
      normalizeText(existing.businessName) !== normalizeText(business.businessName) ||
      normalizeText(existing.customerId) !== normalizeText(business.customerId) ||
      normalizeText(existing.customerCode) !== normalizeText(business.customerCode) ||
      normalizeText(existing.contactName) !== normalizeText(item.contactName) ||
      Number(existing.isPrimary || 0) !== Number(item.isPrimary || 0) ||
      normalizeText(existing.contactRole) !== normalizeText(item.contactRole);
    if (shouldChange) changed.push(desiredRow);
  });

  existingMap.forEach((item, key) => {
    if (!desiredMap.has(key)) deleted.push({ rowid: item.rowid });
  });

  if (added.length === 0 && changed.length === 0 && deleted.length === 0) return;
  const saveParam = relTable.getSaveParam(added, changed, deleted);
  await requestClient.post(relTable.saveUrl, saveParam, {
    headers: relTable.getRequestHeader(), responseReturn: 'raw',
  });
}

async function syncBusinessProductRelations(business: CrmCustomerBusinessApi.Business, items?: CrmCustomerBusinessApi.BusinessProductItem[]) {
  const businessId = normalizeText(business.rowid ?? business.id);
  if (!businessId) return;
  const relTable = getBusinessProductRelTable();
  const existingList = await queryBusinessProductRelList(businessId);
  const desiredList = buildBusinessProductItems(business, items);
  const existingMap = new Map(existingList.map((item) => [normalizeText(item.rowid), item]));
  const desiredMap = new Map(desiredList.map((item) => [normalizeText(item.rowid), item] as const).filter((item) => item[0]));
  const added: any[] = [];
  const changed: any[] = [];
  const deleted: any[] = [];

  desiredMap.forEach((item, key) => {
    const existing = existingMap.get(key);
    const desiredRow = mapBusinessProductItemToRow({
      ...item,
      businessId,
      businessCode: business.businessCode,
      businessName: business.businessName,
      customerId: business.customerId,
      customerCode: business.customerCode,
      customerName: business.customerName,
    });
    if (!existing) {
      added.push(desiredRow);
      return;
    }
    const shouldChange =
      normalizeText(existing.businessCode) !== normalizeText(item.businessCode || business.businessCode) ||
      normalizeText(existing.businessName) !== normalizeText(item.businessName || business.businessName) ||
      normalizeText(existing.customerId) !== normalizeText(item.customerId || business.customerId) ||
      normalizeText(existing.customerCode) !== normalizeText(item.customerCode || business.customerCode) ||
      normalizeText(existing.customerName) !== normalizeText(item.customerName || business.customerName) ||
      normalizeText(existing.productId) !== normalizeText(item.productId) ||
      normalizeText(existing.productCode) !== normalizeText(item.productCode) ||
      normalizeText(existing.productName) !== normalizeText(item.productName) ||
      normalizeText(existing.productBarCode) !== normalizeText(item.productBarCode) ||
      normalizeText(existing.productUnitId) !== normalizeText(item.productUnitId) ||
      normalizeText(existing.productUnitName) !== normalizeText(item.productUnitName) ||
      Number(existing.sortNo || 0) !== Number(item.sortNo || 0) ||
      toNumber(existing.productPrice) !== toNumber(item.productPrice) ||
      toNumber(existing.salePrice) !== toNumber(item.salePrice) ||
      toNumber(existing.productCount) !== toNumber(item.productCount) ||
      toNumber(existing.totalPrice) !== toNumber(item.totalPrice) ||
      normalizeText(existing.remark) !== normalizeText(item.remark);
    if (shouldChange) changed.push(desiredRow);
  });

  existingMap.forEach((item, key) => {
    if (!desiredMap.has(key)) deleted.push({ rowid: item.rowid });
  });

  if (added.length === 0 && changed.length === 0 && deleted.length === 0) return;
  const saveParam = relTable.getSaveParam(added, changed, deleted);
  await requestClient.post(relTable.saveUrl, saveParam, {
    headers: relTable.getRequestHeader(), responseReturn: 'raw',
  });
}

function normalizeBusinessForSave(business: CrmCustomerBusinessApi.Business): CrmCustomerBusinessApi.Business {
  const totalProductPrice = roundAmount(toNumber(business.totalProductPrice));
  const rawDiscountPercent = roundAmount(toNumber(business.discountPercent), 2);
  const discountPercent = Math.min(Math.max(rawDiscountPercent, 0), 100);
  const normalizedAmount = roundAmount(totalProductPrice * (1 - discountPercent / 100));
  return {
    ...business,
    totalProductPrice,
    discountPercent,
    amount: normalizedAmount,
  };
}

export async function getBusinessPage(params: PageParam & Record<string, any>) {
  const businessTable = getBusinessTable();
  const conditions: any[] = [];
  const sceneOwnerIds = await resolveSceneOwnerIds(params.sceneType);
  const normalizedSceneType = normalizeText(params.sceneType);
  const currentUser = getCurrentUserInfo();

  if (normalizedSceneType === '1' && sceneOwnerIds.length > 0) {
    conditions.push(cond('owner_user_id', 'in', sceneOwnerIds));
  }
  if (normalizedSceneType === '3' && sceneOwnerIds.length > 0) {
    conditions.push(cond('owner_user_id', 'in', sceneOwnerIds));
  }
  if (normalizedSceneType === '2') {
    const participationConditions: any[] = [];
    if (currentUser.userName) {
      participationConditions.push(cond('createuser', 'equal', currentUser.userName));
      participationConditions.push(cond('updateuser', 'equal', currentUser.userName));
    }
    if (participationConditions.length > 0) {
      conditions.push(or(...participationConditions));
      if (currentUser.userId) conditions.push(cond('owner_user_id', 'notequal', currentUser.userId));
    }
  }

  if (params.businessCode) conditions.push(cond('business_code', 'contains', params.businessCode));
  if (params.businessName) conditions.push(cond('business_name', 'contains', params.businessName));
  if (params.customerName) conditions.push(cond('customer_name', 'contains', params.customerName));
  if (params.primaryContactName) conditions.push(cond('primary_contact_name', 'contains', params.primaryContactName));
  if (params.ownerUserName) conditions.push(cond('ownerUserName', 'contains', params.ownerUserName));
  if (params.businessStage !== undefined && params.businessStage !== null && params.businessStage !== '') {
    conditions.push(cond('business_stage', 'equal', Number(params.businessStage)));
  }
  if (params.businessStatus !== undefined && params.businessStatus !== null && params.businessStatus !== '') {
    conditions.push(cond('business_status', 'equal', Number(params.businessStatus)));
  }
  if (params.sourceLeadId) {
    conditions.push(cond('source_lead_id', 'equal', params.sourceLeadId));
  } else if (params.sourceLeadName) {
    const leadIds = await getLeadIdsByKeyword(params.sourceLeadName);
    if (leadIds.length === 0) {
      const result = new clientData();
      result.dataTable = businessTable;
      result.list = [];
      result.total = 0;
      return result as any;
    }
    conditions.push(cond('source_lead_id', 'in', leadIds));
  }
  if (conditions.length > 0) businessTable.Filter = and(...conditions);

  const queryParam: any = {
    Table: [businessTable],
    PageParam: { page: params.page || 0, index: params.pageNo || 1 },
  };
  const resQuery = await requestClient.post(businessTable.queryUrl, queryParam, {
    headers: businessTable.getRequestHeader(), responseReturn: 'raw',
  });
  businessTable.execQueryResult(resQuery);

  const result = new clientData();
  result.dataTable = businessTable;
  const data = resQuery?.data?.Result?.data || {};
  const items = (data?.Items || []) as any[];
  const leadMap = await getLeadMapByIds(items.map((item) => item.source_lead_id));
  result.list = items.map((item) => mapRowToBusiness(item, leadMap));
  result.total = data?.Count || items.length || 0;
  return result as any;
}

export async function getBusiness(id: number | string) {
  const businessTable = getBusinessTable();
  businessTable.Filter = and(cond('rowid', 'equal', id));
  const queryParam = { Table: [businessTable], PageParam: { page: 0, index: 1 } } as any;
  const resQuery = await requestClient.post(businessTable.queryUrl, queryParam, {
    headers: businessTable.getRequestHeader(), responseReturn: 'raw',
  });
  businessTable.execQueryResult(resQuery);
  const items = (resQuery?.data?.Result?.data?.Items || []) as any[];
  if (items.length === 0) return null as any;
  const leadMap = await getLeadMapByIds([items[0].source_lead_id]);
  const business = mapRowToBusiness(items[0], leadMap);
  const relList = await queryBusinessContactRelList(id);
  const productItems = await queryBusinessProductRelList(id);
  business.contactRelations = relList;
  business.participantContacts = relList.filter((item) => Number(item.isPrimary || 0) !== 1);
  business.participantContactIds = business.participantContacts.map((item) => item.contactId || '').filter(Boolean);
  business.items = productItems;
  return business as any;
}

export async function checkBusinessDuplicate(data: CrmCustomerBusinessApi.Business): Promise<CrmCustomerBusinessApi.BusinessDuplicateCheckResult> {
  if (!data.businessName || !data.customerId) {
    return { hasDuplicate: false, items: [], message: '' };
  }
  const businessTable = getBusinessTable();
  const conditions: any[] = [cond('business_name', 'equal', data.businessName), cond('customer_id', 'equal', data.customerId)];
  const currentId = normalizeText(data.rowid ?? data.id);
  if (currentId) conditions.push(cond('rowid', 'notequal', currentId));
  businessTable.Filter = and(...conditions);
  const queryParam = { Table: [businessTable], PageParam: { page: 20, index: 1 } } as any;
  const resQuery = await requestClient.post(businessTable.queryUrl, queryParam, {
    headers: businessTable.getRequestHeader(), responseReturn: 'raw',
  });
  businessTable.execQueryResult(resQuery);
  const items = (resQuery?.data?.Result?.data?.Items || []) as any[];
  const mapped = items.map((item) => ({
    rowid: item.rowid,
    businessCode: item.business_code,
    businessName: item.business_name,
    customerId: item.customer_id,
    customerName: item.customer_name,
    ownerUserName: item.ownerUserName,
    businessStatus: Number(item.business_status || 0),
    businessStage: Number(item.business_stage || 0),
  }));
  return {
    hasDuplicate: mapped.length > 0,
    items: mapped,
    message: mapped.length > 0 ? `检测到 ${mapped.length} 条同客户下重名商机，确认后仍可继续保存。` : '',
  };
}

async function saveBusinessMain(data: CrmCustomerBusinessApi.Business, isCreate: boolean) {
  const table = getBusinessTable();
  const row = mapBusinessToRow(data);
  const saveParam = isCreate ? table.getSaveParam([row], [], []) : table.getSaveParam([], [row], []);
  await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(), responseReturn: 'raw',
  });
}

async function deleteBusinessContactRelations(businessId: number | string) {
  const items = await queryBusinessContactRelList(businessId);
  if (items.length === 0) return;
  const relTable = getBusinessContactRelTable();
  const saveParam = relTable.getSaveParam([], [], items.map((item) => ({ rowid: item.rowid })));
  await requestClient.post(relTable.saveUrl, saveParam, {
    headers: relTable.getRequestHeader(), responseReturn: 'raw',
  });
}

async function deleteBusinessProductRelations(businessId: number | string) {
  const items = await queryBusinessProductRelList(businessId);
  if (items.length === 0) return;
  const relTable = getBusinessProductRelTable();
  const saveParam = relTable.getSaveParam([], [], items.map((item) => ({ rowid: item.rowid })));
  await requestClient.post(relTable.saveUrl, saveParam, {
    headers: relTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export async function createBusiness(payload: CrmCustomerBusinessApi.BusinessSavePayload | CrmCustomerBusinessApi.Business) {
  const business = 'business' in payload ? payload.business : payload;
  const contacts = 'business' in payload ? payload.contacts : undefined;
  const items = 'business' in payload ? payload.items : business.items;
  const rowid = normalizeText(business.rowid ?? business.id) || buildUUID();
  const normalizedBusiness = normalizeBusinessForSave({
    ...business,
    id: rowid,
    rowid,
    companyType: 1,
    businessStatus: Number(business.businessStatus ?? 0),
    businessStage: Number(business.businessStage ?? 0),
  });
  await saveBusinessMain(normalizedBusiness, true);
  await syncBusinessContactRelations(normalizedBusiness, contacts);
  await syncBusinessProductRelations(normalizedBusiness, items);
  return { rowid, businessCode: normalizedBusiness.businessCode };
}

export async function createBusinessWithAutoCode(payload: CrmCustomerBusinessApi.BusinessSavePayload | CrmCustomerBusinessApi.Business) {
  const business = 'business' in payload ? payload.business : payload;
  const contacts = 'business' in payload ? payload.contacts : undefined;
  const items = 'business' in payload ? payload.items : business.items;
  const rowid = normalizeText(business.rowid ?? business.id) || buildUUID();
  const normalizedBusiness = normalizeBusinessForSave({
    ...business,
    id: rowid,
    rowid,
    companyType: 1,
    businessStatus: Number(business.businessStatus ?? 0),
    businessStage: Number(business.businessStage ?? 0),
  });
  await saveBusinessMain(normalizedBusiness, true);
  if (!normalizeText(normalizedBusiness.businessCode) && BUSINESS_CODE_RULE_ID) {
    try {
      const codeRes = await getCodeString(rowid, BUSINESS_CODE_RULE_ID, getBusinessTable().getRequestHeader());
      if (codeRes?.Code === 200 && codeRes?.Message) {
        normalizedBusiness.businessCode = codeRes.Message;
        await saveBusinessMain(normalizedBusiness, false);
      }
    } catch {
      // 预留自动编码能力，不阻塞保存
    }
  }
  await syncBusinessContactRelations(normalizedBusiness, contacts);
  await syncBusinessProductRelations(normalizedBusiness, items);
  return { rowid, businessCode: normalizedBusiness.businessCode };
}

export async function updateBusiness(payload: CrmCustomerBusinessApi.BusinessSavePayload | CrmCustomerBusinessApi.Business) {
  const business = 'business' in payload ? payload.business : payload;
  const contacts = 'business' in payload ? payload.contacts : undefined;
  const items = 'business' in payload ? payload.items : business.items;
  const current = await getBusiness(normalizeText(business.rowid ?? business.id));
  if (!current) throw new Error('商机不存在');
  if (Number(current.businessStatus || 0) !== 0) throw new Error('赢单、输单或关闭后的商机不可编辑');
  const normalizedBusiness = normalizeBusinessForSave({
    ...current,
    ...business,
    id: normalizeText(business.rowid ?? business.id ?? current.rowid),
    rowid: normalizeText(business.rowid ?? business.id ?? current.rowid),
    companyType: 1,
    businessStatus: Number(current.businessStatus || 0),
  });
  await saveBusinessMain(normalizedBusiness, false);
  await syncBusinessContactRelations(normalizedBusiness, contacts);
  await syncBusinessProductRelations(normalizedBusiness, items);
  return { rowid: normalizedBusiness.rowid, businessCode: normalizedBusiness.businessCode };
}

export async function deleteBusiness(id: number | string) {
  const current = await getBusiness(id);
  if (!current) throw new Error('商机不存在');
  if (Number(current.businessStatus || 0) !== 0) throw new Error('赢单、输单或关闭后的商机不可删除');
  await deleteBusinessContactRelations(id);
  await deleteBusinessProductRelations(id);
  const businessTable = getBusinessTable();
  const saveParam = businessTable.getSaveParam([], [], [{ rowid: id }]);
  return requestClient.post(businessTable.saveUrl, saveParam, {
    headers: businessTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export async function updateBusinessStatus(data: CrmCustomerBusinessApi.BusinessStatusUpdateReqVO) {
  const current = await getBusiness(data.id);
  if (!current) throw new Error('商机不存在');
  if (Number(current.businessStatus || 0) !== 0) throw new Error('结果态商机不可逆，不能再次变更状态');
  const targetStatus = Number(data.businessStatus || 0);
  if (![1, 2, 3].includes(targetStatus)) throw new Error('仅支持变更为赢单、输单或关闭');
  if (targetStatus === 2 && !normalizeText(data.lostReason)) throw new Error('输单时必须填写输单原因');
  const changed: any = { rowid: data.id, business_status: targetStatus };
  if (targetStatus === 1) changed.business_stage = 4;
  if (targetStatus === 2) {
    changed.business_stage = 5;
    changed.lost_reason = normalizeText(data.lostReason);
  }
  if (targetStatus !== 2) changed.lost_reason = '';
  const businessTable = getBusinessTable();
  const saveParam = businessTable.getSaveParam([], [changed], []);
  return requestClient.post(businessTable.saveUrl, saveParam, {
    headers: businessTable.getRequestHeader(), responseReturn: 'raw',
  });
}

export async function getBusinessContactRelList(businessId: number | string) {
  return queryBusinessContactRelList(businessId);
}

export async function getBusinessProductRelList(businessId: number | string) {
  return queryBusinessProductRelList(businessId);
}

export async function getBusinessLeadOptions(keyword = '') {
  const items = await queryLeadRows({ keyword: normalizeText(keyword), page: 20, pageNo: 1 });
  return items.map((item) => mapRowToLeadOption(item));
}

export async function getBusinessCustomerOptions(keyword = '') {
  const items = await getCustomerSimpleList();
  const normalizedKeyword = normalizeText(keyword);
  return items
    .filter((item: any) => Number(item.companyType || 1) === 1)
    .filter((item: any) => {
      if (!normalizedKeyword) return true;
      const source = `${item.customerName || item.name || ''} ${item.customerCode || ''}`;
      return source.includes(normalizedKeyword);
    })
    .map((item: any) => ({
      id: item.rowid ?? item.id,
      customerId: item.rowid ?? item.id,
      customerCode: item.customerCode,
      customerName: item.customerName || item.name,
      ownerUserId: item.ownerUserId,
      ownerUserName: item.ownerUserName,
      departId: item.departId,
      departName: item.departName || item.ownerUserDeptName,
      subjectStageLabel: getUnifiedSubjectStageLabel(item),
    }));
}

export async function getBusinessContactOptions(customerId: number | string) {
  if (!customerId) return [] as CrmCustomerBusinessApi.ContactOption[];
  const items = await getCustomerContacts({ customerId, companyType: 1 });
  return items.map((item) => ({
    id: item.id,
    customerId: item.customerId,
    customerCode: item.customerCode,
    customerName: item.customerName,
    contactName: item.contactName,
    mobile: item.mobile,
    email: item.email,
    isPrimary: Number(item.isPrimary || 0),
  }));
}

export async function getBusinessOwnerOptions(keyword = '') {
  const staffList = await getStaffList(undefined, normalizeText(keyword));
  return (staffList || []).map((item) => ({
    id: item.ROWID,
    name: item.UserName,
    departId: item.DepID,
    departName: item.DepName,
  }));
}

export {
  mapRowToBusiness,
  mapBusinessToRow,
  mapRowToBusinessProductItem,
  mapBusinessProductItemToRow,
  mapRowToBusinessContactRel,
  mapBusinessContactRelToRow,
};
