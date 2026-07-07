import { generateUUID } from '@vben/utils';
import { and, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getSimpleDeptList } from '#/api/system/dept';

import { createFinanceDataTableCurrent } from '../../common/account-set-scope';

const FIN_AUX_MODEL_ID = '5B21EC55F1C3FA8682C6527629FFC25F';
const FIN_AUX_DB = 'LMBill';
const FIN_AUX_PK = 'row_id';

type AuxDimCode = 'CUSTOMER' | 'DEPT' | 'EMPLOYEE' | 'PROJECT' | 'STAFF' | 'SUPPLIER';

export type FinanceAuxValueOption = {
  label: string;
  raw: Record<string, any>;
  value: string;
};

type AuxTableConfig = {
  codeField: string;
  dimCode: AuxDimCode;
  nameField: string;
  tableName: string;
};

const AUX_TABLE_CONFIGS: AuxTableConfig[] = [
  {
    dimCode: 'CUSTOMER',
    tableName: 'Bil_Fin_Aux_Customer',
    codeField: 'customer_code',
    nameField: 'customer_name',
  },
  {
    dimCode: 'SUPPLIER',
    tableName: 'Bil_Fin_Aux_Supplier',
    codeField: 'supplier_code',
    nameField: 'supplier_name',
  },
  {
    dimCode: 'DEPT',
    tableName: 'Bil_Fin_Aux_Department',
    codeField: 'department_code',
    nameField: 'department_name',
  },
  {
    dimCode: 'PROJECT',
    tableName: 'Bil_Fin_Aux_Project',
    codeField: 'project_code',
    nameField: 'project_name',
  },
  {
    dimCode: 'STAFF',
    tableName: 'Bil_Fin_Aux_Employee',
    codeField: 'employee_code',
    nameField: 'employee_name',
  },
];

function extractItems(raw: any): any[] {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  return Array.isArray(resultData?.Items) ? resultData.Items : [];
}

function normalizeDimCode(code: any): AuxDimCode | '' {
  const key = String(code || '').trim().toUpperCase();
  if (key === 'DEPARTMENT') return 'DEPT';
  if (key === 'EMPLOYEE') return 'STAFF';
  if (key === 'STAFF') return 'STAFF';
  if (key === 'CUSTOMER') return 'CUSTOMER';
  if (key === 'SUPPLIER') return 'SUPPLIER';
  if (key === 'PROJECT') return 'PROJECT';
  if (key === 'DEPT') return 'DEPT';
  return '';
}

function getConfigs(dimCodes?: string[]) {
  const normalized = (dimCodes || [])
    .map((item) => normalizeDimCode(item))
    .filter(Boolean);
  if (normalized.length === 0) return AUX_TABLE_CONFIGS;
  const allow = new Set(normalized);
  return AUX_TABLE_CONFIGS.filter((item) => allow.has(item.dimCode));
}

function buildOption(row: any, config: AuxTableConfig): FinanceAuxValueOption | null {
  const code = String(row?.[config.codeField] ?? '').trim();
  if (!code) return null;
  const name = String(row?.[config.nameField] ?? '').trim();
  return {
    value: code,
    label: [code, name].filter(Boolean).join(' ').trim() || code,
    raw: {
      ...row,
      dimCode: config.dimCode,
      dim_code: config.dimCode,
      value_code: code,
      value_name: name || code,
    },
  };
}

async function fetchFinanceAuxValueOptionsByConfig(
  config: AuxTableConfig,
  params: { keyword?: string } = {},
) {
  const table = createFinanceDataTableCurrent(
    FIN_AUX_MODEL_ID,
    config.tableName,
    FIN_AUX_DB,
    FIN_AUX_PK,
  );
  table.Type = '数据库表';

  const filterConds: any[] = [];

  const keyword = String(params.keyword || '').trim();
  if (keyword) {
    filterConds.push(
      or(
        cond(config.codeField, 'contains', keyword),
        cond(config.nameField, 'contains', keyword),
      ),
    );
  }

  if (filterConds.length > 0) {
    table.Filter = filterConds.length === 1 ? filterConds[0] : and(...filterConds);
  }

  const resQuery = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
      PageParam: { page: 0, index: 1 },
    },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  table.execQueryResult(resQuery);
  return extractItems(resQuery)
    .map((row) => buildOption(row, config))
    .filter(Boolean) as FinanceAuxValueOption[];
}

