import type { ErpSaleOutApi } from '#/api/erp/sale/out';

import { requestClient } from '#/api/request';
import { and, cond, DataTable } from '#/api/qyapi';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';
import { getAllSubjectList } from '#/api/erp/finance/settings/project';
import { createVoucher, getNextVoucherCodeByDate, getVoucherPage } from '#/api/erp/finance/voucher';
import { getStoredAccountSetId } from '#/utils/accountSet';

export interface DimensionEventConfig {
  rowid: string;
  event_code: string;
  event_name: string;
  biz_category: string;
  source_table: string;
  trigger_action: string;
  enabled: number;
  description?: string;
}

export interface DimensionRuleConfig {
  rowid: string;
  rule_code: string;
  rule_name: string;
  event_code: string;
  biz_category: string;
  account_set_id?: string;
  priority: number;
  voucher_required: number;
  auto_voucher_write?: number;
  status: number;
  stop_after_match: number;
  description?: string;
}

export interface DimensionVoucherPreviewEntry {
  summary: string;
  subject: string;
  direction: 'DEBIT' | 'CREDIT';
  debit: number;
  credit: number;
  amount: number;
}

export interface DimensionRuleCondition {
  rowid: string;
  rule_id: string;
  sort_no: number;
  field_code: string;
  operator: string;
  value_source: 'CONST' | 'FIELD';
  compare_value?: string;
  compare_field?: string;
  description?: string;
}

export interface DimensionRuleResult {
  rowid: string;
  rule_id: string;
  sort_no: number;
  dim_category: 'FINANCIAL' | 'BIZ' | 'ANALYSIS';
  dim_code: string;
  value_type: 'CONST' | 'FIELD' | 'DICT' | 'FUNC';
  value_expr: string;
  amount_type: 'CONST' | 'FIELD' | 'FUNC' | 'NONE';
  amount_expr?: string;
  direction_type?: 'CONST' | 'FIELD' | 'FUNC';
  direction_expr?: string;
  currency_type?: 'CONST' | 'FIELD' | 'FUNC';
  currency_expr?: string;
  period_type?: 'CONST' | 'FIELD' | 'FUNC';
  period_expr?: string;
  required_flag: number;
  description?: string;
}

export interface DimensionDefinition {
  rowid: string;
  dim_category: 'FINANCIAL' | 'BIZ' | 'ANALYSIS';
  dim_code: string;
  dim_name: string;
  value_data_type: string;
  source_type: string;
  required_flag: number;
  status: number;
  description?: string;
}

export interface DimensionDictMap {
  rowid: string;
  map_code: string;
  source_value: string;
  target_value: string;
  target_name: string;
  status: number;
  description?: string;
}

export interface DimensionExceptionItem {
  rowid: string;
  event_code: string;
  biz_category: string;
  ref_id: string;
  biz_date: string;
  rule_code?: string;
  rule_name?: string;
  dimension_status: 'FAILED' | 'PENDING';
  error_message: string;
  voucher_status: 'NONE' | 'READY' | 'FAILED';
}

export interface DimensionRuleBundle {
  rule: DimensionRuleConfig;
  conditions: DimensionRuleCondition[];
  results: DimensionRuleResult[];
}

export interface DimensionRuleBundleSaveOptions {
  forceCreate?: boolean;
  omitAccountSetId?: boolean;
}

export interface DimensionRuleTemplate {
  row_id: string;
  template_code: string;
  template_name: string;
  template_category: string;
  event_code: string;
  biz_category: string;
  source_table?: string;
  source_pk_field?: string;
  biz_no_field?: string;
  biz_date_field?: string;
  priority: number;
  voucher_required: number;
  auto_voucher_write?: number;
  stop_after_match: number;
  status: number;
  description?: string;
}

export interface DimensionRuleTemplateSyncResult {
  synced: number;
  templateCodes: string[];
}

export interface DimensionBizCategoryOption {
  rowid: string;
  biz_category_code: string;
  biz_category_name: string;
  status: number;
  sort_no?: number;
  description?: string;
}

export interface DimensionBizCategorySaveOptions {
  forceCreate?: boolean;
}

export interface DimensionPreviewResult {
  matched: boolean;
  rule: DimensionRuleConfig | null;
  rule_name: string;
  details: Array<Record<string, any>>;
  payload: Record<string, any>;
}

const TEST_RULE_ID = 'RULE_TEST_SALE_SHIPMENT';
const DIMENSION_SET_FORM_KEY = '07D264520034366B1DA25CEE5358E502';
const DIMENSION_DETAIL_FORM_KEY = '07D264520034366B1DA25CEE5358E502';
const DIMENSION_SET_TABLE = 'Bil_Dimension_Set';
const DIMENSION_DETAIL_TABLE = 'Bil_Dimension_Detail';
const DIMENSION_DB = 'LMBill';
const DIMENSION_RULE_FORM_KEY = 'BA19AC51BD169B8E138E4E8B7001B50F';
const DIMENSION_RULE_TEMPLATE_FORM_KEY = '01B764065E2361CDD0B55EE4F9565FC4';
const DIMENSION_RULE_TABLE = 'Bil_Dimension_Rule';
const DIMENSION_RULE_CONDITION_TABLE = 'Bil_Dimension_Rule_Condition';
const DIMENSION_RULE_RESULT_TABLE = 'Bil_Dimension_Rule_Result';
const DIMENSION_BIZ_CATEGORY_TABLE = 'Bil_Dimension_Biz_Category';
const DIMENSION_DICT_ITEM_TABLE = 'Bil_Dimension_Dict_Item';
const DIMENSION_RULE_TEMPLATE_TABLE = 'Bil_Dimension_Rule_Template';
const DIMENSION_RULE_TEMPLATE_CONDITION_TABLE = 'Bil_Dimension_Rule_Template_Condition';
const DIMENSION_RULE_TEMPLATE_RESULT_TABLE = 'Bil_Dimension_Rule_Template_Result';
const DIMENSION_GLOBAL_ACCOUNT_SET_ID = 'GLOBAL';


const EVENTS: DimensionEventConfig[] = [
 ];

const RULES: DimensionRuleConfig[] = [
 ];

const CONDITIONS: DimensionRuleCondition[] = [
  ];

const RULE_RESULTS: DimensionRuleResult[] = [

];

const DEFINITIONS: DimensionDefinition[] = [

];

const DICT_MAPS: DimensionDictMap[] = [

];

const EXCEPTIONS: DimensionExceptionItem[] = [

];

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
function uid(prefix: string) { return String(prefix) + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }
function newRowId() { const seed = String(Date.now()) + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2); return seed.replace(/[^a-fA-F0-9]/g, '').toUpperCase().padEnd(32, '0').slice(0, 32); }
function pickNonEmptyText(...candidates: any[]) { for (const item of candidates) { const value = String(item ?? '').trim(); if (value) return value; } return ''; }
function normalizeSubjectNo(value: any) { return String(value ?? '').trim(); }
function toVoucherAmount(value: any) { const amount = Number(value ?? 0); return Number.isFinite(amount) ? amount : 0; }
function toMysqlDateTime(value: Date | string | number) { const date = value instanceof Date ? value : new Date(value); if (Number.isNaN(date.getTime())) { const now = new Date(); return now.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19); } const pad = (num: number) => String(num).padStart(2, '0'); return String(date.getFullYear()) + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()); }
function extractItemsAndTotal(raw: any) { const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data || {}; const items = Array.isArray(resultData?.Items) ? resultData.Items : []; const total = Number(resultData?.Count ?? items.length ?? 0); return { items, total }; }
function bitToNumber(value: any) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value ? 1 : 0;
  if (value instanceof Uint8Array) return Number(value[0] || 0) ? 1 : 0;
  if (Array.isArray(value?.data)) return Number(value.data[0] || 0) ? 1 : 0;
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['1', 'true', 'yes', '\u0001'].includes(normalized) ? 1 : 0;
}

