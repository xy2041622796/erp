import ExcelJS from 'exceljs';

import type { ImportSchemeDetail } from '#/api/erp/import-design/scheme';
import { getImportSchemeDetail } from '#/api/erp/import-design/scheme';
import { getSalaryItemMetaPage } from '#/api/erp/finance/cashier/settings/payroll';
import { getSalaryRankEmployeeList } from '#/api/erp/finance/cashier/rank';
import { getSalaryRuleBundle } from '#/api/erp/finance/cashier/salaryRule';
import {
  getSalaryRuleAssignmentPage,
  matchSalaryRuleAssignment,
  type SalaryRuleAssignmentApi,
} from '#/api/erp/finance/cashier/salaryRuleAssignment';
import {
  getSalarySlipItemPage,
  getSalarySlipPage,
} from '#/api/erp/finance/cashier/wages';
import {
  transformByImportExportConfig,
  type DictConfigMappingRow,
  type RowColumnTransformConfig,
} from '#/utils';
import { getCanonicalSalaryFieldCode, getSalaryFieldValue } from './salary-field-registry';
import { calcSalaryTaxByRule, type SalaryTaxRule } from './tax-rules';

export const WAGES_OVERALL_SCHEME_ID = 'E40FE264A6EF284DA9CFD8A0FC4D4EBD';

/**
 * 导出阶段统一使用的“完整明细行”结构。
 *
 * 为什么要定义这个类型：
 * - 工资表主表数据和工资表明细表数据原本分散在两张表里
 * - 导出时为了统一做行列互转，需要先把主表字段补到明细行上
 * - 后续所有导出处理都只面对这一种“拍平后的完整行对象”
 */
export type ExportDetailRow = Record<string, any> & {
  dept_name?: string;
  pay_month?: string;
  salary_month?: string;
};

/**
 * 单个 worksheet 最终需要的数据载体。
 *
 * 这个对象会在“方案解析完成后”生成，再交给 fillWorksheet 统一写入 Excel。
 */
export type WorkbookSheetPayload = {
  dataIndex: number;
  dynamicHeaders: Array<{ column: string; key: string; title: string }>;
  fileNameSegment: string;
  fixedFields: Array<{ index: string; name: string; title: string }>;
  rows: Record<string, any>[];
  sheetName: string;
  titleIndex: number;
};

/**
 * 对外暴露的导出结果。
 *
 * 方便页面层在需要时拿到一些导出后的反馈信息，
 * 比如导出了多少条数据、使用了哪个方案名。
 */
export interface ExportWagesBySchemeIdResult {
  fileName: string;
  rowCount: number;
  schemeId: string;
  schemeName: string;
  sheetName: string;
}

/**
 * 单行导入解析后的工资数据。
 *
 * 这里的结构故意与工资录入页 / createSalarySlip 所需的行结构保持一致，
 * 这样后续无论是：
 * - 先回填到录入弹窗里给用户确认
 * - 还是直接拿去保存
 * 都不需要再做二次转换。
 */
export interface ParsedWagesImportRow {
  companyFund: number;
  companySocial: number;
  deductTotal: number;
  detailDept: string;
  detailDeptId?: string;
  detailProject: string;
  employeeId?: string;
  employeeName: string;
  employeeNo?: string;
  rankCode?: string;
  rankId?: string;
  rankName?: string;
  feeType: string;
  itemValues: Record<string, number>;
  realPay: number;
  remark: string;
  shouldPay: number;
  tax: number;
}

/**
 * 导入解析后的完整结果。
 *
 * payload 字段会尽量对齐工资表保存接口需要的结构，
 * 方便页面层直接复用。
 */
export interface ParseWagesImportBySchemeIdResult {
  payload: {
    attachmentName: string;
    dept: string;
    items: Array<{
      item_category?: string;
      item_code?: string;
      item_direction?: string;
      item_name?: string;
      sort_no?: number;
    }>;
    month: string;
    payMonth: string;
    project: string;
    remark: string;
    rows: ParsedWagesImportRow[];
  };
  rowCount: number;
  schemeId: string;
  schemeName: string;
  sheetName: string;
}

/**
 * 将任意值转为去首尾空格后的字符串。
 *
 * 这是整个导入/导出过程里最常用的标准化操作：
 * - 方案 id 判空
 * - 表字段名读取
 * - 动态列 key / title / column 读取
 * - 文件名 / sheet 名拼装
 */
function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

/**
 * 只接受 `Base_Import_solution.rowid` 这种 32 位主键。
 */
function isBaseImportSolutionId(value: unknown) {
  return /^[A-F0-9]{32}$/i.test(normalizeText(value));
}

/**
 * 标准化并校验方案主表 ID。
 *
 * 这里强调：传入的 schemaId / schemeId 必须是 `Base_Import_solution.rowid`，
 * 后续所有配置、字段都要再通过这个主表 ID 去子表反查。
 */
function normalizeSchemeId(value: unknown) {
  const normalized = normalizeText(value);
  return isBaseImportSolutionId(normalized) ? normalized : '';
}

/**
 * 将任意值标准化为数字，并统一保留两位小数。
 *
 * 这样做是为了避免：
 * - 后端返回 null / undefined / ''
 * - 某些字段是字符串数字
 * - Excel 导入/导出时出现 NaN
 */
function normalizeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

const WAGES_EXPORT_DEBUG_KEY = 'wages_export_debug';

function isWagesExportDebugEnabled() {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  try {
    const search = new URLSearchParams(window.location.search || '');
    return win.__WAGES_EXPORT_DEBUG__ === true
      || window.localStorage?.getItem(WAGES_EXPORT_DEBUG_KEY) === '1'
      || window.sessionStorage?.getItem(WAGES_EXPORT_DEBUG_KEY) === '1'
      || search.get('wagesExportDebug') === '1';
  } catch {
    return win.__WAGES_EXPORT_DEBUG__ === true;
  }
}

function debugWagesExport(label: string, payload?: unknown) {
  if (!isWagesExportDebugEnabled()) return;
  const time = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log('[wages-export-debug][' + time + '] ' + label, payload ?? '');
}