export async function getFinanceAuxiliaryValueOptions(params: {
  dimCodes?: string[];
  keyword?: string;
} = {}) {
  const configs = getConfigs(params.dimCodes);
  const entries = await Promise.all(
    configs.map(async (config) => {
      const options = await fetchFinanceAuxValueOptionsByConfig(config, params);
      return [config.dimCode, options] as const;
    }),
  );

  const result: Record<string, FinanceAuxValueOption[]> = {};
  for (const [dimCode, options] of entries) {
    result[dimCode] = options;
    if (dimCode === 'STAFF') {
      result.EMPLOYEE = options;
    }
  }
  return result;
}


export type FinanceAuxRecord = Record<string, any>;

export function getFinanceAuxTableConfig(dimCode: string) {
  const normalized = normalizeDimCode(dimCode);
  return AUX_TABLE_CONFIGS.find((item) => item.dimCode === normalized) || null;
}

export async function getFinanceAuxRecordPage(params: {
  dimCode: string;
  keyword?: string;
  page?: number;
  pageNo?: number;
  showDisabled?: boolean;
  subjectId?: string;
}) {
  const config = getFinanceAuxTableConfig(params.dimCode);
  if (!config) return { list: [], total: 0 };

  const table = createFinanceDataTableCurrent(
    FIN_AUX_MODEL_ID,
    config.tableName,
    FIN_AUX_DB,
    FIN_AUX_PK,
  );
  table.Type = '数据库表';

  const filterConds: any[] = [];

  const subjectId = String((params as any).subjectId || '').trim();
  if (subjectId && config.dimCode === 'CUSTOMER') {
    filterConds.push(cond('source_parent_subject_id', 'equal', subjectId));
  }

  const keyword = String(params.keyword || '').trim();
  if (keyword) {
    filterConds.push(
      or(
        cond(config.codeField, 'contains', keyword),
        cond(config.nameField, 'contains', keyword),
      ),
    );
  }

  if (filterConds.length > 0) {
    table.Filter = filterConds.length === 1 ? filterConds[0] : and(...filterConds);
  }

  const resQuery = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
      PageParam: {
        page: params.page || 0,
        index: params.pageNo || 1,
      },
    },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  table.execQueryResult(resQuery);
  const resultData = resQuery?.data?.Result?.data || resQuery?.data?.Result || resQuery?.data;
  const list = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = Number(resultData?.Count ?? list.length ?? 0);
  return { list, total };
}