function createDimensionRuleTable() { return createFinanceDataTable(DIMENSION_RULE_FORM_KEY, DIMENSION_RULE_TABLE, DIMENSION_DB, 'rowid'); }
function createDimensionRuleConditionTable() { return createFinanceDataTable(DIMENSION_RULE_FORM_KEY, DIMENSION_RULE_CONDITION_TABLE, DIMENSION_DB, 'rowid'); }
function createDimensionRuleResultTable() { return createFinanceDataTable(DIMENSION_RULE_FORM_KEY, DIMENSION_RULE_RESULT_TABLE, DIMENSION_DB, 'rowid'); }
function createDimensionBizCategoryTable() { return createFinanceDataTable(DIMENSION_RULE_FORM_KEY, DIMENSION_BIZ_CATEGORY_TABLE, DIMENSION_DB, 'rowid'); }
function createDimensionDictItemTable() { return createFinanceDataTable(DIMENSION_RULE_FORM_KEY, DIMENSION_DICT_ITEM_TABLE, DIMENSION_DB, 'row_id'); }
function createDimensionRuleTemplateTable() { return new DataTable(DIMENSION_RULE_TEMPLATE_FORM_KEY, DIMENSION_RULE_TEMPLATE_TABLE, DIMENSION_DB, 'row_id'); }
function createDimensionRuleTemplateConditionTable() { return new DataTable(DIMENSION_RULE_TEMPLATE_FORM_KEY, DIMENSION_RULE_TEMPLATE_CONDITION_TABLE, DIMENSION_DB, 'row_id'); }
function createDimensionRuleTemplateResultTable() { return new DataTable(DIMENSION_RULE_TEMPLATE_FORM_KEY, DIMENSION_RULE_TEMPLATE_RESULT_TABLE, DIMENSION_DB, 'row_id'); }
async function queryTableItems(table: any, page = 0, index = 1) { const queryParam = { Table: [table], PageParam: { page: page, index: index } }; const res = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' }); table.execQueryResult(res); return extractItemsAndTotal(res).items || []; }
function normalizeRuleRow(item: any): DimensionRuleConfig { return { ...item, rowid: String(item?.rowid || item?.row_id || '').trim(), priority: Number(item?.priority || 0), voucher_required: bitToNumber(item?.voucher_required), auto_voucher_write: bitToNumber(item?.auto_voucher_write), status: bitToNumber(item?.status), stop_after_match: bitToNumber(item?.stop_after_match) }; }
function normalizeConditionRow(item: any): DimensionRuleCondition { return { ...item, rowid: String(item?.rowid || item?.row_id || '').trim(), sort_no: Number(item?.sort_no || 0) }; }
function normalizeResultRow(item: any): DimensionRuleResult { return { ...item, rowid: String(item?.rowid || item?.row_id || '').trim(), sort_no: Number(item?.sort_no || 0), required_flag: bitToNumber(item?.required_flag) }; }
function normalizeTemplateRow(item: any): DimensionRuleTemplate { return { ...item, row_id: String(item?.row_id || item?.rowid || '').trim(), priority: Number(item?.priority || 0), voucher_required: bitToNumber(item?.voucher_required), auto_voucher_write: bitToNumber(item?.auto_voucher_write), stop_after_match: bitToNumber(item?.stop_after_match), status: bitToNumber(item?.status) }; }
function normalizeBizCategoryRow(item: any): DimensionBizCategoryOption { return { ...item, status: bitToNumber(item?.status), sort_no: Number(item?.sort_no || 0) }; }
function normalizeDimensionDefinitionRow(item: any): DimensionDefinition {
  const dimCategory = String(item?.parent_code || '').trim() as DimensionDefinition['dim_category'];
  const dimCode = String(item?.item_code || item?.item_value || '').trim();
  return {
    rowid: String(item?.row_id || item?.rowid || '').trim(),
    dim_category: dimCategory,
    dim_code: dimCode,
    dim_name: String(item?.item_name || dimCode).trim(),
    value_data_type: 'STRING',
    source_type: String(item?.description || '').trim() || 'DICT_ITEM',
    required_flag: 0,
    status: bitToNumber(item?.status),
    description: item?.description,
  };
}
function normalizeDimensionDictMapRow(item: any): DimensionDictMap {
  const itemCode = String(item?.item_code || '').trim();
  return {
    rowid: String(item?.row_id || item?.rowid || '').trim(),
    map_code: String(item?.dict_type_code || '').trim(),
    source_value: itemCode,
    target_value: String(item?.item_value || itemCode).trim(),
    target_name: String(item?.item_name || itemCode).trim(),
    status: bitToNumber(item?.status),
    description: item?.description,
  };
}
async function fetchDimensionDictItemsFromDb(dictTypeCode?: string, includeDisabled = false) {
  try {
    const table = createDimensionDictItemTable();
    const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
    const normalizedType = String(dictTypeCode || '').trim();
    if (normalizedType) filters.push(cond('dict_type_code', 'equal', normalizedType));
    if (!includeDisabled) filters.push(cond('status', 'equal', 1));
    table.Filter = and(...filters);
    return await queryTableItems(table, 0, 1);
  } catch (error) {
    return [];
  }
}
async function fetchDimensionDefinitionListFromDb(includeDisabled = false) {
  const items = await fetchDimensionDictItemsFromDb('DIM_CODE', includeDisabled);
  return items
    .map(normalizeDimensionDefinitionRow)
    .filter((item) => item.dim_category && item.dim_code && (includeDisabled || Number(item.status) === 1))
    .sort((a, b) => String(a.dim_category).localeCompare(String(b.dim_category)) || String(a.dim_code).localeCompare(String(b.dim_code)));
}
async function fetchDimensionDictMapListFromDb(includeDisabled = false) {
  const items = await fetchDimensionDictItemsFromDb('', includeDisabled);
  return items
    .map(normalizeDimensionDictMapRow)
    .filter((item) => item.map_code && item.source_value && (includeDisabled || Number(item.status) === 1));
}
function getDefaultBizCategoryOptions(): DimensionBizCategoryOption[] { return [
  { rowid: 'BIZ_CATEGORY_SALE', biz_category_code: 'SALE', biz_category_name: '销售', status: 1, sort_no: 1, description: '销售业务' },
  { rowid: 'BIZ_CATEGORY_COLLECTION', biz_category_code: 'COLLECTION', biz_category_name: '收款', status: 1, sort_no: 2, description: '收款业务' },
  { rowid: 'BIZ_CATEGORY_PURCHASE', biz_category_code: 'PURCHASE', biz_category_name: '采购', status: 1, sort_no: 3, description: '采购业务' },
  { rowid: 'BIZ_CATEGORY_INVENTORY', biz_category_code: 'INVENTORY', biz_category_name: '库存', status: 1, sort_no: 4, description: '库存业务' },
]; }
async function fetchBizCategoryListFromDb(includeDisabled = false) {
  try {
    const table = createDimensionBizCategoryTable();
    table.Filter = and(cond('lingma_sys_is_delete', 'notequal', 1));
    const items = await queryTableItems(table, 0, 1);
    const list = items
      .map(normalizeBizCategoryRow)
      .filter((item) => includeDisabled || Number(item.status) === 1)
      .sort((a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0));
    return list.length ? list : getDefaultBizCategoryOptions();
  } catch (error) {
    return getDefaultBizCategoryOptions();
  }
}
function createEmptyBizCategory(): DimensionBizCategoryOption {
  return {
    rowid: newRowId(),
    biz_category_code: '',
    biz_category_name: '',
    status: 1,
    sort_no: 1,
    description: '',
  };
}
async function saveBizCategoryToDb(item: DimensionBizCategoryOption, options: DimensionBizCategorySaveOptions = {}) {
  const rowid = String(item?.rowid || '').trim() || newRowId();
  const forceCreate = Boolean(options.forceCreate);
  const table = createDimensionBizCategoryTable();
  table.Filter = and(cond('rowid', 'equal', rowid));
  const existItems = await queryTableItems(table, 1, 1);
  const normalized = {
    ...item,
    rowid,
    biz_category_code: String(item?.biz_category_code || '').trim(),
    biz_category_name: String(item?.biz_category_name || '').trim(),
    sort_no: Number(item?.sort_no || 0),
    status: Number(item?.status || 0),
    description: String(item?.description || '').trim() || undefined,
  };
  const added = forceCreate || !existItems.length ? [{ ...normalized }] : [];
  const changed = !forceCreate && existItems.length ? [{ ...normalized }] : [];
  const saveReq = table.getSaveParam(added, changed, []);
  await requestClient.post(table.saveUrl, saveReq, { headers: table.getRequestHeader() });
  return rowid;
}
async function deleteBizCategoryFromDb(rowid: string) {
  const normalizedRowId = String(rowid || '').trim();
  if (!normalizedRowId) return;
  const table = createDimensionBizCategoryTable();
  table.Filter = and(cond('rowid', 'equal', normalizedRowId));
  const existItems = await queryTableItems(table, 1, 1);
  if (!existItems.length) return;
  const saveReq = table.getSaveParam([], [], existItems.map((item) => ({ rowid: item.rowid })));
  await requestClient.post(table.saveUrl, saveReq, { headers: table.getRequestHeader() });
}
function getDefaultTestRuleBundle(): DimensionRuleBundle { return { rule: clone(RULES.find((item) => item.rowid === TEST_RULE_ID)!), conditions: clone(CONDITIONS.filter((item) => item.rule_id === TEST_RULE_ID)), results: clone(RULE_RESULTS.filter((item) => item.rule_id === TEST_RULE_ID)) }; }
function createEmptyRuleBundle(): DimensionRuleBundle {
  const rowid = newRowId();
  return {
    rule: {
      rowid,
      rule_code: '',
      rule_name: '',
      event_code: '',
      biz_category: '',
      account_set_id: getStoredAccountSetId() || '',
      priority: 100,
      voucher_required: 1,
      auto_voucher_write: 0,
      status: 1,
      stop_after_match: 1,
      description: '',
    },
    conditions: [],
    results: [
      {
        rowid: '',
        rule_id: rowid,
        sort_no: 1,
        dim_category: 'FINANCIAL',
        dim_code: 'SUBJECT',
        value_type: 'FIELD',
        value_expr: 'subject_no',
        amount_type: 'FIELD',
        amount_expr: 'total_price',
        direction_type: 'CONST',
        direction_expr: 'DEBIT',
        currency_type: 'CONST',
        currency_expr: 'CNY',
        period_type: 'FUNC',
        period_expr: 'formatPeriod(out_time)',
        required_flag: 1,
        description: '默认财务维度-会计科目',
      },
      {
        rowid: '',
        rule_id: rowid,
        sort_no: 2,
        dim_category: 'FINANCIAL',
        dim_code: 'AMOUNT',
        value_type: 'FIELD',
        value_expr: 'total_price',
        amount_type: 'NONE',
        amount_expr: '',
        direction_type: 'CONST',
        direction_expr: 'DEBIT',
        currency_type: 'CONST',
        currency_expr: 'CNY',
        period_type: 'FUNC',
        period_expr: 'formatPeriod(out_time)',
        required_flag: 1,
        description: '默认财务维度-金额',
      },
      {
        rowid: '',
        rule_id: rowid,
        sort_no: 3,
        dim_category: 'BIZ',
        dim_code: 'CUSTOMER',
        value_type: 'FIELD',
        value_expr: 'customer_id',
        amount_type: 'NONE',
        amount_expr: '',
        direction_type: 'CONST',
        direction_expr: 'DEBIT',
        currency_type: 'CONST',
        currency_expr: 'CNY',
        period_type: 'FUNC',
        period_expr: 'formatPeriod(out_time)',
        required_flag: 1,
        description: '默认业务维度-客户',
      },
      {
        rowid: '',
        rule_id: rowid,
        sort_no: 4,
        dim_category: 'BIZ',
        dim_code: 'DEPT',
        value_type: 'FIELD',
        value_expr: 'sale_dept_id',
        amount_type: 'NONE',
        amount_expr: '',
        direction_type: 'CONST',
        direction_expr: 'DEBIT',
        currency_type: 'CONST',
        currency_expr: 'CNY',
        period_type: 'FUNC',
        period_expr: 'formatPeriod(out_time)',
        required_flag: 1,
        description: '默认业务维度-部门',
      },
      {
        rowid: '',
        rule_id: rowid,
        sort_no: 5,
        dim_category: 'ANALYSIS',
        dim_code: 'ORDER_NO',
        value_type: 'FIELD',
        value_expr: 'order_no',
        amount_type: 'NONE',
        amount_expr: '',
        direction_type: 'CONST',
        direction_expr: 'DEBIT',
        currency_type: 'CONST',
        currency_expr: 'CNY',
        period_type: 'FUNC',
        period_expr: 'formatPeriod(out_time)',
        required_flag: 1,
        description: '默认分析维度-订单号',
      },
    ],
  };
}

async function fetchRuleListFromDb() { /*await ensureDimensionRuleSeeded();*/ const table = createDimensionRuleTable();  const items = await queryTableItems(table, 0, 1); return items.map(normalizeRuleRow).sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0)); }
async function fetchConditionListFromDb(ruleId?: string) { /*await ensureDimensionRuleSeeded();*/ const table = createDimensionRuleConditionTable(); const filters: any[] = []; if (ruleId) filters.push(cond('rule_id', 'equal', ruleId)); table.Filter = and(...filters); const items = await queryTableItems(table, 0, 1); return items.map(normalizeConditionRow).sort((a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0)); }
async function fetchResultListFromDb(ruleId?: string) { /*await ensureDimensionRuleSeeded();*/ const table = createDimensionRuleResultTable(); const filters: any[] = []; if (ruleId) filters.push(cond('rule_id', 'equal', ruleId)); table.Filter = and(...filters); const items = await queryTableItems(table, 0, 1); return items.map(normalizeResultRow).sort((a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0)); }
async function getDimensionRuleBundleFromDb(ruleId: string) {
  const normalizedRuleId = String(ruleId || '').trim();
  if (!normalizedRuleId) return null;
  const [rules, conditions, results] = await Promise.all([
    fetchRuleListFromDb(),
    fetchConditionListFromDb(normalizedRuleId),
    fetchResultListFromDb(normalizedRuleId),
  ]);
  const rule = rules.find((item) => item.rowid === normalizedRuleId);
  if (!rule) return null;
  return { rule, conditions, results } as DimensionRuleBundle;
}

