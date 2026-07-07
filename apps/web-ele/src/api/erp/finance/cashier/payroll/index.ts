import { generateUUID } from '@vben/utils';

import { and, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';

const SALARY_MODEL_ID = '21E51ABDA5BB65CE1254165531A68A3C';
const SALARY_ITEM_META_TABLE = 'Bil_Salary_Item_Meta';
const SALARY_DB = 'LMBill';
const SALARY_ITEM_META_PK = 'rowid';

const ALLOWED_DEFAULT_SOURCE_SET = new Set(['INPUT']);
const ALLOWED_SALARY_SLIP_DISPLAY_SET = new Set([
  'ALL',
  'NONE',
  'LEVEL:L1,L2',
  'LEVEL:M1+',
  'LEVEL:E1',
]);
const ALLOWED_SETTING_PERMISSION_SET = new Set(['SYS', 'HR', 'FIN', 'HR|FIN', 'READONLY']);
const ALLOWED_ITEM_DIRECTION_SET = new Set(['income', 'deduct', 'result', 'middle', 'company']);
const ALLOWED_ITEM_CATEGORY_SET = new Set([
  'BASIC',
  'FLOATING',
  'ALLOWANCE',
  'ATTENDANCE',
  'INSURANCE',
  'TAX',
  'RESULT',
  'CUSTOM',
]);
const ALLOWED_DATA_TYPE_SET = new Set(['DECIMAL', 'INTEGER', 'TEXT', 'DATE', 'BOOLEAN']);
const ALLOWED_UNIT_SET = new Set(['CNY', 'PERCENT', 'HOUR', 'DAY', 'TIMES', 'TEXT']);
const ALLOWED_INPUT_MODE_SET = new Set(['MANUAL', 'FORMULA', 'IMPORT', 'SYNC', 'FIXED']);
const ALLOWED_VISIBLE_SCOPE_SET = new Set(['ALL', 'HR', 'FIN', 'HR|FIN', 'ADMIN', 'NONE']);
const ALLOWED_EDITABLE_SCOPE_SET = new Set(['SYS', 'HR', 'FIN', 'HR|FIN', 'READONLY']);

export namespace SalaryItemMetaApi {
  export interface Row {
    rowid?: string;
    item_code?: string;
    item_name?: string;
    item_category?:
      | 'ALLOWANCE'
      | 'ATTENDANCE'
      | 'BASIC'
      | 'CUSTOM'
      | 'FLOATING'
      | 'INSURANCE'
      | 'RESULT'
      | 'TAX';
    item_subcategory?: string;
    default_value?: number | null;
    default_source?: string;
    input_mode?: 'FIXED' | 'FORMULA' | 'IMPORT' | 'MANUAL' | 'SYNC';
    is_tax_item?: number;
    is_formula_item?: number;
    is_bonus_item?: number;
    is_custom_item?: number;
    required_flag?: number;
    negative_allowed?: number;
    salary_slip_display?: string;
    display_group?: string;
    display_name?: string;
    setting_permission?: string;
    visible_scope?: string;
    editable_scope?: string;
    item_direction?: 'company' | 'income' | 'deduct' | 'middle' | 'result';
    data_type?: 'BOOLEAN' | 'DATE' | 'DECIMAL' | 'INTEGER' | 'TEXT';
    value_precision?: number;
    unit?: 'CNY' | 'DAY' | 'HOUR' | 'PERCENT' | 'TEXT' | 'TIMES';
    validation_rule?: string;
    source_table?: string;
    source_field?: string;
    source_expr?: string;
    tax_rule_code?: string;
    social_insurance_rule_code?: string;
    housing_fund_rule_code?: string;
    effective_start_date?: null | string;
    effective_end_date?: null | string;
    version_no?: number;
    is_enabled?: number;
    sort_no?: number;
    description?: string;
    remark?: string;
    status?: number;
    lingma_sys_is_delete?: number;
    account_set_id?: string;
  }
}

function createSalaryItemMetaTable() {
  return createFinanceDataTable(
    SALARY_MODEL_ID,
    SALARY_ITEM_META_TABLE,
    SALARY_DB,
    SALARY_ITEM_META_PK,
  );
}

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = Number(resultData?.Count ?? items.length ?? 0);
  return { items, total };
}