function getNextCodeByRows(rows: any[], codeField: string, prefix: string) {
  let max = 0;
  for (const row of rows || []) {
    const raw = String(row?.[codeField] ?? '').trim();
    if (!raw) continue;
    const matched = raw.match(/(\d+)$/);
    if (!matched) continue;
    const num = Number(matched[1]);
    if (Number.isFinite(num) && num > max) max = num;
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

async function generateNextFinanceAuxCode(config: AuxTableConfig, prefix: string) {
  const table = createFinanceDataTableCurrent(
    FIN_AUX_MODEL_ID,
    config.tableName,
    FIN_AUX_DB,
    FIN_AUX_PK,
  );
  table.Type = '数据库表';

  const resQuery = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
      PageParam: { page: 0, index: 1 },
    },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  table.execQueryResult(resQuery);
  return getNextCodeByRows(extractItems(resQuery), config.codeField, prefix);
}

export async function createFinanceAuxRecord(dimCode: string, data: FinanceAuxRecord) {
  const config = getFinanceAuxTableConfig(dimCode);
  if (!config) throw new Error('不支持的辅助核算类型');

  const table = createFinanceDataTableCurrent(
    FIN_AUX_MODEL_ID,
    config.tableName,
    FIN_AUX_DB,
    FIN_AUX_PK,
  );
  table.Type = '数据库表';

  const autoCode =
    config.dimCode === 'CUSTOMER' && !String(data?.[config.codeField] ?? '').trim()
      ? await generateNextFinanceAuxCode(config, 'KH')
      : undefined;

  const payload = {
    ...data,
    ...(autoCode ? { [config.codeField]: autoCode } : {}),
    row_id: data.row_id || generateUUID(),
    enabled: data.enabled ?? 1,
    sort_no: data.sort_no ?? 0,
    lingma_sys_is_delete: data.lingma_sys_is_delete ?? 0,
  };

  const saveParam = table.getSaveParam([payload], [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateFinanceAuxRecord(dimCode: string, data: FinanceAuxRecord) {
  const config = getFinanceAuxTableConfig(dimCode);
  if (!config) throw new Error('不支持的辅助核算类型');
  if (!data.row_id) throw new Error('缺少 row_id');

  const table = createFinanceDataTableCurrent(
    FIN_AUX_MODEL_ID,
    config.tableName,
    FIN_AUX_DB,
    FIN_AUX_PK,
  );
  table.Type = '数据库表';

  const payload = {
    ...data,
    enabled: data.enabled ?? 1,
    sort_no: data.sort_no ?? 0,
    lingma_sys_is_delete: data.lingma_sys_is_delete ?? 0,
  };

  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function deleteFinanceAuxRecord(dimCode: string, rowId: string) {
  return await updateFinanceAuxRecord(dimCode, {
    row_id: rowId,
    lingma_sys_is_delete: 1,
  });
}

function normalizeAuxText(value: any) {
  return String(value ?? '').trim();
}

function normalizeDeptCode(value: any) {
  return normalizeAuxText(value);
}

function buildDeptSort(value: any, index: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : index + 1;
}

export async function initializeFinanceAuxDepartmentsFromSystemDept() {
  const config = getFinanceAuxTableConfig('DEPT');
  if (!config) throw new Error('未找到部门辅助核算配置');

  const sourceList = (await getSimpleDeptList()).filter((item: any) => {
    return normalizeDeptCode(item?.id) && normalizeAuxText(item?.name);
  });

  if (sourceList.length === 0) {
    throw new Error('系统部门表没有可初始化的数据');
  }

  const table = createFinanceDataTableCurrent(
    FIN_AUX_MODEL_ID,
    config.tableName,
    FIN_AUX_DB,
    FIN_AUX_PK,
  );
  table.Type = '数据库表';
  table.Filter = cond('department_code', 'notequal', '');

  const currentRes = await requestClient.post(
    table.queryUrl,
    { Table: [table], PageParam: { page: 0, index: 1 } },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );
  table.execQueryResult(currentRes);
  const currentRows = extractItems(currentRes);

  const currentByCode = new Map<string, any>();
  for (const row of currentRows) {
    const code = normalizeDeptCode(row?.department_code);
    if (code && !currentByCode.has(code)) currentByCode.set(code, row);
  }

  const sourceNameByCode = new Map<string, string>();
  for (const item of sourceList) {
    sourceNameByCode.set(normalizeDeptCode((item as any).id), normalizeAuxText((item as any).name));
  }

  const added: any[] = [];
  const changed: any[] = [];
  const sourceCodes = new Set<string>();

  sourceList.forEach((item: any, index: number) => {
    const code = normalizeDeptCode(item?.id);
    const name = normalizeAuxText(item?.name);
    if (!code || !name) return;
    sourceCodes.add(code);

    const parentCode = normalizeDeptCode(item?.parentId);
    const payload: any = {
      department_code: code,
      department_name: name,
      department_short_name: name,
      parent_department_code: parentCode && parentCode !== '0' ? parentCode : '',
      parent_department_name: parentCode && parentCode !== '0' ? sourceNameByCode.get(parentCode) || '' : '',
      source_system: 'SYSTEM',
      source_table: 'Base_DepartInfo',
      source_row_id: code,
      source_code: code,
      enabled: Number(item?.status ?? 1) === 1 ? 1 : 0,
      sort_no: buildDeptSort(item?.sort, index),
      lingma_sys_is_delete: 0,
    };

    const current = currentByCode.get(code);
    if (current?.row_id) {
      changed.push({ row_id: current.row_id, ...payload });
    } else {
      added.push({ row_id: generateUUID(), ...payload });
    }
  });

  for (const row of currentRows) {
    const code = normalizeDeptCode(row?.department_code);
    if (!code || sourceCodes.has(code) || Number(row?.lingma_sys_is_delete ?? 0) === 1) continue;
    changed.push({
      row_id: row.row_id,
      department_code: code,
      lingma_sys_is_delete: 1,
    });
  }

  if (added.length > 0 || changed.length > 0) {
    const saveParam = table.getSaveParam(added, changed, []);
    await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
  }

  return {
    addedCount: added.length,
    updatedCount: changed.filter((row) => Number(row?.lingma_sys_is_delete ?? 0) !== 1).length,
    deletedCount: changed.filter((row) => Number(row?.lingma_sys_is_delete ?? 0) === 1).length,
    sourceCount: sourceList.length,
  };
}