async function saveRuleBundleToDb(bundle: DimensionRuleBundle, options: DimensionRuleBundleSaveOptions = {}) {
  const ruleId = String(bundle?.rule?.rowid || '').trim() || newRowId();
  const forceCreate = Boolean(options.forceCreate);
  const ruleTable = createDimensionRuleTable();
  const conditionTable = createDimensionRuleConditionTable();
  const resultTable = createDimensionRuleResultTable();
  const shouldOmitAccountSetId = Boolean(options.omitAccountSetId);
  const resolvedAccountSetId = shouldOmitAccountSetId
    ? ''
    : String(
      bundle?.rule?.account_set_id || getStoredAccountSetId() || DIMENSION_GLOBAL_ACCOUNT_SET_ID,
    ).trim();

  ruleTable.Filter = and(cond('rowid', 'equal', ruleId));
  conditionTable.Filter = and(cond('rule_id', 'equal', ruleId));
  resultTable.Filter = and(cond('rule_id', 'equal', ruleId));

  const [ruleItems, conditionItems, resultItems] = await Promise.all([
    queryTableItems(ruleTable, 1, 1),
    queryTableItems(conditionTable, 0, 1),
    queryTableItems(resultTable, 0, 1),
  ]);

  const normalizedRule = {
    ...bundle.rule,
    rowid: ruleId,
    ...(shouldOmitAccountSetId ? {} : { account_set_id: resolvedAccountSetId }),
    voucher_required: Number(bundle.rule.voucher_required || 0),
    auto_voucher_write: Number(bundle.rule.auto_voucher_write || 0),
    status: Number(bundle.rule.status || 0),
    stop_after_match: Number(bundle.rule.stop_after_match || 0),
    priority: Number(bundle.rule.priority || 0),
  };

  const normalizedConditions = (bundle.conditions || []).map((item, index) => ({
    ...item,
    rowid: String(item.rowid || newRowId()).trim(),
    rule_id: ruleId,
    sort_no: index + 1,
    ...(shouldOmitAccountSetId ? {} : { account_set_id: resolvedAccountSetId }),
  }));

  const normalizedResults = (bundle.results || []).map((item, index) => ({
    ...item,
    rowid: String(item.rowid || newRowId()).trim(),
    rule_id: ruleId,
    sort_no: index + 1,
    required_flag: Number(item.required_flag || 0),
    ...(shouldOmitAccountSetId ? {} : { account_set_id: resolvedAccountSetId }),
  }));

  const ruleAdded = forceCreate || !ruleItems.length ? [{ ...normalizedRule }] : [];
  const ruleChanged = !forceCreate && ruleItems.length ? [{ ...normalizedRule }] : [];

  const currentConditionMap = new Map(conditionItems.map((item) => [String(item.rowid), item]));
  const conditionAdded = normalizedConditions
    .filter((item) => !currentConditionMap.has(String(item.rowid)))
    .map((item) => shouldOmitAccountSetId ? { ...item } : { ...item, account_set_id: resolvedAccountSetId });
  const conditionChanged = normalizedConditions
    .filter((item) => currentConditionMap.has(String(item.rowid)))
    .map((item) => shouldOmitAccountSetId ? { ...item } : { ...item, account_set_id: resolvedAccountSetId });
  const nextConditionIds = new Set(normalizedConditions.map((item) => String(item.rowid)));
  const conditionDeleted = conditionItems
    .filter((item) => !nextConditionIds.has(String(item.rowid)))
    .map((item) => ({ rowid: item.rowid }));

  const currentResultMap = new Map(resultItems.map((item) => [String(item.rowid), item]));
  const resultAdded = normalizedResults
    .filter((item) => !currentResultMap.has(String(item.rowid)))
    .map((item) => shouldOmitAccountSetId ? { ...item } : { ...item, account_set_id: resolvedAccountSetId });
  const resultChanged = normalizedResults
    .filter((item) => currentResultMap.has(String(item.rowid)))
    .map((item) => shouldOmitAccountSetId ? { ...item } : { ...item, account_set_id: resolvedAccountSetId });
  const nextResultIds = new Set(normalizedResults.map((item) => String(item.rowid)));
  const resultDeleted = resultItems
    .filter((item) => !nextResultIds.has(String(item.rowid)))
    .map((item) => ({ rowid: item.rowid }));

  const saveReq = [
    ...ruleTable.getSaveParam(ruleAdded, ruleChanged, []),
    ...conditionTable.getSaveParam(conditionAdded, conditionChanged, conditionDeleted),
    ...resultTable.getSaveParam(resultAdded, resultChanged, resultDeleted),
  ];

  await requestClient.post(ruleTable.saveUrl, saveReq, { headers: ruleTable.getRequestHeader() });
  return ruleId;
}

function newRowIdFromText(text: string) {
  let hash = 0x811c9dc5;
  const input = String(text || '');
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return (hex + newRowId()).slice(0, 32);
}

function buildRuleIdByTemplate(template: DimensionRuleTemplate, accountSetId?: string) {
  const accountSetPart = String(accountSetId || '').trim();
  return newRowIdFromText(
    ['DIM_RULE', String(template.event_code || '').trim(), accountSetPart]
      .filter(Boolean)
      .join(':'),
  );
}

async function fetchRuleTemplateRowsDirect(table: any) {
  const queryParam = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
  };
  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(res);
  return extractItemsAndTotal(res).items || [];
}

async function fetchRuleTemplateListFromDb() {
  const table = createDimensionRuleTemplateTable();
  table.Filter = and(cond('lingma_sys_is_delete', 'notequal', 1), cond('status', 'equal', 1));
  const items = await fetchRuleTemplateRowsDirect(table);
  return items.map(normalizeTemplateRow).sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));
}

async function fetchRuleTemplateConditionListFromDb(templateCode?: string) {
  const table = createDimensionRuleTemplateConditionTable();
  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  const normalizedCode = String(templateCode || '').trim();
  if (normalizedCode) filters.push(cond('template_code', 'equal', normalizedCode));
  table.Filter = and(...filters);
  const items = await fetchRuleTemplateRowsDirect(table);
  return items.map(normalizeConditionRow).sort((a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0));
}

async function fetchRuleTemplateResultListFromDb(templateCode?: string) {
  const table = createDimensionRuleTemplateResultTable();
  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  const normalizedCode = String(templateCode || '').trim();
  if (normalizedCode) filters.push(cond('template_code', 'equal', normalizedCode));
  table.Filter = and(...filters);
  const items = await fetchRuleTemplateRowsDirect(table);
  return items.map(normalizeResultRow).sort((a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0));
}



function buildRuleBundleFromTemplate(template: DimensionRuleTemplate, conditions: DimensionRuleCondition[], results: DimensionRuleResult[], accountSetId?: string): DimensionRuleBundle {
  const normalizedAccountSetId = String(accountSetId || '').trim();
  const ruleId = buildRuleIdByTemplate(template, normalizedAccountSetId);
  return {
    rule: {
      rowid: ruleId,
      rule_code: 'DIM_RULE_' + String(template.event_code || '').trim(),
      rule_name: String(template.template_name || '').replace('标准模板', '维度规则') || String(template.template_code || ''),
      event_code: String(template.event_code || '').trim(),
      biz_category: String(template.biz_category || '').trim(),
      ...(normalizedAccountSetId ? { account_set_id: normalizedAccountSetId } : {}),
      priority: Number(template.priority || 100),
      voucher_required: Number(template.voucher_required || 0),
      auto_voucher_write: Number(template.auto_voucher_write || 0),
      status: Number(template.status || 1),
      stop_after_match: Number(template.stop_after_match || 1),
      description: ['由模板同步', template.template_code, template.description].filter(Boolean).join('：'),
    },
    conditions: conditions.map((item, index) => ({
      ...item,
      rowid: newRowIdFromText(['DIM_RULE_COND', template.event_code, index + 1, normalizedAccountSetId].filter(Boolean).join(':')),
      rule_id: ruleId,
      sort_no: index + 1,
    })),
    results: results.map((item, index) => ({
      ...item,
      rowid: newRowIdFromText(['DIM_RULE_RESULT', template.event_code, index + 1, item.dim_category, item.dim_code, String(item.value_expr || ''), normalizedAccountSetId].filter(Boolean).join(':')),
      rule_id: ruleId,
      sort_no: index + 1,
      required_flag: Number(item.required_flag || 0),
    })),
  };
}

export async function getDimensionRuleTemplateList() {
  return fetchRuleTemplateListFromDb();
}

export async function syncDimensionRuleTemplates(templateCodes: string[] = []): Promise<DimensionRuleTemplateSyncResult> {
  // 同步模板生成通用规则，不写入账套字段，避免模板规则按账套重复生成。
  const accountSetId = '';
  const selectedCodes = new Set((templateCodes || []).map((item) => String(item || '').trim()).filter(Boolean));
  const templates = (await fetchRuleTemplateListFromDb()).filter((item) => !selectedCodes.size || selectedCodes.has(String(item.template_code || '').trim()));
  for (const template of templates) {
    const [conditions, results] = await Promise.all([
      fetchRuleTemplateConditionListFromDb(template.template_code),
      fetchRuleTemplateResultListFromDb(template.template_code),
    ]);
    await saveRuleBundleToDb(
      buildRuleBundleFromTemplate(template, conditions, results, accountSetId),
      { omitAccountSetId: true },
    );
  }
  return { synced: templates.length, templateCodes: templates.map((item) => item.template_code) };
}

export async function ensureDimensionRuleTemplateForEvent(eventCode: string) {
  const normalizedEventCode = String(eventCode || '').trim();
  if (!normalizedEventCode) return null;
  const templates = await fetchRuleTemplateListFromDb();
  const template = templates.find((item) => String(item.event_code || '').trim() === normalizedEventCode);
  if (!template) return null;
  await syncDimensionRuleTemplates([template.template_code]);
  return template;
}

export async function getEditableTestSaleShipmentRule() {
  const current = await getDimensionRuleBundleFromDb(TEST_RULE_ID);
  return current || getDefaultTestRuleBundle();
}
export async function saveEditableTestSaleShipmentRule(bundle: DimensionRuleBundle) {
  await saveRuleBundleToDb({ ...bundle, rule: { ...bundle.rule, rowid: TEST_RULE_ID } });
  return getEditableTestSaleShipmentRule();
}
export async function resetEditableTestSaleShipmentRule() {
  await saveRuleBundleToDb(getDefaultTestRuleBundle());
  return getEditableTestSaleShipmentRule();
}