function normalizeBooleanNumber(value: any, defaultValue = 0) {
  if (value === true) return 1;
  if (value === false) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? (num ? 1 : 0) : defaultValue;
}

function normalizeText(value: any) {
  return String(value ?? '').trim();
}

function normalizeNullableText(value: any) {
  return normalizeText(value);
}

function normalizeDateText(value: any) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeDefaultValue(value: any) {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error('默认值必须是有效数字');
  }
  if (Math.abs(num) > 999999999999.99) {
    throw new Error('默认值超出允许范围');
  }
  return Number(num.toFixed(2));
}

function normalizeSortNo(value: any) {
  const num = Number(value ?? 0);
  if (!Number.isInteger(num) || num < 0) {
    throw new Error('排序必须是大于等于 0 的整数');
  }
  return num;
}

function normalizeVersionNo(value: any) {
  const num = Number(value ?? 1);
  if (!Number.isInteger(num) || num < 1) {
    throw new Error('版本号必须是大于等于 1 的整数');
  }
  return num;
}

function normalizePrecision(value: any) {
  const num = Number(value ?? 2);
  if (!Number.isInteger(num) || num < 0 || num > 6) {
    throw new Error('数值精度必须是 0 到 6 的整数');
  }
  return num;
}

function validateItemCode(value: string) {
  if (!value) throw new Error('项目编码不能为空');
  if (value.length > 100) throw new Error('项目编码长度不能超过 100');
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) {
    throw new Error('项目编码只能以字母开头，并由字母、数字、下划线组成');
  }
}

function validateItemName(value: string) {
  if (!value) throw new Error('项目名称不能为空');
  if (value.length > 100) throw new Error('项目名称长度不能超过 100');
}

function validateTextLength(field: string, value: string, maxLength: number) {
  if (value.length > maxLength) {
    throw new Error(`${field}长度不能超过 ${maxLength}`);
  }
}

async function querySalaryItemMetaByField(fieldName: string, fieldValue: string) {
  const table = createSalaryItemMetaTable();
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond(fieldName, 'equal', fieldValue),
  );

  const queryParam: any = {
    Table: [table],
    PageParam: { page: 20, index: 1 },
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(res);
  const { items } = extractListAndTotal(res);
  return items || [];
}

async function ensureUniqueItemCode(itemCode: string, excludeRowid = '') {
  const list = await querySalaryItemMetaByField('item_code', itemCode);
  const existed = list.find((item: any) => String(item?.rowid || '') !== String(excludeRowid || ''));
  if (existed) {
    throw new Error(`项目编码已存在：${itemCode}`);
  }
}

async function ensureUniqueItemName(itemName: string, excludeRowid = '') {
  const list = await querySalaryItemMetaByField('item_name', itemName);
  const existed = list.find((item: any) => String(item?.rowid || '') !== String(excludeRowid || ''));
  if (existed) {
    throw new Error(`项目名称已存在：${itemName}`);
  }
}

