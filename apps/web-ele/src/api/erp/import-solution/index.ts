import { DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';

const IMPORT_SOLUTION_FORM_KEY = 'EE51818A60B93DBFDD6222A2D2F6606B';
const DB_NAME = 'QYVirtualPlat';
const ENT_CODE = 'NewApp';
const DEFAULT_USER = 'U00029';
const DEFAULT_MENU_ID = 'A3A38857F7584319844A826EF9AAA881';
const IMPORT_SOLUTION_TABLE = 'QYVirtualPlat@Base_Import_solution';
const IMPORT_CONFIG_TABLE = 'QYVirtualPlat@Base_ImportData_Config';
const IMPORT_FIELD_TABLE = 'QYVirtualPlat@Base_ImportData_Field';

export interface ImportSolutionRow {
  rowid: string;
  coding?: string;
  solutionName: string;
  createuser?: string;
  createtime?: string;
  updateuser?: string;
  updatetime?: string;
  description?: string;
  lingma_sys_is_delete?: number;
  lingma_sys_ent?: string;
}

export interface ImportConfigRow {
  schemeid: string;
  rowid: string;
  sheet: number;
  sheetName: string;
  titleIndex: number;
  dataIndex: number;
  table: string;
  tableDesc?: string;
  parentField: string;
  parentFieldDesc?: string;
  foreignKeyField: string;
  foreignKeyFieldDesc?: string;
  pid: string;
  exportType: string;
  filters?: string;
  sorted?: string;
  relatedappid?: string;
  relatedAppName?: string;
  templatePath?: string;
  hasChild?: boolean;
  transformType?: string;
  dynamicStartCol?: string;
  dynamicEndCol?: string;
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
  name?: string;
  title?: string;
  index?: string;
  type?: number | null;
  textField?: string;
  valueField?: string;
  refDataid?: string;
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

export interface ImportConfigWithFields {
  configRow?: Partial<ImportConfigRow>;
  fieldRows?: Partial<ImportFieldRow>[];
}

export interface CreateImportSolutionOptions {
  rootConfigRow?: Partial<ImportConfigRow>;
  rootFieldRows?: Partial<ImportFieldRow>[];
  childConfigRow?: Partial<ImportConfigRow>;
  childFieldRows?: Partial<ImportFieldRow>[];
  childConfigs?: ImportConfigWithFields[];
  includeChildConfig?: boolean;
  includeDefaultFieldRows?: boolean;
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

function createImportSolutionTable() {
  return new DataTable(IMPORT_SOLUTION_FORM_KEY, 'Base_Import_solution', DB_NAME, 'rowid');
}

async function saveTable(table: DataTable, added: any[], changed: any[], deleted: any[]) {
  const saveParam = table.getSaveParam(added, changed, deleted);
  const result = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  return isSaveSuccess(result);
}

async function saveByPayload(table: DataTable, payload: any) {
  const result = await requestClient.post(table.saveUrl, payload, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  return isSaveSuccess(result);
}

export async function getImportSolutions() {
  const table = createImportSolutionTable();
  const resQuery = await requestClient.post(
    table.queryUrl,
    { Table: [table] },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  table.execQueryResult(resQuery);
  return (table.items || []) as ImportSolutionRow[];
}

export function createEmptyImportSolution(): ImportSolutionRow {
  const now = getNowString();
  return {
    rowid: getNewGuid(),
    coding: '',
    solutionName: '',
    createuser: DEFAULT_USER,
    createtime: now,
    updateuser: DEFAULT_USER,
    updatetime: now,
    description: '',
    lingma_sys_is_delete: 0,
    lingma_sys_ent: ENT_CODE,
  };
}

function createBaseConfigRow(
  solutionId: string,
  overrides: Partial<ImportConfigRow> | undefined,
  defaults: {
    rowid: string;
    pid: string;
    sheet: number;
    sheetName: string;
  },
): ImportConfigRow {
  const now = getNowString();
  return {
    schemeid: solutionId,
    rowid: defaults.rowid,
    sheet: overrides?.sheet ?? defaults.sheet,
    sheetName: overrides?.sheetName || defaults.sheetName,
    titleIndex: overrides?.titleIndex ?? 1,
    dataIndex: overrides?.dataIndex ?? 2,
    table: overrides?.table || '',
    tableDesc: overrides?.tableDesc || '',
    parentField: overrides?.parentField || '',
    parentFieldDesc: overrides?.parentFieldDesc || '',
    foreignKeyField: overrides?.foreignKeyField || '',
    foreignKeyFieldDesc: overrides?.foreignKeyFieldDesc || '',
    pid: overrides?.pid || defaults.pid,
    exportType: overrides?.exportType || 'tree',
    filters: overrides?.filters || '',
    sorted: overrides?.sorted || '',
    relatedappid: overrides?.relatedappid || '',
    relatedAppName: overrides?.relatedAppName || '',
    templatePath: overrides?.templatePath || '',
    hasChild: overrides?.hasChild ?? false,
    transformType: overrides?.transformType || '',
    dynamicStartCol: overrides?.dynamicStartCol || '',
    dynamicEndCol: overrides?.dynamicEndCol || '',
    dynamicKeyField: overrides?.dynamicKeyField || '',
    dynamicValueField: overrides?.dynamicValueField || '',
    skipEmptyValue: overrides?.skipEmptyValue ?? 0,
    dynamicStartRow: overrides?.dynamicStartRow ?? null,
    dynamicEndRow: overrides?.dynamicEndRow ?? null,
    dynamicKeySourceCol: overrides?.dynamicKeySourceCol || '',
    dynamicValueSourceCol: overrides?.dynamicValueSourceCol || '',
    dynamicStopMode: overrides?.dynamicStopMode || '',
    groupKeyCols: overrides?.groupKeyCols || '',
    dictJson: overrides?.dictJson ?? null,
    createuser: overrides?.createuser || DEFAULT_USER,
    createtime: overrides?.createtime || now,
    updateuser: DEFAULT_USER,
    updatetime: now,
    description: overrides?.description || '',
    lingma_sys_is_delete: 0,
    lingma_sys_ent: ENT_CODE,
  };
}

function createDefaultFieldRow(configid: string): ImportFieldRow {
  const now = getNowString();
  return {
    rowid: getNewGuid(),
    configid,
    name: '',
    title: '',
    index: '',
    type: null,
    textField: '',
    valueField: '',
    refDataid: '',
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

function normalizeFieldRows(fieldRows: Partial<ImportFieldRow>[] | undefined, defaultConfigId: string) {
  const now = getNowString();
  return (fieldRows || []).map((item) => ({
    rowid: item.rowid || getNewGuid(),
    configid: item.configid || defaultConfigId,
    name: item.name || '',
    title: item.title || '',
    index: item.index || '',
    type: item.type ?? null,
    textField: item.textField || '',
    valueField: item.valueField || '',
    refDataid: item.refDataid || '',
    refTable: item.refTable || '',
    refTableDesc: item.refTableDesc || '',
    filterField: item.filterField || '',
    filterValue: item.filterValue || '',
    createuser: item.createuser || DEFAULT_USER,
    createtime: item.createtime || now,
    updateuser: DEFAULT_USER,
    updatetime: now,
    description: item.description || '',
    lingma_sys_is_delete: 0,
    lingma_sys_ent: ENT_CODE,
  }));
}

function buildDefaultCreateData(solutionId: string, options?: CreateImportSolutionOptions) {
  const rootConfigId = options?.rootConfigRow?.rowid || getNewGuid();
  const includeDefaultFieldRows = options?.includeDefaultFieldRows !== false;
  const resolvedChildConfigs = Array.isArray(options?.childConfigs)
    ? options.childConfigs
    : options?.includeChildConfig === false
      ? []
      : options?.childConfigRow
        ? [{ configRow: options.childConfigRow, fieldRows: options.childFieldRows }]
        : [];

  const rootConfigRow = createBaseConfigRow(solutionId, options?.rootConfigRow, {
    rowid: rootConfigId,
    pid: solutionId,
    sheet: 0,
    sheetName: '新建项',
  });

  const configRows: ImportConfigRow[] = [rootConfigRow];
  const fieldRows: ImportFieldRow[] = [...normalizeFieldRows(options?.rootFieldRows, rootConfigId)];
  const childConfigIds: string[] = [];

  resolvedChildConfigs.forEach((childConfig, index) => {
    const childConfigId = childConfig?.configRow?.rowid || getNewGuid();
    childConfigIds.push(childConfigId);
    configRows.push(
      createBaseConfigRow(solutionId, childConfig?.configRow, {
        rowid: childConfigId,
        pid: rootConfigId,
        sheet: childConfig?.configRow?.sheet ?? index + 1,
        sheetName: childConfig?.configRow?.sheetName || '新建子级',
      }),
    );
    fieldRows.push(...normalizeFieldRows(childConfig?.fieldRows, childConfigId));
  });

  if (includeDefaultFieldRows && fieldRows.length === 0) {
    fieldRows.push(createDefaultFieldRow(rootConfigId));
    childConfigIds.forEach((configId) => {
      fieldRows.push(createDefaultFieldRow(configId));
    });
  }

  return {
    configRows,
    fieldRows,
  };
}

function buildCreatePayload(
  solutionRow: ImportSolutionRow,
  configRows: ImportConfigRow[],
  fieldRows: ImportFieldRow[] = [],
) {
  const payload: any[] = [
    {
      TableName: IMPORT_SOLUTION_TABLE,
      CrudModel: {
        Added: [
          {
            rowid: solutionRow.rowid,
            solutionName: solutionRow.solutionName,
            createuser: solutionRow.createuser,
            createtime: solutionRow.createtime,
            updateuser: solutionRow.updateuser,
            updatetime: solutionRow.updatetime,
            description: solutionRow.description,
            lingma_sys_is_delete: solutionRow.lingma_sys_is_delete,
            lingma_sys_ent: solutionRow.lingma_sys_ent,
          },
        ],
        Changed: [],
        Deleted: [],
      },
    },
    {
      TableName: IMPORT_CONFIG_TABLE,
      CrudModel: {
        Added: configRows,
        Changed: [],
        Deleted: [],
      },
    },
  ];

  if (fieldRows.length > 0) {
    payload.push({
      TableName: IMPORT_FIELD_TABLE,
      CrudModel: {
        Added: fieldRows,
        Changed: [],
        Deleted: [],
      },
    });
  }

  return payload;
}

export async function createImportSolution(
  solutionName: string,
  options?: CreateImportSolutionOptions,
): Promise<ApiResult<ImportSolutionRow>> {
  const table = createImportSolutionTable();
  const now = getNowString();
  const row: ImportSolutionRow = {
    rowid: getNewGuid(),
    coding: '',
    solutionName,
    createuser: DEFAULT_USER,
    createtime: now,
    updateuser: DEFAULT_USER,
    updatetime: now,
    description: '',
    lingma_sys_is_delete: 0,
    lingma_sys_ent: ENT_CODE,
  };

  const { configRows, fieldRows } = buildDefaultCreateData(row.rowid, options);
  const createPayload = buildCreatePayload(row, configRows, fieldRows);
  const createState = await saveByPayload(table, createPayload);
  if (!createState.success) {
    return { success: false, message: createState.message || '新增方案失败' };
  }

  try {
    const codeRes = await getCodeString(row.rowid, DEFAULT_MENU_ID, table.getRequestHeader());
    const codeData = codeRes?.data as any;
    if (codeData?.Code === 200 && codeData?.Message) {
      row.coding = codeData.Message;
      const updateState = await saveTable(table, [], [row], []);
      if (!updateState.success) {
        return {
          success: true,
          message: '方案已新增，但方案编码写回失败，请稍后重新保存',
          data: row,
        };
      }
    }
  } catch {
    return {
      success: true,
      message: '方案已新增，但方案编码生成失败，请稍后重试',
      data: row,
    };
  }

  return { success: true, message: '新增方案成功', data: row };
}

export async function updateImportSolution(row: ImportSolutionRow): Promise<ApiResult<ImportSolutionRow>> {
  const table = createImportSolutionTable();
  const now = getNowString();
  const payload: ImportSolutionRow = {
    ...row,
    updateuser: DEFAULT_USER,
    updatetime: now,
    createuser: row.createuser || DEFAULT_USER,
    createtime: row.createtime || now,
    lingma_sys_is_delete: 0,
    lingma_sys_ent: ENT_CODE,
  };
  const saveState = await saveTable(table, [], [payload], []);
  if (!saveState.success) {
    return { success: false, message: saveState.message || '保存方案失败' };
  }
  return { success: true, message: '保存方案成功', data: payload };
}

export async function deleteImportSolution(row: ImportSolutionRow): Promise<ApiResult> {
  const table = createImportSolutionTable();
  const saveState = await saveTable(table, [], [], [row]);
  if (!saveState.success) {
    return { success: false, message: saveState.message || '删除方案失败' };
  }
  return { success: true, message: '删除方案成功' };
}