export async function createDimensionRuleBundle() {
  return createEmptyRuleBundle();
}
export async function getDimensionRuleBundle(ruleId: string) {
  return getDimensionRuleBundleFromDb(ruleId);
}
export async function saveDimensionRuleBundle(bundle: DimensionRuleBundle, options: DimensionRuleBundleSaveOptions = {}) {
  const ruleId = await saveRuleBundleToDb(bundle, options);
  return getDimensionRuleBundleFromDb(ruleId);
}
function omitFieldDeep<T>(value: T, fieldName: string): T {
  if (Array.isArray(value)) return value.map((item) => omitFieldDeep(item, fieldName)) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.entries(value as Record<string, any>).reduce((result, [key, item]) => {
    if (key !== fieldName) result[key] = omitFieldDeep(item, fieldName);
    return result;
  }, {} as Record<string, any>) as T;
}

async function deleteDimensionRuleChildRow(tableFactory: () => any, rowid: string, options: { omitLingmaSysKey?: boolean } = {}) {
  const normalizedRowId = String(rowid || '').trim();
  if (!normalizedRowId) return;
  const table = tableFactory();
  table.Filter = and(cond('rowid', 'equal', normalizedRowId));
  const items = await queryTableItems(table, 1, 1);
  if (!items.length) return;
  const rawSaveReq = table.getSaveParam([], [], items.map((item) => ({ rowid: item.rowid })));
  const saveReq = options.omitLingmaSysKey ? omitFieldDeep(rawSaveReq, 'lingma_sys_key') : rawSaveReq;
  await requestClient.post(table.saveUrl, saveReq, { headers: table.getRequestHeader() });
}

export async function deleteDimensionRuleCondition(conditionId: string) {
  return deleteDimensionRuleChildRow(createDimensionRuleConditionTable, conditionId);
}

export async function deleteDimensionRuleResult(resultId: string) {
  return deleteDimensionRuleChildRow(createDimensionRuleResultTable, resultId, { omitLingmaSysKey: true });
}

export async function deleteDimensionRuleBundle(ruleId: string) {
  const normalizedRuleId = String(ruleId || '').trim();
  if (!normalizedRuleId) return;
  const ruleTable = createDimensionRuleTable();
  const conditionTable = createDimensionRuleConditionTable();
  const resultTable = createDimensionRuleResultTable();

  ruleTable.Filter = and(cond('rowid', 'equal', normalizedRuleId));
  conditionTable.Filter = and(cond('rule_id', 'equal', normalizedRuleId));
  resultTable.Filter = and(cond('rule_id', 'equal', normalizedRuleId));

  const [ruleItems, conditionItems, resultItems] = await Promise.all([
    queryTableItems(ruleTable, 0, 1),
    queryTableItems(conditionTable, 0, 1),
    queryTableItems(resultTable, 0, 1),
  ]);

  if (!ruleItems.length) return;

  const saveReq = [
    ...ruleTable.getSaveParam([], [], ruleItems.map((item) => ({ rowid: item.rowid }))),
    ...conditionTable.getSaveParam([], [], conditionItems.map((item) => ({ rowid: item.rowid }))),
    ...resultTable.getSaveParam([], [], resultItems.map((item) => ({ rowid: item.rowid }))),
  ];

  await requestClient.post(ruleTable.saveUrl, saveReq, { headers: ruleTable.getRequestHeader() });
}

export async function getDimensionEventList() { return clone(EVENTS); }
export async function createDimensionBizCategory() { return createEmptyBizCategory(); }
export async function getDimensionBizCategoryList(options: { includeDisabled?: boolean } = {}) { return fetchBizCategoryListFromDb(Boolean(options.includeDisabled)); }
export async function saveDimensionBizCategory(item: DimensionBizCategoryOption, options: DimensionBizCategorySaveOptions = {}) { const rowid = await saveBizCategoryToDb(item, options); const list = await fetchBizCategoryListFromDb(true); return list.find((current) => current.rowid === rowid) || null; }
export async function deleteDimensionBizCategory(rowid: string) { return deleteBizCategoryFromDb(rowid); }
export async function getDimensionRuleList() { return fetchRuleListFromDb(); }
export async function getDimensionRuleConditions(ruleId: string) { return fetchConditionListFromDb(ruleId); }
export async function getDimensionRuleResults(ruleId: string) { return fetchResultListFromDb(ruleId); }
export async function getDimensionDefinitionList() { const list = await fetchDimensionDefinitionListFromDb(); return list.length ? list : clone(DEFINITIONS); }
export async function getDimensionDictMapList() { const list = await fetchDimensionDictMapListFromDb(); return list.length ? list : clone(DICT_MAPS); }
export async function getDimensionExceptionList() { return clone(EXCEPTIONS); }

export interface DimensionResultQuery {
  keyword?: string;
  event_code?: string;
  biz_category?: string;
  dim_category?: 'FINANCIAL' | 'BIZ' | 'ANALYSIS' | '';
  dim_code?: string;
  value_keyword?: string;
  voucher_required?: 'ALL' | '1' | '0';
  voucher_status?: 'ALL' | 'BOUND' | 'UNBOUND';
}

export interface DimensionResultSetRow {
  rowid: string;
  event_code: string;
  biz_category: string;
  ref_id: string;
  biz_date: string;
  description?: string;
  is_voucher_required: number;
  voucher_no?: string | null;
  account_set_id?: string;
}

export interface DimensionResultDetailRow {
  rowid: string;
  set_id: string;
  dim_category: 'FINANCIAL' | 'BIZ' | 'ANALYSIS';
  dim_code: string;
  value_code: string;
  amount?: number | null;
  direction?: string | null;
  currency?: string | null;
  period?: string | null;
  account_set_id?: string;
  description?: string;
}

export interface DimensionResultLedgerRow extends DimensionResultSetRow {
  details: DimensionResultDetailRow[];
  detail_count: number;
  financial_dimension_count: number;
  biz_dimension_count: number;
  analysis_dimension_count: number;
  analysis_summary: string;
}

export interface DimensionResultAnalysisItem {
  key: string;
  label: string;
  count: number;
  amount: number;
}

export interface DimensionResultDashboard {
  records: DimensionResultLedgerRow[];
  event_stats: DimensionResultAnalysisItem[];
  biz_category_stats: DimensionResultAnalysisItem[];
  analysis_dimension_stats: DimensionResultAnalysisItem[];
}

function normalizeDimensionResultSetRow(item: any): DimensionResultSetRow {
  return {
    ...item,
    is_voucher_required: bitToNumber(item?.is_voucher_required),
    voucher_no: item?.voucher_no == null ? '' : String(item.voucher_no),
    biz_date: String(item?.biz_date || ''),
  };
}

function normalizeDimensionResultDetailRow(item: any): DimensionResultDetailRow {
  return {
    ...item,
    dim_category: String(item?.dim_category || '') as any,
    value_code: String(item?.value_code || ''),
    amount: item?.amount == null || item?.amount === '' ? null : Number(item.amount),
    direction: item?.direction == null ? '' : String(item.direction),
    currency: item?.currency == null ? '' : String(item.currency),
    period: item?.period == null ? '' : String(item.period),
  };
}

function buildFilter(filters: any[]) {
  const effective = filters.filter(Boolean);
  if (!effective.length) return undefined;
  if (effective.length === 1) return effective[0];
  return and(...effective);
}

function createDimensionSetTable() {
  return createFinanceDataTable(DIMENSION_SET_FORM_KEY, DIMENSION_SET_TABLE, DIMENSION_DB, 'rowid');
}

function createDimensionDetailTable() {
  return createFinanceDataTable(DIMENSION_DETAIL_FORM_KEY, DIMENSION_DETAIL_TABLE, DIMENSION_DB, 'rowid');
}

async function fetchDimensionSetListFromDb() {
  const table = createDimensionSetTable();
  table.Filter = buildFilter([cond('lingma_sys_is_delete', 'notequal', 1)]);
  const items = await queryTableItems(table, 0, 1);
  return items
    .map(normalizeDimensionResultSetRow)
    .sort((a, b) => String(b.biz_date || '').localeCompare(String(a.biz_date || '')));
}

async function fetchDimensionDetailListFromDb() {
  const table = createDimensionDetailTable();
  table.Filter = buildFilter([cond('lingma_sys_is_delete', 'notequal', 1)]);
  const items = await queryTableItems(table, 0, 1);
  return items.map(normalizeDimensionResultDetailRow);
}

function summarizeAnalysisDimensions(details: DimensionResultDetailRow[]) {
  return details
    .filter((item) => String(item.dim_category || '') === 'ANALYSIS')
    .slice(0, 3)
    .map((item) =>
      `${getDimCodeLabel(item.dim_code)}：${item.value_code || '-'}`,
    )
    .join('；');
}

function aggregateDimensionResult(items: Array<{ key: string; label: string; amount?: number | null }>) {
  const map = new Map<string, DimensionResultAnalysisItem>();
  for (const item of items) {
    const key = String(item.key || '').trim();
    if (!key) continue;
    const current = map.get(key) || {
      key,
      label: String(item.label || key),
      count: 0,
      amount: 0,
    };
    current.count += 1;
    current.amount += Number(item.amount || 0);
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.amount - a.amount;
  });
}

function matchesDimensionResultQuery(record: DimensionResultLedgerRow, query: DimensionResultQuery = {}) {
  const keyword = String(query.keyword || '').trim();
  const eventCode = String(query.event_code || '').trim();
  const bizCategory = String(query.biz_category || '').trim();
  const dimCategory = String(query.dim_category || '').trim();
  const dimCode = String(query.dim_code || '').trim().toLowerCase();
  const valueKeyword = String(query.value_keyword || '').trim().toLowerCase();
  const voucherRequired = String(query.voucher_required || 'ALL').trim();
  const voucherStatus = String(query.voucher_status || 'ALL').trim();

  const matchesKeyword = !keyword || [
    record.ref_id,
    record.event_code,
    record.biz_category,
    record.description,
    record.voucher_no,
    ...record.details.flatMap((item) => [item.dim_code, item.value_code, item.description]),
  ].filter(Boolean).some((value) => String(value).includes(keyword));

  const matchesEventCode = !eventCode || record.event_code === eventCode;
  const matchesBizCategory = !bizCategory || record.biz_category === bizCategory;
  const matchesVoucherRequired = voucherRequired === 'ALL' || String(record.is_voucher_required) === voucherRequired;
  const hasVoucher = Boolean(String(record.voucher_no || '').trim());
  const matchesVoucherStatus = voucherStatus === 'ALL'
    || (voucherStatus === 'BOUND' && hasVoucher)
    || (voucherStatus === 'UNBOUND' && !hasVoucher);

  const matchesDetail = !dimCategory && !dimCode && !valueKeyword
    ? true
    : record.details.some((item) => {
      const categoryOk = !dimCategory || String(item.dim_category || '') === dimCategory;
      const codeOk = !dimCode || String(item.dim_code || '').toLowerCase().includes(dimCode);
      const valueOk = !valueKeyword || [item.value_code, item.description, getDimCodeLabel(item.dim_code)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(valueKeyword));
      return categoryOk && codeOk && valueOk;
    });

  return matchesKeyword && matchesEventCode && matchesBizCategory && matchesVoucherRequired && matchesVoucherStatus && matchesDetail;
}

