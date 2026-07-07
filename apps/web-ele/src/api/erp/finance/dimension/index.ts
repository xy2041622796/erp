import type { ErpSaleOutApi } from '#/api/erp/sale/out';
import type { ErpSaleReturnApi } from '#/api/erp/sale/return';
import type { BilSubjectApi } from '#/api/erp/finance/settings/project';

import { generateUUID } from '@vben/utils';

import { exportExcelByConfig, importExcelByConfig } from '#/api/common/import-export';
import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { resolveVoucherDateByPeriodStatus } from '#/api/erp/finance/period-status';
import { getAllSubjectList } from '#/api/erp/finance/settings/project';
import { createVoucher, getNextVoucherCodeByDate, getVoucherPage } from '#/api/erp/finance/voucher';

import { createFinanceDataTable } from '../common/account-set-scope';

export namespace ErpDimensionApi {
  export interface DimensionSet {
    rowid?: string;
    event_code?: string;
    biz_category?: string;
    ref_id?: string;
    biz_date?: Date | string;
    description?: string;
    is_voucher_required?: number;
    voucher_no?: string;
    account_set_id?: string;
    lingma_sys_ent?: string;
    lingma_sys_is_delete?: number;
    createuser?: string;
    createtime?: Date | string;
    updateuser?: string;
    updatetime?: Date | string;
  }

  export interface DimensionDetail {
    rowid?: string;
    set_id?: string;
    dim_category?: string;
    dim_code?: string;
    value_code?: string;
    value_name?: string;
    amount?: number;
    direction?: string;
    currency?: string;
    period?: string;
    account_set_id?: string;
    lingma_sys_ent?: string;
    lingma_sys_is_delete?: number;
    createuser?: string;
    createtime?: Date | string;
    updateuser?: string;
    updatetime?: Date | string;
  }
}

const DIMENSION_SET_MODEL_ID = '07D264520034366B1DA25CEE5358E502';
const DIMENSION_SET_TABLE = 'Bil_Dimension_Set';
const DIMENSION_SET_DB = 'LMBill';
const DIMENSION_SET_PK = 'rowid';

const DIMENSION_DETAIL_MODEL_ID = '07D264520034366B1DA25CEE5358E502';
const DIMENSION_DETAIL_TABLE = 'Bil_Dimension_Detail';
const DIMENSION_DETAIL_DB = 'LMBill';
const DIMENSION_DETAIL_PK = 'rowid';

const COLLECTION_SUBMIT_MODEL_ID = '33B22E86D2F2B11CFDCBBD786A00058E';
const COLLECTION_SUBMIT_TABLE = 'Bil_Collection_Submit';
const COLLECTION_SUBMIT_DB = 'LMBill';
const COLLECTION_SUBMIT_PK = 'rowid';

const DIMENSION_RESULT_IO_ENCODING_ID = '7245EE90F2839A8241580051B2C47A71';
const DIMENSION_RESULT_IMPORT_CUSTOM_PATH = 'LMBDimensionResult';
const DIMENSION_RESULT_EXPORT_FILE_NAME = '业务维度台账';

const SALE_SHIPMENT_EVENT_CODE = 'SALE_SHIPMENT';
const SALE_SHIPMENT_BIZ_CATEGORY = '销售';
const SALE_RETURN_EVENT_CODE = 'SALE_RETURN';
const SALE_RETURN_BIZ_CATEGORY = '销售';
const COLLECTION_SUBMIT_CONFIRM_EVENT_CODE = 'COLLECTION_SUBMIT_CONFIRM';
const COLLECTION_SUBMIT_BIZ_CATEGORY = '收款';
const PURCHASE_IN_EVENT_CODE = 'PURCHASE_IN';
const PURCHASE_IN_BIZ_CATEGORY = '采购';
const DIMENSION_VOUCHER_BUSINESS_URL = 'erp/finance/dimension/result';

function createDimensionSetTable() {
  return createFinanceDataTable(
    DIMENSION_SET_MODEL_ID,
    DIMENSION_SET_TABLE,
    DIMENSION_SET_DB,
    DIMENSION_SET_PK,
  );
}

function createDimensionDetailTable() {
  return createFinanceDataTable(
    DIMENSION_DETAIL_MODEL_ID,
    DIMENSION_DETAIL_TABLE,
    DIMENSION_DETAIL_DB,
    DIMENSION_DETAIL_PK,
  );
}


function extractItemsAndTotal(raw: any) {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data || {};
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = Number(resultData?.Count ?? items.length ?? 0);
  return { items, total };
}