function debugWagesExportTable(label: string, rows: unknown[]) {
  if (!isWagesExportDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.groupCollapsed('[wages-export-debug] ' + label + ' (' + (Array.isArray(rows) ? rows.length : 0) + ')');
  if (Array.isArray(rows)) {
    // eslint-disable-next-line no-console
    console.table(rows);
  } else {
    // eslint-disable-next-line no-console
    console.log(rows);
  }
  // eslint-disable-next-line no-console
  console.groupEnd();
}

/**
 * 获取当前年月，作为导出文件名兜底值。
 */
function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const monthText = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${monthText}`;
}

/**
 * 浏览器端下载工作簿。
 *
 * 这是整个导出动作的最后一步：
 * 1. workbook 转成 xlsx 二进制
 * 2. 用 Blob 包装成浏览器可下载对象
 * 3. 创建临时 a 标签触发下载
 * 4. 下载后释放 URL，避免内存泄漏
 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 根据方案主表 ID 读取完整方案详情。
 *
 * 这里传入的 schemaId / schemeId 必须是 `Base_Import_solution.rowid`。
 * 读取流程是：
 * 1. 先命中 `Base_Import_solution`
 * 2. 再通过 `schemeid = Base_Import_solution.rowid` 去查 `Base_ImportData_Config`
 * 3. 再通过 `configid = Base_ImportData_Config.rowid` 去查 `Base_ImportData_Field`
 *
 * 因此，真正生效的方案内容来自子级配置与字段，而不是工资明细表里的某个零散字段本身。
 */
export async function getExportSchemeDetailBySchemaId(
  schemaId: string,
): Promise<ImportSchemeDetail | null> {
  const normalizedSchemaId = normalizeSchemeId(schemaId);
  if (!normalizedSchemaId) return null;

  return getImportSchemeDetail({
    schemeId: normalizedSchemaId,
    table: 'LMBill@Bil_Salary_Slip_Item',
  });
}

/**
 * 读取工资表主表的“全量数据”。
 *
 * 当前这里不再接收月份等筛选条件，
 * 因为你现在要求对外只保留一个 schemaId 参数。
 */
async function fetchAllSalarySlips() {
  const res = await getSalarySlipPage({ pageNo: 1, page: 0 });
  return res.list || [];
}

/**
 * 根据主表 rowid 列表读取工资表明细全量数据。
 */
async function fetchAllSalarySlipDetails(slipIds: string[]) {
  const res = await getSalarySlipItemPage({
    pageNo: 1,
    page: 9999,
    slipIds,
  });
  return res.list || [];
}

/**
 * 解析方案配置中的字典 JSON。
 *
 * 兼容以下几种历史格式：
 * 1. config.dictJson 本身就是对象
 * 2. config.dictJson 是 JSON 字符串
 * 3. dictJson 直接是数组
 * 4. dictJson 外包一层 { dictData: [...] }
 */
function parseDictData(config: ImportSchemeDetail['config']) {
  const raw = config?.dictJson;
  if (!raw) return [] as any[];

  let parsed: any = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (Array.isArray(parsed)) return parsed as any[];
  if (Array.isArray(parsed?.dictData)) return parsed.dictData as any[];
  return [];
}

function getFlatDictDataItems(config: ImportSchemeDetail['config']) {
  const dictData = parseDictData(config);
  if (!Array.isArray(dictData) || !dictData.length) {
    return [] as Array<{ column: string; key: string; title: string }>;
  }

  const firstItem = dictData[0] || {};
  if (firstItem?.key || firstItem?.column || firstItem?.title) {
    return dictData
      .map((item: any) => ({
        column: normalizeText(item?.column).toUpperCase(),
        key: getCanonicalSalaryFieldCode(item?.key),
        title: normalizeText(item?.title || item?.value || item?.key),
      }))
      .filter((item) => item.column && item.key);
  }

  const mappings = Array.isArray(firstItem?.mappings) ? firstItem.mappings : [];
  return (mappings as DictConfigMappingRow[])
    .map((item) => ({
      column: normalizeText(item.column).toUpperCase(),
      key: getCanonicalSalaryFieldCode(item.key),
      title: normalizeText(item.value || item.key),
    }))
    .filter((item) => item.column && item.key);
}

/**
 * 提取方案中的固定列定义，并按 Excel 列号排序。
 *
 * 固定列来源于方案 fields：
 * - index：Excel 列号，例如 A / B / C
 * - name：导出/导入数据对象中的字段名
 * - title：表头显示名
 */
function getSortedFixedFields(detail: ImportSchemeDetail) {
  return (detail.fields || [])
    .map((item) => ({
      index: normalizeText(item.index).toUpperCase(),
      name: normalizeText(item.name),
      title: normalizeText(item.title || item.name),
    }))
    .filter((item) => item.index && item.name)
    .sort((a, b) => a.index.localeCompare(b.index, 'en'));
}

/**
 * 提取方案中的动态列表头定义，并按 Excel 列号排序。
 *
 * 动态列来源于 dictJson / dictData / mappings：
 * - key：工资项编码
 * - title：Excel 动态表头显示文字
 * - column：写入 Excel / 从 Excel 读取的列号
 */
function getSortedDynamicHeaders(detail: ImportSchemeDetail) {
  return getFlatDictDataItems(detail.config).sort((a, b) => a.column.localeCompare(b.column, 'en'));
}

function getNextExcelColumnName(headers: Array<{ column: string }>) {
  const indexes = headers
    .map((item) => normalizeText(item.column))
    .filter(Boolean)
    .map((column) => {
      let result = 0;
      for (const char of column.toUpperCase()) {
        result = result * 26 + (char.charCodeAt(0) - 64);
      }
      return result - 1;
    });
  const nextIndex = indexes.length ? Math.max(...indexes) + 1 : 0;
  return getExcelColumnName(nextIndex);
}

function mergeDynamicHeadersWithActualRows(
  dynamicHeaders: Array<{ column: string; key: string; title: string }>,
  rows: ExportDetailRow[],
) {
  const headerMap = new Map(dynamicHeaders.map((item) => [getCanonicalSalaryFieldCode(item.key), item]));
  const result = dynamicHeaders.map((item) => ({ ...item, key: getCanonicalSalaryFieldCode(item.key) }));
  const priorityCodes = [
    'base_salary',
    'basic_salary',
    'post_salary',
    'performance_salary',
    'month_bonus',
    'bonus',
    'overtime_pay',
    'temp_allowance',
    'allowance',
    'other_deduction',
  ];

  const actualMap = new Map<string, string>();
  rows.forEach((row) => {
    const code = getCanonicalSalaryFieldCode(row.item_code);
    if (!code || headerMap.has(code) || actualMap.has(code)) return;
    actualMap.set(code, normalizeText(row.item_name || code));
  });

  const sortedActualItems = Array.from(actualMap.entries()).sort(([a], [b]) => {
    const aIndex = priorityCodes.indexOf(a);
    const bIndex = priorityCodes.indexOf(b);
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? 9999 : aIndex) - (bIndex === -1 ? 9999 : bIndex);
    }
    return a.localeCompare(b, 'en');
  });

  sortedActualItems.forEach(([key, title]) => {
    const column = getNextExcelColumnName(result);
    result.push({ column, key, title: title || key });
    headerMap.set(key, { column, key, title: title || key });
  });

  return result;
}

/**
 * 构建运行时行列互转配置。
 *
 * 关键点：
 * - groupKeyCols 决定“哪些字段相同的多行明细，需要聚合成一行”
 * - 为了避免固定列在转换后丢失，这里会把 fields 中的 name 也并入 groupKeyCols
 */
function buildRuntimeTransformConfig(
  detail: ImportSchemeDetail,
  overrideDynamicHeaders?: Array<{ column: string; key: string; title: string }>,
): RowColumnTransformConfig {
  const fixedFields = getSortedFixedFields(detail);
  const fixedNames = fixedFields.map((item) => item.name).filter(Boolean);
  const groupKeyCols = normalizeText(detail.config.groupKeyCols)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const flatDictItems = overrideDynamicHeaders?.length ? overrideDynamicHeaders : getFlatDictDataItems(detail.config);

  return {
    transformType: (detail.config.transformType as any) || '行列互转',
    dynamicStartCol: detail.config.dynamicStartCol,
    dynamicEndCol: detail.config.dynamicEndCol,
    dynamicKeyField: detail.config.dynamicKeyField,
    dynamicValueField: detail.config.dynamicValueField,
    skipEmptyValue: detail.config.skipEmptyValue,
    dynamicStartRow: detail.config.dynamicStartRow,
    dynamicEndRow: detail.config.dynamicEndRow,
    dynamicKeySourceCol: detail.config.dynamicKeySourceCol,
    dynamicValueSourceCol: detail.config.dynamicValueSourceCol,
    dynamicStopMode: detail.config.dynamicStopMode,
    groupKeyCols: Array.from(new Set([...fixedNames, ...groupKeyCols])),
    fields: fixedFields,
    dictData: flatDictItems.length
      ? [
          {
            field: normalizeText(detail.config.dynamicKeyField || 'item_code'),
            type: 'SALARY_ITEM',
            mappings: flatDictItems.map((item) => ({
              key: item.key,
              value: item.title || item.key,
              column: item.column,
            })),
          },
        ]
      : [],
  };
}

/**
 * 某些方案的动态字典里会配置汇总类字段，
 * 但数据库原始明细中它们不一定是按工资项行存储。
 *
 * 例如：
 * - gross_salary 对应 should_pay
 * - net_salary 对应 real_pay
 * - personal_income_tax 对应 tax_value
 *
 * 所以这里补一层“虚拟工资项行”，
 * 让后续仍然走统一的 item_code + item_value 动态列展开逻辑。
 */
function appendVirtualDynamicRows(
  rows: ExportDetailRow[],
  dynamicHeaders: Array<{ column: string; key: string; title: string }>,
  config: RowColumnTransformConfig,
) {
  const dynamicKeyField = normalizeText(config.dynamicKeyField || 'item_code');
  const dynamicValueField = normalizeText(config.dynamicValueField || 'item_value');

  const groupValueMap = new Map<string, Record<string, number>>();
  rows.forEach((row) => {
    const groupKey = [
      normalizeText(row.slip_id),
      normalizeText(row.line_no),
      normalizeText(row.employee_id),
      normalizeText(row.employee_no),
      normalizeText(row.employee_name),
      normalizeText(row.detail_depart_name || row.dept_name),
      normalizeText(row.detail_project_name),
    ].join('__');
    if (!groupValueMap.has(groupKey)) groupValueMap.set(groupKey, {});
    const values = groupValueMap.get(groupKey)!;
    const itemCode = getCanonicalSalaryFieldCode(row[dynamicKeyField]);
    if (itemCode) {
      values[itemCode] = normalizeNumber(row[dynamicValueField]);
    }
  });

  return rows.flatMap((row) => {
    const groupKey = [
      normalizeText(row.slip_id),
      normalizeText(row.line_no),
      normalizeText(row.employee_id),
      normalizeText(row.employee_no),
      normalizeText(row.employee_name),
      normalizeText(row.detail_depart_name || row.dept_name),
      normalizeText(row.detail_project_name),
    ].join('__');
    const groupItemValues = groupValueMap.get(groupKey) || {};
    const rowWithValues = { ...row, itemValues: groupItemValues };
    const resultRows: ExportDetailRow[] = [{ ...rowWithValues }];
    const currentItemCode = getCanonicalSalaryFieldCode(row[dynamicKeyField]);

    dynamicHeaders.forEach((header) => {
      const headerKey = getCanonicalSalaryFieldCode(header.key);
      if (headerKey === currentItemCode) return;
      const matchedValue = getSalaryFieldValue(rowWithValues, headerKey);
      if (matchedValue === undefined || matchedValue === null || matchedValue === '') return;

      resultRows.push({
        ...rowWithValues,
        [dynamicKeyField]: headerKey,
        [dynamicValueField]: normalizeNumber(matchedValue),
      });
    });

    return resultRows;
  });
}

/**
 * 将工资表主表字段补到明细对象上。
 *
 * 这样导出阶段后续只需要处理一种数据结构，
 * 不需要在 workbook 组装时同时查两套对象。
 */
function enrichDetailRowsWithHeader(slips: any[], details: any[]) {
  const headerMap = new Map<string, any>();
  slips.forEach((item) => {
    const rowid = normalizeText(item.rowid);
    if (rowid) headerMap.set(rowid, item);
  });

  return (details || []).map((item) => {
    const header = headerMap.get(normalizeText(item.slip_id)) || {};
    return {
      ...item,
      salary_month: normalizeText(item.salary_month || header.salary_month),
      pay_month: normalizeText(item.pay_month || header.pay_month),
      dept_name: normalizeText(item.dept_name || item.detail_depart_name || header.depart_name),
      depart_name: normalizeText(item.depart_name || header.depart_name),
      project_name: normalizeText(item.project_name || header.project_name),
      rank_code: normalizeText(item.rank_code),
      rank_name: normalizeText(item.rank_name),
      employee_no: normalizeText(item.employee_no),
      employee_name: normalizeText(item.employee_name),
      detail_depart_name: normalizeText(item.detail_depart_name),
      detail_project_name: normalizeText(item.detail_project_name),
      line_no: Number(item.line_no || 0),
      item_code: getCanonicalSalaryFieldCode(item.item_code),
      item_name: normalizeText(item.item_name),
      item_value: normalizeNumber(item.item_value),
      should_pay: normalizeNumber(item.should_pay),
      deduct_total: normalizeNumber(item.deduct_total),
      tax_value: normalizeNumber(item.tax_value),
      real_pay: normalizeNumber(item.real_pay),
      company_social: normalizeNumber(item.company_social),
      company_fund: normalizeNumber(item.company_fund),
    } as ExportDetailRow;
  });
}

/**
 * 清洗 worksheet 名称。
 *
 * Excel sheet 名称有两个限制：
 * - 不能包含某些特殊字符
 * - 最长 31 个字符
 */
function buildExportRowsByGroupedItems(
  rows: ExportDetailRow[],
  fixedFields: Array<{ index: string; name: string; title: string }>,
  dynamicHeaders: Array<{ column: string; key: string; title: string }>,
  config: RowColumnTransformConfig,
) {
  const dynamicKeyField = normalizeText(config.dynamicKeyField || 'item_code');
  const dynamicValueField = normalizeText(config.dynamicValueField || 'item_value');
  const configuredGroupKeys = Array.isArray(config.groupKeyCols)
    ? config.groupKeyCols
    : normalizeText(config.groupKeyCols)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  const groupKeys = Array.from(
    new Set([
      ...fixedFields.map((item) => item.name).filter(Boolean),
      ...configuredGroupKeys,
      'slip_id',
      'line_no',
      'employee_id',
      'employee_no',
      'employee_name',
      'detail_depart_name',
      'detail_project_name',
    ]),
  ).filter((key) => key && key !== dynamicKeyField && key !== dynamicValueField && key !== 'item_code' && key !== 'item_value' && key !== 'item_name');

  const grouped = new Map<string, Record<string, any>>();

  rows.forEach((row) => {
    const groupObject: Record<string, any> = {};
    groupKeys.forEach((key) => {
      groupObject[key] = normalizeText(row[key]);
    });
    const groupId = JSON.stringify(groupObject);
    if (!grouped.has(groupId)) {
      const baseRow: Record<string, any> = { itemValues: {} };
      groupKeys.forEach((key) => {
        baseRow[key] = row[key] ?? '';
      });
      fixedFields.forEach((field) => {
        baseRow[field.name] = row[field.name] ?? '';
      });
      baseRow.should_pay = normalizeNumber(row.should_pay);
      baseRow.deduct_total = normalizeNumber(row.deduct_total);
      baseRow.tax_value = normalizeNumber(row.tax_value);
      baseRow.real_pay = normalizeNumber(row.real_pay);
      baseRow.company_social = normalizeNumber(row.company_social);
      baseRow.company_fund = normalizeNumber(row.company_fund);
      grouped.set(groupId, baseRow);
    }

    const current = grouped.get(groupId)!;
    const itemCode = getCanonicalSalaryFieldCode(row[dynamicKeyField]);
    if (itemCode) {
      current.itemValues[itemCode] = normalizeNumber(row[dynamicValueField]);
    }
    current.should_pay = normalizeNumber(row.should_pay ?? current.should_pay);
    current.deduct_total = normalizeNumber(row.deduct_total ?? current.deduct_total);
    current.tax_value = normalizeNumber(row.tax_value ?? current.tax_value);
    current.real_pay = normalizeNumber(row.real_pay ?? current.real_pay);
    current.company_social = normalizeNumber(row.company_social ?? current.company_social);
    current.company_fund = normalizeNumber(row.company_fund ?? current.company_fund);
  });

  return Array.from(grouped.values()).map((row) => {
    const result: Record<string, any> = { ...row };
    dynamicHeaders.forEach((header) => {
      const key = getCanonicalSalaryFieldCode(header.key);
      result[key] = normalizeNumber(getSalaryFieldValue(row, key));
    });
    delete result.itemValues;
    return result;
  });
}

function sanitizeSheetName(name: string, fallbackIndex: number) {
  const cleaned = String(name || '')
    .replace(/[\\/?*\[\]:]/g, '_')
    .trim();
  const result = cleaned || `Sheet${fallbackIndex}`;
  return result.slice(0, 31);
}

/**
 * 生成 Excel 列号：
 * - 0 -> A
 * - 1 -> B
 * - 25 -> Z
 * - 26 -> AA
 */
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

/**
 * 使用指定方案，把完整明细行转换成一个 sheet 所需的数据结构。
 *
 * 处理顺序：
 * 1. 取固定列
 * 2. 取动态列
 * 3. 构建运行时转换配置
 * 4. 注入虚拟工资项行
 * 5. 做行列互转
 * 6. 生成最终 worksheet payload
 */
function buildWorkbookSheetPayloadByScheme(
  rows: ExportDetailRow[],
  detail: ImportSchemeDetail,
  sheetIndex: number,
): WorkbookSheetPayload {
  const fixedFields = getSortedFixedFields(detail);
  const dynamicHeaders = mergeDynamicHeadersWithActualRows(getSortedDynamicHeaders(detail), rows);
  const runtimeConfig = buildRuntimeTransformConfig(detail, dynamicHeaders);
  debugWagesExport('scheme fixedFields', fixedFields);
  debugWagesExport('scheme dynamicHeaders', dynamicHeaders);
  debugWagesExport('runtimeConfig', runtimeConfig);
  debugWagesExportTable('enriched rows before grouped export', rows.map((row) => ({
    slip_id: row.slip_id,
    line_no: row.line_no,
    employee_id: row.employee_id,
    employee_no: row.employee_no,
    employee_name: row.employee_name,
    dept_name: row.dept_name || row.detail_depart_name,
    item_code: row.item_code,
    item_name: row.item_name,
    item_value: row.item_value,
    should_pay: row.should_pay,
    deduct_total: row.deduct_total,
    tax_value: row.tax_value,
    real_pay: row.real_pay,
  })));
  debugWagesExportTable('base_salary source rows', rows
    .filter((row) => getCanonicalSalaryFieldCode(row.item_code) === 'base_salary')
    .map((row) => ({
      slip_id: row.slip_id,
      line_no: row.line_no,
      employee_id: row.employee_id,
      employee_no: row.employee_no,
      employee_name: row.employee_name,
      dept_name: row.dept_name || row.detail_depart_name,
      item_code: row.item_code,
      item_name: row.item_name,
      item_value: row.item_value,
    })));
  const exportRows = buildExportRowsByGroupedItems(rows, fixedFields, dynamicHeaders, runtimeConfig);
  debugWagesExportTable('final export rows', exportRows.map((row) => ({
    salary_month: row.salary_month,
    pay_month: row.pay_month,
    employee_no: row.employee_no,
    employee_name: row.employee_name,
    dept_name: row.dept_name,
    base_salary: row.base_salary,
    post_salary: row.post_salary,
    gross_salary: row.gross_salary,
    should_pay_total: row.should_pay_total,
    deduct_total: row.deduct_total,
    personal_income_tax: row.personal_income_tax,
    real_pay: row.real_pay,
  })));

  return {
    sheetName: sanitizeSheetName(
      detail.config.sheetName || detail.scheme.solutionName || `工资表明细导出${sheetIndex}`,
      sheetIndex,
    ),
    fileNameSegment: normalizeText(
      detail.scheme.solutionName || detail.config.sheetName || `sheet${sheetIndex}`,
    ),
    titleIndex: Number(detail.config.titleIndex || 1),
    dataIndex: Number(detail.config.dataIndex || 2),
    fixedFields,
    dynamicHeaders,
    rows: exportRows,
  };
}

/**
 * 当没有方案时的兜底导出规则。
 *
 * 虽然当前主入口要求必须传 schemaId，
 * 但这个兜底函数仍然保留，方便后续内部复用或异常兜底。
 */
function buildFallbackWorkbookSheetPayload(
  rows: ExportDetailRow[],
  sheetIndex: number,
): WorkbookSheetPayload {
  const fixedFields = [
    { index: 'A', name: 'salary_month', title: '工资月份' },
    { index: 'B', name: 'pay_month', title: '工资发放月份' },
    { index: 'C', name: 'rank_code', title: '职级编码' },
    { index: 'D', name: 'rank_name', title: '职级名称' },
    { index: 'E', name: 'employee_no', title: '员工工号' },
    { index: 'F', name: 'employee_name', title: '员工姓名' },
    { index: 'G', name: 'dept_name', title: '部门名称' },
  ];

  const codeMap = new Map<string, { key: string; title: string }>();
  rows.forEach((row) => {
    const code = normalizeText(row.item_code);
    if (!code || codeMap.has(code)) return;
    codeMap.set(code, {
      key: code,
      title: normalizeText(row.item_name || code),
    });
  });

  const dynamicHeaders = Array.from(codeMap.values()).map((item, index) => ({
    column: getExcelColumnName(7 + index),
    key: item.key,
    title: item.title,
  }));

  const runtimeConfig: RowColumnTransformConfig = {
    transformType: '行列互转',
    dynamicKeyField: 'item_code',
    dynamicValueField: 'item_value',
    skipEmptyValue: 1,
    groupKeyCols: [...fixedFields.map((item) => item.name), 'detail_depart_name', 'line_no'],
    fields: fixedFields,
    dictData: [
      {
        field: 'item_code',
        type: 'SALARY_ITEM',
        mappings: dynamicHeaders.map((item) => ({
          key: item.key,
          value: item.title,
          column: item.column,
        })),
      },
    ],
  };

  const transformed = transformByImportExportConfig(rows, runtimeConfig);
  return {
    sheetName: sanitizeSheetName(`明细导出_${sheetIndex}`, sheetIndex),
    fileNameSegment: `明细导出_${sheetIndex}`,
    titleIndex: 1,
    dataIndex: 2,
    fixedFields,
    dynamicHeaders,
    rows: transformed.rows || [],
  };
}

/**
 * 将 sheet payload 写入 worksheet。
 *
 * 写入内容包括：
 * - 标题行
 * - 固定列数据
 * - 动态列数据
 * - 基础宽度和表头样式
 */
function fillWorksheet(worksheet: ExcelJS.Worksheet, payload: WorkbookSheetPayload) {
  const titleRow = worksheet.getRow(payload.titleIndex);

  payload.fixedFields.forEach((field) => {
    titleRow.getCell(field.index).value = field.title;
    worksheet.getColumn(field.index).width = Math.max(14, String(field.title || '').length + 4);
  });

  payload.dynamicHeaders.forEach((header) => {
    if (!header.column) return;
    titleRow.getCell(header.column).value = header.title;
    worksheet.getColumn(header.column).width = Math.max(14, String(header.title || '').length + 4);
  });

  payload.rows.forEach((row, rowIndex) => {
    const worksheetRow = worksheet.getRow(payload.dataIndex + rowIndex);

    payload.fixedFields.forEach((field) => {
      worksheetRow.getCell(field.index).value = row[field.name] ?? '';
    });

    payload.dynamicHeaders.forEach((header) => {
      if (!header.column) return;
      worksheetRow.getCell(header.column).value = row[header.key] ?? '';
    });
  });

  titleRow.font = { bold: true };
  titleRow.eachCell((cell) => {
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
}

/**
 * 下载工资导入标准模板。
 *
 * 模板复用工资导入/导出方案中的固定列和动态工资项列，只生成表头，
 * 不写入业务数据，方便用户下载后按标准格式填写并上传。
 */
export async function downloadWagesTemplateBySchemeId(schemaId: string) {
  const normalizedSchemaId = normalizeSchemeId(schemaId);
  if (!normalizedSchemaId) {
    throw new Error('schemaId 不能为空，且必须是 Base_Import_solution.rowid');
  }

  const schemeDetail = await getExportSchemeDetailBySchemaId(normalizedSchemaId);
  if (!schemeDetail) {
    throw new Error('未找到对应的工资模板方案，或方案子级配置不完整');
  }

  const workbook = new ExcelJS.Workbook();
  const sheetPayload = buildWorkbookSheetPayloadByScheme([], schemeDetail, 1);
  const worksheet = workbook.addWorksheet(sheetPayload.sheetName);
  fillWorksheet(worksheet, sheetPayload);

  const fileName = `${getCurrentMonth()}_${normalizeText(schemeDetail.scheme.solutionName || '工资标准模板')}_模板.xlsx`;
  await downloadWorkbook(workbook, fileName);
  return { fileName, schemeId: normalizedSchemaId, schemeName: normalizeText(schemeDetail.scheme.solutionName) };
}
/**
 * 对外暴露的统一导出入口。
 *
 * 页面按钮点击时，只需要调用 exportWagesBySchemeId(schemaId)。
 * 页面层不再自己关心：
 * - 如何查询 `Base_Import_solution`
 * - 如何通过 `schemeid` 查询子级配置 `Base_ImportData_Config`
 * - 如何通过 `configid` 查询字段 `Base_ImportData_Field`
 * - 如何查工资表主表
 * - 如何查工资表明细
 * - 如何组装 Excel
 * - 如何触发浏览器下载
 */
export async function exportWagesBySchemeId(
  schemaId: string,
): Promise<ExportWagesBySchemeIdResult> {
  const normalizedSchemaId = normalizeSchemeId(schemaId);
  if (!normalizedSchemaId) {
    throw new Error('schemaId 不能为空，且必须是 Base_Import_solution.rowid');
  }

  const schemeDetail = await getExportSchemeDetailBySchemaId(normalizedSchemaId);
  if (!schemeDetail) {
    throw new Error('未找到对应的导出方案，或方案子级配置不完整');
  }

  const slips = await fetchAllSalarySlips();
  if (!slips.length) {
    throw new Error('当前没有可导出的工资表');
  }

  const slipIds = slips
    .map((item: any) => normalizeText(item.rowid))
    .filter(Boolean);
  if (!slipIds.length) {
    throw new Error('工资表主表缺少有效主键，无法导出');
  }

  const detailRows = await fetchAllSalarySlipDetails(slipIds);
  debugWagesExport('export slips count', { count: slips.length, slipIds });
  debugWagesExportTable('raw detailRows from API', (detailRows || []).map((row: any) => ({
    slip_id: row.slip_id,
    line_no: row.line_no,
    employee_id: row.employee_id,
    employee_no: row.employee_no,
    employee_name: row.employee_name,
    detail_depart_name: row.detail_depart_name,
    item_code: row.item_code,
    item_name: row.item_name,
    item_value: row.item_value,
    should_pay: row.should_pay,
    deduct_total: row.deduct_total,
    tax_value: row.tax_value,
    real_pay: row.real_pay,
  })));
  if (!detailRows.length) {
    throw new Error('当前工资表没有可导出的明细数据');
  }

  const enrichedRows = enrichDetailRowsWithHeader(slips, detailRows);
  const workbook = new ExcelJS.Workbook();
  const sheetPayload = buildWorkbookSheetPayloadByScheme(enrichedRows, schemeDetail, 1);

  const worksheet = workbook.addWorksheet(sheetPayload.sheetName);
  fillWorksheet(worksheet, sheetPayload);
  debugWagesExport('sheetPayload summary', {
    sheetName: sheetPayload.sheetName,
    rowCount: sheetPayload.rows.length,
    dynamicHeaders: sheetPayload.dynamicHeaders,
  });

  const monthText =
    normalizeText(slips[0]?.salary_month) || normalizeText(slips[0]?.pay_month) || getCurrentMonth();
  const fileName = `${monthText}_${normalizeText(schemeDetail.scheme.solutionName || '工资表导出')}.xlsx`;
  await downloadWorkbook(workbook, fileName);

  return {
    fileName,
    rowCount: sheetPayload.rows.length,
    schemeId: normalizedSchemaId,
    schemeName: normalizeText(schemeDetail.scheme.solutionName),
    sheetName: sheetPayload.sheetName,
  };
}

/**
 * ExcelJS 单元格值的运行时形态比较多：
 * - 可能是字符串
 * - 可能是数字
 * - 可能是日期
 * - 可能是富文本
 * - 可能是公式对象
 *
 * 导入解析时不能直接 String(cell.value)，否则会把对象转成 [object Object]。
 * 所以这里统一做一层安全提取。
 */
function getWorksheetCellRawValue(cell: ExcelJS.Cell) {
  const value: any = cell?.value;
  if (value === undefined || value === null) return '';

  if (typeof value === 'object') {
    if (value instanceof Date) {
      return value;
    }
    if (Array.isArray(value?.richText)) {
      return value.richText.map((item: any) => String(item?.text || '')).join('');
    }
    if ('text' in value && value.text !== undefined) {
      return value.text;
    }
    if ('result' in value && value.result !== undefined) {
      return value.result;
    }
    if ('formula' in value && value.formula !== undefined && value.result === undefined) {
      return '';
    }
  }

  return value;
}

/**
 * 把单元格值标准化成文本。
 *
 * 规则：
 * - 日期转成 YYYY-MM-DD
 * - 其他值都转成去首尾空格的字符串
 */
function getWorksheetCellText(cell: ExcelJS.Cell) {
  const raw = getWorksheetCellRawValue(cell);
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const year = raw.getFullYear();
    const month = String(raw.getMonth() + 1).padStart(2, '0');
    const day = String(raw.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return normalizeText(raw);
}

/**
 * 把单元格值标准化成金额。
 *
 * 允许导入单元格里出现：
 * - 数字
 * - 数字字符串
 * - 带千分位的数字字符串
 * - 空值
 */
function getWorksheetCellMoney(cell: ExcelJS.Cell) {
  const raw = getWorksheetCellRawValue(cell);
  if (raw === '' || raw === undefined || raw === null) return 0;
  const normalized = String(raw).replaceAll(',', '').trim();
  return normalizeNumber(normalized);
}

/**
 * 判断一行在当前方案定义下是否为空行。
 *
 * 这里只看“固定列 + 动态列”的所有目标列，
 * 只要这些列全部为空，就认为这是一行无效行，解析时直接跳过。
 */
function isWorksheetDataRowEmpty(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  fixedFields: Array<{ index: string; name: string; title: string }>,
  dynamicHeaders: Array<{ column: string; key: string; title: string }>,
) {
  const fixedEmpty = fixedFields.every(
    (field) => !getWorksheetCellText(worksheet.getCell(`${field.index}${rowNumber}`)),
  );
  const dynamicEmpty = dynamicHeaders.every(
    (header) => !getWorksheetCellText(worksheet.getCell(`${header.column}${rowNumber}`)),
  );
  return fixedEmpty && dynamicEmpty;
}

/**
 * 从工作簿中挑选本次导入要解析的 worksheet。
 *
 * 优先级：
 * 1. 先按方案配置的 sheetName 精确匹配
 * 2. 如果没配或没找到，则回退到第一个 sheet
 */
function pickWorksheetByScheme(workbook: ExcelJS.Workbook, detail: ImportSchemeDetail) {
  const targetSheetName = normalizeText(detail.config.sheetName);
  if (targetSheetName) {
    const matched = workbook.worksheets.find(
      (sheet) => normalizeText(sheet.name) === targetSheetName,
    );
    if (matched) return matched;
  }
  return workbook.worksheets[0] || null;
}

/**
 * 读取工资项元数据，建立 item_code -> 元数据 的映射。
 *
 * 导入解析时需要用这些元数据来：
 * - 判断收入项 / 扣减项 / 税项
 * - 计算 shouldPay / deductTotal / tax / realPay
 * - 回填 items 列表中的 item_name / item_category / item_direction
 */
async function buildSalaryItemMetaMap() {
  const metaRes = await getSalaryItemMetaPage({ pageNo: 1, page: 9999, is_enabled: 1 });
  const list = (metaRes.list || []).slice();
  const map = new Map<string, any>();
  list.forEach((item: any) => {
    const code = normalizeText(item.item_code);
    if (code) map.set(code, item);
  });
  return { list, map };
}

/**
 * 读取职级人员列表，并建立员工匹配索引。
 *
 * 导入文件里常见的员工标识通常是：
 * - employee_no（员工工号）
 * - employee_name（员工姓名）
 *
 * 保存工资表时又需要 employeeId，
 * 所以这里提前把职级人员表拉下来，尽量把导入行自动补齐 employeeId。
 */
async function buildEmployeeLookupMaps() {
  const res = await getSalaryRankEmployeeList({});
  const list = res.list || [];
  const byNo = new Map<string, any>();
  const byName = new Map<string, any>();

  list.forEach((item: any) => {
    const employeeNo = normalizeText(item.employee_no);
    const employeeName = normalizeText(item.employee_name);
    if (employeeNo && !byNo.has(employeeNo)) byNo.set(employeeNo, item);
    if (employeeName && !byName.has(employeeName)) byName.set(employeeName, item);
  });

  return { byNo, byName };
}

/**
 * 计算导入行的应发、扣减、个税、实发。
 *
 * 计算规则与工资录入页保持一致：
 * - shouldPay：所有 income 项求和
 * - deductTotal：所有 deduct 项求和
 * - tax：TAX 分类或 personal_income_tax 项求和
 * - realPay：shouldPay - deductTotal - tax
 */
type TaxRuleRuntimeContext = {
  assignments: SalaryRuleAssignmentApi.Row[];
  salaryTaxRules: SalaryTaxRule[];
};

function calcImportRowTotals(itemValues: Record<string, number>, itemMetaMap: Map<string, any>) {
  let shouldPay = 0;
  let deductTotal = 0;
  let tax = 0;

  Object.entries(itemValues).forEach(([itemCode, itemValue]) => {
    const meta = itemMetaMap.get(itemCode) || {};
    const itemCategory = normalizeText(meta.item_category).toUpperCase();
    const itemDirection = normalizeText(meta.item_direction).toLowerCase();
    const money = normalizeNumber(itemValue);

    if (itemDirection === 'income') {
      shouldPay += money;
    }
    if (itemDirection === 'deduct') {
      deductTotal += money;
    }
    if (itemCategory === 'TAX' || itemCode === 'personal_income_tax') {
      tax += money;
    }
  });

  shouldPay = normalizeNumber(shouldPay);
  deductTotal = normalizeNumber(deductTotal);
  tax = normalizeNumber(tax);
  const realPay = normalizeNumber(shouldPay - deductTotal - tax);

  return { shouldPay, deductTotal, tax, realPay };
}

function resolveTaxRuleCodeByAssignment(
  context: TaxRuleRuntimeContext,
  params: { deptId?: string; employeeId?: string; period?: string; rankCode?: string; rankId?: string },
) {
  const matched = matchSalaryRuleAssignment(context.assignments, 'TAX', params);
  return normalizeText(matched?.rule_code) || 'SALARY_TAX_SIMPLE_CN_MONTHLY';
}

function applyTaxRuleToImportRow(params: {
  context: TaxRuleRuntimeContext;
  deptId?: string;
  employeeId?: string;
  itemValues: Record<string, number>;
  period?: string;
  rankCode?: string;
  rankId?: string;
}) {
  const ruleCode = resolveTaxRuleCodeByAssignment(params.context, {
    deptId: params.deptId,
    employeeId: params.employeeId,
    period: params.period,
    rankCode: params.rankCode,
    rankId: params.rankId,
  });
  const rule = params.context.salaryTaxRules.find((item) => normalizeText(item.code) === ruleCode);
  if (!rule) return null;
  return calcSalaryTaxByRule(rule, params.itemValues || {});
}

const IMPORT_SUMMARY_FIELD_MAP: Record<string, 'companyFund' | 'companySocial' | 'deductTotal' | 'realPay' | 'shouldPay' | 'tax'> = {
  company_housing_fund: 'companyFund',
  company_social_insurance: 'companySocial',
  deduct_total: 'deductTotal',
  should_pay_total: 'shouldPay',
  personal_income_tax: 'tax',
  real_pay: 'realPay',
};

/**
 * 从 worksheet 中按方案定义解析出工资表导入数据。
 *
 * 这里会完成以下工作：
 * 1. 按方案固定列取基础字段
 * 2. 按方案动态列取工资项金额
 * 3. 自动匹配员工 employeeId / employeeNo / employeeName / 部门
 * 4. 计算 shouldPay / deductTotal / tax / realPay
 * 5. 组装成工资表保存接口可直接消费的 rows 结构
 */
function parseWorksheetRowsByScheme(
  worksheet: ExcelJS.Worksheet,
  detail: ImportSchemeDetail,
  itemMetaMap: Map<string, any>,
  employeeLookup: { byName: Map<string, any>; byNo: Map<string, any> },
  taxRuleContext: TaxRuleRuntimeContext,
) {
  const fixedFields = getSortedFixedFields(detail);
  const dynamicHeaders = getSortedDynamicHeaders(detail);
  const dataStartRow = Number(detail.config.dataIndex || 2);
  const maxRowNumber = worksheet.rowCount || worksheet.actualRowCount || dataStartRow;

  const parsedRows: ParsedWagesImportRow[] = [];
  const usedItemCodes = new Set<string>();
  let month = '';
  let payMonth = '';
  let commonDept = '';

  for (let rowNumber = dataStartRow; rowNumber <= maxRowNumber; rowNumber += 1) {
    if (isWorksheetDataRowEmpty(worksheet, rowNumber, fixedFields, dynamicHeaders)) {
      continue;
    }

    const baseRow: Record<string, string> = {};
    fixedFields.forEach((field) => {
      baseRow[field.name] = getWorksheetCellText(worksheet.getCell(`${field.index}${rowNumber}`));
    });

    const itemValues: Record<string, number> = {};
    const importedSummaryValues: Partial<Record<'companyFund' | 'companySocial' | 'deductTotal' | 'realPay' | 'shouldPay' | 'tax', number>> = {};
    const importedSummaryFields = new Set<'companyFund' | 'companySocial' | 'deductTotal' | 'realPay' | 'shouldPay' | 'tax'>();

    dynamicHeaders.forEach((header) => {
      const cell = worksheet.getCell(`${header.column}${rowNumber}`);
      const money = getWorksheetCellMoney(cell);
      const canonicalKey = getCanonicalSalaryFieldCode(header.key);
      const summaryField = IMPORT_SUMMARY_FIELD_MAP[canonicalKey];
      if (summaryField) {
        if (getWorksheetCellText(cell) !== '') {
          importedSummaryValues[summaryField] = money;
          importedSummaryFields.add(summaryField);
        }
        return;
      }
      if (money === 0) return;
      itemValues[canonicalKey] = money;
      usedItemCodes.add(canonicalKey);
    });

    const employeeNo = normalizeText(baseRow.employee_no);
    const employeeName = normalizeText(baseRow.employee_name);
    const matchedEmployee =
      employeeLookup.byNo.get(employeeNo) || employeeLookup.byName.get(employeeName) || {};

    const detailDept = normalizeText(baseRow.dept_name || matchedEmployee.dept_name);
    const detailDeptId = normalizeText(matchedEmployee.dept_id);
    const employeeId = normalizeText(matchedEmployee.employee_id);
    const rankId = normalizeText(matchedEmployee.rank_id);
    const rankCode = normalizeText(matchedEmployee.rank_code);
    const rankName = normalizeText(matchedEmployee.rank_name);

    const totals = calcImportRowTotals(itemValues, itemMetaMap);
    const finalShouldPay = importedSummaryFields.has('shouldPay')
      ? normalizeNumber(importedSummaryValues.shouldPay)
      : totals.shouldPay;
    const finalDeductTotal = importedSummaryFields.has('deductTotal')
      ? normalizeNumber(importedSummaryValues.deductTotal)
      : totals.deductTotal;
    const finalTax = importedSummaryFields.has('tax')
      ? normalizeNumber(importedSummaryValues.tax)
      : totals.tax;
    const finalRealPay = importedSummaryFields.has('realPay')
      ? normalizeNumber(importedSummaryValues.realPay)
      : normalizeNumber(finalShouldPay - finalDeductTotal - finalTax);
    itemValues.should_pay_total = finalShouldPay;
    itemValues.deduct_total = finalDeductTotal;
    itemValues.tax_base = itemValues.tax_base ?? finalShouldPay;

    const taxRuleResult = applyTaxRuleToImportRow({
      context: taxRuleContext,
      deptId: detailDeptId,
      employeeId,
      itemValues,
      period: normalizeText(baseRow.salary_month || month),
      rankCode,
      rankId,
    });
    const ruleCalculatedTax = taxRuleResult ? normalizeNumber(taxRuleResult.taxAmount) : finalTax;
    const ruleCalculatedRealPay = normalizeNumber(finalShouldPay - finalDeductTotal - ruleCalculatedTax);
    itemValues.personal_income_tax = ruleCalculatedTax;
    usedItemCodes.add('personal_income_tax');

    const finalCompanySocial = importedSummaryFields.has('companySocial')
      ? normalizeNumber(importedSummaryValues.companySocial)
      : 0;
    const finalCompanyFund = importedSummaryFields.has('companyFund')
      ? normalizeNumber(importedSummaryValues.companyFund)
      : 0;

    if (!month && normalizeText(baseRow.salary_month)) {
      month = normalizeText(baseRow.salary_month).slice(0, 7);
    }
    if (!payMonth && normalizeText(baseRow.pay_month)) {
      payMonth = normalizeText(baseRow.pay_month).slice(0, 7);
    }
    if (!commonDept && detailDept) {
      commonDept = detailDept;
    }

    parsedRows.push({
      companyFund: finalCompanyFund,
      companySocial: finalCompanySocial,
      deductTotal: finalDeductTotal,
      detailDept,
      detailDeptId: detailDeptId || undefined,
      detailProject: '',
      employeeId: employeeId || undefined,
      employeeName: employeeName || normalizeText(matchedEmployee.employee_name),
      employeeNo: employeeNo || normalizeText(matchedEmployee.employee_no),
      rankCode: rankCode || undefined,
      rankId: rankId || undefined,
      rankName: rankName || undefined,
      feeType: '',
      itemValues,
      realPay: ruleCalculatedRealPay,
      remark: '',
      shouldPay: finalShouldPay,
      tax: ruleCalculatedTax,
    });
  }

  return {
    commonDept,
    month,
    payMonth,
    rows: parsedRows,
    usedItemCodes,
  };
}

/**
 * 解析工资表导入文件。
 *
 * 这是导入侧与 exportWagesBySchemeId 对应的统一 helper：
 * - 页面层只需要提供 `Base_Import_solution.rowid` 和文件对象
 * - helper 内部自动完成：
 *   1. 读取方案主表与子级配置
 *   2. 读取 Excel 工作簿
 *   3. 匹配目标 worksheet
 *   4. 解析固定列 / 动态列
 *   5. 自动补齐员工信息
 *   6. 计算金额汇总
 *   7. 组装出可直接用于工资保存的 payload
 *
 * 这意味着页面层后续无论是：
 * - 先预览再保存
 * - 直接保存
 * 都只需要消费这个结果对象。
 */
export async function parseWagesImportFileBySchemeId(
  schemaId: string,
  file: Blob,
): Promise<ParseWagesImportBySchemeIdResult> {
  const normalizedSchemaId = normalizeSchemeId(schemaId);
  if (!normalizedSchemaId) {
    throw new Error('schemaId 不能为空，且必须是 Base_Import_solution.rowid');
  }
  if (!file) {
    throw new Error('请选择需要解析的导入文件');
  }

  const schemeDetail = await getExportSchemeDetailBySchemaId(normalizedSchemaId);
  if (!schemeDetail) {
    throw new Error('未找到对应的导入方案，或方案子级配置不完整');
  }

  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = pickWorksheetByScheme(workbook, schemeDetail);
  if (!worksheet) {
    throw new Error('导入文件中没有可解析的工作表');
  }

  const [{ map: itemMetaMap }, employeeLookup, ruleBundle, assignmentRes] = await Promise.all([
    buildSalaryItemMetaMap(),
    buildEmployeeLookupMaps(),
    getSalaryRuleBundle(),
    getSalaryRuleAssignmentPage({ is_enabled: 1, pageNo: 1, page: 9999 }).catch(() => ({ list: [] })),
  ]);

  const parsed = parseWorksheetRowsByScheme(
    worksheet,
    schemeDetail,
    itemMetaMap,
    employeeLookup,
    {
      assignments: assignmentRes.list || [],
      salaryTaxRules: ruleBundle.salaryTaxRules || [],
    },
  );

  if (!parsed.rows.length) {
    throw new Error('导入文件中没有解析到有效工资数据');
  }

  const dynamicHeaders = getSortedDynamicHeaders(schemeDetail);
  const items = dynamicHeaders
    .filter((header) => parsed.usedItemCodes.has(header.key))
    .map((header, index) => {
      const meta = itemMetaMap.get(header.key) || {};
      return {
        item_category: meta.item_category,
        item_code: header.key,
        item_direction: meta.item_direction,
        item_name: normalizeText(meta.item_name || header.title || header.key),
        sort_no: Number(meta.sort_no || index + 1),
      };
    });

  const attachmentName =
    file && 'name' in file && typeof (file as any).name === 'string'
      ? String((file as any).name || '')
      : '';

  return {
    payload: {
      attachmentName,
      dept: parsed.commonDept,
      items,
      month: parsed.month,
      payMonth: parsed.payMonth || parsed.month,
      project: '',
      remark: '',
      rows: parsed.rows,
    },
    rowCount: parsed.rows.length,
    schemeId: normalizedSchemaId,
    schemeName: normalizeText(schemeDetail.scheme.solutionName),
    sheetName: normalizeText(worksheet.name),
  };
}