export async function getDimensionResultDashboard(query: DimensionResultQuery = {}): Promise<DimensionResultDashboard> {
  const [sets, details] = await Promise.all([
    fetchDimensionSetListFromDb(),
    fetchDimensionDetailListFromDb(),
  ]);

  const detailMap = new Map<string, DimensionResultDetailRow[]>();
  for (const detail of details) {
    const setId = String(detail.set_id || '').trim();
    if (!setId) continue;
    const list = detailMap.get(setId) || [];
    list.push(detail);
    detailMap.set(setId, list);
  }

  const records = sets.map((setItem) => {
    const childRows = (detailMap.get(String(setItem.rowid || '').trim()) || []).sort((a, b) => {
      const left = `${a.dim_category || ''}-${a.dim_code || ''}-${a.value_code || ''}`;
      const right = `${b.dim_category || ''}-${b.dim_code || ''}-${b.value_code || ''}`;
      return left.localeCompare(right);
    });
    return {
      ...setItem,
      details: childRows,
      detail_count: childRows.length,
      financial_dimension_count: childRows.filter((item) => item.dim_category === 'FINANCIAL').length,
      biz_dimension_count: childRows.filter((item) => item.dim_category === 'BIZ').length,
      analysis_dimension_count: childRows.filter((item) => item.dim_category === 'ANALYSIS').length,
      analysis_summary: summarizeAnalysisDimensions(childRows),
    } as DimensionResultLedgerRow;
  }).filter((item) => matchesDimensionResultQuery(item, query));

  const eventStats = aggregateDimensionResult(
    records.map((item) => ({
      key: item.event_code,
      label: item.event_code,
      amount: item.details.reduce((sum, detail) => sum + Number(detail.amount || 0), 0),
    })),
  );

  const bizCategoryStats = aggregateDimensionResult(
    records.map((item) => ({
      key: item.biz_category,
      label: item.biz_category,
      amount: item.details.reduce((sum, detail) => sum + Number(detail.amount || 0), 0),
    })),
  );

  const analysisDimensionStats = aggregateDimensionResult(
    records.flatMap((item) => item.details
      .filter((detail) => detail.dim_category === 'ANALYSIS')
      .map((detail) => ({
        key: `${detail.dim_code}::${detail.value_code}`,
        label: `${getDimCodeLabel(detail.dim_code)} / ${detail.value_code || '-'}`,
        amount: detail.amount,
      }))),
  );

  return {
    records,
    event_stats: eventStats.slice(0, 10),
    biz_category_stats: bizCategoryStats.slice(0, 10),
    analysis_dimension_stats: analysisDimensionStats.slice(0, 20),
  };
}


type ArithmeticToken = { type: 'number' | 'field' | 'operator' | 'leftParen' | 'rightParen'; value: string };

function readFieldValue(data: Record<string, any>, fieldPath: string) { return String(fieldPath || '').split('.').filter(Boolean).reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), data); }
function formatPeriod(value: any) { const date = value ? new Date(value) : new Date(); if (Number.isNaN(date.getTime())) return ''; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function normalizeArithmeticExpression(expr: string) { return String(expr || '').replace(/[xX×]/g, '*').replace(/÷/g, '/').replace(/（/g, '(').replace(/）/g, ')'); }
function tokenizeArithmeticExpression(expr: string): ArithmeticToken[] | null {
  const normalized = normalizeArithmeticExpression(expr);
  const tokens: ArithmeticToken[] = [];
  let index = 0;
  while (index < normalized.length) {
    const char = normalized[index];
    if (/\s/.test(char)) { index += 1; continue; }
    if (/[0-9.]/.test(char)) {
      let end = index + 1;
      let dotCount = char === '.' ? 1 : 0;
      while (end < normalized.length && /[0-9.]/.test(normalized[end])) {
        if (normalized[end] === '.') dotCount += 1;
        if (dotCount > 1) return null;
        end += 1;
      }
      const value = normalized.slice(index, end);
      if (!Number.isFinite(Number(value))) return null;
      tokens.push({ type: 'number', value });
      index = end;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let end = index + 1;
      while (end < normalized.length && /[A-Za-z0-9_.]/.test(normalized[end])) end += 1;
      tokens.push({ type: 'field', value: normalized.slice(index, end) });
      index = end;
      continue;
    }
    if ('+-*/'.includes(char)) {
      tokens.push({ type: 'operator', value: char });
      index += 1;
      continue;
    }
    if (char === '(') { tokens.push({ type: 'leftParen', value: char }); index += 1; continue; }
    if (char === ')') { tokens.push({ type: 'rightParen', value: char }); index += 1; continue; }
    return null;
  }
  return tokens.length ? tokens : null;
}
function getArithmeticOperatorPrecedence(operator: string) { switch (operator) { case 'u+': case 'u-': return 3; case '*': case '/': return 2; case '+': case '-': return 1; default: return 0; } }
function isRightAssociativeArithmeticOperator(operator: string) { return operator === 'u+' || operator === 'u-'; }
function toArithmeticRpn(tokens: ArithmeticToken[]) {
  const output: ArithmeticToken[] = [];
  const stack: ArithmeticToken[] = [];
  let previous: ArithmeticToken | null = null;
  for (const token of tokens) {
    if (token.type === 'number' || token.type === 'field') {
      output.push(token);
      previous = token;
      continue;
    }
    if (token.type === 'operator') {
      let operator = token.value;
      if ((operator === '+' || operator === '-') && (!previous || previous.type === 'operator' || previous.type === 'leftParen')) {
        operator = operator === '+' ? 'u+' : 'u-';
      }
      const currentToken: ArithmeticToken = { type: 'operator', value: operator };
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type !== 'operator') break;
        const shouldPop = isRightAssociativeArithmeticOperator(operator)
          ? getArithmeticOperatorPrecedence(operator) < getArithmeticOperatorPrecedence(top.value)
          : getArithmeticOperatorPrecedence(operator) <= getArithmeticOperatorPrecedence(top.value);
        if (!shouldPop) break;
        output.push(stack.pop()!);
      }
      stack.push(currentToken);
      previous = currentToken;
      continue;
    }
    if (token.type === 'leftParen') {
      stack.push(token);
      previous = token;
      continue;
    }
    if (token.type === 'rightParen') {
      let matched = false;
      while (stack.length) {
        const top = stack.pop()!;
        if (top.type === 'leftParen') {
          matched = true;
          break;
        }
        output.push(top);
      }
      if (!matched) return null;
      previous = token;
    }
  }
  while (stack.length) {
    const top = stack.pop()!;
    if (top.type === 'leftParen' || top.type === 'rightParen') return null;
    output.push(top);
  }
  return output;
}
function evaluateArithmeticExpression(expr: string, data: Record<string, any>) {
  const tokens = tokenizeArithmeticExpression(expr);
  if (!tokens) return null;
  const rpn = toArithmeticRpn(tokens);
  if (!rpn?.length) return null;
  const stack: number[] = [];
  for (const token of rpn) {
    if (token.type === 'number') {
      const value = Number(token.value);
      if (!Number.isFinite(value)) return null;
      stack.push(value);
      continue;
    }
    if (token.type === 'field') {
      const rawValue = readFieldValue(data, token.value);
      const numericValue = Number(rawValue ?? 0);
      if (!Number.isFinite(numericValue)) return null;
      stack.push(numericValue);
      continue;
    }
    if (token.type === 'operator') {
      if (token.value === 'u+' || token.value === 'u-') {
        if (stack.length < 1) return null;
        const value = stack.pop()!;
        stack.push(token.value === 'u-' ? -value : value);
        continue;
      }
      if (stack.length < 2) return null;
      const right = stack.pop()!;
      const left = stack.pop()!;
      switch (token.value) {
        case '+': stack.push(left + right); break;
        case '-': stack.push(left - right); break;
        case '*': stack.push(left * right); break;
        case '/': if (right === 0) return null; stack.push(left / right); break;
        default: return null;
      }
    }
  }
  if (stack.length !== 1 || !Number.isFinite(stack[0])) return null;
  return stack[0];
}
function resolveFieldOrArithmeticValue(expr: string, data: Record<string, any>) {
  const normalizedExpr = String(expr || '').trim();
  if (!normalizedExpr) return '';
  const directValue = readFieldValue(data, normalizedExpr);
  if (directValue !== undefined) return directValue;
  const arithmeticValue = evaluateArithmeticExpression(normalizedExpr, data);
  return arithmeticValue ?? '';
}
function collectMissingArithmeticFields(expr: string, data: Record<string, any>) {
  const tokens = tokenizeArithmeticExpression(expr) || [];
  return Array.from(new Set(tokens
    .filter((token) => token.type === 'field')
    .map((token) => token.value)
    .filter((field) => readFieldValue(data, field) === undefined || readFieldValue(data, field) === null || String(readFieldValue(data, field)).trim() === '')));
}
function resolveFinancialAmountValue(type: string | undefined, expr: string | undefined, data: Record<string, any>, dictMaps: DimensionDictMap[] = DICT_MAPS) {
  if (!type || type === 'NONE') return { amount: 0, verifyMessage: '' };
  const normalizedExpr = String(expr || '').trim();
  if (!normalizedExpr) return { amount: 0, verifyMessage: '核验：财务金额表达式为空，已按 0 处理' };
  if (type === 'CONST') {
    const amount = Number(normalizedExpr || 0);
    return { amount: Number.isFinite(amount) ? amount : 0, verifyMessage: Number.isFinite(amount) ? '' : '核验：财务金额常量无效，已按 0 处理' };
  }
  if (type === 'FIELD' || type === 'FUNC') {
    const directValue = readFieldValue(data, normalizedExpr);
    const missingFields = directValue === undefined ? collectMissingArithmeticFields(normalizedExpr, data) : [];
    const rawValue = directValue !== undefined ? directValue : evaluateArithmeticExpression(normalizedExpr, data);
    const amount = Number(rawValue ?? 0);
    const verifyMessage = missingFields.length
      ? '核验：缺少财务字段 ' + missingFields.join('、') + '，已按 0 处理'
      : (!Number.isFinite(amount) ? '核验：财务金额字段 ' + normalizedExpr + ' 无法转换为数字，已按 0 处理' : '');
    return { amount: Number.isFinite(amount) ? amount : 0, verifyMessage };
  }
  const value = resolveValueByType(type as DimensionRuleResult['value_type'], normalizedExpr, data, dictMaps);
  const amount = Number(value ?? 0);
  return { amount: Number.isFinite(amount) ? amount : 0, verifyMessage: Number.isFinite(amount) ? '' : '核验：财务金额取值无效，已按 0 处理' };
}
function resolveValueByType(valueType: DimensionRuleResult['value_type'], valueExpr: string, data: Record<string, any>, dictMaps: DimensionDictMap[] = DICT_MAPS) {
  if (valueType === 'CONST') return valueExpr;
  if (valueType === 'FIELD') return resolveFieldOrArithmeticValue(valueExpr, data);
  if (valueType === 'DICT') { const [mapCode, fieldCode] = String(valueExpr || '').split(':'); const sourceValue = String(readFieldValue(data, fieldCode || '') ?? ''); const mapped = dictMaps.find((item) => item.map_code === mapCode && String(item.source_value) === sourceValue && Number(item.status) === 1); return mapped?.target_value || ''; }
  if (valueType === 'FUNC' && /^formatPeriod\((.+)\)$/.test(valueExpr)) { const fieldCode = valueExpr.replace(/^formatPeriod\((.+)\)$/, '$1').trim(); return formatPeriod(readFieldValue(data, fieldCode)); }
  if (valueType === 'FUNC') return resolveFieldOrArithmeticValue(valueExpr, data);
  return '';
}
function resolveOptionalValue(type: string | undefined, expr: string | undefined, data: Record<string, any>, dictMaps: DimensionDictMap[] = DICT_MAPS) { if (!type || !expr || type === 'NONE') return undefined; return resolveValueByType(type as DimensionRuleResult['value_type'], expr, data, dictMaps); }
function matchCondition(item: DimensionRuleCondition, data: Record<string, any>) { const left = readFieldValue(data, item.field_code); const right = item.value_source === 'FIELD' ? readFieldValue(data, item.compare_field || '') : item.compare_value; switch (item.operator) { case 'equal': return String(left ?? '') === String(right ?? ''); case 'notnull': return !(left === undefined || left === null || String(left).trim() === ''); case 'contains': return String(left ?? '').includes(String(right ?? '')); default: return false; } }

