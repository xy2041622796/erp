import { computed, onMounted, reactive, ref } from 'vue';

import { downloadFileFromBlobPart } from '@vben/utils';

import {
  createSalaryItemMeta,
  deleteSalaryItemMeta,
  getSalaryItemMetaPage,
  updateSalaryItemMeta,
} from '#/api/erp/finance/cashier/settings/payroll';
import {
  createImportSolution,
  getImportSolutions,
} from '#/api/erp/import-solution';

import { ElMessage, ElMessageBox } from 'element-plus';

import {
  categoryOptions,
  commonItemTemplates,
  dataTypeOptions,
  defaultSourceOptions,
  directionOptions,
  displayOptions,
  editableScopeOptions,
  inputModeOptions,
  payrollImportConfigSheetName,
  payrollImportConfigTable,
  payrollImportFieldTemplates,
  payrollImportSolutionName,
  permissionOptions,
  unitOptions,
  visibleScopeOptions,
} from '#/views/finance/cashier/settings/payroll/constants';
import {
  applyRowToEditForm,
  buildCommonItemPayload,
  buildSubmitPayload,
  createEditFormRules,
  createInitialEditForm,
  fillDefaultDisplayGroup,
  fillDefaultDisplayName,
  resetEditForm,
} from '#/views/finance/cashier/settings/payroll/form';
import {
  buildCommonItemTemplateCandidates,
  buildEffectiveTotal,
  buildOverviewCards,
  buildPagedList,
  buildValueSet,
  filterCreatableTemplateCandidates,
  getErrorMessage,
} from '#/views/finance/cashier/settings/payroll/helpers';
import type {
  DialogType,
  PageDataState,
  PayrollEditDialogExpose,
  QueryFormState,
} from '#/views/finance/cashier/settings/payroll/types';

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

