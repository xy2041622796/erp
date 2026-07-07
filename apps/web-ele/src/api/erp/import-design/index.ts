import { cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import {
  getImportSolutions,
  type ImportSolutionRow,
} from '#/api/erp/import-solution';

const IMPORT_FORM_KEY = '41E700C03286416F8D13557C23514BE4';
const DB_NAME = 'QYVirtualPlat';
const ENT_CODE = 'NewApp';
const DEFAULT_USER = 'U00029';

export interface ImportConfigRow {
  rowid: string;
  schemeid: string;
  pid?: string;
  sheetName: string;
  sheet: number;
  titleIndex: number;
  dataIndex: number;
  table: string;
  tableDesc?: string;
  parentField: string;
  parentFieldDesc?: string;
  foreignKeyField: string;
  foreignKeyFieldDesc?: string;
  relatedappid?: string;
  relatedAppName?: string;
  exportType?: string;
  templatePath?: string;
  hasChild?: boolean;
  filters?: string;
  sorted?: string;
  transformType?: string;
  dynamicStartCol?: string;
  dynamicEndCol?: string;
  dynamicTitle?: string;
  dynamicKeyField?: string;
  dynamicValueField?: string;
  skipEmptyValue?: number;
  dynamicStartRow?: number | null;
  dynamicEndRow?: number | null;
  dynamicKeySourceCol?: string;
  dynamicValueSourceCol?: string;
  dynamicStopMode?: string;
  groupKeyCols?: string;
  dictJson?: any;
  createuser?: string;
  createtime?: string;
  updateuser?: string;
  updatetime?: string;
  description?: string;
  lingma_sys_is_delete?: number;
  lingma_sys_ent?: string;
}

export interface ImportFieldRow {
  rowid: string;
  configid: string;
  name: string;
  title: string;
  index?: string;
  refDataid?: string;
  type?: number;
  textField?: string;
  valueField?: string;
  refTable?: string;
  refTableDesc?: string;
  filterField?: string;
  filterValue?: string;
  createuser?: string;
  createtime?: string;
  updateuser?: string;
  updatetime?: string;
  description?: string;
  lingma_sys_is_delete?: number;
  lingma_sys_ent?: string;
}

export interface ApiResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface FieldOrderRuleItem {
  label: string;
  candidates: string[];
}

export interface ReorderImportFieldsPayload {
  schemeId?: string;
  schemeName?: string;
  sheetName?: string;
  fieldOrder: FieldOrderRuleItem[];
}

export interface ReorderImportFieldsResult {
  scheme: ImportSolutionRow;
  config: ImportConfigRow;
  updated: Array<{
    index: string;
    name: string;
    title: string;
  }>;
  unmatched: string[];
}

function getNowString() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function getNewGuid() {
  let guid = '';
  for (let i = 0; i < 32; i++) {
    guid += Math.floor(Math.random() * 16).toString(16);
  }
  return guid.toUpperCase();
}

function getExcelColumnName(index: number) {
  let current = index + 1;
  let result = '';
  while (current > 0) {
    const mod = (current - 1) % 26;
    result = String.fromCharCode(65 + mod) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}

function normalizeCompareValue(value: string | undefined) {
  return String(value || '').trim().toLowerCase();
}

function isFieldMatched(field: ImportFieldRow, rule: FieldOrderRuleItem) {
  const fieldName = normalizeCompareValue(field.name);
  const fieldTitle = normalizeCompareValue(field.title);
  return rule.candidates.some((candidate) => {
    const normalized = normalizeCompareValue(candidate);
    return normalized && (normalized === fieldName || normalized === fieldTitle);
  });
}

function isSaveSuccess(result: any) {
  const httpOk = result?.status === 200;
  const raw = result?.data?.raw ?? result?.data ?? {};
  const message = raw?.Message ?? result?.data?.message ?? raw?.message ?? '';
  const type = raw?.Type ?? raw?.type ?? raw?.status ?? raw?.Status;
  const code = result?.data?.code ?? raw?.Code ?? raw?.code ?? null;
  const success =
    code === 200 ||
    type === 'success' ||
    type === 'Success' ||
    raw?.Success === true ||
    httpOk;

  return {
    success,
    message: message || (success ? '保存成功' : '保存失败'),
    raw,
  };
}

function createImportConfigTable() {
  return new DataTable(IMPORT_FORM_KEY, 'Base_ImportData_Config', DB_NAME, 'rowid');
}

function createImportFieldTable() {
  return new DataTable(IMPORT_FORM_KEY, 'Base_ImportData_Field', DB_NAME, 'rowid');
}

export function createEmptyImportConfig(schemeid: string, pid = ''): ImportConfigRow {
  const now = getNowString();
  return {
    rowid: getNewGuid(),
    schemeid,
    pid,
    sheetName: pid ? '新建子级' : '新建项',
    sheet: 0,
    titleIndex: 1,
    dataIndex: 2,
    table: '',
    tableDesc: '',
    parentField: '',
    parentFieldDesc: '',
    foreignKeyField: '',
    foreignKeyFieldDesc: '',
    relatedappid: '',
    relatedAppName: '',
    exportType: 'tree',
    templatePath: '',
    hasChild: false,
    filters: '',
    sorted: '',
    transformType: '',
    dynamicStartCol: '',
    dynamicEndCol: '',
    dynamicTitle: '',
    dynamicKeyField: '',
    dynamicValueField: '',
    skipEmptyValue: 0,
    dynamicStartRow: null,
    dynamicEndRow: null,
    dynamicKeySourceCol: '',
    dynamicValueSourceCol: '',
    dynamicStopMode: '',
    groupKeyCols: '',
    dictJson: null,
    createuser: DEFAULT_USER,
    createtime: now,
    updateuser: DEFAULT_USER,
    updatetime: now,
    description: '',
    lingma_sys_is_delete: 0,
    lingma_sys_ent: ENT_CODE,
  };
}

export function createEmptyImportField(configid: string): ImportFieldRow {
  const now = getNowString();
  return {
    rowid: getNewGuid(),
    configid,
    name: '',
    title: '',
    index: '',
    refDataid: '',
    type: 0,
    textField: '',
    valueField: '',
    refTable: '',
    refTableDesc: '',
    filterField: '',
    filterValue: '',
    createuser: DEFAULT_USER,
    createtime: now,
    updateuser: DEFAULT_USER,
    updatetime: now,
    description: '',
    lingma_sys_is_delete: 0,
    lingma_sys_ent: ENT_CODE,
  };
}

export async function getImportConfigsBySchemeId(schemeid: string) {
  const table = createImportConfigTable();
  table.Filter = cond('schemeid', 'equal', schemeid);
  const resQuery = await requestClient.post(
    table.queryUrl,
    { Table: [table] },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  table.execQueryResult(resQuery);
  return (table.items || []) as ImportConfigRow[];
}

export async function getImportFieldsByConfigId(configid: string) {
  const table = createImportFieldTable();
  table.Filter = cond('configid', 'equal', configid);
  const resQuery = await requestClient.post(
    table.queryUrl,
    { Table: [table] },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  table.execQueryResult(resQuery);
  return (table.items || []) as ImportFieldRow[];
}

async function saveTable(table: DataTable, added: any[], changed: any[], deleted: any[]) {
  const saveParam = table.getSaveParam(added, changed, deleted);
  const result = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  return isSaveSuccess(result);
}

export async function saveImportConfig(config: ImportConfigRow): Promise<ApiResult<ImportConfigRow>> {
  const table = createImportConfigTable();
  const existing = await getImportConfigsBySchemeId(config.schemeid);
  const exists = existing.some((item) => item.rowid === config.rowid);
  const now = getNowString();
  const row: ImportConfigRow = {
    ...config,
    updateuser: DEFAULT_USER,
    updatetime: now,
    createuser: config.createuser || DEFAULT_USER,
    createtime: config.createtime || now,
    lingma_sys_is_delete: 0,
    lingma_sys_ent: ENT_CODE,
  };

  const saveState = await saveTable(table, exists ? [] : [row], exists ? [row] : [], []);
  if (!saveState.success) {
    return { success: false, message: saveState.message || '保存导入配置失败' };
  }
  return { success: true, message: '保存导入配置成功', data: row };
}

export async function saveImportFields(
  configid: string,
  rows: ImportFieldRow[],
  deletedRowIds: string[] = [],
): Promise<ApiResult<ImportFieldRow[]>> {
  const table = createImportFieldTable();
  const existingRows = await getImportFieldsByConfigId(configid);
  const existingMap = new Map(existingRows.map((item) => [item.rowid, item]));
  const now = getNowString();

  const normalizedRows = rows.map((item) => ({
    ...item,
    configid,
    updateuser: DEFAULT_USER,
    updatetime: now,
    createuser: item.createuser || DEFAULT_USER,
    createtime: item.createtime || now,
    lingma_sys_is_delete: 0,
    lingma_sys_ent: ENT_CODE,
  }));

  const added = normalizedRows.filter((item) => !existingMap.has(item.rowid));
  const changed = normalizedRows.filter((item) => existingMap.has(item.rowid));
  const deleted = existingRows.filter((item) => deletedRowIds.includes(item.rowid));

  if (added.length === 0 && changed.length === 0 && deleted.length === 0) {
    return { success: true, message: '字段映射无变化', data: normalizedRows };
  }

  const saveState = await saveTable(table, added, changed, deleted);
  if (!saveState.success) {
    return { success: false, message: saveState.message || '保存字段映射失败' };
  }
  return { success: true, message: '保存字段映射成功', data: normalizedRows };
}

export async function saveImportDesign(payload: {
  config: ImportConfigRow;
  fields: ImportFieldRow[];
  deletedFieldRowIds?: string[];
}): Promise<ApiResult<{ config: ImportConfigRow; fields: ImportFieldRow[] }>> {
  const configResult = await saveImportConfig(payload.config);
  if (!configResult.success || !configResult.data) {
    return { success: false, message: configResult.message };
  }

  const fieldsResult = await saveImportFields(
    configResult.data.rowid,
    payload.fields.map((item) => ({ ...item, configid: configResult.data!.rowid })),
    payload.deletedFieldRowIds || [],
  );

  if (!fieldsResult.success) {
    return {
      success: false,
      message: `主配置已保存，但字段映射保存失败: ${fieldsResult.message}`,
      data: {
        config: configResult.data,
        fields: payload.fields,
      },
    };
  }

  return {
    success: true,
    message: '导入配置保存成功',
    data: {
      config: configResult.data,
      fields: fieldsResult.data || [],
    },
  };
}

export async function reorderImportFieldsByScheme(
  payload: ReorderImportFieldsPayload,
): Promise<ApiResult<ReorderImportFieldsResult>> {
  if (!payload.schemeId && !payload.schemeName?.trim()) {
    return { success: false, message: '请提供方案ID或方案名称' };
  }
  if (!payload.fieldOrder?.length) {
    return { success: false, message: '字段排序规则不能为空' };
  }

  const solutions = await getImportSolutions();
  const scheme = solutions.find((item) => {
    if (payload.schemeId && item.rowid === payload.schemeId) return true;
    if (payload.schemeName?.trim() && item.solutionName === payload.schemeName.trim()) {
      return true;
    }
    return false;
  });

  if (!scheme) {
    return { success: false, message: '未找到对应的导入导出方案' };
  }

  const configs = await getImportConfigsBySchemeId(scheme.rowid);
  const config = payload.sheetName?.trim()
    ? configs.find((item) => item.sheetName === payload.sheetName!.trim())
    : configs.find((item) => item.pid === scheme.rowid) || configs[0];

  if (!config) {
    return { success: false, message: '未找到方案对应的主表配置节点' };
  }

  const fields = await getImportFieldsByConfigId(config.rowid);
  if (!fields.length) {
    return { success: false, message: '当前配置节点下没有可排序字段' };
  }

  const clonedFields = fields.map((item) => ({ ...item }));
  const usedRowIds = new Set<string>();
  const updated: Array<{ index: string; name: string; title: string }> = [];
  const unmatched: string[] = [];

  payload.fieldOrder.forEach((rule, orderIndex) => {
    const target = clonedFields.find(
      (field) => !usedRowIds.has(field.rowid) && isFieldMatched(field, rule),
    );

    if (!target) {
      unmatched.push(rule.label);
      return;
    }

    target.index = getExcelColumnName(orderIndex);
    usedRowIds.add(target.rowid);
    updated.push({
      index: target.index,
      name: target.name,
      title: target.title,
    });
  });

  if (!updated.length) {
    return { success: false, message: '没有匹配到任何可更新的字段' };
  }

  const saveResult = await saveImportFields(config.rowid, clonedFields, []);
  if (!saveResult.success) {
    return { success: false, message: saveResult.message || '保存字段排序失败' };
  }

  return {
    success: true,
    message: unmatched.length
      ? `字段排序已保存，未匹配字段：${unmatched.join('、')}`
      : '字段排序已保存',
    data: {
      scheme,
      config,
      updated,
      unmatched,
    },
  };
}

export async function deleteImportConfig(config: ImportConfigRow): Promise<ApiResult> {
  const configTable = createImportConfigTable();
  const fieldTable = createImportFieldTable();
  const childRows = await getImportConfigsBySchemeId(config.schemeid);
  if (childRows.some((item) => item.pid === config.rowid)) {
    return { success: false, message: '当前节点存在子级，请先删除子级节点' };
  }

  const fields = await getImportFieldsByConfigId(config.rowid);
  if (fields.length > 0) {
    const deleteFieldState = await saveTable(fieldTable, [], [], fields);
    if (!deleteFieldState.success) {
      return { success: false, message: deleteFieldState.message || '删除字段映射失败' };
    }
  }

  const deleteConfigState = await saveTable(configTable, [], [], [config]);
  if (!deleteConfigState.success) {
    return { success: false, message: deleteConfigState.message || '删除配置节点失败' };
  }

  return { success: true, message: '删除成功' };
}