export function getDimCategoryLabel(value?: string) { const map: Record<string, string> = { FINANCIAL: '财务维度', BIZ: '业务维度', ANALYSIS: '分析维度' }; return map[String(value || '')] || String(value || '-'); }
export function getDimCodeLabel(value?: string) { const map: Record<string, string> = { SUBJECT: '会计科目', CUSTOMER: '客户', DEPT: '部门', CHANNEL: '销售渠道', CUSTOMER_LEVEL: '客户等级', INCOME_TYPE: '收入类型', ORDER_NO: '订单号', AMOUNT: '销售金额', BIZ_NO: '业务单号', BIZ_TO_FINANCE: '业财映射' }; return map[String(value || '')] || String(value || '-'); }
export function getDirectionLabel(value?: string) { const map: Record<string, string> = { INFLOW: '借方', OUTFLOW: '贷方', DEBIT: '借方', CREDIT: '贷方' }; return map[String(value || '')] || String(value || '-'); }

//
export function buildSaleShipmentPreviewPayload(saleOut: ErpSaleOutApi.SaleOut | Record<string, any>) {
  const record = (saleOut || {}) as Record<string, any>;
  const rawItems = Array.isArray(record.items) ? record.items : [];
  const items = rawItems.map((item: any) => ({
    ...item,
    count: Number(item?.count || 0),
    total_price: Number(item?.total_price || 0),
    total_product_price: Number(item?.total_product_price || 0),
    tax_price: Number(item?.tax_price || 0),
  }));

  const directTotal = Number(record.total_price || 0);
  const mergedTotal = Number(record.total_product_price || 0)
    + Number(record.total_tax_price || 0)
    - Number(record.discount_price || 0)
    + Number(record.other_price || 0);
  const itemTotal = items.reduce((sum: number, item: any) => {
    const total = Number(item?.total_price || 0);
    if (Number.isFinite(total) && total > 0) return sum + total;
    return sum + Number(item?.total_product_price || 0) + Number(item?.tax_price || 0);
  }, 0);

  const totalPrice =
    (Number.isFinite(directTotal) && directTotal > 0 ? directTotal : 0)
    || (Number.isFinite(mergedTotal) && mergedTotal > 0 ? mergedTotal : 0)
    || (Number.isFinite(itemTotal) ? itemTotal : 0);

  const totalCount = Number(record.total_count || 0)
    || items.reduce((sum: number, item: any) => sum + Number(item?.count || 0), 0);

  return {
    ...record,
    id: record.id || record.rowid || '',
    rowid: record.rowid || record.id || '',
    no: record.no || '',
    customer_id: record.customer_id || '',
    customer_type: record.customer_type || '',
    customer_level: record.customer_level || '',
    sale_user_id: record.sale_user_id || '',
    sale_dept_id: record.sale_dept_id || record.dept_id || record.sale_dept || '',
    sale_org: record.sale_org || record.org_name || record.sale_org_name || '',
    channel: record.channel || record.sale_channel || '',
    order_id: record.order_id || '',
    order_no: record.order_no || '',
    out_time: record.out_time || record.update_time || record.create_time || '',
    total_count: totalCount,
    total_price: totalPrice,
    status: Number(record.status || 0),
    items,
  };
}

export function buildPurchaseInPreviewPayload(purchaseIn: Record<string, any>) {
  const record = (purchaseIn || {}) as Record<string, any>;
  const rawItems = Array.isArray(record.items) ? record.items : [];
  const items = rawItems.map((item: any) => ({
    ...item,
    count: Number(item?.count || 0),
    total_price: Number(item?.total_price || 0),
    total_product_price: Number(item?.total_product_price || 0),
    tax_price: Number(item?.tax_price || 0),
  }));

  const directTotal = Number(record.total_price || 0);
  const mergedTotal = Number(record.total_product_price || 0)
    + Number(record.tax_price || record.total_tax_price || 0)
    - Number(record.discount_price || 0)
    + Number(record.other_price || 0);
  const itemTotal = items.reduce((sum: number, item: any) => {
    const total = Number(item?.total_price || 0);
    if (Number.isFinite(total) && total > 0) return sum + total;
    return sum + Number(item?.total_product_price || 0) + Number(item?.tax_price || 0);
  }, 0);

  const totalPrice =
    (Number.isFinite(directTotal) && directTotal > 0 ? directTotal : 0)
    || (Number.isFinite(mergedTotal) && mergedTotal > 0 ? mergedTotal : 0)
    || (Number.isFinite(itemTotal) ? itemTotal : 0);

  const totalCount = Number(record.total_count || 0)
    || items.reduce((sum: number, item: any) => sum + Number(item?.count || 0), 0);

  return {
    ...record,
    id: record.id || record.rowid || '',
    rowid: record.rowid || record.id || '',
    no: record.no || '',
    supplier_id: record.supplier_id || '',
    buyer_id: record.buyer_id || record.purchase_user_id || record.createuser || '',
    dept_id: record.dept_id || record.purchase_dept_id || '',
    order_id: record.order_id || '',
    order_no: record.order_no || '',
    in_time: record.in_time || record.update_time || record.create_time || '',
    total_count: totalCount,
    total_price: totalPrice,
    status: Number(record.status || 0),
    items,
  };
}

export async function previewSaleOutDimensionRule(saleOut: ErpSaleOutApi.SaleOut | Record<string, any>) {
  return previewRuleExecution('SALE_SHIPMENT', buildSaleShipmentPreviewPayload(saleOut));
}

export async function previewPurchaseInDimensionRule(purchaseIn: Record<string, any>) {
  return previewRuleExecution('PURCHASE_IN', buildPurchaseInPreviewPayload(purchaseIn));
}

async function updateDimensionSetVoucherNo(setId: string, voucherNo: string) {
  const normalizedSetId = String(setId || '').trim();
  const normalizedVoucherNo = String(voucherNo || '').trim();
  if (!normalizedSetId || !normalizedVoucherNo) return;
  const table = createFinanceDataTable(DIMENSION_SET_FORM_KEY, DIMENSION_SET_TABLE, DIMENSION_DB, 'rowid');
  const saveReq = table.getSaveParam([], [{ rowid: normalizedSetId, voucher_no: normalizedVoucherNo }], []);
  await requestClient.post(table.saveUrl, saveReq, { headers: table.getRequestHeader() });
}

async function findVoucherByBusiness(businessUrl: string, businessCode: string) {
  const normalizedCode = String(businessCode || '').trim();
  const normalizedUrl = String(businessUrl || '').trim();
  if (!normalizedCode || !normalizedUrl) return null;
  const res = await getVoucherPage({ pageNo: 1, page: 0, keyword: normalizedCode } as any);
  const list = Array.isArray(res?.list) ? res.list : [];
  return list.find((item: any) => String(item?.business_code || '').trim() === normalizedCode && String(item?.business_url || '').trim() === normalizedUrl) || null;
}

