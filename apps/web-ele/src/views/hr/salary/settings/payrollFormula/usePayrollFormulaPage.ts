import { computed, onMounted, reactive, ref, watch } from 'vue';

import { createSalaryFormula, deleteSalaryFormula, getSalaryFormulaPage, updateSalaryFormula } from '#/api/erp/finance/cashier/settings/payrollFormula';
import { getSalaryItemMetaPage } from '#/api/erp/finance/cashier/settings/payroll';
import { getStoredAccountSetId } from '#/utils/accountSet';
import { ElMessage, ElMessageBox } from 'element-plus';

import { commonFormulaTemplates, formulaPresetOptions, quickStartCards, roundModeOptions } from './constants';
import { applyRowToEditForm, buildSubmitPayload, buildTemplatePayload, createEditFormRules, createInitialEditForm, resetEditForm, resolveSelectionFromRow, validateFormulaSelection } from './form';
import { buildFormulaExpr, buildTemplateCandidate, enabledText, formulaPresetText, getErrorMessage, getFormulaPreviewText, getItemLabel, getPresetFieldLimit, getSelectedFieldTip, normalizeSelectedSourceFields, parseFormulaExpr, resolveFormulaFieldCodes } from './helpers';
import type { FormulaPreset, OptionItem, PayrollFormulaEditDialogExpose, QueryFormState, SalaryFormulaTemplateCandidate } from './types';

