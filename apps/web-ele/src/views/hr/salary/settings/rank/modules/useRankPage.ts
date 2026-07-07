import { computed, onMounted, reactive, ref, watch } from 'vue';

import { downloadFileFromBlobPart, generateUUID } from '@vben/utils';

import {
  createSalaryRank,
  createSalaryRankEmployee,
  deleteSalaryRank,
  deleteSalaryRankEmployee,
  getSalaryRankEmployeeList,
  getSalaryRankItemList,
  getSalaryRankList,
  saveSalaryRankItemBatch,
  updateSalaryRank,
  updateSalaryRankEmployee,
} from '#/api/erp/finance/cashier/rank';
import { getSalaryItemMetaPage } from '#/api/erp/finance/cashier/settings/payroll';
import {
  createImportSolution,
  getImportSolutions,
  updateImportSolution,
  type ImportSolutionRow,
} from '#/api/erp/import-solution';
import {
  createEmptyImportConfig,
  getImportConfigsBySchemeId,
  getImportFieldsByConfigId,
  saveImportConfig,
  saveImportDesign,
  type ImportConfigRow,
  type ImportFieldRow,
} from '#/api/erp/import-design';

import { ElMessage, ElMessageBox } from 'element-plus';

import { categoryOptions } from '../../payroll/constants';

export type RankRow = any;
export type EmployeeRow = any;
export type RankItemRow = any;

export type RankItemDraftRow = {
  item_id: string;
  item_code: string;
  item_name: string;
  item_category: string;
  item_direction: string;
  selected: boolean;
  rowid: string;
  is_required: boolean;
  is_default_selected: boolean;
  default_amount: number;
  sort_no: number;
  remark: string;
};

export type TemplateColumn = {
  categoryLabel: string;
  field: string;
  key: string;
  title: string;
};

const WAGE_DETAIL_SCHEME_TABLE = 'LMBill@Bil_Salary_Slip_Item';

const TEMPLATE_STATIC_COLUMNS: TemplateColumn[] = [
  { categoryLabel: '基础信息', field: 'salary_month', key: 'salary_month', title: '工资月份' },
  { categoryLabel: '基础信息', field: 'pay_month', key: 'pay_month', title: '工资发放月份' },
  { categoryLabel: '基础信息', field: 'rank_code', key: 'rank_code', title: '职级编码' },
  { categoryLabel: '基础信息', field: 'rank_name', key: 'rank_name', title: '职级名称' },
  { categoryLabel: '基础信息', field: 'employee_no', key: 'employee_no', title: '员工工号' },
  { categoryLabel: '基础信息', field: 'employee_name', key: 'employee_name', title: '员工姓名' },
  { categoryLabel: '基础信息', field: 'dept_name', key: 'dept_name', title: '部门名称' },
];

