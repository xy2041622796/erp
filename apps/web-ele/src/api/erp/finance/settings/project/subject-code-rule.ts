import { generateUUID } from '@vben/utils';

import { cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getStoredAccountSetId } from '#/utils/accountSet';

const SUBJECT_CODE_RULE_FORM_ID = 'E79A70507324328C2E18BAEAFF744C8C';
const SUBJECT_CODE_RULE_TABLE = 'Bil_Subject_Code_Rule';
const SUBJECT_CODE_RULE_DB = 'LMBill';
const SUBJECT_CODE_RULE_PK = 'row_id';
const SUBJECT_CODE_RULE_STORAGE_PREFIX = 'finance:subject-code-rule:';

export const DEFAULT_SUBJECT_CODE_RULE = [4, 3, 2] as const;
export const DEFAULT_SUBJECT_LEVEL = DEFAULT_SUBJECT_CODE_RULE.length;

export interface SubjectCodeRule {
  account_set_id: string;
  subject_level: number;
  segment_rule: number[];
}

interface SubjectCodeRuleRow {
  row_id?: string;
  account_set_id?: string;
  subject_level?: number | string;
  segment_rule?: string;
  segment_rule_json?: string;
  segment1?: number | string;
  segment2?: number | string;
  segment3?: number | string;
  segment4?: number | string;
  segment5?: number | string;
  createuser?: string;
  createtime?: string;
  updateuser?: string;
  updatetime?: string;
  description?: string;
  lingma_sys_is_delete?: number;
  lingma_sys_ent?: string;
}

function getNowString() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function getCurrentAccountSetId() {
  return String(getStoredAccountSetId() || '').trim();
}

function normalizeSubjectTypeKey(subjectType?: unknown) {
  const key = String(subjectType ?? '').trim();
  return /^[1-5]$/.test(key) ? key : '';
}

function getRuleAccountSetId(accountSetId = getCurrentAccountSetId(), subjectType?: unknown) {
  const typeKey = normalizeSubjectTypeKey(subjectType);
  const baseId = String(accountSetId || '').trim();
  return typeKey ? `${baseId}:${typeKey}` : baseId;
}

function getStorageKey(accountSetId = getCurrentAccountSetId(), subjectType?: unknown) {
  const ruleAccountSetId = getRuleAccountSetId(accountSetId, subjectType);
  return `${SUBJECT_CODE_RULE_STORAGE_PREFIX}${ruleAccountSetId || 'default'}`;
}

function toPositiveInt(value: unknown, fallback: number) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return fallback;
  return Math.min(num, 12);
}

export function normalizeSubjectCodeRule(value?: Partial<SubjectCodeRule> | null): SubjectCodeRule {
  const accountSetId = String(value?.account_set_id ?? getCurrentAccountSetId() ?? '').trim();
  const rawSegments = Array.isArray(value?.segment_rule) && value.segment_rule.length > 0
    ? value.segment_rule
    : [...DEFAULT_SUBJECT_CODE_RULE];
  const subjectLevel = toPositiveInt(value?.subject_level, rawSegments.length || DEFAULT_SUBJECT_LEVEL);
  const segments = Array.from({ length: subjectLevel }).map((_, index) =>
    toPositiveInt(rawSegments[index], DEFAULT_SUBJECT_CODE_RULE[index] ?? 2),
  );

  return {
    account_set_id: accountSetId,
    subject_level: subjectLevel,
    segment_rule: segments,
  };
}

export function formatSubjectCodeRule(rule: SubjectCodeRule) {
  return normalizeSubjectCodeRule(rule).segment_rule.join('-');
}

export function getSubjectCodeLevelByLength(length: number, rule = getSubjectCodeRuleSync()) {
  let total = 0;
  for (let index = 0; index < rule.segment_rule.length; index += 1) {
    total += rule.segment_rule[index] ?? 0;
    if (total === length) return index + 1;
  }
  return 0;
}

export function getNextSubjectCodeSegmentLength(parentNumber: string, rule = getSubjectCodeRuleSync()) {
  const parentLength = String(parentNumber || '').trim().length;
  const parentLevel = getSubjectCodeLevelByLength(parentLength, rule);
  if (!parentLevel || parentLevel >= rule.segment_rule.length) return 0;
  return rule.segment_rule[parentLevel] ?? 0;
}

export function getRootSubjectCodeLength(rule = getSubjectCodeRuleSync()) {
  return rule.segment_rule[0] ?? DEFAULT_SUBJECT_CODE_RULE[0];
}