async function ensureVoucherByRulePreview(options: {
  eventCode: string;
  setId: string;
  payload: Record<string, any>;
  preview: DimensionPreviewResult;
}) {
  const eventCode = String(options?.eventCode || '').trim();
  const setId = String(options?.setId || '').trim();
  const payload = options?.payload || {};
  const preview = options?.preview;
  if (!preview?.matched || !preview?.rule || Number(preview.rule.auto_voucher_write || 0) !== 1) {
    return null;
  }

  const voucherEntries = buildVoucherEntriesFromPreview(preview, preview.rule.rule_name || preview.rule.rule_code);
  if (!voucherEntries.length) return null;

  const businessUrlMap: Record<string, string> = {
    SALE_SHIPMENT: 'erp/sale/out',
    SALE_RETURN: 'erp/sale/return',
    COLLECTION_SUBMIT_CONFIRM: 'erp/finance/revenue/submit',
    PURCHASE_IN: 'erp/purchase/in',
  };
  const businessNameMap: Record<string, string> = {
    SALE_SHIPMENT: '销售出库',
    SALE_RETURN: '销售退货',
    COLLECTION_SUBMIT_CONFIRM: '收款确认',
    PURCHASE_IN: '采购入库',
  };
  const businessUrl = businessUrlMap[eventCode] || `erp/finance/dimension/${eventCode.toLowerCase()}`;
  const businessCode = pickNonEmptyText(payload.no, payload.ReportID, payload.id, payload.rowid, setId);

  const existedVoucher = await findVoucherByBusiness(businessUrl, businessCode);
  if (existedVoucher?.voucher_code) {
    await updateDimensionSetVoucherNo(setId, String(existedVoucher.voucher_code));
    return existedVoucher;
  }

  const subjectRes = await getAllSubjectList({ subject_state: 1, pageNo: 1, page: 0 } as any);
  const subjectList = Array.isArray(subjectRes?.list) ? subjectRes.list : [];
  const subjectNameMap = new Map(subjectList.map((item: any) => [normalizeSubjectNo(item?.subject_number), String(item?.subject_name || '').trim()]));

  const voucherDateSource = pickNonEmptyText(payload.out_time, payload.in_time, payload.return_time, payload.collection_date, payload.biz_date, new Date().toISOString());
  const voucherDate = toMysqlDateTime(voucherDateSource);
  const voucherCode = await getNextVoucherCodeByDate(voucherDate, '记');
  const totalAmount = voucherEntries.reduce((sum, item) => sum + Math.max(toVoucherAmount(item.debit), toVoucherAmount(item.credit)), 0);
  const summary = `${businessNameMap[eventCode] || eventCode} ${businessCode} 命中规则 ${preview.rule.rule_code || preview.rule.rule_name}`;

  const created = await createVoucher(
    {
      business_url: businessUrl,
      business_code: businessCode,
      business_name: businessNameMap[eventCode] || eventCode,
      voucher_type: pickNonEmptyText(preview.rule.rule_name, '自动凭证'),
      voucher_date: voucherDate,
      voucher_code: voucherCode,
      debit_amount: totalAmount,
      credit_amount: totalAmount,
      description: summary,
      is_posted: 0,
      is_reversed: 0,
      operator: pickNonEmptyText(payload.user_name, payload.createuser, payload.updateuser, 'system'),
      account_set_id: getStoredAccountSetId() || preview.rule.account_set_id || undefined,
    },
    voucherEntries.map((item, index) => ({
      abstract_content: String(item.summary || summary).trim(),
      account_code: normalizeSubjectNo(item.subject),
      account_name: subjectNameMap.get(normalizeSubjectNo(item.subject)) || normalizeSubjectNo(item.subject),
      debit_amount: toVoucherAmount(item.debit),
      credit_amount: toVoucherAmount(item.credit),
      sort_no: index + 1,
      account_set_id: getStoredAccountSetId() || preview?.rule?.account_set_id || undefined,
    })),
  );

  await updateDimensionSetVoucherNo(setId, voucherCode);
  return { ...(created as any), voucher_code: voucherCode };
}

async function findDimensionSetByRefId(refId: string) {
  const table = createFinanceDataTable(DIMENSION_SET_FORM_KEY, DIMENSION_SET_TABLE, DIMENSION_DB, 'rowid');
  table.Filter = cond('ref_id', 'equal', refId);
  const queryParam = { Table: [table], PageParam: { page: 1, index: 1 } };
  const res = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(res);
  return (res.data?.Result?.data?.Items || [])[0] || null;
}


export interface SaveDimensionResultOptions {
  allowOverwrite?: boolean;
  bizDateField?: string;
  refIdField?: string;
  /** 审批按钮专用：未命中启用规则时跳过维度写入，不阻断业务审批 */
  skipWhenNoRule?: boolean;
}

export interface SaveDimensionResultRequest {
  eventCode: string;
  payload: Record<string, any>;
  preview?: DimensionPreviewResult | null;
  options?: SaveDimensionResultOptions;
}

function pickDimensionRefId(payload: Record<string, any>, options: SaveDimensionResultOptions = {}) {
  const field = String(options.refIdField || '').trim();
  if (field) return String(readFieldValue(payload, field) ?? '').trim();
  return pickNonEmptyText(payload.id, payload.rowid, payload.ReportID, payload.ref_id, payload.no);
}

function pickDimensionBizDate(payload: Record<string, any>, options: SaveDimensionResultOptions = {}) {
  const field = String(options.bizDateField || '').trim();
  if (field) return readFieldValue(payload, field) || new Date();
  return pickNonEmptyText(payload.biz_date, payload.order_time, payload.out_time, payload.in_time, payload.receipt_time, payload.payment_time, payload.registration_date, payload.issue_date, payload.salary_day, payload.salary_month, payload.createtime, payload.create_time, new Date().toISOString());
}

async function findDimensionSetByEventAndRef(eventCode: string, refId: string) {
  const normalizedEventCode = String(eventCode || '').trim();
  const normalizedRefId = String(refId || '').trim();
  if (!normalizedEventCode || !normalizedRefId) return null;
  const table = createFinanceDataTable(DIMENSION_SET_FORM_KEY, DIMENSION_SET_TABLE, DIMENSION_DB, 'rowid');
  table.Filter = and(cond('event_code', 'equal', normalizedEventCode), cond('ref_id', 'equal', normalizedRefId), cond('lingma_sys_is_delete', 'notequal', 1));
  const items = await queryTableItems(table, 1, 1);
  return items?.[0] || null;
}

async function softDeleteDimensionSetDetails(setId: string) {
  const normalizedSetId = String(setId || '').trim();
  if (!normalizedSetId) return;
  const detailTable = createFinanceDataTable(DIMENSION_DETAIL_FORM_KEY, DIMENSION_DETAIL_TABLE, DIMENSION_DB, 'rowid');
  detailTable.Filter = and(cond('set_id', 'equal', normalizedSetId), cond('lingma_sys_is_delete', 'notequal', 1));
  const details = await queryTableItems(detailTable, 0, 1);
  if (!details.length) return;
  const changed = details.map((item: any) => ({ rowid: item.rowid, lingma_sys_is_delete: 1 }));
  await requestClient.post(detailTable.saveUrl, detailTable.getSaveParam([], changed, []), { headers: detailTable.getRequestHeader() });
}

export async function saveDimensionResultsByRulePayloads(requests: SaveDimensionResultRequest[] = []) {
  const results = [];
  for (const request of requests) {
    const eventCode = String(request?.eventCode || '').trim();
    if (!eventCode) continue;
    const payload = request?.payload || {};
    results.push(await saveDimensionResultByRulePayload(eventCode, payload, request?.preview || null, request?.options || {}));
  }
  return results;
}

function buildItemDimensionPayloads(master: Record<string, any>, itemEventCode: string, options: SaveDimensionResultOptions = {}) {
  const items = Array.isArray(master?.items) ? master.items : [];
  return items.map((item: Record<string, any>, index: number) => {
    const itemId = pickNonEmptyText(item?.id, item?.rowid, item?.seq, String(index + 1));
    const payload = {
      ...master,
      ...item,
      master_id: pickNonEmptyText(master?.id, master?.rowid),
      master_no: master?.no,
      source_item_id: itemId,
      ref_id: itemId ? String(itemEventCode) + ':' + itemId : String(itemEventCode) + ':' + index,
    };
    return {
      eventCode: itemEventCode,
      payload,
      options: { allowOverwrite: true, refIdField: 'ref_id', ...options },
    } as SaveDimensionResultRequest;
  });
}

export function buildMasterAndItemDimensionRequests(
  masterEventCode: string,
  masterPayload: Record<string, any>,
  itemEventCode?: string,
  options: SaveDimensionResultOptions = {},
) {
  const requests: SaveDimensionResultRequest[] = [
    {
      eventCode: masterEventCode,
      payload: masterPayload,
      options: { allowOverwrite: true, ...options },
    },
  ];
  if (itemEventCode) requests.push(...buildItemDimensionPayloads(masterPayload, itemEventCode, options));
  return requests;
}

export async function saveDimensionResultByRulePayload(
  eventCode: string,
  payload: Record<string, any>,
  preview?: DimensionPreviewResult | null,
  options: SaveDimensionResultOptions = {},
) {
  const normalizedEventCode = String(eventCode || '').trim();
  if (!normalizedEventCode) throw new Error('生成维度失败：缺少事件编码 event_code');
  await ensureDimensionRuleTemplateForEvent(normalizedEventCode);
  const normalizedPayload = { ...(payload || {}) };
  const effectivePreview = preview || (await previewRuleExecution(normalizedEventCode, normalizedPayload));
  if (!effectivePreview?.matched || !effectivePreview.rule) {
    if (options.skipWhenNoRule) {
      return { setId: '', details: [], duplicated: false, rule: null, voucher: null, skipped: true, reason: 'NO_MATCHED_RULE' } as any;
    }
    throw new Error('当前业务数据未命中任何启用的维度规则');
  }

  const previewPayload = effectivePreview.payload || normalizedPayload;
  const refId = pickDimensionRefId(previewPayload, options);
  if (!refId) throw new Error('生成维度失败：业务数据缺少 id / rowid / ReportID / ref_id / no');

  const existing = await findDimensionSetByEventAndRef(normalizedEventCode, refId);
  if (existing?.rowid && !options.allowOverwrite) {
    return { setId: String(existing.rowid), details: effectivePreview.details || [], duplicated: true, rule: effectivePreview.rule, voucher: null };
  }

  const accountSetId = getStoredAccountSetId() || effectivePreview.rule.account_set_id || previewPayload.account_set_id || null;
  const setId = existing?.rowid ? String(existing.rowid) : newRowId();
  const bizDate = pickDimensionBizDate(previewPayload, options);
  const setTable = createFinanceDataTable(DIMENSION_SET_FORM_KEY, DIMENSION_SET_TABLE, DIMENSION_DB, 'rowid');
  const detailTable = createFinanceDataTable(DIMENSION_DETAIL_FORM_KEY, DIMENSION_DETAIL_TABLE, DIMENSION_DB, 'rowid');

  if (existing?.rowid) await softDeleteDimensionSetDetails(setId);

  const setRow = {
    rowid: setId,
    event_code: normalizedEventCode,
    biz_category: effectivePreview.rule.biz_category || previewPayload.biz_category || '',
    ref_id: refId,
    biz_date: bizDate,
    description: '前端按钮生成：' + (effectivePreview.rule.rule_name || effectivePreview.rule.rule_code) + '；业务标识：' + pickNonEmptyText(previewPayload.no, refId),
    is_voucher_required: Number(effectivePreview.rule.voucher_required || 0),
    voucher_no: existing?.voucher_no || null,
    account_set_id: accountSetId,
    lingma_sys_ent: previewPayload.lingma_sys_ent || 'NewApp',
    lingma_sys_is_delete: 0,
  };

  const detailRows = (effectivePreview.details || [])
    .filter((item: any) => item?.value_code !== undefined && item?.value_code !== null && String(item.value_code).trim() !== '')
    .map((item: any) => ({
      rowid: newRowId(),
      set_id: setId,
      dim_category: item.dim_category,
      dim_code: item.dim_code,
      value_code: String(item.value_code),
      amount: item.amount == null || item.amount === '' ? null : Number(item.amount),
      direction: item.direction == null || item.direction === '' ? null : String(item.direction),
      currency: item.currency == null || item.currency === '' ? null : String(item.currency),
      period: item.period == null || item.period === '' ? null : String(item.period),
      account_set_id: accountSetId,
      lingma_sys_ent: previewPayload.lingma_sys_ent || 'NewApp',
      lingma_sys_is_delete: 0,
      description: item.description || getDimCategoryLabel(item.dim_category) + '-' + getDimCodeLabel(item.dim_code),
    }));

  const setAdded = existing?.rowid ? [] : [setRow];
  const setChanged = existing?.rowid ? [setRow] : [];
  const saveReq = [...setTable.getSaveParam(setAdded, setChanged, []), ...detailTable.getSaveParam(detailRows, [], [])];
  await requestClient.post(setTable.saveUrl, saveReq, { headers: setTable.getRequestHeader() });

  const voucher = await ensureVoucherByRulePreview({ eventCode: normalizedEventCode, setId, payload: previewPayload, preview: effectivePreview });
  return { setId, details: detailRows, duplicated: Boolean(existing?.rowid), rule: effectivePreview.rule, voucher };
}