export function useRankPage() {
  const rankLoading = ref(false);
  const employeeLoading = ref(false);
  const itemLoading = ref(false);
  const itemMetaLoading = ref(false);
  const itemSaving = ref(false);
  const schemeSolutionLoading = ref(false);
  const importTemplateLoading = ref(false);
  const exportTemplateLoading = ref(false);
  const schemePreviewVisible = ref(false);
  const schemeBindingLoading = ref(false);
  const templateBindingVisible = ref(false);
  const templateBindingLoading = ref(false);
  const templateBindingSaving = ref(false);
  const designerVisible = ref(false);

  const rankKeyword = ref('');
  const employeeKeyword = ref('');
  const itemKeyword = ref('');

  const rankList = ref<RankRow[]>([]);
  const employeeList = ref<EmployeeRow[]>([]);
  const rankItemList = ref<RankItemRow[]>([]);
  const salaryItemOptions = ref<any[]>([]);
  const rankItemDraftList = ref<RankItemDraftRow[]>([]);

  const selectedRankId = ref('');

  const rankDialogVisible = ref(false);
  const employeeDialogVisible = ref(false);

  const rankEditingId = ref('');
  const employeeEditingId = ref('');
  const templateBindingMode = ref<'create' | 'edit'>('create');
  const currentTemplateConfig = ref<ImportConfigRow | null>(null);

  const rankForm = reactive({
    rowid: '',
    rank_code: '',
    rank_name: '',
    rank_level: 1,
    rank_type: '',
    is_enabled: true,
    remark: '',
  });

  const employeeForm = reactive({
    rowid: '',
    rank_id: '',
    employee_id: '',
    employee_no: '',
    employee_name: '',
    dept_id: '',
    dept_name: '',
    is_current: true,
    effective_date: '',
    expire_date: '',
    remark: '',
  });

  const templateBindingForm = reactive({
    solutionId: '',
    solutionName: '',
    templatePath: '',
  });

  const selectedRank = computed(
    () => rankList.value.find((item) => String(item.rowid || '') === selectedRankId.value) || null,
  );

  const selectedRankLabel = computed(() => {
    const rank = selectedRank.value;
    if (!rank) return '';
    return [rank.rank_code, rank.rank_name].filter(Boolean).join(' / ');
  });

  const currentSchemeName = computed(() => getRankSchemeName());

  const employeeCountMap = computed(() => {
    const map = new Map<string, number>();
    employeeList.value.forEach((item) => {
      const rankId = String(item.rank_id || '');
      if (!rankId) return;
      map.set(rankId, (map.get(rankId) || 0) + 1);
    });
    return map;
  });

  const filteredRankItemDraftList = computed(() => {
    const keyword = itemKeyword.value.trim().toLowerCase();
    const source = rankItemDraftList.value;
    if (!keyword) return source;
    return source.filter((item) =>
      [item.item_code, item.item_name, item.item_category, item.item_direction, item.item_id, item.remark]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  });

  const selectedRankTemplateItems = computed(() => {
    return [...rankItemDraftList.value]
      .filter((item) => item.selected)
      .sort((a, b) => {
        const sortDiff = Number(a.sort_no || 0) - Number(b.sort_no || 0);
        if (sortDiff !== 0) return sortDiff;
        return String(a.item_code || '').localeCompare(String(b.item_code || ''), 'zh-CN');
      });
  });

  function escapeXml(value: unknown) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  function getCategoryLabel(value: string) {
    return categoryOptions.find((item) => item.value === value)?.label || value || '未分类';
  }

  function sanitizeFileName(value: string) {
    return String(value || '职级模板').replace(/[\\/:*?"<>|]/g, '_').trim() || '职级模板';
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

  function assertTemplateDownloadable() {
    if (!selectedRank.value) {
      ElMessage.warning('请先选择职级');
      return false;
    }
    if (!selectedRankTemplateItems.value.length) {
      ElMessage.warning('当前职级还没有勾选工资项，请先保存职级工资项');
      return false;
    }
    return true;
  }

  function assertSchemePreviewable() {
    if (!selectedRank.value) {
      ElMessage.warning('请先选择职级');
      return false;
    }
    if (!selectedRankTemplateItems.value.length) {
      ElMessage.warning('请先勾选当前职级需要生成方案的工资项');
      return false;
    }
    return true;
  }

  function buildTemplateColumns() {
    const columns: TemplateColumn[] = [...TEMPLATE_STATIC_COLUMNS];
    selectedRankTemplateItems.value.forEach((item) => {
      columns.push({
        categoryLabel: getCategoryLabel(item.item_category),
        field: item.item_code || item.item_id,
        key: item.item_code || item.item_id,
        title: item.item_name || item.item_code || item.item_id,
      });
    });
    return columns;
  }

  function buildTemplateExcelHtml(title: string, columns: TemplateColumn[], rows: Record<string, any>[]) {
    const categoryCells: string[] = [];
    let currentCategory = '';
    let currentSpan = 0;
    const pushCategoryCell = () => {
      if (!currentCategory || currentSpan <= 0) return;
      categoryCells.push(
        `<td colspan="${currentSpan}" style="font-weight:bold;background:#cfe2f3;text-align:center;white-space:nowrap;">${escapeXml(currentCategory)}</td>`,
      );
    };
    for (const column of columns) {
      if (column.categoryLabel !== currentCategory) {
        pushCategoryCell();
        currentCategory = column.categoryLabel;
        currentSpan = 1;
      } else {
        currentSpan += 1;
      }
    }
    pushCategoryCell();
    const titleCells = columns
      .map((column) => `<td style="font-weight:bold;background:#d9ead3;white-space:nowrap;">${escapeXml(column.title)}</td>`)
      .join('');
    const fieldCells = columns
      .map((column) => `<td style="white-space:nowrap;background:#f4f4f5;color:#606266;">${escapeXml(column.field)}</td>`)
      .join('');
    const bodyRows = rows
      .map((row) => `<tr>${columns.map((column) => `<td style="white-space:nowrap;">${escapeXml(row[column.key] ?? '')}</td>`).join('')}</tr>`)
      .join('');
    return `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8" /><meta name="ProgId" content="Excel.Sheet" /><meta name="Generator" content="Microsoft Excel 15" /></head>
    <body><table border="1" cellspacing="0" cellpadding="4"><tr><td colspan="${columns.length}" style="font-weight:bold;font-size:16px;background:#eaf2ff;text-align:center;">${escapeXml(title)}</td></tr><tr>${categoryCells.join('')}</tr><tr>${titleCells}</tr><tr>${fieldCells}</tr>${bodyRows}</table></body>
  </html>`;
  }

  function buildWageSchemeFieldRows() {
    return TEMPLATE_STATIC_COLUMNS.map((item, index) => ({
      name: item.field,
      title: item.title,
      index: getExcelColumnName(index),
      type: 1,
    }));
  }

  const selectedRankItemDictData = computed(() => {
    const dynamicStartIndex = TEMPLATE_STATIC_COLUMNS.length;
    return selectedRankTemplateItems.value
      .map((item, index) => {
        const itemCode = String(item.item_code || '').trim();
        if (!itemCode) return null;
        return {
          key: itemCode,
          title: String(item.item_name || item.item_code || item.item_id || '').trim(),
          column: getExcelColumnName(dynamicStartIndex + index),
        };
      })
      .filter(Boolean);
  });

  const selectedRankItemDictJsonText = computed(() => JSON.stringify(selectedRankItemDictData.value));
  const selectedRankDynamicStartCol = computed(() => getExcelColumnName(TEMPLATE_STATIC_COLUMNS.length));
  const selectedRankDynamicEndCol = computed(() => {
    const count = selectedRankTemplateItems.value.length;
    const startIndex = TEMPLATE_STATIC_COLUMNS.length;
    if (count <= 0) return getExcelColumnName(startIndex);
    return getExcelColumnName(startIndex + count - 1);
  });

  function getRankSchemeName() {
    const rank = selectedRank.value;
    return `${rank?.rank_name || rank?.rank_code || '职级'}导入导出方案`;
  }

  function buildRankSchemeConfig() {
    return {
      sheet: 0,
      sheetName: '工资表明细导出',
      titleIndex: 1,
      dataIndex: 2,
      table: WAGE_DETAIL_SCHEME_TABLE,
      parentField: '',
      foreignKeyField: '',
      transformType: 'RtoC',
      dynamicStartCol: selectedRankDynamicStartCol.value,
      dynamicEndCol: selectedRankDynamicEndCol.value,
      dynamicTitle: 'item_name',
      dynamicKeyField: 'item_code',
      dynamicValueField: 'item_value',
      skipEmptyValue: 1,
      dynamicStartRow: 2,
      dynamicEndRow: null,
      dynamicKeySourceCol: 'A',
      dynamicValueSourceCol: 'B',
      dynamicStopMode: '按行结束',
      groupKeyCols: 'slip_id,employee_name,detail_depart_name,line_no',
      fields: buildWageSchemeFieldRows(),
      dictData: selectedRankItemDictData.value,
    };
  }

  const schemePreviewPayload = computed(() => {
    if (!selectedRank.value) return null;
    const config = buildRankSchemeConfig();
    return {
      solutionName: getRankSchemeName(),
      description: `${selectedRankLabel.value}基于工资表明细表生成的导入导出方案，直接供工资表导出页面使用`,
      configs: [config],
    };
  });
  const schemePreviewJson = computed(() => (schemePreviewPayload.value ? JSON.stringify(schemePreviewPayload.value, null, 2) : ''));

  async function ensureRankSolution() {
    if (!assertSchemePreviewable()) return false;
    const solutionName = getRankSchemeName();
    const solutions = await getImportSolutions();
    const existed = solutions.find((item) => item.solutionName === solutionName);
    if (existed) {
      ElMessage.info(`方案已存在：${solutionName}${existed.coding ? `（${existed.coding}）` : ''}`);
      return true;
    }
    const config = buildRankSchemeConfig();
    const result = await createImportSolution(solutionName, {
      rootConfigRow: {
        sheet: config.sheet,
        sheetName: config.sheetName,
        titleIndex: config.titleIndex,
        dataIndex: config.dataIndex,
        table: config.table,
        parentField: '',
        foreignKeyField: '',
        exportType: 'tree',
        transformType: 'RtoC',
        dynamicStartCol: selectedRankDynamicStartCol.value,
        dynamicEndCol: selectedRankDynamicEndCol.value,
        dynamicTitle: 'item_name',
        dynamicKeyField: 'item_code',
        dynamicValueField: 'item_value',
        skipEmptyValue: 1,
        dynamicStartRow: 2,
        dynamicEndRow: null,
        dynamicKeySourceCol: 'A',
        dynamicValueSourceCol: 'B',
        dynamicStopMode: '按行结束',
        groupKeyCols: 'slip_id,employee_name,detail_depart_name,line_no',
        dictJson: selectedRankItemDictJsonText.value,
        description: `${selectedRankLabel.value}工资表明细导出配置（直接供工资表导出使用）`,
      },
      rootFieldRows: config.fields,
      includeChildConfig: false,
      includeDefaultFieldRows: false,
    });
    if (!result.success || !result.data) {
      ElMessage.error(result.message || '生成导入导出方案失败');
      return false;
    }
    ElMessage.success(`已生成方案：${result.data.solutionName}${result.data.coding ? `（${result.data.coding}）` : ''}`);
    return true;
  }

  function getRootConfigBySchemeId(configs: ImportConfigRow[], schemeId: string) {
    return configs.find((item) => item.pid === schemeId) || configs[0] || null;
  }

  function buildImportFieldRows(configId: string, rows: Array<{ index: string; name: string; title: string; type: number }>, existingRows: ImportFieldRow[] = []) {
    const existingMap = new Map(existingRows.map((item) => [`${String(item.name || '')}__${String(item.title || '')}`, item]));
    const nextRows: ImportFieldRow[] = rows.map((item) => {
      const key = `${String(item.name || '')}__${String(item.title || '')}`;
      const existed = existingMap.get(key);
      return {
        rowid: existed?.rowid || generateUUID(),
        configid: configId,
        name: item.name || '',
        title: item.title || '',
        index: item.index || '',
        type: item.type ?? 0,
        refDataid: existed?.refDataid || '',
        textField: existed?.textField || '',
        valueField: existed?.valueField || '',
        refTable: existed?.refTable || '',
        refTableDesc: existed?.refTableDesc || '',
        filterField: existed?.filterField || '',
        filterValue: existed?.filterValue || '',
        description: existed?.description || '',
      } as ImportFieldRow;
    });
    const nextRowIdSet = new Set(nextRows.map((item) => item.rowid));
    const deletedRowIds = existingRows.filter((item) => !nextRowIdSet.has(item.rowid)).map((item) => item.rowid);
    return { nextRows, deletedRowIds };
  }

  async function saveSchemeConfigNode(schemeId: string, existingConfig: ImportConfigRow | null, configOverrides: Partial<ImportConfigRow>, fieldRowsSource: Array<{ index: string; name: string; title: string; type: number }>, pid: string) {
    const configRow = existingConfig ? { ...existingConfig, ...configOverrides, schemeid: schemeId, pid } : { ...createEmptyImportConfig(schemeId, pid), ...configOverrides, schemeid: schemeId, pid };
    const existingFields = existingConfig?.rowid ? await getImportFieldsByConfigId(existingConfig.rowid) : [];
    const { nextRows, deletedRowIds } = buildImportFieldRows(configRow.rowid, fieldRowsSource, existingFields);
    const result = await saveImportDesign({ config: configRow, fields: nextRows, deletedFieldRowIds: deletedRowIds });
    if (!result.success || !result.data) throw new Error(result.message || '保存方案节点失败');
    return result.data.config;
  }

  async function upsertRankSolution() {
    if (!assertSchemePreviewable()) return false;
    const solutionName = getRankSchemeName();
    const config = buildRankSchemeConfig();
    const solutions = await getImportSolutions();
    let solution = solutions.find((item) => item.solutionName === solutionName) || null;
    if (!solution) {
      return ensureRankSolution();
    }
    const updateBasic = await updateImportSolution({
      ...solution,
      solutionName,
      description: `${selectedRankLabel.value}基于工资表明细表生成的导入导出方案，直接供工资表导出页面使用`,
    });
    if (!updateBasic.success || !updateBasic.data) {
      ElMessage.error(updateBasic.message || '更新导入导出方案失败');
      return false;
    }
    solution = updateBasic.data as ImportSolutionRow;
    const configs = await getImportConfigsBySchemeId(solution.rowid);
    const existedRoot = getRootConfigBySchemeId(configs, solution.rowid);
    await saveSchemeConfigNode(solution.rowid, existedRoot, {
      sheet: config.sheet,
      sheetName: config.sheetName,
      titleIndex: config.titleIndex,
      dataIndex: config.dataIndex,
      table: config.table,
      parentField: '',
      foreignKeyField: '',
      exportType: 'tree',
      transformType: 'RtoC',
      dynamicStartCol: selectedRankDynamicStartCol.value,
      dynamicEndCol: selectedRankDynamicEndCol.value,
      dynamicTitle: 'item_name',
      dynamicKeyField: 'item_code',
      dynamicValueField: 'item_value',
      skipEmptyValue: 1,
      dynamicStartRow: 2,
      dynamicEndRow: null,
      dynamicKeySourceCol: 'A',
      dynamicValueSourceCol: 'B',
      dynamicStopMode: '按行结束',
      groupKeyCols: 'slip_id,employee_name,detail_depart_name,line_no',
      dictJson: selectedRankItemDictJsonText.value,
      description: `${selectedRankLabel.value}工资表明细导出配置（直接供工资表导出使用）`,
    }, config.fields, solution.rowid);
    ElMessage.success(`已更新并绑定方案：${solution.solutionName}${solution.coding ? `（${solution.coding}）` : ''}`);
    return true;
  }

  async function handleBindScheme() {
    schemeBindingLoading.value = true;
    try {
      await upsertRankSolution();
    } catch (error: any) {
      ElMessage.error(error?.message || '绑定导入导出方案失败');
    } finally {
      schemeBindingLoading.value = false;
    }
  }

  function openSchemePreview() {
    if (!assertSchemePreviewable()) return;
    schemePreviewVisible.value = true;
  }

  async function confirmGenerateScheme() {
    schemeSolutionLoading.value = true;
    try {
      const success = await upsertRankSolution();
      if (success) schemePreviewVisible.value = false;
    } catch (error: any) {
      ElMessage.error(error?.message || '生成导入导出方案失败');
    } finally {
      schemeSolutionLoading.value = false;
    }
  }

  function downloadTemplateFile(title: string, rows: Record<string, any>[], fileName: string) {
    const columns = buildTemplateColumns();
    const html = buildTemplateExcelHtml(title, columns, rows);
    const blob = new Blob([`\uFEFF${html}`], { type: 'application/vnd.ms-excel;charset=utf-8' });
    downloadFileFromBlobPart({ fileName, source: blob });
  }

  async function handleDownloadImportTemplate() {
    if (!assertTemplateDownloadable() || !selectedRank.value) return;
    importTemplateLoading.value = true;
    try {
      const rank = selectedRank.value;
      const baseName = sanitizeFileName(`${rank.rank_code || rank.rank_name || '职级'}_导入模板`);
      const sampleRow = {
        salary_month: '',
        pay_month: '',
        rank_code: rank.rank_code || '',
        rank_name: rank.rank_name || '',
        employee_no: '示例工号',
        employee_name: '示例姓名',
        dept_name: '示例部门',
      } as Record<string, any>;
      selectedRankTemplateItems.value.forEach((item) => {
        sampleRow[item.item_code || item.item_id] = '';
      });
      downloadTemplateFile(`${selectedRankLabel.value}工资导入模板`, [sampleRow], `${baseName}.xls`);
      ElMessage.success('已下载当前职级导入模板');
    } catch (error: any) {
      ElMessage.error(error?.message || '下载导入模板失败');
    } finally {
      importTemplateLoading.value = false;
    }
  }

  async function handleDownloadExportTemplate() {
    if (!assertTemplateDownloadable() || !selectedRank.value) return;
    exportTemplateLoading.value = true;
    try {
      const rank = selectedRank.value;
      const baseName = sanitizeFileName(`${rank.rank_code || rank.rank_name || '职级'}_导出模板`);
      const rows = (employeeList.value.length ? employeeList.value : [{}]).map((employee) => {
        const row = {
          salary_month: '',
          pay_month: '',
          rank_code: rank.rank_code || '',
          rank_name: rank.rank_name || '',
          employee_no: employee.employee_no || '',
          employee_name: employee.employee_name || '',
          dept_name: employee.dept_name || '',
        } as Record<string, any>;
        selectedRankTemplateItems.value.forEach((item) => {
          row[item.item_code || item.item_id] = item.is_default_selected ? Number(item.default_amount || 0) : '';
        });
        return row;
      });
      downloadTemplateFile(`${selectedRankLabel.value}工资导出模板`, rows, `${baseName}.xls`);
      ElMessage.success('已下载当前职级导出模板');
    } catch (error: any) {
      ElMessage.error(error?.message || '下载导出模板失败');
    } finally {
      exportTemplateLoading.value = false;
    }
  }

  function buildRankItemDrafts() {
    const selectedMap = new Map<string, RankItemRow>(rankItemList.value.map((item) => [String(item.item_id || ''), item]));
    rankItemDraftList.value = salaryItemOptions.value.map((meta) => {
      const itemId = String(meta.rowid || '');
      const current = selectedMap.get(itemId);
      return {
        item_id: itemId,
        item_code: String(meta.item_code || ''),
        item_name: String(meta.display_name || meta.item_name || ''),
        item_category: String(meta.item_category || ''),
        item_direction: String(meta.item_direction || ''),
        selected: !!current,
        rowid: String(current?.rowid || ''),
        is_required: Number(current?.is_required ?? 0) === 1,
        is_default_selected: Number(current?.is_default_selected ?? 1) === 1,
        default_amount: Number(current?.default_amount || 0),
        sort_no: Number(current?.sort_no || 0),
        remark: String(current?.remark || ''),
      };
    });
  }

  async function loadRankList() {
    rankLoading.value = true;
    try {
      const res = await getSalaryRankList({ keyword: rankKeyword.value });
      rankList.value = res.list || [];
      if (!selectedRankId.value && rankList.value.length) selectedRankId.value = String(rankList.value[0].rowid || '');
      if (selectedRankId.value && !rankList.value.some((item) => String(item.rowid || '') === selectedRankId.value)) {
        selectedRankId.value = String(rankList.value[0]?.rowid || '');
      }
    } catch (error: any) {
      ElMessage.error(error?.message || '加载职级失败');
    } finally {
      rankLoading.value = false;
    }
  }

  async function loadEmployeeList() {
    if (!selectedRankId.value) {
      employeeList.value = [];
      return;
    }
    employeeLoading.value = true;
    try {
      const res = await getSalaryRankEmployeeList({ rank_id: selectedRankId.value, keyword: employeeKeyword.value });
      employeeList.value = res.list || [];
    } catch (error: any) {
      ElMessage.error(error?.message || '加载职级人员失败');
    } finally {
      employeeLoading.value = false;
    }
  }

  async function loadRankItemList() {
    if (!selectedRankId.value) {
      rankItemList.value = [];
      buildRankItemDrafts();
      return;
    }
    itemLoading.value = true;
    try {
      const res = await getSalaryRankItemList({ rank_id: selectedRankId.value });
      rankItemList.value = res.list || [];
      buildRankItemDrafts();
    } catch (error: any) {
      ElMessage.error(error?.message || '加载职级工资项失败');
    } finally {
      itemLoading.value = false;
    }
  }

  async function loadSalaryItems() {
    itemMetaLoading.value = true;
    try {
      const res = await getSalaryItemMetaPage({ pageNo: 1, page: 9999, is_enabled: 1 });
      salaryItemOptions.value = res.list || [];
      buildRankItemDrafts();
    } catch (error: any) {
      ElMessage.error(error?.message || '加载工资项元数据失败');
    } finally {
      itemMetaLoading.value = false;
    }
  }

  function resetRankForm() {
    rankForm.rowid = '';
    rankForm.rank_code = '';
    rankForm.rank_name = '';
    rankForm.rank_level = 1;
    rankForm.rank_type = '';
    rankForm.is_enabled = true;
    rankForm.remark = '';
  }

  function resetEmployeeForm() {
    employeeForm.rowid = '';
    employeeForm.rank_id = selectedRankId.value;
    employeeForm.employee_id = '';
    employeeForm.employee_no = '';
    employeeForm.employee_name = '';
    employeeForm.dept_id = '';
    employeeForm.dept_name = '';
    employeeForm.is_current = true;
    employeeForm.effective_date = '';
    employeeForm.expire_date = '';
    employeeForm.remark = '';
  }

  function handleRankItemSelectedChange(row: RankItemDraftRow, checked: boolean | string | number) {
    row.selected = !!checked;
    if (row.selected) row.is_default_selected = row.is_default_selected ?? true;
  }

  function handleEmployeeStaffChange(staff: any) {
    if (!staff) {
      employeeForm.employee_id = '';
      employeeForm.employee_no = '';
      employeeForm.employee_name = '';
      employeeForm.dept_id = '';
      employeeForm.dept_name = '';
      return;
    }
    employeeForm.employee_id = String(staff.ROWID || '');
    employeeForm.employee_no = String(staff.LoginName || '');
    employeeForm.employee_name = String(staff.UserName || '');
    employeeForm.dept_id = String(staff.DepID || '');
    employeeForm.dept_name = String(staff.DepName || '');
  }

  function openRankCreate() {
    rankEditingId.value = '';
    resetRankForm();
    rankDialogVisible.value = true;
  }

  function openRankEdit(row: RankRow) {
    rankEditingId.value = String(row.rowid || '');
    rankForm.rowid = String(row.rowid || '');
    rankForm.rank_code = String(row.rank_code || '');
    rankForm.rank_name = String(row.rank_name || '');
    rankForm.rank_level = Number(row.rank_level || 0);
    rankForm.rank_type = String(row.rank_type || '');
    rankForm.is_enabled = Number(row.is_enabled ?? 1) === 1;
    rankForm.remark = String(row.remark || '');
    rankDialogVisible.value = true;
  }

  async function submitRank() {
    try {
      const payload = {
        rowid: rankForm.rowid,
        rank_code: rankForm.rank_code,
        rank_name: rankForm.rank_name,
        rank_level: rankForm.rank_level,
        rank_type: rankForm.rank_type,
        is_enabled: rankForm.is_enabled ? 1 : 0,
        remark: rankForm.remark,
      };
      if (rankEditingId.value) {
        await updateSalaryRank(payload as any);
        ElMessage.success('职级已更新');
      } else {
        await createSalaryRank(payload as any);
        ElMessage.success('职级已新增');
      }
      rankDialogVisible.value = false;
      await loadRankList();
    } catch (error: any) {
      ElMessage.error(error?.message || '保存职级失败');
    }
  }

  async function removeRank(row: RankRow) {
    try {
      await ElMessageBox.confirm(`确认删除职级【${row.rank_name}】吗？`, '提示', { type: 'warning' });
      await deleteSalaryRank(String(row.rowid || ''));
      ElMessage.success('职级已删除');
      await loadRankList();
      await loadEmployeeList();
      await loadRankItemList();
    } catch (error: any) {
      if (error === 'cancel' || error === 'close') return;
      ElMessage.error(error?.message || '删除职级失败');
    }
  }

  function openEmployeeCreate() {
    if (!selectedRankId.value) return ElMessage.warning('请先选择职级');
    employeeEditingId.value = '';
    resetEmployeeForm();
    employeeDialogVisible.value = true;
  }

  function openEmployeeEdit(row: EmployeeRow) {
    employeeEditingId.value = String(row.rowid || '');
    employeeForm.rowid = String(row.rowid || '');
    employeeForm.rank_id = String(row.rank_id || selectedRankId.value);
    employeeForm.employee_id = String(row.employee_id || '');
    employeeForm.employee_no = String(row.employee_no || '');
    employeeForm.employee_name = String(row.employee_name || '');
    employeeForm.dept_id = String(row.dept_id || '');
    employeeForm.dept_name = String(row.dept_name || '');
    employeeForm.is_current = Number(row.is_current ?? 1) === 1;
    employeeForm.effective_date = String(row.effective_date || '');
    employeeForm.expire_date = String(row.expire_date || '');
    employeeForm.remark = String(row.remark || '');
    employeeDialogVisible.value = true;
  }

  async function submitEmployee() {
    try {
      const payload = {
        rowid: employeeForm.rowid,
        rank_id: employeeForm.rank_id,
        employee_id: employeeForm.employee_id,
        employee_no: employeeForm.employee_no,
        employee_name: employeeForm.employee_name,
        dept_id: employeeForm.dept_id,
        dept_name: employeeForm.dept_name,
        is_current: employeeForm.is_current ? 1 : 0,
        effective_date: employeeForm.effective_date,
        expire_date: employeeForm.expire_date,
        remark: employeeForm.remark,
      };
      if (employeeEditingId.value) {
        await updateSalaryRankEmployee(payload as any);
        ElMessage.success('职级人员已更新');
      } else {
        await createSalaryRankEmployee(payload as any);
        ElMessage.success('职级人员已新增');
      }
      employeeDialogVisible.value = false;
      await loadEmployeeList();
    } catch (error: any) {
      ElMessage.error(error?.message || '保存职级人员失败');
    }
  }

  async function removeEmployee(row: EmployeeRow) {
    try {
      await ElMessageBox.confirm(`确认删除员工【${row.employee_name}】的职级分配吗？`, '提示', { type: 'warning' });
      await deleteSalaryRankEmployee(String(row.rowid || ''));
      ElMessage.success('职级人员已删除');
      await loadEmployeeList();
    } catch (error: any) {
      if (error === 'cancel' || error === 'close') return;
      ElMessage.error(error?.message || '删除职级人员失败');
    }
  }

  async function saveRankItems() {
    if (!selectedRankId.value) {
      ElMessage.warning('请先选择职级');
      return;
    }
    itemSaving.value = true;
    try {
      const existingMap = new Map<string, RankItemRow>(rankItemList.value.map((item) => [String(item.item_id || ''), item]));
      const selectedDrafts = rankItemDraftList.value.filter((item) => item.selected);
      const selectedIds = new Set(selectedDrafts.map((item) => item.item_id));
      const added = selectedDrafts.filter((draft) => !existingMap.has(draft.item_id)).map((draft) => ({
        rank_id: selectedRankId.value,
        item_id: draft.item_id,
        is_required: draft.is_required ? 1 : 0,
        is_default_selected: draft.is_default_selected ? 1 : 0,
        default_amount: Number(draft.default_amount || 0),
        sort_no: Number(draft.sort_no || 0),
        remark: draft.remark || '',
      }));
      const changed = selectedDrafts.filter((draft) => {
        const existed = existingMap.get(draft.item_id);
        if (!existed) return false;
        return Number(existed.is_required ?? 0) !== (draft.is_required ? 1 : 0) || Number(existed.is_default_selected ?? 1) !== (draft.is_default_selected ? 1 : 0) || Number(existed.default_amount || 0) !== Number(draft.default_amount || 0) || Number(existed.sort_no || 0) !== Number(draft.sort_no || 0) || String(existed.remark || '') !== String(draft.remark || '');
      }).map((draft) => ({
        rowid: String(existingMap.get(draft.item_id)?.rowid || draft.rowid),
        rank_id: selectedRankId.value,
        item_id: draft.item_id,
        is_required: draft.is_required ? 1 : 0,
        is_default_selected: draft.is_default_selected ? 1 : 0,
        default_amount: Number(draft.default_amount || 0),
        sort_no: Number(draft.sort_no || 0),
        remark: draft.remark || '',
      }));
      const deletedRowIds = rankItemList.value.filter((item) => !selectedIds.has(String(item.item_id || ''))).map((item) => String(item.rowid || '')).filter(Boolean);
      await saveSalaryRankItemBatch({ added, changed, deletedRowIds });
      ElMessage.success('职级工资项已批量保存');
      await loadRankItemList();
    } catch (error: any) {
      ElMessage.error(error?.message || '保存职级工资项失败');
    } finally {
      itemSaving.value = false;
    }
  }

  async function openTemplateBindingDialog() {
    if (!selectedRank.value) {
      ElMessage.warning('请先选择职级');
      return;
    }
    templateBindingVisible.value = true;
    templateBindingLoading.value = true;
    currentTemplateConfig.value = null;
    templateBindingForm.solutionId = '';
    templateBindingForm.solutionName = getRankSchemeName();
    templateBindingForm.templatePath = '';
    try {
      const solutionName = getRankSchemeName();
      const solutions = await getImportSolutions();
      const existed = solutions.find((item) => item.solutionName === solutionName);
      if (!existed) {
        templateBindingMode.value = 'create';
        return;
      }
      templateBindingMode.value = 'edit';
      templateBindingForm.solutionId = existed.rowid;
      templateBindingForm.solutionName = existed.solutionName;
      const configs = await getImportConfigsBySchemeId(existed.rowid);
      const rootConfig = getRootConfigBySchemeId(configs, existed.rowid);
      currentTemplateConfig.value = rootConfig;
      templateBindingForm.templatePath = String(rootConfig?.templatePath || '');
    } catch (error: any) {
      ElMessage.error(error?.message || '加载模板绑定信息失败');
    } finally {
      templateBindingLoading.value = false;
    }
  }

  async function submitTemplateBinding() {
    if (!selectedRank.value) {
      ElMessage.warning('请先选择职级');
      return;
    }
    templateBindingSaving.value = true;
    try {
      let solutionId = templateBindingForm.solutionId;
      let rootConfig = currentTemplateConfig.value;
      if (!solutionId) {
        const success = await upsertRankSolution();
        if (!success) return;
        const solutions = await getImportSolutions();
        const existed = solutions.find((item) => item.solutionName === getRankSchemeName());
        if (!existed) {
          ElMessage.error('方案创建成功后未找到对应记录');
          return;
        }
        solutionId = existed.rowid;
        templateBindingForm.solutionId = existed.rowid;
        templateBindingForm.solutionName = existed.solutionName;
        const configs = await getImportConfigsBySchemeId(existed.rowid);
        rootConfig = getRootConfigBySchemeId(configs, existed.rowid);
        if (!rootConfig) {
          ElMessage.error('未找到方案根配置，无法绑定模板');
          return;
        }
        currentTemplateConfig.value = rootConfig;
        templateBindingMode.value = 'edit';
      }
      if (!rootConfig) {
        const configs = await getImportConfigsBySchemeId(solutionId);
        rootConfig = getRootConfigBySchemeId(configs, solutionId);
        if (!rootConfig) {
          ElMessage.error('未找到方案根配置，无法绑定模板');
          return;
        }
        currentTemplateConfig.value = rootConfig;
      }
      const result = await saveImportConfig({ ...rootConfig, templatePath: templateBindingForm.templatePath.trim() });
      if (!result.success || !result.data) {
        ElMessage.error(result.message || '保存模板绑定失败');
        return;
      }
      currentTemplateConfig.value = result.data;
      templateBindingMode.value = 'edit';
      ElMessage.success(templateBindingForm.templatePath.trim() ? '模板绑定已保存' : '模板绑定已清空');
      templateBindingVisible.value = false;
    } catch (error: any) {
      ElMessage.error(error?.message || '保存模板绑定失败');
    } finally {
      templateBindingSaving.value = false;
    }
  }

  function openDesigner() {
    if (!selectedRank.value) {
      ElMessage.warning('请先选择职级');
      return;
    }
    designerVisible.value = true;
  }

  watch(selectedRankId, async () => {
    resetEmployeeForm();
    await Promise.all([loadEmployeeList(), loadRankItemList()]);
  });

  watch([salaryItemOptions, rankItemList], () => {
    buildRankItemDrafts();
  });

  onMounted(async () => {
    await Promise.all([loadSalaryItems(), loadRankList()]);
    await Promise.all([loadEmployeeList(), loadRankItemList()]);
  });

  return {
    currentSchemeName,
    currentTemplateConfig,
    designerVisible,
    employeeCountMap,
    employeeDialogVisible,
    employeeEditingId,
    employeeForm,
    employeeKeyword,
    employeeList,
    employeeLoading,
    exportTemplateLoading,
    filteredRankItemDraftList,
    handleBindScheme,
    handleDownloadExportTemplate,
    handleDownloadImportTemplate,
    handleEmployeeStaffChange,
    handleRankItemSelectedChange,
    importTemplateLoading,
    itemKeyword,
    itemLoading,
    itemMetaLoading,
    itemSaving,
    loadEmployeeList,
    loadRankList,
    openDesigner,
    loadRankItemList,
    openEmployeeCreate,
    openEmployeeEdit,
    openRankCreate,
    openRankEdit,
    openSchemePreview,
    openTemplateBindingDialog,
    rankDialogVisible,
    rankEditingId,
    rankForm,
    rankKeyword,
    rankList,
    rankLoading,
    removeEmployee,
    removeRank,
    saveRankItems,
    schemeBindingLoading,
    schemePreviewJson,
    schemePreviewPayload,
    schemePreviewVisible,
    schemeSolutionLoading,
    selectedRank,
    selectedRankDynamicStartCol,
    selectedRankDynamicEndCol,
    selectedRankId,
    selectedRankLabel,
    selectedRankTemplateItems,
    submitEmployee,
    submitRank,
    submitTemplateBinding,
    templateBindingForm,
    templateBindingLoading,
    templateBindingMode,
    templateBindingSaving,
    templateBindingVisible,
    confirmGenerateScheme,
  };
}