function toNumber(value: any, defaultValue = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

function formatDateTime(value: any) {
  const d = value ? new Date(value) : new Date();
  const time = d.getTime();
  if (!Number.isFinite(time)) {
    const now = new Date();
    return now.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
  }
  return d.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

function formatPeriod(value: any) {
  const d = value ? new Date(value) : new Date();
  const time = d.getTime();
  if (!Number.isFinite(time)) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatVoucherPeriodText(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toMysqlDateTime(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('凭证日期无效，无法生成财务凭证');
  }
  const pad = (num: number) => String(num).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function pickNonEmptyText(...candidates: any[]) {
  for (const item of candidates) {
    const value = String(item ?? '').trim();
    if (value) return value;
  }
  return '';
}

function normalizeVoucherDirection(value: any) {
  const text = String(value ?? '').trim().toUpperCase();
  if (['DEBIT', 'INFLOW', '借方', '借'].includes(text)) return 'DEBIT' as const;
  if (['CREDIT', 'OUTFLOW', '贷方', '贷'].includes(text)) return 'CREDIT' as const;
  return null;
}

function getEventDisplayName(eventCode: string) {
  const map: Record<string, string> = {
    SALE_SHIPMENT: '销售发货',
    SALE_RETURN: '销售退货',
    COLLECTION_SUBMIT_CONFIRM: '收款确认',
  };
  return map[String(eventCode || '').trim()] || String(eventCode || '业务事件').trim() || '业务事件';
}

async function findDimensionVoucher(setId: string) {
  const normalizedSetId = String(setId || '').trim();
  if (!normalizedSetId) return null;
  const res = await getVoucherPage({ pageNo: 1, page: 0, keyword: normalizedSetId } as any);
  const list = Array.isArray(res?.list) ? res.list : [];
  return (
    list.find(
      (item: any) =>
        String(item?.business_code || '').trim() === normalizedSetId &&
        String(item?.business_url || '').trim() === DIMENSION_VOUCHER_BUSINESS_URL,
    ) || null
  );
}

async function updateDimensionSetVoucherInfo(setId: string, voucherNo: string) {
  const normalizedSetId = String(setId || '').trim();
  const normalizedVoucherNo = String(voucherNo || '').trim();
  if (!normalizedSetId || !normalizedVoucherNo) return;
  const table = createDimensionSetTable();
  const saveReq = table.getSaveParam(
    [],
    [{ rowid: normalizedSetId, voucher_no: normalizedVoucherNo } as any],
    [],
  );
  await requestClient.post(table.saveUrl, saveReq, {
    headers: table.getRequestHeader(),
  });
}

function buildSaleShipmentDimensionDetails(
  setId: string,
  saleOut: ErpSaleOutApi.SaleOut,
): ErpDimensionApi.DimensionDetail[] {
  const totalAmount = toNumber((saleOut as any)?.total_price, 0);
  const period = formatPeriod((saleOut as any)?.out_time || (saleOut as any)?.create_time);
  const customerCode = String((saleOut as any)?.customer_id ?? 'C09').trim() || 'C09';

  return [
    {
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'FINANCIAL',
      dim_code: 'SUBJECT',
      value_code: '6401',
      amount: totalAmount,
      direction: 'OUTFLOW',
      currency: 'CNY',
      period,
      lingma_sys_is_delete: 0,
    },
    {
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'FINANCIAL',
      dim_code: 'SUBJECT',
      value_code: '1405',
      amount: totalAmount,
      direction: 'INFLOW',
      currency: 'CNY',
      period,
      lingma_sys_is_delete: 0,
    },
    {
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'BIZ',
      dim_code: 'DEPT',
      value_code: 'D02',
      amount: undefined,
      direction: '',
      currency: '',
      period,
      lingma_sys_is_delete: 0,
    },
    {
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'BIZ',
      dim_code: 'CUSTOMER',
      value_code: customerCode,
      amount: undefined,
      direction: '',
      currency: '',
      period,
      lingma_sys_is_delete: 0,
    },
    {
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'ANALYSIS',
      dim_code: 'CUSTOMER_LEVEL',
      value_code: 'V1',
      amount: undefined,
      direction: '',
      currency: '',
      period,
      lingma_sys_is_delete: 0,
    },
  ];
}

function buildSaleReturnDimensionDetails(
  setId: string,
  saleReturn: ErpSaleReturnApi.SaleReturn,
): ErpDimensionApi.DimensionDetail[] {
  const totalAmount = toNumber((saleReturn as any)?.total_price, 0);
  const period = formatPeriod((saleReturn as any)?.return_time || new Date());
  const customerCode = String((saleReturn as any)?.customer_id ?? 'C09').trim() || 'C09';

  return [
    {
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'FINANCIAL',
      dim_code: 'SUBJECT',
      value_code: '1405',
      amount: totalAmount,
      direction: 'OUTFLOW',
      currency: 'CNY',
      period,
      lingma_sys_is_delete: 0,
    },
    {
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'FINANCIAL',
      dim_code: 'SUBJECT',
      value_code: '6401',
      amount: totalAmount,
      direction: 'INFLOW',
      currency: 'CNY',
      period,
      lingma_sys_is_delete: 0,
    },
    {
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'BIZ',
      dim_code: 'DEPT',
      value_code: 'D02',
      amount: undefined,
      direction: '',
      currency: '',
      period,
      lingma_sys_is_delete: 0,
    },
    {
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'BIZ',
      dim_code: 'CUSTOMER',
      value_code: customerCode,
      amount: undefined,
      direction: '',
      currency: '',
      period,
      lingma_sys_is_delete: 0,
    },
    {
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'ANALYSIS',
      dim_code: 'CUSTOMER_LEVEL',
      value_code: 'V1',
      amount: undefined,
      direction: '',
      currency: '',
      period,
      lingma_sys_is_delete: 0,
    },
  ];
}


function buildPurchaseInDimensionDetails(
  setId: string,
  row: any,
): ErpDimensionApi.DimensionDetail[] {
  const totalAmount = toNumber(row?.total_price, 0);
  const period = formatPeriod(row?.in_time || new Date());
  const bizNo = String(row?.no ?? row?.id ?? '').trim();

  const details: ErpDimensionApi.DimensionDetail[] = [
    {
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'FINANCIAL',
      dim_code: 'SUBJECT',
      value_code: '1405',
      amount: totalAmount,
      direction: 'INFLOW',
      currency: 'CNY',
      period,
      lingma_sys_is_delete: 0,
    },
    {
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'FINANCIAL',
      dim_code: 'SUBJECT',
      value_code: '2202',
      amount: totalAmount,
      direction: 'OUTFLOW',
      currency: 'CNY',
      period,
      lingma_sys_is_delete: 0,
    },
  ];

  if (bizNo) {
    details.push({
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'BIZ',
      dim_code: 'BIZ_NO',
      value_code: bizNo,
      amount: undefined,
      direction: '',
      currency: '',
      period,
      lingma_sys_is_delete: 0,
    });
  }

  details.push({
    rowid: generateUUID(),
    set_id: setId,
    dim_category: 'BIZ',
    dim_code: 'BIZ_TO_FINANCE',
    value_code: '借:1405 / 贷:2202',
    amount: undefined,
    direction: '',
    currency: '',
    period,
    lingma_sys_is_delete: 0,
  });

  return details;
}

function buildCollectionSubmitDimensionDetails(
  setId: string,
  row: any,
  debitSubjectNo: string,
  creditSubjectNo: string,
): ErpDimensionApi.DimensionDetail[] {
  const totalAmount = toNumber(row?.collection_amount, 0);
  const period = formatPeriod(row?.collection_date || row?.createtime || new Date());
  const customerCode = String(row?.customer_id ?? '').trim();
  const deptCode = String(row?.depart_name ?? '').trim();
  const reportId = String(row?.ReportID ?? row?.rowid ?? '').trim();

  const details: ErpDimensionApi.DimensionDetail[] = [
    {
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'FINANCIAL',
      dim_code: 'SUBJECT',
      value_code: String(debitSubjectNo || '').trim(),
      amount: totalAmount,
      direction: 'INFLOW',
      currency: 'CNY',
      period,
      lingma_sys_is_delete: 0,
    },
    {
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'FINANCIAL',
      dim_code: 'SUBJECT',
      value_code: String(creditSubjectNo || '').trim(),
      amount: totalAmount,
      direction: 'OUTFLOW',
      currency: 'CNY',
      period,
      lingma_sys_is_delete: 0,
    },
  ];

  if (deptCode) {
    details.push({
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'BIZ',
      dim_code: 'DEPT',
      value_code: deptCode,
      amount: undefined,
      direction: '',
      currency: '',
      period,
      lingma_sys_is_delete: 0,
    });
  }

  if (customerCode) {
    details.push({
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'BIZ',
      dim_code: 'CUSTOMER',
      value_code: customerCode,
      amount: undefined,
      direction: '',
      currency: '',
      period,
      lingma_sys_is_delete: 0,
    });
  }

  if (reportId) {
    details.push({
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'BIZ',
      dim_code: 'BIZ_NO',
      value_code: reportId,
      amount: undefined,
      direction: '',
      currency: '',
      period,
      lingma_sys_is_delete: 0,
    });
  }

  const bizToFinanceText = [
    debitSubjectNo ? `借:${debitSubjectNo}` : '',
    creditSubjectNo ? `贷:${creditSubjectNo}` : '',
  ]
    .filter(Boolean)
    .join(' / ');

  if (bizToFinanceText) {
    details.push({
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'BIZ',
      dim_code: 'BIZ_TO_FINANCE',
      value_code: bizToFinanceText,
      amount: undefined,
      direction: '',
      currency: '',
      period,
      lingma_sys_is_delete: 0,
    });
  }

  const incomeType = String(row?.income_type ?? '').trim();
  if (incomeType) {
    details.push({
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'BIZ',
      dim_code: 'INCOME_TYPE',
      value_code: incomeType,
      amount: undefined,
      direction: '',
      currency: '',
      period,
      lingma_sys_is_delete: 0,
    });
  }

  return details;
}
export async function getDimensionSetPage(params: any = {}) {
  const table = createDimensionSetTable();

  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];

  if (params.event_code) {
    filters.push(cond('event_code', 'equal', params.event_code));
  }

  if (params.biz_category) {
    filters.push(cond('biz_category', 'equal', params.biz_category));
  }

  if (params.ref_id) {
    filters.push(cond('ref_id', 'contains', params.ref_id));
  }

  if (params.keyword) {
    filters.push(
      or(
        cond('rowid', 'contains', params.keyword),
        cond('ref_id', 'contains', params.keyword),
        cond('description', 'contains', params.keyword),
        cond('voucher_no', 'contains', params.keyword),
      ),
    );
  }

  if (Array.isArray(params.biz_date) && params.biz_date.length === 2) {
    const [start, end] = params.biz_date;
    if (start) {
      filters.push(cond('biz_date', 'greaterthanorequal', start));
    }
    if (end) {
      filters.push(cond('biz_date', 'lessthanorequal', end));
    }
  }

  table.Filter = and(...filters);

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const { items, total } = extractItemsAndTotal(resQuery);

  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = items;
  returnData.total = total;
  return returnData;
}

export async function exportDimensionResult(params: any = {}) {
  return await exportExcelByConfig({
    formId: DIMENSION_SET_MODEL_ID,
    tableName: DIMENSION_SET_TABLE,
    dbName: DIMENSION_SET_DB,
    primaryKey: DIMENSION_SET_PK,
    fileName: DIMENSION_RESULT_EXPORT_FILE_NAME,
    encodingId: DIMENSION_RESULT_IO_ENCODING_ID,
    extraData: params,
  });
}

export async function importDimensionResult(file: File) {
  return await importExcelByConfig({
    formId: DIMENSION_SET_MODEL_ID,
    tableName: DIMENSION_SET_TABLE,
    dbName: DIMENSION_SET_DB,
    primaryKey: DIMENSION_SET_PK,
    file,
    encodingId: DIMENSION_RESULT_IO_ENCODING_ID,
    customPath: DIMENSION_RESULT_IMPORT_CUSTOM_PATH,
    isReplace: false,
    isCrossEnt: false,
  });
}

export async function getDimensionSet(rowid: string) {
  const table = createDimensionSetTable();
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('rowid', 'equal', rowid),
  );

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: 1,
      index: 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const { items } = extractItemsAndTotal(resQuery);
  return (items?.[0] || null) as ErpDimensionApi.DimensionSet | null;
}

export async function getDimensionSetListByBizRef(eventCode: string, bizCategory: string, refId: string) {
  const res = await getDimensionSetPage({
    pageNo: 1,
    page: 0,
    event_code: eventCode,
    biz_category: bizCategory,
    ref_id: refId,
  });
  return (res?.list || []) as ErpDimensionApi.DimensionSet[];
}

export async function getDimensionDetails(setId: string) {
  const table = createDimensionDetailTable();

  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('set_id', 'equal', setId),
  );

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: 0,
      index: 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const { items } = extractItemsAndTotal(resQuery);
  return items as ErpDimensionApi.DimensionDetail[];
}


function aggregateVoucherEntries(
  entries: Array<{
    subjectCode: string;
    amount: number;
    direction: 'DEBIT' | 'CREDIT';
    period?: string;
  }>,
) {
  const map = new Map<string, {
    subjectCode: string;
    amount: number;
    direction: 'DEBIT' | 'CREDIT';
    period?: string;
  }>();
  for (const item of entries) {
    const key = String(item.direction) + '::' + String(item.subjectCode);
    const current = map.get(key) || {
      subjectCode: item.subjectCode,
      amount: 0,
      direction: item.direction,
      period: item.period,
    };
    current.amount += Number(item.amount || 0);
    current.period = current.period || item.period;
    map.set(key, current);
  }
  return Array.from(map.values());
}

function buildVoucherEntriesFromDimensionDetails(details: ErpDimensionApi.DimensionDetail[]) {
  return (details || [])
    .map((item) => {
      const dimCategory = String(item?.dim_category || '').trim().toUpperCase();
      const dimCode = String(item?.dim_code || '').trim().toUpperCase();
      const subjectCode = String(item?.value_code || '').trim();
      const amount = Number(item?.amount ?? 0);
      const direction = normalizeVoucherDirection(item?.direction);
      if (dimCategory !== 'FINANCIAL' || dimCode !== 'SUBJECT' || !subjectCode || !direction || !(amount > 0)) {
        return null;
      }
      return {
        subjectCode,
        amount,
        direction,
        period: item?.period,
      };
    })
    .filter(Boolean) as Array<{
    subjectCode: string;
    amount: number;
    direction: 'DEBIT' | 'CREDIT';
    period?: string;
  }>;
}

export async function ensureVoucherForDimensionSets(setIds: string[]) {
  const normalizedSetIds = Array.from(new Set((setIds || []).map((item) => String(item || '').trim()).filter(Boolean)));
  if (!normalizedSetIds.length) {
    throw new Error('缺少维度主表ID，无法生成凭证');
  }
  if (normalizedSetIds.length === 1) {
    return ensureVoucherForDimensionSet(normalizedSetIds[0]!);
  }

  const setList = (await Promise.all(normalizedSetIds.map((item) => getDimensionSet(item)))).filter(Boolean) as ErpDimensionApi.DimensionSet[];
  if (setList.length !== normalizedSetIds.length) {
    throw new Error('存在未找到的维度主表，无法合并生成凭证');
  }

  if (setList.some((item) => String(item?.voucher_no || '').trim())) {
    throw new Error('所选业务维度中存在已生成凭证的数据，请先取消选择后重试');
  }
  if (setList.some((item) => Number(item?.is_voucher_required || 0) !== 1)) {
    throw new Error('所选业务维度中存在“无需凭证”的数据，无法合并生成');
  }

  const accountSetIds = Array.from(new Set(setList.map((item) => String(item?.account_set_id || '').trim()).filter(Boolean)));
  if (accountSetIds.length > 1) {
    throw new Error('所选业务维度属于不同账套，暂不支持合并生成同一张凭证');
  }

  const detailsList = await Promise.all(normalizedSetIds.map((item) => getDimensionDetails(item)));
  const voucherEntries = aggregateVoucherEntries(buildVoucherEntriesFromDimensionDetails(detailsList.flat()));
  if (!voucherEntries.length) {
    throw new Error('所选维度结果缺少可用于制证的财务科目明细，无法合并生成凭证');
  }

  const debitAmount = voucherEntries.filter((item) => item.direction === 'DEBIT').reduce((sum, item) => sum + item.amount, 0);
  const creditAmount = voucherEntries.filter((item) => item.direction === 'CREDIT').reduce((sum, item) => sum + item.amount, 0);
  if (Math.abs(debitAmount - creditAmount) > 0.0001) {
    throw new Error('所选业务维度汇总后借贷金额不平衡，无法合并生成凭证');
  }

  const subjectRes = await getAllSubjectList({ subject_state: 1, lingma_sys_is_delete: 0, pageNo: 1, page: 0 } as any);
  const subjectList = (subjectRes?.list || []) as BilSubjectApi.Subject[];
  const subjectNameMap = new Map(subjectList.map((item) => [String(item?.subject_number || '').trim(), String(item?.subject_name || '').trim()]));

  const refIds = setList.map((item) => String(item?.ref_id || '').trim()).filter(Boolean);
  const sourceVoucherDate = setList.map((item) => pickNonEmptyText(item.biz_date, item.updatetime, item.createtime)).filter(Boolean).sort().slice(-1)[0] || new Date().toISOString();
  const resolvedVoucherDate = await resolveVoucherDateByPeriodStatus({ date: sourceVoucherDate });
  const sourceVoucherPeriod = formatVoucherPeriodText(sourceVoucherDate);
  const resolvedVoucherPeriod = formatVoucherPeriodText(resolvedVoucherDate.voucherDate);
  const voucherDate = toMysqlDateTime(resolvedVoucherDate.voucherDate);
  const voucherCode = await getNextVoucherCodeByDate(voucherDate, '记');
  const eventNames = Array.from(new Set(setList.map((item) => getEventDisplayName(String(item.event_code || ''))).filter(Boolean)));
  const businessName = eventNames.length === 1 ? String(eventNames[0]) + '维度台账合并制证' : '业务维度台账合并制证';
  const summary = businessName + '（' + refIds.slice(0, 5).join('、') + (refIds.length > 5 ? ' 等' : '') + '）';

  const created = await createVoucher(
    {
      business_url: DIMENSION_VOUCHER_BUSINESS_URL,
      business_code: 'MERGE_' + Date.now(),
      business_name: businessName,
      voucher_type: '业务维度合并凭证',
      voucher_date: voucherDate,
      voucher_code: voucherCode,
      debit_amount: debitAmount,
      credit_amount: creditAmount,
      description: summary,
      is_posted: 0,
      is_reversed: 0,
      operator: pickNonEmptyText(setList[0]?.updateuser, setList[0]?.createuser, 'system'),
      account_set_id: accountSetIds[0] || undefined,
    },
    voucherEntries.map((item, index) => ({
      abstract_content: summary,
      account_code: item.subjectCode,
      account_name: subjectNameMap.get(item.subjectCode) || item.subjectCode,
      debit_amount: item.direction === 'DEBIT' ? item.amount : 0,
      credit_amount: item.direction === 'CREDIT' ? item.amount : 0,
      sort_no: index + 1,
      account_set_id: accountSetIds[0] || undefined,
    })),
  );

  await Promise.all(normalizedSetIds.map((item) => updateDimensionSetVoucherInfo(item, voucherCode)));
  return {
    ...(created as any),
    voucher_code: voucherCode,
    merged_set_ids: normalizedSetIds,
    voucher_date: voucherDate,
    source_voucher_period: sourceVoucherPeriod,
    resolved_voucher_period: resolvedVoucherPeriod,
    voucher_date_shifted: Boolean(resolvedVoucherDate.shifted),
  };
}

export async function ensureVoucherForDimensionSet(setId: string) {
  const normalizedSetId = String(setId || '').trim();
  if (!normalizedSetId) {
    throw new Error('缺少维度主表ID，无法生成凭证');
  }

  const currentSet = await getDimensionSet(normalizedSetId);
  if (!currentSet?.rowid) {
    throw new Error('未找到对应维度主表，无法生成凭证');
  }

  const existedVoucher = await findDimensionVoucher(normalizedSetId);
  if (existedVoucher?.voucher_code) {
    await updateDimensionSetVoucherInfo(normalizedSetId, String(existedVoucher.voucher_code));
    return existedVoucher;
  }

  if (String(currentSet.voucher_no ?? '').trim()) {
    const voucherByNo = await getVoucherPage({ pageNo: 1, page: 0, voucherCodeExact: currentSet.voucher_no } as any);
    const voucherByNoList = Array.isArray(voucherByNo?.list) ? voucherByNo.list : [];
    if (voucherByNoList.length > 0) {
      await updateDimensionSetVoucherInfo(normalizedSetId, String(currentSet.voucher_no));
      return voucherByNoList[0];
    }
  }

  const details = await getDimensionDetails(normalizedSetId);
  const voucherEntries = buildVoucherEntriesFromDimensionDetails(details);

  if (!voucherEntries.length) {
    throw new Error('当前维度结果缺少可用于制证的财务科目明细，无法生成凭证');
  }

  const debitAmount = voucherEntries
    .filter((item) => item.direction === 'DEBIT')
    .reduce((sum, item) => sum + item.amount, 0);
  const creditAmount = voucherEntries
    .filter((item) => item.direction === 'CREDIT')
    .reduce((sum, item) => sum + item.amount, 0);

  if (Math.abs(debitAmount - creditAmount) > 0.0001) {
    throw new Error('借贷金额不平衡，无法生成凭证');
  }

  const subjectRes = await getAllSubjectList({
    subject_state: 1,
    lingma_sys_is_delete: 0,
    pageNo: 1,
    page: 0,
  } as any);
  const subjectList = (subjectRes?.list || []) as BilSubjectApi.Subject[];
  const subjectNameMap = new Map(
    subjectList.map((item) => [String(item?.subject_number || '').trim(), String(item?.subject_name || '').trim()]),
  );

  const eventName = getEventDisplayName(String(currentSet.event_code || ''));
  const businessCode = normalizedSetId;
  const businessName = `${eventName}维度台账`;
  const sourceVoucherDate = pickNonEmptyText(currentSet.biz_date, currentSet.updatetime, currentSet.createtime, new Date().toISOString());
  const resolvedVoucherDate = await resolveVoucherDateByPeriodStatus({ date: sourceVoucherDate });
  const sourceVoucherPeriod = formatVoucherPeriodText(sourceVoucherDate);
  const resolvedVoucherPeriod = formatVoucherPeriodText(resolvedVoucherDate.voucherDate);
  const voucherDate = toMysqlDateTime(resolvedVoucherDate.voucherDate);
  const voucherCode = await getNextVoucherCodeByDate(voucherDate, '记');
  const summary = `${eventName} ${pickNonEmptyText(currentSet.ref_id, normalizedSetId)} 自动生成凭证`;

  const created = await createVoucher(
    {
      business_url: DIMENSION_VOUCHER_BUSINESS_URL,
      business_code: businessCode,
      business_name: businessName,
      voucher_type: `${eventName}凭证`,
      voucher_date: voucherDate,
      voucher_code: voucherCode,
      debit_amount: debitAmount,
      credit_amount: creditAmount,
      description: summary,
      is_posted: 0,
      is_reversed: 0,
      operator: pickNonEmptyText(currentSet.updateuser, currentSet.createuser, 'system'),
      account_set_id: String(currentSet.account_set_id || '').trim() || undefined,
    },
    voucherEntries.map((item, index) => ({
      abstract_content: summary,
      account_code: item.subjectCode,
      account_name: subjectNameMap.get(item.subjectCode) || item.subjectCode,
      debit_amount: item.direction === 'DEBIT' ? item.amount : 0,
      credit_amount: item.direction === 'CREDIT' ? item.amount : 0,
      sort_no: index + 1,
      account_set_id: String(currentSet.account_set_id || '').trim() || undefined,
    })),
  );

  await updateDimensionSetVoucherInfo(normalizedSetId, voucherCode);
  return {
    ...(created as any),
    voucher_code: voucherCode,
    voucher_date: voucherDate,
    source_voucher_period: sourceVoucherPeriod,
    resolved_voucher_period: resolvedVoucherPeriod,
    voucher_date_shifted: Boolean(resolvedVoucherDate.shifted),
  };
}

async function softDeleteDimensionByEventAndRef(eventCode: string, bizCategory: string, refId: string) {
  const setTable = createDimensionSetTable();
  const detailTable = createDimensionDetailTable();

  const activeSets = await getDimensionSetListByBizRef(eventCode, bizCategory, refId);
  if (!activeSets.length) return;

  const setChanged = activeSets.map((item) => ({
    rowid: item.rowid,
    lingma_sys_is_delete: 1,
  }));

  const allDetails = await Promise.all(
    activeSets
      .map((item) => String(item.rowid || '').trim())
      .filter(Boolean)
      .map((setId) => getDimensionDetails(setId)),
  );

  const detailChanged = allDetails
    .flat()
    .map((item) => ({
      rowid: item.rowid,
      lingma_sys_is_delete: 1,
    }));

  const reqList = [
    ...setTable.getSaveParam([], setChanged as any, []),
    ...detailTable.getSaveParam([], detailChanged as any, []),
  ];

  await requestClient.post(setTable.saveUrl, reqList, {
    headers: setTable.getRequestHeader(),
  });
}


export async function generateDimensionByVoucherSave(payload: {
  accountSetId?: string;
  description?: string;
  details: Array<{
    abstract_content?: string;
    account_code?: string;
    account_set_id?: string;
    auxiliaries?: Array<{
      dimCode?: string;
      dim_code?: string;
      label?: string;
      value?: string;
      value_code?: string;
      valueName?: string;
      value_name?: string;
    }>;
    credit_amount?: number;
    debit_amount?: number;
    lingma_sys_ent?: string;
  }>;
  ent?: string;
  operator?: string;
  voucherCode?: string;
  voucherDate?: Date | number | string;
  voucherId: string;
}) {
  const voucherId = String(payload?.voucherId ?? '').trim();
  if (!voucherId) return;

  await softDeleteDimensionByEventAndRef('VOUCHER_SAVE', '凭证', voucherId);

  const setTable = createDimensionSetTable();
  const detailTable = createDimensionDetailTable();
  const setId = generateUUID();
  const voucherDate = payload?.voucherDate || new Date();
  const period = formatPeriod(voucherDate);
  const voucherCode = String(payload?.voucherCode ?? '').trim();
  const operator = String(payload?.operator ?? '').trim();
  const accountSetId = String(payload?.accountSetId ?? '').trim() || undefined;
  const ent = String(payload?.ent ?? '').trim() || undefined;

  const setAdded: ErpDimensionApi.DimensionSet[] = [
    {
      rowid: setId,
      event_code: 'VOUCHER_SAVE',
      biz_category: '凭证',
      ref_id: voucherId,
      biz_date: formatDateTime(voucherDate),
      description: payload?.description || '凭证保存反向同步维度',
      is_voucher_required: 1,
      voucher_no: voucherCode,
      account_set_id: accountSetId,
      lingma_sys_ent: ent,
      lingma_sys_is_delete: 0,
      createuser: operator || undefined,
    },
  ];

  const detailAdded: ErpDimensionApi.DimensionDetail[] = [];
  if (voucherCode) {
    detailAdded.push({
      rowid: generateUUID(),
      set_id: setId,
      dim_category: 'BIZ',
      dim_code: 'VOUCHER_NO',
      value_code: voucherCode,
      amount: undefined,
      direction: '',
      currency: 'CNY',
      period,
      account_set_id: accountSetId,
      lingma_sys_ent: ent,
      lingma_sys_is_delete: 0,
      createuser: operator || undefined,
    });
  }

  for (const item of payload.details || []) {
    const subjectCode = String(item?.account_code ?? '').trim();
    const debit = toNumber(item?.debit_amount, 0);
    const credit = toNumber(item?.credit_amount, 0);
    const amount = debit > 0 ? debit : credit;
    const direction = debit > 0 ? 'INFLOW' : 'OUTFLOW';
    if (subjectCode && amount > 0) {
      detailAdded.push({
        rowid: generateUUID(),
        set_id: setId,
        dim_category: 'FINANCIAL',
        dim_code: 'SUBJECT',
        value_code: subjectCode,
        amount,
        direction,
        currency: 'CNY',
        period,
        account_set_id: item?.account_set_id || accountSetId,
        lingma_sys_ent: item?.lingma_sys_ent || ent,
        lingma_sys_is_delete: 0,
        createuser: operator || undefined,
      });
    }

    for (const aux of item.auxiliaries || []) {
      const dimCode = String(aux?.dim_code ?? aux?.dimCode ?? '').trim().toUpperCase();
      const valueCode = String(aux?.value_code ?? aux?.value ?? '').trim();
      const valueName = pickNonEmptyText(aux?.value_name, aux?.valueName, aux?.label, valueCode);
      if (!dimCode || !valueCode || !(amount > 0)) continue;
      detailAdded.push({
        rowid: generateUUID(),
        set_id: setId,
        dim_category: 'AUX',
        dim_code: dimCode,
        value_code: valueCode,
        value_name: valueName,
        amount,
        direction,
        currency: 'CNY',
        period,
        account_set_id: item?.account_set_id || accountSetId,
        lingma_sys_ent: item?.lingma_sys_ent || ent,
        lingma_sys_is_delete: 0,
        createuser: operator || undefined,
      });
    }
  }

  const reqList = [
    ...setTable.getSaveParam(setAdded as any, [], []),
    ...detailTable.getSaveParam(detailAdded as any, [], []),
  ];

  return await requestClient.post(setTable.saveUrl, reqList, {
    headers: setTable.getRequestHeader(),
  });
}

export async function removeDimensionBySaleShipment(refId: string) {
  await softDeleteDimensionByEventAndRef(
    SALE_SHIPMENT_EVENT_CODE,
    SALE_SHIPMENT_BIZ_CATEGORY,
    refId,
  );
}

export async function removeDimensionBySaleReturn(refId: string) {
  await softDeleteDimensionByEventAndRef(
    SALE_RETURN_EVENT_CODE,
    SALE_RETURN_BIZ_CATEGORY,
    refId,
  );
}

export async function generateDimensionBySaleShipment(saleOut: ErpSaleOutApi.SaleOut) {
  const refId = String((saleOut as any)?.id ?? '').trim();
  if (!refId) {
    throw new Error('销售发货单缺少 id，无法生成维度');
  }

  await removeDimensionBySaleShipment(refId);

  const setTable = createDimensionSetTable();
  const detailTable = createDimensionDetailTable();

  const setId = generateUUID();
  const bizDate = formatDateTime((saleOut as any)?.out_time || (saleOut as any)?.create_time || new Date());
  const description = `销售发货单 ${String((saleOut as any)?.no ?? refId)} 自动生成维度`;

  const setAdded: ErpDimensionApi.DimensionSet[] = [
    {
      rowid: setId,
      event_code: SALE_SHIPMENT_EVENT_CODE,
      biz_category: SALE_SHIPMENT_BIZ_CATEGORY,
      ref_id: refId,
      biz_date: bizDate,
      description,
      is_voucher_required: 0,
      voucher_no: '',
      lingma_sys_is_delete: 0,
    },
  ];

  const detailAdded = buildSaleShipmentDimensionDetails(setId, saleOut);

  const reqList = [
    ...setTable.getSaveParam(setAdded as any, [], []),
    ...detailTable.getSaveParam(detailAdded as any, [], []),
  ];

  return await requestClient.post(setTable.saveUrl, reqList, {
    headers: setTable.getRequestHeader(),
  });
}

export async function generateDimensionBySaleReturn(saleReturn: ErpSaleReturnApi.SaleReturn) {
  const refId = String((saleReturn as any)?.id ?? '').trim();
  if (!refId) {
    throw new Error('销售退货单缺少 id，无法生成维度');
  }

  await removeDimensionBySaleReturn(refId);

  const setTable = createDimensionSetTable();
  const detailTable = createDimensionDetailTable();

  const setId = generateUUID();
  const bizDate = formatDateTime((saleReturn as any)?.return_time || new Date());
  const description = `销售退货单 ${String((saleReturn as any)?.no ?? refId)} 自动生成维度`;

  const setAdded: ErpDimensionApi.DimensionSet[] = [
    {
      rowid: setId,
      event_code: SALE_RETURN_EVENT_CODE,
      biz_category: SALE_RETURN_BIZ_CATEGORY,
      ref_id: refId,
      biz_date: bizDate,
      description,
      is_voucher_required: 0,
      voucher_no: '',
      lingma_sys_is_delete: 0,
    },
  ];

  const detailAdded = buildSaleReturnDimensionDetails(setId, saleReturn);

  const reqList = [
    ...setTable.getSaveParam(setAdded as any, [], []),
    ...detailTable.getSaveParam(detailAdded as any, [], []),
  ];

  return await requestClient.post(setTable.saveUrl, reqList, {
    headers: setTable.getRequestHeader(),
  });
}

export async function removeDimensionByPurchaseIn(refId: string) {
  await softDeleteDimensionByEventAndRef(
    PURCHASE_IN_EVENT_CODE,
    PURCHASE_IN_BIZ_CATEGORY,
    refId,
  );
}

export async function generateDimensionByPurchaseIn(row: any) {
  const refId = String(row?.id ?? row?.rowid ?? '').trim();
  if (!refId) {
    throw new Error('采购入库缺少 id，无法生成维度');
  }

  await removeDimensionByPurchaseIn(refId);

  const setTable = createDimensionSetTable();
  const detailTable = createDimensionDetailTable();

  const setId = generateUUID();
  const bizDate = formatDateTime(row?.in_time || new Date());
  const bizNo = String(row?.no ?? refId).trim();
  const description = '采购入库 ' + bizNo + ' 自动生成维度';

  const setAdded: ErpDimensionApi.DimensionSet[] = [
    {
      rowid: setId,
      event_code: PURCHASE_IN_EVENT_CODE,
      biz_category: PURCHASE_IN_BIZ_CATEGORY,
      ref_id: refId,
      biz_date: bizDate,
      description,
      is_voucher_required: 1,
      voucher_no: '',
      lingma_sys_is_delete: 0,
    },
  ];

  const detailAdded = buildPurchaseInDimensionDetails(setId, row);

  const reqList = [
    ...setTable.getSaveParam(setAdded as any, [], []),
    ...detailTable.getSaveParam(detailAdded as any, [], []),
  ];

  return await requestClient.post(setTable.saveUrl, reqList, {
    headers: setTable.getRequestHeader(),
  });
}

export async function removeDimensionByCollectionSubmit(refId: string) {
  await softDeleteDimensionByEventAndRef(
    COLLECTION_SUBMIT_CONFIRM_EVENT_CODE,
    COLLECTION_SUBMIT_BIZ_CATEGORY,
    refId,
  );
}

export async function generateDimensionByCollectionSubmit(
  row: any,
  options: { debitSubjectNo: string; creditSubjectNo: string },
) {
  const refId = String(row?.rowid ?? '').trim();
  if (!refId) {
    throw new Error('收款提报缺少 rowid，无法生成维度');
  }

  const debitSubjectNo = String(options?.debitSubjectNo ?? '').trim();
  const creditSubjectNo = String(options?.creditSubjectNo ?? '').trim();
  if (!debitSubjectNo || !creditSubjectNo) {
    throw new Error('收款提报缺少业财转换后的财务科目，无法生成维度');
  }

  await removeDimensionByCollectionSubmit(refId);

  const setTable = createDimensionSetTable();
  const detailTable = createDimensionDetailTable();

  const setId = generateUUID();
  const bizDate = formatDateTime(row?.collection_date || row?.createtime || new Date());
  const bizNo = String(row?.ReportID ?? refId).trim();
  const description = '收款提报 ' + bizNo + ' 业财转换生成维度';

  const setAdded: ErpDimensionApi.DimensionSet[] = [
    {
      rowid: setId,
      event_code: COLLECTION_SUBMIT_CONFIRM_EVENT_CODE,
      biz_category: COLLECTION_SUBMIT_BIZ_CATEGORY,
      ref_id: refId,
      biz_date: bizDate,
      description,
      is_voucher_required: 0,
      voucher_no: '',
      lingma_sys_is_delete: 0,
    },
  ];

  const detailAdded = buildCollectionSubmitDimensionDetails(
    setId,
    row,
    debitSubjectNo,
    creditSubjectNo,
  );

  const reqList = [
    ...setTable.getSaveParam(setAdded as any, [], []),
    ...detailTable.getSaveParam(detailAdded as any, [], []),
  ];

  return await requestClient.post(setTable.saveUrl, reqList, {
    headers: setTable.getRequestHeader(),
  });
}