export async function saveSaleOutDimensionResult(
  saleOut: ErpSaleOutApi.SaleOut | Record<string, any>,
  preview?: DimensionPreviewResult | null,
) {
  const payload = buildSaleShipmentPreviewPayload(saleOut);
  const effectivePreview = preview || (await previewSaleOutDimensionRule(payload));
  if (!effectivePreview?.matched || !effectivePreview.rule) {
    throw new Error('当前销售出库未命中任何可保存的维度规则');
  }

  const previewPayload = effectivePreview.payload || payload;
  const refId = String(payload.id || previewPayload.id || '');
  const existing = refId ? await findDimensionSetByRefId(refId) : null;
  if (existing?.rowid) {
    const voucher = await ensureVoucherByRulePreview({
      eventCode: 'SALE_SHIPMENT',
      setId: String(existing.rowid),
      payload: previewPayload,
      preview: effectivePreview,
    });
    return { setId: String(existing.rowid), details: effectivePreview.details || [], duplicated: true, rule: effectivePreview.rule, voucher };
  }

  const accountSetId = getStoredAccountSetId() || effectivePreview.rule.account_set_id || null;
  const setId = newRowId();
  const now = new Date();
  const setTable = createFinanceDataTable(DIMENSION_SET_FORM_KEY, DIMENSION_SET_TABLE, DIMENSION_DB, 'rowid');
  const detailTable = createFinanceDataTable(DIMENSION_DETAIL_FORM_KEY, DIMENSION_DETAIL_TABLE, DIMENSION_DB, 'rowid');

  const setRow = {
    rowid: setId,
    event_code: 'SALE_SHIPMENT',
    biz_category: '销售',
    ref_id: refId,
    biz_date: previewPayload.out_time || payload.out_time || now,
    description: `销售出库 ${previewPayload.no || payload.no || refId} 命中规则：${effectivePreview.rule.rule_name}`,
    is_voucher_required: Number(effectivePreview.rule.voucher_required || 0),
    voucher_no: null,
    account_set_id: accountSetId,

  };

  const detailRows = (effectivePreview.details || []).map((item: any) => ({
    rowid: newRowId(),
    set_id: setId,
    dim_category: item.dim_category,
    dim_code: item.dim_code,
    value_code: item.value_code == null ? '' : String(item.value_code),
    amount: item.amount == null || item.amount === '' ? null : Number(item.amount),
    direction: item.direction == null ? null : String(item.direction),
    currency: item.currency == null ? null : String(item.currency),
    period: item.period == null ? null : String(item.period),
    account_set_id: accountSetId,
    description: item.description || `${getDimCategoryLabel(item.dim_category)}-${getDimCodeLabel(item.dim_code)}`,
  }));

  const saveReq = [
    ...setTable.getSaveParam([setRow], [], []),
    ...detailTable.getSaveParam(detailRows, [], []),
  ];

  await requestClient.post(setTable.saveUrl, saveReq, { headers: setTable.getRequestHeader() });
  const voucher = await ensureVoucherByRulePreview({
    eventCode: 'SALE_SHIPMENT',
    setId,
    payload: previewPayload,
    preview: effectivePreview,
  });
  return { setId, details: detailRows, duplicated: false, rule: effectivePreview.rule, voucher };
}

export async function savePurchaseInDimensionResult(
  purchaseIn: Record<string, any>,
  preview?: DimensionPreviewResult | null,
) {
  const payload = buildPurchaseInPreviewPayload(purchaseIn);
  const effectivePreview = preview || (await previewPurchaseInDimensionRule(payload));
  if (!effectivePreview?.matched || !effectivePreview.rule) {
    throw new Error('当前采购入库未命中任何可保存的维度规则');
  }

  const previewPayload = effectivePreview.payload || payload;
  const refId = String(payload.id || previewPayload.id || '');
  const existing = refId ? await findDimensionSetByRefId(refId) : null;
  if (existing?.rowid) {
    const voucher = await ensureVoucherByRulePreview({
      eventCode: 'PURCHASE_IN',
      setId: String(existing.rowid),
      payload: previewPayload,
      preview: effectivePreview,
    });
    return { setId: String(existing.rowid), details: effectivePreview.details || [], duplicated: true, rule: effectivePreview.rule, voucher };
  }

  const accountSetId = getStoredAccountSetId() || effectivePreview.rule.account_set_id || null;
  const setId = newRowId();
  const now = new Date();
  const setTable = createFinanceDataTable(DIMENSION_SET_FORM_KEY, DIMENSION_SET_TABLE, DIMENSION_DB, 'rowid');
  const detailTable = createFinanceDataTable(DIMENSION_DETAIL_FORM_KEY, DIMENSION_DETAIL_TABLE, DIMENSION_DB, 'rowid');

  const setRow = {
    rowid: setId,
    event_code: 'PURCHASE_IN',
    biz_category: '采购',
    ref_id: refId,
    biz_date: previewPayload.in_time || payload.in_time || now,
    description: `采购入库 ${previewPayload.no || payload.no || refId} 命中规则：${effectivePreview.rule.rule_name}`,
    is_voucher_required: Number(effectivePreview.rule.voucher_required || 0),
    voucher_no: null,
    account_set_id: accountSetId,

  };

  const detailRows = (effectivePreview.details || []).map((item: any) => ({
    rowid: newRowId(),
    set_id: setId,
    dim_category: item.dim_category,
    dim_code: item.dim_code,
    value_code: item.value_code == null ? '' : String(item.value_code),
    amount: item.amount == null || item.amount === '' ? null : Number(item.amount),
    direction: item.direction == null ? null : String(item.direction),
    currency: item.currency == null ? null : String(item.currency),
    period: item.period == null ? null : String(item.period),
    account_set_id: accountSetId,
    description: item.description || `${getDimCategoryLabel(item.dim_category)}-${getDimCodeLabel(item.dim_code)}`,
  }));

  const saveReq = [
    ...setTable.getSaveParam([setRow], [], []),
    ...detailTable.getSaveParam(detailRows, [], []),
  ];

  await requestClient.post(setTable.saveUrl, saveReq, { headers: setTable.getRequestHeader() });
  const voucher = await ensureVoucherByRulePreview({
    eventCode: 'PURCHASE_IN',
    setId,
    payload: previewPayload,
    preview: effectivePreview,
  });
  return { setId, details: detailRows, duplicated: false, rule: effectivePreview.rule, voucher };
}

function toPreviewAmount(value: any) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeVoucherDirection(value?: string) {
  const text = String(value || '').trim().toUpperCase();
  if (['DEBIT', 'INFLOW', '借方', '借'].includes(text)) return 'DEBIT' as const;
  if (['CREDIT', 'OUTFLOW', '贷方', '贷'].includes(text)) return 'CREDIT' as const;
  return null;
}

export function buildVoucherEntriesFromPreview(
  preview: DimensionPreviewResult | null | undefined,
  summaryPrefix?: string,
): DimensionVoucherPreviewEntry[] {
  if (!preview?.matched || !preview.rule || Number(preview.rule.auto_voucher_write || 0) !== 1) return [];

  const prefix = String(summaryPrefix || preview.rule.rule_name || '维度规则自动写凭证').trim();
  return (preview.details || [])
    .filter((item: any) => String(item?.dim_category || '') === 'FINANCIAL' && String(item?.dim_code || '') === 'SUBJECT')
    .map((item: any, index: number) => {
      const amount = toPreviewAmount(item?.amount);
      const direction = normalizeVoucherDirection(item?.direction) || 'DEBIT';
      return {
        summary: `${prefix}-${index + 1}`,
        subject: String(item?.value_code || '').trim(),
        direction,
        debit: direction === 'DEBIT' ? amount : 0,
        credit: direction === 'CREDIT' ? amount : 0,
        amount,
      };
    })
    .filter((item) => Boolean(item.subject));
}

export async function previewRuleExecution(eventCode: string, data: Record<string, any>): Promise<DimensionPreviewResult> {
  //获取所有的规则信息

  const [mergedRules, dictMaps] = await Promise.all([fetchRuleListFromDb(), getDimensionDictMapList()]);
  const candidates = mergedRules
    .filter((item) => item.event_code === eventCode && Number(item.status) === 1)
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
  for (const rule of candidates) {
    const normalizedRuleId = String(rule.rowid || '').trim();
    if (!normalizedRuleId) continue;
    const [conds, results] = await Promise.all([fetchConditionListFromDb(normalizedRuleId), fetchResultListFromDb(normalizedRuleId)]);
    const matched = conds.sort((a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0)).every((item) => matchCondition(item, data));
    if (!matched) continue;
    const details = results.sort((a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0)).map((item) => {
      const amountResult = resolveFinancialAmountValue(item.amount_type, item.amount_expr, data, dictMaps);
      const direction = resolveOptionalValue(item.direction_type, item.direction_expr, data, dictMaps);
      const verifyDescription = [item.description, amountResult.verifyMessage].filter(Boolean).join('；');
      return {
        rowid: item.rowid,
        dim_category: item.dim_category,
        dim_code: item.dim_code,
        dim_category_label: getDimCategoryLabel(item.dim_category),
        dim_code_label: getDimCodeLabel(item.dim_code),
        value_code: resolveValueByType(item.value_type, item.value_expr, data, dictMaps),
        amount: amountResult.amount,
        verify_message: amountResult.verifyMessage,
        direction,
        direction_label: getDirectionLabel(direction as any),
        currency: resolveOptionalValue(item.currency_type, item.currency_expr, data, dictMaps),
        period: resolveOptionalValue(item.period_type, item.period_expr, data, dictMaps),
        required_flag: item.required_flag,
        description: verifyDescription,
      };
    });
    return { matched: true, rule, rule_name: rule.rule_name, details, payload: clone(data) };
  }
  return { matched: false, rule: null, rule_name: '', details: [], payload: clone(data) };
}