async function buildAndValidatePayload(data: SalaryItemMetaApi.Row, mode: 'create' | 'update') {
  const rowid = normalizeText(data.rowid) || generateUUID();
  const item_code = normalizeText(data.item_code);
  const item_name = normalizeText(data.item_name);
  const item_category = normalizeText(data.item_category || 'CUSTOM') || 'CUSTOM';
  const item_subcategory = normalizeNullableText(data.item_subcategory);
  const default_source = normalizeText(data.default_source || 'INPUT') || 'INPUT';
  const input_mode = normalizeText(data.input_mode || 'MANUAL') || 'MANUAL';
  const salary_slip_display = normalizeText(data.salary_slip_display || 'ALL') || 'ALL';
  const display_group = normalizeNullableText(data.display_group);
  const display_name = normalizeNullableText(data.display_name) || item_name;
  const setting_permission = normalizeText(data.setting_permission || 'FIN') || 'FIN';
  const visible_scope = normalizeText(data.visible_scope || 'ALL') || 'ALL';
  const editable_scope = normalizeText(data.editable_scope || 'FIN') || 'FIN';
  const item_direction = normalizeText(data.item_direction || 'income') || 'income';
  const data_type = normalizeText(data.data_type || 'DECIMAL') || 'DECIMAL';
  const unit = normalizeText(data.unit || 'CNY') || 'CNY';
  const validation_rule = normalizeNullableText(data.validation_rule);
  const source_table = normalizeNullableText(data.source_table);
  const source_field = normalizeNullableText(data.source_field);
  const source_expr = normalizeNullableText(data.source_expr);
  const tax_rule_code = normalizeNullableText(data.tax_rule_code);
  const social_insurance_rule_code = normalizeNullableText(data.social_insurance_rule_code);
  const housing_fund_rule_code = normalizeNullableText(data.housing_fund_rule_code);
  const description = normalizeNullableText(data.description);
  const remark = normalizeNullableText(data.remark);
  const default_value = normalizeDefaultValue(data.default_value);
  const sort_no = normalizeSortNo(data.sort_no);
  const version_no = normalizeVersionNo(data.version_no);
  const value_precision = normalizePrecision(data.value_precision);
  const effective_start_date = normalizeDateText(data.effective_start_date);
  const effective_end_date = normalizeDateText(data.effective_end_date);

  validateItemCode(item_code);
  validateItemName(item_name);
  validateTextLength('项目子分类', item_subcategory, 50);
  validateTextLength('显示分组', display_group, 50);
  validateTextLength('显示名称', display_name, 100);
  validateTextLength('校验规则', validation_rule, 255);
  validateTextLength('来源表', source_table, 100);
  validateTextLength('来源字段', source_field, 100);
  validateTextLength('来源表达式', source_expr, 500);
  validateTextLength('税规则编码', tax_rule_code, 100);
  validateTextLength('社保规则编码', social_insurance_rule_code, 100);
  validateTextLength('公积金规则编码', housing_fund_rule_code, 100);
  validateTextLength('说明', description, 1000);
  validateTextLength('备注', remark, 500);

  if (!ALLOWED_DEFAULT_SOURCE_SET.has(default_source)) {
    throw new Error('默认值来源不合法，仅支持“手工输入”');
  }
  if (!ALLOWED_ITEM_CATEGORY_SET.has(item_category)) {
    throw new Error('项目分类不合法');
  }
  if (!ALLOWED_INPUT_MODE_SET.has(input_mode)) {
    throw new Error('录入模式不合法');
  }
  if (!ALLOWED_SALARY_SLIP_DISPLAY_SET.has(salary_slip_display)) {
    throw new Error('工资条显示规则不合法');
  }
  if (!ALLOWED_SETTING_PERMISSION_SET.has(setting_permission)) {
    throw new Error('设置权限不合法');
  }
  if (!ALLOWED_VISIBLE_SCOPE_SET.has(visible_scope)) {
    throw new Error('可见范围不合法');
  }
  if (!ALLOWED_EDITABLE_SCOPE_SET.has(editable_scope)) {
    throw new Error('可编辑范围不合法');
  }
  if (!ALLOWED_ITEM_DIRECTION_SET.has(item_direction)) {
    throw new Error('项目方向不合法');
  }
  if (!ALLOWED_DATA_TYPE_SET.has(data_type)) {
    throw new Error('数据类型不合法');
  }
  if (!ALLOWED_UNIT_SET.has(unit)) {
    throw new Error('单位不合法');
  }
  if (effective_start_date && effective_end_date && effective_start_date > effective_end_date) {
    throw new Error('生效结束日期不能早于生效开始日期');
  }

  await ensureUniqueItemCode(item_code, mode === 'update' ? rowid : '');
  await ensureUniqueItemName(item_name, mode === 'update' ? rowid : '');

  const payload: SalaryItemMetaApi.Row = {
    ...data,
    rowid,
    item_code,
    item_name,
    item_category: item_category as SalaryItemMetaApi.Row['item_category'],
    item_subcategory,
    default_value,
    default_source,
    input_mode: input_mode as SalaryItemMetaApi.Row['input_mode'],
    is_tax_item: normalizeBooleanNumber(data.is_tax_item, 0),
    is_formula_item: normalizeBooleanNumber(data.is_formula_item, 0),
    is_bonus_item: normalizeBooleanNumber(data.is_bonus_item, 0),
    is_custom_item: normalizeBooleanNumber(data.is_custom_item, 0),
    required_flag: normalizeBooleanNumber(data.required_flag, 0),
    negative_allowed: normalizeBooleanNumber(data.negative_allowed, 0),
    is_enabled: normalizeBooleanNumber(data.is_enabled, 1),
    sort_no,
    salary_slip_display,
    display_group,
    display_name,
    setting_permission,
    visible_scope,
    editable_scope,
    item_direction: item_direction as SalaryItemMetaApi.Row['item_direction'],
    data_type: data_type as SalaryItemMetaApi.Row['data_type'],
    value_precision,
    unit: unit as SalaryItemMetaApi.Row['unit'],
    validation_rule,
    source_table,
    source_field,
    source_expr,
    tax_rule_code,
    social_insurance_rule_code,
    housing_fund_rule_code,
    effective_start_date,
    effective_end_date,
    version_no,
    description,
    remark,
    status: Number(data.status ?? 1),
    lingma_sys_is_delete: 0,
  };

  return payload;
}

