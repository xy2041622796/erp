import { generateUUID } from '@vben/utils';

import { and, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';
import {
  defaultHousingFundRules,
  defaultSalaryTaxRules,
  defaultSocialInsuranceRules,
  type HousingFundRule,
  type SalaryTaxRule,
  type SocialInsuranceRule,
} from '#/views/finance/cashier/wages/tax-rules';

const SALARY_MODEL_ID = 'EE51818A60B93DBFDD6222A2D2F6606B';
const SALARY_RULE_TABLE = 'Bil_Salary_Rule';
const SALARY_DB = 'LMBill';
const SALARY_RULE_PK = 'rowid';

export type SalaryRuleType = 'HOUSING_FUND' | 'SOCIAL' | 'TAX';

type SalaryRuleRow = {
  rowid?: string;
  rule_type?: SalaryRuleType;
  rule_code?: string;
  rule_name?: string;
  description?: string;
  base_item_codes?: string;
  rule_json?: string;
  effective_start_period?: string;
  effective_end_period?: string;
  is_enabled?: number;
  version_no?: number;
  status?: number;
  remark?: string;
  lingma_sys_is_delete?: number;
};

export type SalaryRuleBundle = {
  housingFundRules: HousingFundRule[];
  salaryTaxRules: SalaryTaxRule[];
  socialInsuranceRules: SocialInsuranceRule[];
};

function createSalaryRuleTable() {
  return createFinanceDataTable(SALARY_MODEL_ID, SALARY_RULE_TABLE, SALARY_DB, SALARY_RULE_PK);
}

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = Number(resultData?.Count ?? items.length ?? 0);
  return { items, total };
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function stringifyRuleJson(rule: any) {
  return JSON.stringify(rule, (_key, value) => (value === Number.POSITIVE_INFINITY ? 'Infinity' : value));
}

function parseRuleJson<T>(row: SalaryRuleRow, fallback: T): T {
  const raw = row.rule_json;
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeBaseItemCodes(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean);
  return normalizeText(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSalaryTaxRule(row: SalaryRuleRow): SalaryTaxRule {
  const parsed = parseRuleJson<Partial<SalaryTaxRule>>(row, {});
  return {
    code: normalizeText(parsed.code || row.rule_code),
    title: normalizeText(parsed.title || row.rule_name),
    description: normalizeText(parsed.description || row.description),
    baseItemCodes: normalizeBaseItemCodes(parsed.baseItemCodes || row.base_item_codes),
    threshold: Number(parsed.threshold || 0),
    taxableIncomeMode: parsed.taxableIncomeMode === 'already_taxable' ? 'already_taxable' : 'minus_threshold',
    minTaxableAmount: Number(parsed.minTaxableAmount ?? 0),
    roundMode: parsed.roundMode || 'ROUND',
    brackets: Array.isArray(parsed.brackets) ? parsed.brackets : [],
  };
}

function normalizeSocialInsuranceRule(row: SalaryRuleRow): SocialInsuranceRule {
  const parsed = parseRuleJson<Partial<SocialInsuranceRule> & { companyRate?: number; personalRate?: number }>(row, {});
  const code = normalizeText(parsed.code || row.rule_code);
  const title = normalizeText(parsed.title || row.rule_name);
  const baseItemCodes = normalizeBaseItemCodes(parsed.baseItemCodes || row.base_item_codes);
  const components = Array.isArray(parsed.components) && parsed.components.length
    ? parsed.components
    : [
        {
          key: 'aggregate',
          label: title || '社保合计',
          personalRate: Number(parsed.personalRate || 0),
          companyRate: Number(parsed.companyRate || 0),
          itemCodes: ['personal_social_insurance', 'social_insurance_personal', 'social_insurance_total_personal'],
        },
      ];

  return {
    code,
    title,
    description: normalizeText(parsed.description || row.description),
    baseItemCodes,
    minBase: Number(parsed.minBase ?? 0),
    maxBase: String(parsed.maxBase) === 'Infinity' ? Number.POSITIVE_INFINITY : Number(parsed.maxBase ?? Number.POSITIVE_INFINITY),
    roundMode: parsed.roundMode || 'ROUND',
    components,
  };
}

function normalizeHousingFundRule(row: SalaryRuleRow): HousingFundRule {
  const parsed = parseRuleJson<Partial<HousingFundRule>>(row, {});
  return {
    code: normalizeText(parsed.code || row.rule_code),
    title: normalizeText(parsed.title || row.rule_name),
    description: normalizeText(parsed.description || row.description),
    baseItemCodes: normalizeBaseItemCodes(parsed.baseItemCodes || row.base_item_codes),
    personalRate: Number(parsed.personalRate || 0),
    companyRate: Number(parsed.companyRate || 0),
    minBase: Number(parsed.minBase ?? 0),
    maxBase: String(parsed.maxBase) === 'Infinity' ? Number.POSITIVE_INFINITY : Number(parsed.maxBase ?? Number.POSITIVE_INFINITY),
    roundMode: parsed.roundMode || 'ROUND',
  };
}

async function querySalaryRuleRows(ruleTypes?: SalaryRuleType[]) {
  const table = createSalaryRuleTable();
  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  if (ruleTypes?.length === 1) {
    filters.push(cond('rule_type', 'equal', ruleTypes[0]));
  } else if (ruleTypes?.length) {
    filters.push(or(...ruleTypes.map((type) => cond('rule_type', 'equal', type))));
  }

  table.Filter = and(...filters);

  const queryParam: any = {
    Table: [table],
    PageParam: { page: 9999, index: 1 },
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(res);
  const { items } = extractListAndTotal(res);
  return items as SalaryRuleRow[];
}

function buildRuleRow(ruleType: SalaryRuleType, rule: any, existed?: SalaryRuleRow): SalaryRuleRow {
  const ruleCode = normalizeText(rule.code);
  const ruleName = normalizeText(rule.title || rule.name || ruleCode);
  return {
    rowid: normalizeText(existed?.rowid) || generateUUID(),
    rule_type: ruleType,
    rule_code: ruleCode,
    rule_name: ruleName,
    description: normalizeText(rule.description),
    base_item_codes: normalizeBaseItemCodes(rule.baseItemCodes).join(','),
    rule_json: stringifyRuleJson(rule),
    effective_start_period: normalizeText(existed?.effective_start_period),
    effective_end_period: normalizeText(existed?.effective_end_period),
    is_enabled: Number(existed?.is_enabled ?? 1),
    version_no: Number(existed?.version_no || 0) + 1,
    status: Number(existed?.status ?? 1),
    remark: normalizeText(existed?.remark),
    lingma_sys_is_delete: 0,
  };
}

async function saveRulesByType(ruleType: SalaryRuleType, rules: any[]) {
  const table = createSalaryRuleTable();
  const existedRows = await querySalaryRuleRows([ruleType]);
  const existedMap = new Map(existedRows.map((item) => [normalizeText(item.rule_code), item]));
  const nextCodes = new Set((rules || []).map((item) => normalizeText(item.code)).filter(Boolean));

  const inserts: SalaryRuleRow[] = [];
  const updates: SalaryRuleRow[] = [];

  (rules || []).forEach((rule) => {
    const ruleCode = normalizeText(rule.code);
    if (!ruleCode) return;
    const existed = existedMap.get(ruleCode);
    const row = buildRuleRow(ruleType, rule, existed);
    if (existed?.rowid) updates.push(row);
    else inserts.push(row);
  });

  existedRows.forEach((row) => {
    const ruleCode = normalizeText(row.rule_code);
    if (ruleCode && !nextCodes.has(ruleCode)) {
      updates.push({ rowid: row.rowid, lingma_sys_is_delete: 1 });
    }
  });

  if (!inserts.length && !updates.length) return;
  const saveParam = table.getSaveParam(inserts as any[], updates as any[], []);
  await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function getSalaryRuleBundle(): Promise<SalaryRuleBundle> {
  const rows = await querySalaryRuleRows(['TAX', 'SOCIAL', 'HOUSING_FUND']);
  const taxRows = rows.filter((item) => item.rule_type === 'TAX');
  const socialRows = rows.filter((item) => item.rule_type === 'SOCIAL');
  const housingRows = rows.filter((item) => item.rule_type === 'HOUSING_FUND');

  return {
    salaryTaxRules: taxRows.length ? taxRows.map(normalizeSalaryTaxRule) : deepClone(defaultSalaryTaxRules),
    socialInsuranceRules: socialRows.length ? socialRows.map(normalizeSocialInsuranceRule) : deepClone(defaultSocialInsuranceRules),
    housingFundRules: housingRows.length ? housingRows.map(normalizeHousingFundRule) : deepClone(defaultHousingFundRules),
  };
}

export async function saveSalaryRuleBundle(bundle: SalaryRuleBundle) {
  await saveRulesByType('TAX', bundle.salaryTaxRules || []);
  await saveRulesByType('SOCIAL', bundle.socialInsuranceRules || []);
  await saveRulesByType('HOUSING_FUND', bundle.housingFundRules || []);
  return getSalaryRuleBundle();
}

export async function upsertSalaryRulesByType(ruleType: SalaryRuleType, rules: any[]) {
  const table = createSalaryRuleTable();
  const existedRows = await querySalaryRuleRows([ruleType]);
  const existedMap = new Map(existedRows.map((item) => [normalizeText(item.rule_code), item]));
  const inserts: SalaryRuleRow[] = [];
  const updates: SalaryRuleRow[] = [];

  (rules || []).forEach((rule) => {
    const ruleCode = normalizeText(rule.code);
    if (!ruleCode) return;
    const existed = existedMap.get(ruleCode);
    const row = buildRuleRow(ruleType, rule, existed);
    if (existed?.rowid) updates.push(row);
    else inserts.push(row);
  });

  if (!inserts.length && !updates.length) return getSalaryRuleBundle();
  const saveParam = table.getSaveParam(inserts as any[], updates as any[], []);
  await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
  return getSalaryRuleBundle();
}

export async function resetSalaryRulesByType(ruleType: SalaryRuleType) {
  if (ruleType === 'TAX') {
    await saveRulesByType('TAX', deepClone(defaultSalaryTaxRules));
  }
  if (ruleType === 'SOCIAL') {
    await saveRulesByType('SOCIAL', deepClone(defaultSocialInsuranceRules));
  }
  if (ruleType === 'HOUSING_FUND') {
    await saveRulesByType('HOUSING_FUND', deepClone(defaultHousingFundRules));
  }
  return getSalaryRuleBundle();
}
