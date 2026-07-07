import { generateUUID } from '@vben/utils';

import { and, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';

const SALARY_MODEL_ID = '21E51ABDA5BB65CE1254165531A68A3C';
const SALARY_FORMULA_TABLE = 'Bil_Salary_Item_Formula';
const SALARY_DB = 'LMBill';
const SALARY_FORMULA_PK = 'rowid';
const ALLOWED_FORMULA_PRESET_SET = new Set(['DIRECT', 'ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE']);
const ALLOWED_ROUND_MODE_SET = new Set(['ROUND', 'FLOOR', 'CEIL']);

export namespace SalaryFormulaApi {
  export interface Row {
    rowid?: string;
    formula_name?: string;
    target_item_code?: string;
    formula_expr?: string;
    depends_on?: string;
    calc_order?: number;
    round_mode?: string;
    is_enabled?: number;
    description?: string;
    remark?: string;
    status?: number;
    lingma_sys_is_delete?: number;
    account_set_id?: string;
  }
}

function createSalaryFormulaTable() {
  return createFinanceDataTable(
    SALARY_MODEL_ID,
    SALARY_FORMULA_TABLE,
    SALARY_DB,
    SALARY_FORMULA_PK,
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

function validateTextLength(field: string, value: string, maxLength: number) {
  if (value.length > maxLength) {
    throw new Error(`${field}长度不能超过 ${maxLength}`);
  }
}

function normalizeCalcOrder(value: any) {
  const num = Number(value ?? 0);
  if (!Number.isInteger(num) || num < 0) {
    throw new Error('执行顺序必须是大于等于 0 的整数');
  }
  return num;
}

function parseFormulaExpr(expr: string) {
  const text = normalizeText(expr);
  const matched = text.match(/^(DIRECT|ADD|SUBTRACT|MULTIPLY|DIVIDE)\((.*)\)$/);
  if (!matched) {
    throw new Error('公式表达式格式不正确');
  }
  const preset = matched[1];
  const fields = String(matched[2] || '')
    .split(',')
    .map((item) => normalizeText(item))
    .filter(Boolean);
  return { preset, fields };
}

function validateFormulaFieldCount(preset: string, fields: string[]) {
  if (preset === 'DIRECT' && fields.length !== 1) {
    throw new Error('直接取值必须且只能选择 1 个参与字段');
  }
  if ((preset === 'SUBTRACT' || preset === 'DIVIDE') && fields.length !== 2) {
    throw new Error('相减和相除必须且只能选择 2 个参与字段');
  }
  if ((preset === 'ADD' || preset === 'MULTIPLY') && fields.length < 2) {
    throw new Error('求和和相乘至少需要 2 个参与字段');
  }
}

async function querySalaryFormulaByTargetItemCode(
  targetItemCode: string,
  options: { includeDeleted?: boolean } = {},
) {
  const table = createSalaryFormulaTable();
  const filters: any[] = [cond('target_item_code', 'equal', targetItemCode)];

  if (!options.includeDeleted) {
    filters.unshift(cond('lingma_sys_is_delete', 'notequal', 1));
  }

  table.Filter = and(...filters);

  const queryParam: any = {
    Table: [table],
    PageParam: { page: 50, index: 1 },
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(res);
  const { items } = extractListAndTotal(res);
  return items || [];
}

async function findSalaryFormulaByTargetItemCode(
  targetItemCode: string,
  options: { includeDeleted?: boolean } = {},
) {
  const list = await querySalaryFormulaByTargetItemCode(targetItemCode, options);
  return list[0] || null;
}

async function ensureUniqueTargetItemCode(
  targetItemCode: string,
  excludeRowid = '',
  options: { includeDeleted?: boolean } = {},
) {
  const list = await querySalaryFormulaByTargetItemCode(targetItemCode, options);
  const existed = list.find((item: any) => String(item?.rowid || '') !== String(excludeRowid || ''));
  if (existed) {
    if (Number(existed?.lingma_sys_is_delete) === 1) {
      throw new Error(`结果项目已存在已删除公式，请恢复后再维护：${targetItemCode}`);
    }
    throw new Error(`结果项目已存在公式：${targetItemCode}`);
  }
}

async function buildAndValidatePayload(data: SalaryFormulaApi.Row, mode: 'create' | 'update') {
  const rowid = normalizeText(data.rowid) || generateUUID();
  const target_item_code = normalizeText(data.target_item_code);
  const formula_name = normalizeText(data.formula_name);
  const formula_expr = normalizeText(data.formula_expr);
  const depends_on = normalizeText(data.depends_on);
  const round_mode = normalizeText(data.round_mode || 'ROUND') || 'ROUND';
  const description = normalizeText(data.description);
  const remark = normalizeText(data.remark);
  const calc_order = normalizeCalcOrder(data.calc_order);

  if (!target_item_code) {
    throw new Error('结果项目不能为空');
  }
  if (!formula_name) {
    throw new Error('公式名称不能为空');
  }
  if (!formula_expr) {
    throw new Error('公式表达式不能为空');
  }
  validateTextLength('公式名称', formula_name, 100);
  validateTextLength('结果项目', target_item_code, 100);
  validateTextLength('说明', description, 1000);
  validateTextLength('备注', remark, 500);

  if (!ALLOWED_ROUND_MODE_SET.has(round_mode)) {
    throw new Error('舍入方式不合法');
  }

  const parsed = parseFormulaExpr(formula_expr);
  if (!ALLOWED_FORMULA_PRESET_SET.has(parsed.preset)) {
    throw new Error('公式类型不合法');
  }
  validateFormulaFieldCount(parsed.preset, parsed.fields);

  if (parsed.fields.includes(target_item_code)) {
    throw new Error('结果项目不能同时作为参与字段');
  }

  const normalizedDependsOn = parsed.fields.join(',');
  if (depends_on && depends_on !== normalizedDependsOn) {
    throw new Error('依赖字段与公式表达式不一致');
  }

  await ensureUniqueTargetItemCode(target_item_code, mode === 'update' ? rowid : '', {
    includeDeleted: true,
  });

  const payload: SalaryFormulaApi.Row = {
    ...data,
    rowid,
    formula_name,
    target_item_code,
    formula_expr: `${parsed.preset}(${parsed.fields.join(',')})`,
    depends_on: normalizedDependsOn,
    calc_order,
    round_mode,
    is_enabled: normalizeBooleanNumber(data.is_enabled, 1),
    description,
    remark,
    status: Number(data.status ?? 1),
    lingma_sys_is_delete: 0,
  };

  return payload;
}

export async function getSalaryFormulaPage(params: any = {}) {
  const table = createSalaryFormulaTable();

  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];

  if (params.keyword) {
    filters.push(
      or(
        cond('formula_name', 'contains', params.keyword),
        cond('target_item_code', 'contains', params.keyword),
        cond('formula_expr', 'contains', params.keyword),
      ),
    );
  }

  if (params.target_item_code) {
    filters.push(cond('target_item_code', 'equal', params.target_item_code));
  }

  if (params.is_enabled !== undefined && params.is_enabled !== null && params.is_enabled !== '') {
    filters.push(cond('is_enabled', 'equal', Number(params.is_enabled)));
  }

  table.Filter = and(...filters);

  const queryParam: any = {
    Table: [table],
    PageParam: {
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
    const orderDiff = Number(a?.calc_order || 0) - Number(b?.calc_order || 0);
    if (orderDiff !== 0) return orderDiff;
    return String(b?.createtime || '').localeCompare(String(a?.createtime || ''));
  });

  return {
    dataTable: table,
    list,
    total,
  };
}

export async function getSalaryFormula(rowid: string) {
  const table = createSalaryFormulaTable();
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

export async function createSalaryFormula(data: SalaryFormulaApi.Row) {
  const table = createSalaryFormulaTable();
  const targetItemCode = normalizeText(data.target_item_code);
  const existed = targetItemCode
    ? await findSalaryFormulaByTargetItemCode(targetItemCode, { includeDeleted: true })
    : null;

  if (existed) {
    const payload = await buildAndValidatePayload(
      {
        ...data,
        rowid: existed.rowid,
        lingma_sys_is_delete: 0,
      },
      'update',
    );
    const saveParam = table.getSaveParam([], [payload as any], []);
    return await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
  }

  const payload = await buildAndValidatePayload(data, 'create');
  const saveParam = table.getSaveParam([payload as any], [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateSalaryFormula(data: SalaryFormulaApi.Row & { rowid: string }) {
  const table = createSalaryFormulaTable();
  const payload = await buildAndValidatePayload(data, 'update');
  const saveParam = table.getSaveParam([], [payload as any], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function deleteSalaryFormula(rowid: string) {
  const table = createSalaryFormulaTable();
  const saveParam = table.getSaveParam([], [{ rowid, lingma_sys_is_delete: 1 } as any], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