export function usePayrollFormulaPage() {
  const loading = ref(false);
  const templateLoading = ref(false);
  const templateDialogVisible = ref(false);
  const dialogVisible = ref(false);
  const dialogType = ref<'create' | 'edit'>('create');
  const editDialogRef = ref<PayrollFormulaEditDialogExpose>();
  const targetItemOptions = ref<OptionItem[]>([]);
  const sourceFieldOptions = ref<OptionItem[]>([]);
  const allFormulaList = ref<any[]>([]);
  const selectedFormulaPreset = ref<FormulaPreset>('ADD');
  const selectedSourceFields = ref<string[]>([]);
  const showAdvanced = ref(false);
  const currentAccountSetId = ref('');

  const queryForm = reactive<QueryFormState>({ keyword: '', target_item_code: '', is_enabled: '', pageNo: 1, page: 10 });

  function buildPageQueryParams(params: QueryFormState) {
    return {
      ...params,
      pageNo: Math.max(Number(params.pageNo || 1) - 1, 0),
    };
  }

  const pageData = reactive({ list: [] as any[], total: 0 });
  const editForm = reactive(createInitialEditForm());
  const rules = createEditFormRules();

  const existingFormulaTargetCodeSet = computed(() => new Set((allFormulaList.value || []).map((item) => String(item.target_item_code || '').trim()).filter(Boolean)));
  const currentPresetTip = computed(() => formulaPresetOptions.find((item) => item.value === selectedFormulaPreset.value)?.tip || '');
  const selectedSourceFieldLimit = computed(() => {
    const { max } = getPresetFieldLimit(selectedFormulaPreset.value);
    return max === Number.MAX_SAFE_INTEGER ? 0 : max;
  });
  const generatedFormulaExpr = computed(() => buildFormulaExpr(selectedFormulaPreset.value, selectedSourceFields.value));
  const selectedTargetLabel = computed(() => getItemLabel(sourceFieldOptions.value, editForm.target_item_code, true));
  const generatedFormulaName = computed(() => {
    const targetLabel = getItemLabel(sourceFieldOptions.value, editForm.target_item_code, false);
    const presetLabel = formulaPresetText(selectedFormulaPreset.value);
    return targetLabel ? `${targetLabel}-${presetLabel}` : '';
  });
  const selectedSourceFieldLabels = computed(() => selectedSourceFields.value.map((code) => getItemLabel(sourceFieldOptions.value, code, false) || code).filter(Boolean));
  const availableSourceFieldOptions = computed(() => sourceFieldOptions.value.filter((item) => item.value !== editForm.target_item_code));
  const commonFormulaTemplateCandidates = computed<SalaryFormulaTemplateCandidate[]>(() => commonFormulaTemplates.map((template) => buildTemplateCandidate(template, sourceFieldOptions.value, existingFormulaTargetCodeSet.value)));
  const creatableTemplateCandidates = computed(() => commonFormulaTemplateCandidates.value.filter((item) => item.creatable && !item.exists));
  const canSubmit = computed(() => {
    if (!editForm.target_item_code) return false;
    const fields = selectedSourceFields.value.map((item) => String(item || '').trim()).filter(Boolean);
    const { min, max } = getPresetFieldLimit(selectedFormulaPreset.value);
    return fields.length >= min && fields.length <= max;
  });
  const dialogTitle = computed(() => (dialogType.value === 'create' ? '新增公式' : '编辑公式'));

  watch(() => editForm.target_item_code, () => {
    selectedSourceFields.value = selectedSourceFields.value.filter((item) => item !== editForm.target_item_code);
    if (!String(editForm.formula_name || '').trim()) editForm.formula_name = generatedFormulaName.value;
  });

  watch(() => [selectedFormulaPreset.value, selectedSourceFields.value.join(',')], () => {
    const normalizedFields = normalizeSelectedSourceFields(selectedFormulaPreset.value, selectedSourceFields.value);
    if (normalizedFields.join(',') !== selectedSourceFields.value.join(',')) {
      selectedSourceFields.value = normalizedFields;
    }
    if (!String(editForm.formula_name || '').trim() || dialogType.value === 'create') editForm.formula_name = generatedFormulaName.value;
  });

  async function loadTargetItemOptions() {
    currentAccountSetId.value = getStoredAccountSetId() || '';
    const res = await getSalaryItemMetaPage({ pageNo: 0, page: 9999, is_enabled: 1 });
    const list = (res.list || []).map((item: any) => ({ label: `${item.display_name || item.item_name || ''}（${item.item_code || ''}）`, value: item.item_code || '', raw: item })) as OptionItem[];
    targetItemOptions.value = list;
    sourceFieldOptions.value = list;
  }

  async function loadAllFormulaData() {
    const res = await getSalaryFormulaPage({ keyword: '', target_item_code: '', is_enabled: '', pageNo: 0, page: 9999 });
    allFormulaList.value = Array.isArray(res.list) ? res.list : [];
  }

  async function loadData() {
    loading.value = true;
    try {
      const res = await getSalaryFormulaPage(buildPageQueryParams(queryForm));
      pageData.list = res.list || [];
      pageData.total = Number(res.total || 0);
    } catch (error: any) {
      ElMessage.error(getErrorMessage(error, '加载工资公式失败'));
    } finally {
      loading.value = false;
    }
  }

  function handleSearch() { queryForm.pageNo = 1; loadData(); }
  function handleReset() { queryForm.keyword = ''; queryForm.target_item_code = ''; queryForm.is_enabled = ''; queryForm.pageNo = 1; loadData(); }
  async function handleOpenTemplateDialog() { try { await Promise.all([loadTargetItemOptions(), loadData(), loadAllFormulaData()]); templateDialogVisible.value = true; } catch (error:any) { ElMessage.error(getErrorMessage(error, '加载常用公式失败')); } }
  async function handleCreate() { try { await loadTargetItemOptions(); dialogType.value = 'create'; resetEditForm(editForm); selectedFormulaPreset.value = 'ADD'; selectedSourceFields.value = []; showAdvanced.value = false; dialogVisible.value = true; } catch (error:any) { ElMessage.error(getErrorMessage(error, '加载工资项目失败')); } }
  async function handleEdit(row:any) { try { await loadTargetItemOptions(); dialogType.value = 'edit'; applyRowToEditForm(editForm, row); const resolved = resolveSelectionFromRow(row); const sourceCodes = resolveFormulaFieldCodes(sourceFieldOptions.value, resolved.fields); selectedFormulaPreset.value = resolved.preset; selectedSourceFields.value = normalizeSelectedSourceFields(resolved.preset, sourceCodes); showAdvanced.value = Boolean(row.calc_order || row.description || row.remark || row.round_mode !== 'ROUND'); dialogVisible.value = true; } catch (error:any) { ElMessage.error(getErrorMessage(error, '加载公式详情失败')); } }
  async function handleDelete(row:any) { try { await ElMessageBox.confirm(`确认删除公式“${row.formula_name || row.target_item_code}”吗？`, '删除确认', { type: 'warning' }); await deleteSalaryFormula(String(row.rowid || '')); ElMessage.success('删除成功'); await Promise.all([loadData(), loadAllFormulaData()]); } catch (error:any) { if (error === 'cancel' || error === 'close') return; ElMessage.error(getErrorMessage(error, '删除公式失败')); } }
  function handlePresetChange() { selectedSourceFields.value = normalizeSelectedSourceFields(selectedFormulaPreset.value, selectedSourceFields.value); }
  async function handleGenerateTemplate(candidate: SalaryFormulaTemplateCandidate) { if (!candidate.creatable) throw new Error(`“${candidate.title}”缺少必要工资项目，暂不能生成`); if (candidate.exists) { ElMessage.info(`“${candidate.title}”已存在，已跳过`); return; } try { await createSalaryFormula(buildTemplatePayload(candidate)); ElMessage.success(`已生成公式：${candidate.title}`); await Promise.all([loadData(), loadAllFormulaData()]); } catch (error:any) { ElMessage.error(getErrorMessage(error, `生成公式失败：${candidate.title}`)); await loadAllFormulaData(); } }
  async function handleGenerateAllTemplates() { if (!creatableTemplateCandidates.value.length) { ElMessage.warning('当前没有可生成的常用公式模板'); return; } templateLoading.value = true; try { let createdCount = 0; for (const candidate of creatableTemplateCandidates.value) { await createSalaryFormula(buildTemplatePayload(candidate)); createdCount += 1; } await Promise.all([loadData(), loadAllFormulaData()]); ElMessage.success(`已生成 ${createdCount} 条常用公式`); } catch (error:any) { ElMessage.error(getErrorMessage(error, '批量生成常用公式失败')); await loadAllFormulaData(); } finally { templateLoading.value = false; } }
  async function handleSubmit() { try { await editDialogRef.value?.validate?.(); const sourceFields = validateFormulaSelection(editForm.target_item_code, selectedFormulaPreset.value, resolveFormulaFieldCodes(sourceFieldOptions.value, selectedSourceFields.value)); const payload = buildSubmitPayload(editForm, selectedFormulaPreset.value, sourceFields, generatedFormulaName.value); if (!payload.formula_name) throw new Error('请先选择结果项目'); if (dialogType.value === 'create') { await createSalaryFormula(payload); ElMessage.success('新增成功'); } else { await updateSalaryFormula(payload); ElMessage.success('修改成功'); } dialogVisible.value = false; await Promise.all([loadData(), loadAllFormulaData()]); } catch (error:any) { ElMessage.error(getErrorMessage(error, '保存公式失败')); } }
  function handleSizeChange(size:number) { queryForm.page = size; queryForm.pageNo = 1; loadData(); }
  function handleCurrentChange(page:number) { queryForm.pageNo = page; loadData(); }

  onMounted(async () => { try { await Promise.all([loadTargetItemOptions(), loadData(), loadAllFormulaData()]); } catch (error:any) { ElMessage.error(getErrorMessage(error, '初始化工资公式页面失败')); } });

  return {
    loading, templateLoading, templateDialogVisible, dialogVisible, dialogType, editDialogRef,
    targetItemOptions, sourceFieldOptions, allFormulaList, selectedFormulaPreset, selectedSourceFields, selectedSourceFieldLimit, showAdvanced, currentAccountSetId,
    queryForm, pageData, editForm, rules,
    currentPresetTip, generatedFormulaExpr, selectedTargetLabel, generatedFormulaName, selectedSourceFieldLabels, availableSourceFieldOptions,
    commonFormulaTemplateCandidates, creatableTemplateCandidates, canSubmit, dialogTitle,
    quickStartCards, formulaPresetOptions, roundModeOptions,
    enabledText, formulaPresetText, getFormulaPreviewText, parseFormulaExpr,
    handleSearch, handleReset, handleOpenTemplateDialog, handleCreate, handleEdit, handleDelete, handlePresetChange,
    handleGenerateTemplate, handleGenerateAllTemplates, handleSubmit, handleSizeChange, handleCurrentChange,
  };
}