function parseRuleRow(row?: SubjectCodeRuleRow | null): SubjectCodeRule | null {
  if (!row) return null;
  let parsed: number[] = [];
  const rawJson = String(row.segment_rule_json || row.segment_rule || '').trim();
  if (rawJson) {
    try {
      const json = JSON.parse(rawJson);
      if (Array.isArray(json)) parsed = json.map(Number);
    } catch {
      parsed = rawJson
        .split(/[-,，、\s]+/)
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0);
    }
  }
  if (parsed.length === 0) {
    parsed = [row.segment1, row.segment2, row.segment3, row.segment4, row.segment5]
      .map(Number)
      .filter((item) => Number.isInteger(item) && item > 0);
  }
  return normalizeSubjectCodeRule({
    account_set_id: row.account_set_id || getCurrentAccountSetId(),
    subject_level: Number(row.subject_level || parsed.length || DEFAULT_SUBJECT_LEVEL),
    segment_rule: parsed.length > 0 ? parsed : [...DEFAULT_SUBJECT_CODE_RULE],
  });
}

function createRuleTable() {
  return new DataTable(
    SUBJECT_CODE_RULE_FORM_ID,
    SUBJECT_CODE_RULE_TABLE,
    SUBJECT_CODE_RULE_DB,
    SUBJECT_CODE_RULE_PK,
  );
}

function readLocalRule(accountSetId = getCurrentAccountSetId(), subjectType?: unknown) {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(getStorageKey(accountSetId, subjectType));
  if (!raw) return null;
  try {
    return normalizeSubjectCodeRule(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocalRule(rule: SubjectCodeRule) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getStorageKey(rule.account_set_id), JSON.stringify(normalizeSubjectCodeRule(rule)));
}

export function getSubjectCodeRuleSync(subjectType?: unknown) {
  const accountSetId = getCurrentAccountSetId();
  return readLocalRule(accountSetId, subjectType) || normalizeSubjectCodeRule({
    account_set_id: getRuleAccountSetId(accountSetId, subjectType),
    segment_rule: [...DEFAULT_SUBJECT_CODE_RULE],
  });
}

export async function getSubjectCodeRule(subjectType?: unknown) {
  const accountSetId = getCurrentAccountSetId();
  const ruleAccountSetId = getRuleAccountSetId(accountSetId, subjectType);
  const localRule = readLocalRule(accountSetId, subjectType);

  try {
    const table = createRuleTable();
    table.Filter = cond('account_set_id', 'equal', ruleAccountSetId);
    const res = await requestClient.post(
      table.queryUrl,
      { Table: [table] },
      { headers: table.getRequestHeader(), responseReturn: 'raw' },
    );
    table.execQueryResult(res);
    const rows = (table.items || []) as SubjectCodeRuleRow[];
    const remoteRule = parseRuleRow(
      rows.find((item) => Number(item.lingma_sys_is_delete ?? 0) !== 1) || rows[0],
    );
    if (remoteRule) {
      writeLocalRule(remoteRule);
      return remoteRule;
    }
  } catch {
    // 表未创建或模型未配置时，使用账套本地缓存/默认规则，避免页面不可用。
  }

  return localRule || normalizeSubjectCodeRule({
    account_set_id: ruleAccountSetId,
    segment_rule: [...DEFAULT_SUBJECT_CODE_RULE],
  });
}

export async function saveSubjectCodeRule(input: Partial<SubjectCodeRule>) {
  const rule = normalizeSubjectCodeRule(input);
  writeLocalRule(rule);

  try {
    const table = createRuleTable();
    table.Filter = cond('account_set_id', 'equal', rule.account_set_id);
    const queryRes = await requestClient.post(
      table.queryUrl,
      { Table: [table] },
      { headers: table.getRequestHeader(), responseReturn: 'raw' },
    );
    table.execQueryResult(queryRes);
    const existing = ((table.items || []) as SubjectCodeRuleRow[]).find(
      (item) => Number(item.lingma_sys_is_delete ?? 0) !== 1,
    );
    const now = getNowString();
    const row: SubjectCodeRuleRow = {
      row_id: existing?.row_id || generateUUID(),
      account_set_id: rule.account_set_id,
      subject_level: rule.subject_level,
      segment_rule_json: JSON.stringify(rule.segment_rule),
      segment1: rule.segment_rule[0] ?? undefined,
      segment2: rule.segment_rule[1] ?? undefined,
      segment3: rule.segment_rule[2] ?? undefined,
      segment4: rule.segment_rule[3] ?? undefined,
      segment5: rule.segment_rule[4] ?? undefined,
      createuser: existing?.createuser || 'U00029',
      createtime: existing?.createtime || now,
      updateuser: 'U00029',
      updatetime: now,
      description: '科目编码规则',
      lingma_sys_is_delete: 0,
      lingma_sys_ent: existing?.lingma_sys_ent || 'NewApp',
    };
    const saveParam = table.getSaveParam(existing ? [] : [row], existing ? [row] : [], []);
    await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
    return { rule, remoteSaved: true };
  } catch (error: any) {
    return { rule, remoteSaved: false, message: error?.message || '编码规则已保存到当前浏览器，远端设置表暂不可用' };
  }
}