function buildHeaderExcelHtml(rows: any[]) {
  const groupedMap = new Map<
    string,
    {
      categoryLabel: string;
      items: any[];
    }
  >();

  for (const row of rows) {
    const categoryValue = String(row.item_category || 'UNCATEGORIZED');
    if (!groupedMap.has(categoryValue)) {
      groupedMap.set(categoryValue, {
        categoryLabel: getCategoryLabel(categoryValue),
        items: [],
      });
    }
    groupedMap.get(categoryValue)?.items.push(row);
  }

  const groupedList = Array.from(groupedMap.values());

  const categoryCells = groupedList
    .map(
      ({ categoryLabel, items }) =>
        `<td colspan="${items.length}" style="font-weight:bold;background:#cfe2f3;text-align:center;white-space:nowrap;">${escapeXml(categoryLabel)}</td>`,
    )
    .join('');

  const itemNameCells = groupedList
    .flatMap(({ items }) => items)
    .map((row) => {
      const text = row.display_name || row.item_name || row.item_code || '未命名项目';
      return `<td style="font-weight:bold;background:#d9ead3;white-space:nowrap;">${escapeXml(text)}</td>`;
    })
    .join('');

  const itemCodeCells = groupedList
    .flatMap(({ items }) => items)
    .map((row) => `<td style="white-space:nowrap;">${escapeXml(row.item_code || '')}</td>`)
    .join('');

  return `
  <html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8" />
      <meta name="ProgId" content="Excel.Sheet" />
      <meta name="Generator" content="Microsoft Excel 15" />
    </head>
    <body>
      <table border="1" cellspacing="0" cellpadding="4">
        <tr>${categoryCells}</tr>
        <tr>${itemNameCells}</tr>
        <tr>${itemCodeCells}</tr>
      </table>
    </body>
  </html>`;
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

function buildPayrollImportFieldRows() {
  return payrollImportFieldTemplates.map((item, index) => ({
    name: item.name,
    title: item.title,
    index: getExcelColumnName(index),
  }));
}

export function usePayrollPage() {
  const loading = ref(false);
  const submitLoading = ref(false);
  const commonItemLoading = ref(false);
  const commonItemDialogVisible = ref(false);
  const commonItemInitLoading = ref(false);
  const headerExportLoading = ref(false);
  const importSolutionLoading = ref(false);
  const dialogVisible = ref(false);
  const dialogType = ref<DialogType>('create');
  const editDialogRef = ref<PayrollEditDialogExpose>();

  const queryForm = reactive<QueryFormState>({
    keyword: '',
    item_category: '',
    item_direction: '',
    input_mode: '',
    is_enabled: '',
    pageNo: 1,
    page: 10,
  });

  function buildPageQueryParams(params: QueryFormState) {
    return {
      ...params,
      pageNo: 1,
    };
  }

  const pageData = reactive<PageDataState>({
    list: [],
    total: 0,
  });

  const allExistingItems = ref<any[]>([]);
  const editForm = reactive(createInitialEditForm());
  const rules = createEditFormRules(editForm);

  const dialogTitle = computed(() =>
    dialogType.value === 'create' ? '新增工资项目元数据' : '编辑工资项目元数据',
  );

  const existingItemCodeSet = computed(() => buildValueSet(allExistingItems.value, 'item_code'));
  const existingItemNameSet = computed(() => buildValueSet(allExistingItems.value, 'item_name'));

  const commonItemTemplateCandidates = computed(() => {
    return buildCommonItemTemplateCandidates(
      commonItemTemplates,
      existingItemCodeSet.value,
      existingItemNameSet.value,
    );
  });

  const creatableCommonItemCandidates = computed(() => {
    return filterCreatableTemplateCandidates(commonItemTemplateCandidates.value);
  });

  const effectiveTotal = computed(() => buildEffectiveTotal(pageData));
  const pagedList = computed(() => buildPagedList(pageData, queryForm));
  const overviewCards = computed(() => buildOverviewCards(pageData.list));

  async function loadAllExistingItems() {
    const res = await getSalaryItemMetaPage({
      pageNo: 0,
      page: 1,
      keyword: '',
      item_category: '',
      item_direction: '',
      input_mode: '',
      is_enabled: '',
    });
    allExistingItems.value = Array.isArray(res.list) ? res.list : [];
  }

  async function loadData() {
    loading.value = true;
    try {
      const res = await getSalaryItemMetaPage(buildPageQueryParams(queryForm));
      pageData.list = res.list || [];
      pageData.total = Number(res.total || 0);
    } catch (error: any) {
      ElMessage.error(getErrorMessage(error, '加载工资项目失败'));
    } finally {
      loading.value = false;
    }
  }

  async function handleCreateImportSolution() {
    importSolutionLoading.value = true;
    try {
      const solutions = await getImportSolutions();
      const existed = solutions.find((item) => item.solutionName === payrollImportSolutionName);
      if (existed) {
        ElMessage.info(`导入方案已存在：${payrollImportSolutionName}${existed.coding ? `（${existed.coding}）` : ''}`);
        return;
      }

      const result = await createImportSolution(payrollImportSolutionName, {
        rootConfigRow: {
          sheetName: payrollImportConfigSheetName,
          table: payrollImportConfigTable,
          exportType: 'tree',
          titleIndex: 1,
          dataIndex: 2,
        },
        rootFieldRows: buildPayrollImportFieldRows(),
        includeChildConfig: false,
        includeDefaultFieldRows: false,
      });

      if (!result.success || !result.data) {
        ElMessage.error(result.message || '生成工资项目导入方案失败');
        return;
      }

      ElMessage.success(`已生成导入方案：${result.data.solutionName}${result.data.coding ? `（${result.data.coding}）` : ''}`);
    } catch (error: any) {
      ElMessage.error(getErrorMessage(error, '生成工资项目导入方案失败'));
    } finally {
      importSolutionLoading.value = false;
    }
  }

  async function handleTestDownloadHeaders() {
    headerExportLoading.value = true;
    try {
      const res = await getSalaryItemMetaPage({
        ...buildPageQueryParams(queryForm),
        pageNo: 0,
        page: 1,
      });
      const rows = Array.isArray(res.list) ? res.list : [];
      if (!rows.length) {
        ElMessage.warning('当前没有可导出的工资项目表头');
        return;
      }

      const html = buildHeaderExcelHtml(rows);
      const blob = new Blob([`\uFEFF${html}`], {
        type: 'application/vnd.ms-excel;charset=utf-8',
      });

      downloadFileFromBlobPart({
        fileName: '工资明细多级表头测试.xls',
        source: blob,
      });
      ElMessage.success('已下载多级表头测试文件，请检查分类分组与项目结构');
    } catch (error: any) {
      ElMessage.error(getErrorMessage(error, '下载测试文件失败'));
    } finally {
      headerExportLoading.value = false;
    }
  }

  function handleSearch() {
    queryForm.pageNo = 1;
    loadData();
  }

  function handleReset() {
    queryForm.keyword = '';
    queryForm.item_category = '';
    queryForm.item_direction = '';
    queryForm.input_mode = '';
    queryForm.is_enabled = '';
    queryForm.pageNo = 1;
    loadData();
  }

  async function handleOpenCommonItemDialog() {
    commonItemInitLoading.value = true;
    try {
      await Promise.all([loadData(), loadAllExistingItems()]);
      commonItemDialogVisible.value = true;
    } catch (error: any) {
      ElMessage.error(getErrorMessage(error, '加载常用工资项目失败'));
    } finally {
      commonItemInitLoading.value = false;
    }
  }

  function handleCreate() {
    dialogType.value = 'create';
    resetEditForm(editForm);
    dialogVisible.value = true;
  }

  function handleEdit(row: any) {
    dialogType.value = 'edit';
    applyRowToEditForm(editForm, row);
    dialogVisible.value = true;
  }

  async function handleDelete(row: any) {
    try {
      await ElMessageBox.confirm(`确认删除工资项目“${row.item_name || row.item_code}”吗？`, '删除确认', {
        type: 'warning',
      });
      await deleteSalaryItemMeta(String(row.rowid || ''));
      ElMessage.success('删除成功');
      await Promise.all([loadData(), loadAllExistingItems()]);
    } catch (error: any) {
      if (error === 'cancel' || error === 'close') return;
      ElMessage.error(getErrorMessage(error, '删除失败'));
    }
  }

  async function handleCreateCommonItem(item: any) {
    if (item.exists) {
      ElMessage.info(`工资项目“${item.item_name}”已存在${item.existsReason ? `（${item.existsReason}）` : ''}，已跳过`);
      return;
    }
    try {
      await createSalaryItemMeta(buildCommonItemPayload(item));
      ElMessage.success(`已创建工资项目：${item.item_name}`);
      await Promise.all([loadData(), loadAllExistingItems()]);
    } catch (error: any) {
      ElMessage.error(getErrorMessage(error, `创建工资项目失败：${item.item_name}`));
      await loadAllExistingItems();
    }
  }

  async function handleCreateAllCommonItems() {
    if (!creatableCommonItemCandidates.value.length) {
      ElMessage.warning('当前没有可创建的常用工资项目');
      return;
    }
    commonItemLoading.value = true;
    try {
      let createdCount = 0;
      for (const item of creatableCommonItemCandidates.value) {
        await createSalaryItemMeta(buildCommonItemPayload(item));
        createdCount += 1;
      }
      await Promise.all([loadData(), loadAllExistingItems()]);
      ElMessage.success(`已创建 ${createdCount} 个常用工资项目`);
    } catch (error: any) {
      ElMessage.error(getErrorMessage(error, '创建常用工资项目失败'));
      await loadAllExistingItems();
    } finally {
      commonItemLoading.value = false;
    }
  }

  async function handleSubmit() {
    await editDialogRef.value?.validate?.();
    submitLoading.value = true;
    try {
      const payload = buildSubmitPayload(editForm);

      if (dialogType.value === 'create') {
        await createSalaryItemMeta(payload);
        ElMessage.success('新增成功');
      } else {
        await updateSalaryItemMeta(payload);
        ElMessage.success('修改成功');
      }

      dialogVisible.value = false;
      await Promise.all([loadData(), loadAllExistingItems()]);
    } catch (error: any) {
      ElMessage.error(getErrorMessage(error, '保存失败'));
    } finally {
      submitLoading.value = false;
    }
  }

  function handleCategoryChange() {
    fillDefaultDisplayGroup(editForm);
  }

  function handleNameBlur() {
    fillDefaultDisplayName(editForm);
  }

  function handleSizeChange(size: number) {
    queryForm.page = size;
    queryForm.pageNo = 1;
    loadData();
  }

  function handleCurrentChange(page: number) {
    queryForm.pageNo = page;
    loadData();
  }

  onMounted(async () => {
    await Promise.all([loadData(), loadAllExistingItems()]);
  });

  return {
    loading,
    submitLoading,
    commonItemLoading,
    commonItemDialogVisible,
    commonItemInitLoading,
    headerExportLoading,
    importSolutionLoading,
    dialogVisible,
    dialogType,
    editDialogRef,
    queryForm,
    pageData,
    allExistingItems,
    editForm,
    rules,
    dialogTitle,
    commonItemTemplateCandidates,
    creatableCommonItemCandidates,
    effectiveTotal,
    pagedList,
    overviewCards,
    categoryOptions,
    directionOptions,
    inputModeOptions,
    dataTypeOptions,
    unitOptions,
    defaultSourceOptions,
    displayOptions,
    permissionOptions,
    visibleScopeOptions,
    editableScopeOptions,
    loadData,
    loadAllExistingItems,
    handleCreateImportSolution,
    handleTestDownloadHeaders,
    handleSearch,
    handleReset,
    handleOpenCommonItemDialog,
    handleCreate,
    handleEdit,
    handleDelete,
    handleCreateCommonItem,
    handleCreateAllCommonItems,
    handleSubmit,
    handleCategoryChange,
    handleNameBlur,
    handleSizeChange,
    handleCurrentChange,
  };
}