export async function getSalaryItemMetaPage(params: any = {}) {
  const table = createSalaryItemMetaTable();

  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];

  if (params.keyword) {
    filters.push(
      or(
        cond('item_code', 'contains', params.keyword),
        cond('item_name', 'contains', params.keyword),
        cond('display_name', 'contains', params.keyword),
        cond('description', 'contains', params.keyword),
      ),
    );
  }

  if (params.item_direction) {
    filters.push(cond('item_direction', 'equal', params.item_direction));
  }

  if (params.item_category) {
    filters.push(cond('item_category', 'equal', params.item_category));
  }

  if (params.input_mode) {
    filters.push(cond('input_mode', 'equal', params.input_mode));
  }

  if (params.is_enabled !== undefined && params.is_enabled !== null && params.is_enabled !== '') {
    filters.push(cond('is_enabled', 'equal', Number(params.is_enabled)));
  }

  table.Filter = and(...filters);

  const queryParam: any = {
    Table: [table],
    page: {
      page: params.page || 10,
      index: params.pageNo ?? 0,
    },
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(res);
  const { items, total } = extractListAndTotal(res);
  const list = [...items].sort((a: any, b: any) => {
    const categoryCompare = String(a?.item_category || '').localeCompare(String(b?.item_category || ''));
    if (categoryCompare !== 0) return categoryCompare;
    const sortDiff = Number(a?.sort_no || 0) - Number(b?.sort_no || 0);
    if (sortDiff !== 0) return sortDiff;
    return String(b?.createtime || '').localeCompare(String(a?.createtime || ''));
  });

  return {
    dataTable: table,
    list,
    total,
  };
}

export async function getSalaryItemMeta(rowid: string) {
  const table = createSalaryItemMetaTable();
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('rowid', 'equal', rowid),
  );

  const queryParam: any = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(res);
  const { items } = extractListAndTotal(res);
  return items[0] || null;
}

export async function getSalaryItemMetaOptions() {
  const res = await getSalaryItemMetaPage({ pageNo: 0, page: 1, is_enabled: 1 });
  return (res.list || []).map((item: SalaryItemMetaApi.Row) => ({
    label: `${item.display_name || item.item_name || ''}（${item.item_code || ''}）`,
    value: item.item_code || '',
    raw: item,
  }));
}

export async function createSalaryItemMeta(data: SalaryItemMetaApi.Row) {
  const table = createSalaryItemMetaTable();
  const payload = await buildAndValidatePayload(data, 'create');
  const saveParam = table.getSaveParam([payload as any], [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateSalaryItemMeta(data: SalaryItemMetaApi.Row & { rowid: string }) {
  const table = createSalaryItemMetaTable();
  const payload = await buildAndValidatePayload(data, 'update');
  const saveParam = table.getSaveParam([], [payload as any], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function deleteSalaryItemMeta(rowid: string) {
  const table = createSalaryItemMetaTable();
  const saveParam = table.getSaveParam([], [{ rowid, lingma_sys_is_delete: 1 } as any], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
