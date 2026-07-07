<script lang="ts" setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';
import { RefreshRight } from '@element-plus/icons-vue';
import ExcelJS from 'exceljs';

import {
  countVoucherDetailsByAccountCode,
  deleteSubject,
  getDeleteSubjectEffect,
  downloadSubjectExcelTemplate,
  exportSubjectExcel,
  getSubjectExportFileName,
  getSubjectImportSchemeDetail,
  getSubjectList,
  importSubjectExcel,
  resetCurrentAccountSubjectsToTemplate,
  updateSubject,
} from '#/api/erp/finance/settings/project';
import { getSubjectAuxiliaryOptions } from '#/api/erp/finance/settings/auxiliary';
import { useAccountSetStore } from '#/store';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';
import type { ImportConfigRow, ImportFieldRow } from '#/api/erp/import-design';
import {
  DEFAULT_SUBJECT_CODE_RULE,
  formatSubjectCodeRule,
  getSubjectCodeRule,
  saveSubjectCodeRule,
  type SubjectCodeRule,
} from '#/api/erp/finance/settings/project/subject-code-rule';

import {
  AUXILIARY_OPTIONS,
  type AuxiliaryOption,
  balanceDirectionLabel,
  renderAuxiliary,
  SUBJECT_TYPE_TABS,
} from '#/views/finance/settings/project/data';
import Form from '#/views/finance/settings/project/modules/form.vue';

import {
  ElButton,
  ElCard,
  ElCheckbox,
  ElDialog,
  ElLoading,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElUpload,
} from 'element-plus';

defineOptions({ name: 'FinanceSubjectSetting' });

type SubjectRow = Record<string, any> & {
  rowid?: string;
  subject_number?: string;
  parent_subject_number?: string | null;
  children?: SubjectRow[];
};

const activeTab = ref<number>(SUBJECT_TYPE_TABS?.[0]?.value);
const isExpanded = ref(true);
const loading = ref(false);
const initSubmitting = ref(false);
const subjectIoSubmitting = ref(false);
const resetDialogVisible = ref(false);
const codeRuleDialogVisible = ref(false);
const codeRuleSubmitting = ref(false);
const currentSubjectCodeRule = ref<SubjectCodeRule>({
  account_set_id: '',
  subject_level: DEFAULT_SUBJECT_CODE_RULE.length,
  segment_rule: [...DEFAULT_SUBJECT_CODE_RULE],
});
const codeRuleForm = ref<SubjectCodeRule>({
  account_set_id: '',
  subject_level: DEFAULT_SUBJECT_CODE_RULE.length,
  segment_rule: [...DEFAULT_SUBJECT_CODE_RULE],
});
const codeRuleLevelOptions = Array.from({ length: 5 }).map((_, index) => {
  const value = index + 2;
  return { label: String(value), value };
});
const codeRuleLengthOptions = Array.from({ length: 9 }).map((_, index) => {
  const value = index + 1;
  return { label: String(value), value };
});
const resetConfirmed = ref(false);
const tableRenderKey = ref(0);
const tableData = ref<SubjectRow[]>([]);
const auxiliaryOptions = ref<AuxiliaryOption[]>([...AUXILIARY_OPTIONS]);
const tableMaxHeight = 'calc(100vh - 320px)';
const accountSetStore = useAccountSetStore();
const router = useRouter();
const accountSetName = computed(
  () =>
    accountSetStore.currentName || accountSetStore.displayName || '当前账套',
);
const SUBJECT_IMPORT_TEMPLATE_COLUMNS = [
  { header: '科目编码', key: 'subject_number', width: 18 },
  { header: '科目名称', key: 'subject_name', width: 24 },
  { header: '科目类别', key: 'subject_type', width: 18 },
  { header: '余额方向', key: 'balance_direction', width: 14 },
  { header: '上级科目', key: 'parent_subject_number', width: 18 },
  { header: '是否末级', key: 'is_leaf_subject', width: 14 },
  { header: '是否启用', key: 'subject_state', width: 14 },
  { header: '辅助核算', key: 'auxiliary_accounting', width: 24 },
  { header: '备注', key: 'description', width: 28 },
];

// Base_ImportData_Field 字段映射：index/name/title
type SubjectImportField = Pick<ImportFieldRow, 'index' | 'name' | 'title'>;
type SubjectImportScheme = {
  config: Pick<ImportConfigRow, 'dataIndex' | 'sheet' | 'sheetName' | 'titleIndex'>;
  fields: SubjectImportField[];
};


const resetScopes = [
  '新增的所有会计科目、辅助核算等基础设置',
  '所有已录入的凭证、发票、日记账、资产及初始化数据',
  '已保存的凭证模板、数据透视表模板等个性化配置模板',
  '如果您已经结账，重新初始化后会退回到账套启用期间',
];

const { dataTable, hasPermission } = useDataTablePermission();

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

onMounted(() => {
  loadAuxiliaryOptions();
  loadSubjectCodeRule();
  loadSubjectData();
});

function normalizeSubjectCode(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeAuxiliarySelection(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function serializeAuxiliarySelection(value: unknown) {
  return normalizeAuxiliarySelection(value).join(',');
}

function normalizeAuxiliaryRequiredSelection(value: unknown) {
  return normalizeAuxiliarySelection(value);
}

function serializeAuxiliaryRequiredSelection(value: unknown) {
  return normalizeAuxiliaryRequiredSelection(value).join(',');
}

function getAddedAuxiliarySelections(previous: unknown, next: unknown) {
  const previousSet = new Set(normalizeAuxiliarySelection(previous));
  return normalizeAuxiliarySelection(next).filter((item) => !previousSet.has(item));
}

function getAuxiliaryLabel(value: string) {
  return (
    auxiliaryOptions.value.find((item) => String(item.value) === String(value))?.label ||
    value
  );
}

async function confirmAddAuxiliaryForUsedSubject(row: SubjectRow, addedValues: string[]) {
  if (addedValues.length === 0) return true;

  const subjectNumber = normalizeSubjectCode(row?.subject_number);
  if (!subjectNumber) return true;

  const voucherCount = await countVoucherDetailsByAccountCode(subjectNumber);
  if (voucherCount <= 0) return true;

  const subjectName = String(row?.subject_name || '').trim();
  const addedText = addedValues.map(getAuxiliaryLabel).join('、');
  await ElMessageBox.confirm(
    `科目${subjectNumber}${subjectName ? ` ${subjectName}` : ''}已存在 ${voucherCount} 条账目。继续设置辅助核算【${addedText}】后，历史账目不会自动补充对应辅助项，是否继续？`,
    '设置辅助核算提示',
    {
      type: 'warning',
      confirmButtonText: '继续设置',
      cancelButtonText: '取消',
      distinguishCancelAndClose: true,
    },
  );
  return true;
}

async function loadAuxiliaryOptions() {
  try {
    const options = await getSubjectAuxiliaryOptions();
    auxiliaryOptions.value = options.length > 0 ? options : [...AUXILIARY_OPTIONS];
  } catch (error: any) {
    auxiliaryOptions.value = [...AUXILIARY_OPTIONS];
    ElMessage.error(error?.message || '加载辅助核算类别失败');
  }
}

function functionAuxiliaryDisabled(row: SubjectRow) {
  return (
    Number(row?.parent_aux_disabled ?? 0) === 1 ||
    Number(row?.subject_state ?? 1) !== 1 ||
    !hasPermission('row:edit', row?.rowid)
  );
}

function normalizeSubjectList(list: SubjectRow[]) {
  return list.map((item) => {
    const subjectNumber = normalizeSubjectCode(item?.subject_number);
    const parentSubjectNumber = normalizeSubjectCode(
      item?.parent_subject_number,
    );
    const copy = {
      ...item,
      subject_number: subjectNumber,
      parent_subject_number: parentSubjectNumber || null,
      auxiliary_accounting: normalizeAuxiliarySelection(item?.auxiliary_accounting),
      auxiliary_required: normalizeAuxiliaryRequiredSelection(item?.auxiliary_required),
    } as SubjectRow;

    if (
      copy.parent_subject_number &&
      copy.parent_subject_number === subjectNumber
    ) {
      copy.parent_subject_number = null;
    }
    return copy;
  });
}

function buildSubjectTree(list: SubjectRow[]) {
  const nodeMap = new Map<string, SubjectRow>();
  const roots: SubjectRow[] = [];

  list.forEach((item) => {
    const key = normalizeSubjectCode(item.subject_number || item.rowid || '');
    if (!key) return;
    nodeMap.set(key, { ...item, children: [] });
  });

  list.forEach((item) => {
    const key = normalizeSubjectCode(item.subject_number || item.rowid || '');
    if (!key) return;
    const current = nodeMap.get(key);
    if (!current) return;

    const parentKey = normalizeSubjectCode(item.parent_subject_number);
    const parent = parentKey ? nodeMap.get(parentKey) : undefined;

    if (parent) {
      parent.children = parent.children || [];
      parent.children.push(current);
    } else {
      roots.push(current);
    }
  });

  return roots;
}

async function loadSubjectData() {
  loading.value = true;
  try {
    const res = await getSubjectList({
      pageNo: 1,
      page: 0,
      subject_type: String(activeTab.value),
    });

    dataTable.value = res.dataTable;

    const list = Array.isArray(res.list) ? res.list : [];
    const normalized = normalizeSubjectList(list);
    tableData.value = buildSubjectTree(normalized);
    tableRenderKey.value += 1;
  } catch (error: any) {
    tableData.value = [];
    ElMessage.error(error?.message || '加载科目数据失败');
  } finally {
    loading.value = false;
  }
}

async function handleRefresh() {
  await loadSubjectData();
}
async function loadSubjectCodeRule() {
  currentSubjectCodeRule.value = await getSubjectCodeRule(activeTab.value);
}

function getActiveSubjectTypePrefix() {
  return String(activeTab.value || '').trim();
}

function getCodeRuleAccountKey(baseAccountSetId: string) {
  const prefix = getActiveSubjectTypePrefix();
  if (!prefix) return baseAccountSetId;
  return baseAccountSetId.endsWith(':' + prefix)
    ? baseAccountSetId
    : baseAccountSetId + ':' + prefix;
}

function getRuleByActiveTab() {
  const baseRule = currentSubjectCodeRule.value;
  const segments = [...(baseRule.segment_rule || DEFAULT_SUBJECT_CODE_RULE)];
  return {
    account_set_id: getCodeRuleAccountKey(baseRule.account_set_id || ''),
    subject_level: Math.min(6, Math.max(2, segments.length || DEFAULT_SUBJECT_CODE_RULE.length)),
    segment_rule: segments.slice(0, 6),
  };
}

function buildPersistRuleFromDialog() {
  return {
    account_set_id: codeRuleForm.value.account_set_id,
    subject_level: codeRuleForm.value.subject_level,
    segment_rule: [...codeRuleForm.value.segment_rule],
  };
}

function syncCodeRuleSegments() {
  const level = Math.max(2, Math.min(6, Number(codeRuleForm.value.subject_level || DEFAULT_SUBJECT_CODE_RULE.length)));
  const existing = codeRuleForm.value.segment_rule || [];
  const nextSegments = Array.from({ length: level }).map((_, index) => {
    const fallback = DEFAULT_SUBJECT_CODE_RULE[index] ?? 2;
    const value = Number(existing[index]);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  });
  codeRuleForm.value = {
    ...codeRuleForm.value,
    subject_level: level,
    segment_rule: nextSegments,
  };
}

function formatSubjectCodeExample(rule: SubjectCodeRule) {
  const segments = Array.isArray(rule.segment_rule) ? rule.segment_rule : [];
  const prefix = getActiveSubjectTypePrefix() || '1';
  return segments
    .map((length, index) => {
      const segmentLength = Math.max(1, Number(length) || 1);
      if (index === 0) {
        return segmentLength === 1
          ? prefix
          : prefix + String(1).padStart(segmentLength - 1, '0');
      }
      return String(1).padStart(segmentLength, '0');
    })
    .join(' ');
}

async function handleOpenCodeRuleDialog() {
  await loadSubjectCodeRule();
  codeRuleForm.value = getRuleByActiveTab();
  syncCodeRuleSegments();
  codeRuleDialogVisible.value = true;
}

async function handleSaveCodeRule() {
  syncCodeRuleSegments();
  codeRuleSubmitting.value = true;
  try {
    const res = await saveSubjectCodeRule(buildPersistRuleFromDialog());
    currentSubjectCodeRule.value = res.rule;
    if (res.remoteSaved) {
      ElMessage.success('编码设置已保存');
    } else {
      ElMessage.warning(res.message || '编码设置已保存到当前账套本地缓存');
    }
    codeRuleDialogVisible.value = false;
  } catch (error: any) {
    ElMessage.error(error?.message || '保存编码设置失败');
  } finally {
    codeRuleSubmitting.value = false;
  }
}


async function handleTabChange() {
  await nextTick();
  await loadSubjectData();
}

function handleToggleExpand() {
  isExpanded.value = !isExpanded.value;
  tableRenderKey.value += 1;
}

function handleCreateRoot() {
  const tabLabel =
    SUBJECT_TYPE_TABS.find((i) => i.value === activeTab.value)?.label ?? '';

  formModalApi
    .setData({
      type: 'create',
      subject_type: activeTab.value,
      parent_subject_name: tabLabel,
    })
    .open();
}

function handleCreateChild(row: SubjectRow) {
  formModalApi
    .setData({
      type: 'create',
      subject_type: activeTab.value,
      parent_subject_number: normalizeSubjectCode(row.subject_number),
      parent_subject_name: row.subject_name,
      parent_aux_disabled: row?.parent_aux_disabled ?? false,
      parent_auxiliary_accounting:
        row?.auxiliary_accounting || row?.parent_auxiliary_accounting,
      parent_subject_state: row?.subject_state,
    })
    .open();
}

function handleEdit(row: SubjectRow) {
  formModalApi.setData({ type: 'edit', rowid: row.rowid }).open();
}

function handleDetail(row: SubjectRow) {
  formModalApi.setData({ type: 'detail', rowid: row.rowid }).open();
}

async function handleAuxiliaryChange(row: SubjectRow, value: unknown) {
  const rowId = String(row?.rowid || '').trim();
  if (!rowId) {
    ElMessage.error('缺少科目标识，无法更新辅助核算');
    return;
  }

  const nextValue = normalizeAuxiliarySelection(value);
  const previousValue = normalizeAuxiliarySelection(row?.auxiliary_accounting);
  const previousRequired = normalizeAuxiliaryRequiredSelection(row?.auxiliary_required);
  const nextRequired = previousRequired.filter((item) => nextValue.includes(item));
  const addedValues = getAddedAuxiliarySelections(previousValue, nextValue);

  try {
    await confirmAddAuxiliaryForUsedSubject(row, addedValues);
  } catch (error: any) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '检查科目账目失败');
    }
    return;
  }

  row.auxiliary_accounting = nextValue;
  row.auxiliary_required = nextRequired;

  try {
    await updateSubject({
      rowid: rowId,
      auxiliary_accounting: serializeAuxiliarySelection(nextValue),
      auxiliary_required: serializeAuxiliaryRequiredSelection(nextRequired),
    } as any);
    ElMessage.success('辅助核算已更新');
  } catch (error: any) {
    row.auxiliary_accounting = previousValue;
    row.auxiliary_required = previousRequired;
    ElMessage.error(error?.message || '更新辅助核算失败');
  }
}

function isAuxiliaryRequired(row: SubjectRow, value: string) {
  return normalizeAuxiliaryRequiredSelection(row?.auxiliary_required).includes(value);
}

async function handleAuxiliaryRequiredToggle(
  row: SubjectRow,
  value: string,
  required: boolean,
) {
  const rowId = String(row?.rowid || '').trim();
  if (!rowId) {
    ElMessage.error('缺少科目标识，无法更新辅助核算必填项');
    return;
  }

  const enabledAuxiliaries = normalizeAuxiliarySelection(row?.auxiliary_accounting);
  if (!enabledAuxiliaries.includes(value)) return;

  const previousValue = normalizeAuxiliaryRequiredSelection(row?.auxiliary_required);
  const nextSet = new Set(previousValue.filter((item) => enabledAuxiliaries.includes(item)));
  if (required) nextSet.add(value);
  else nextSet.delete(value);

  const nextValue = enabledAuxiliaries.filter((item) => nextSet.has(item));
  row.auxiliary_required = nextValue;

  try {
    await updateSubject({
      rowid: rowId,
      auxiliary_required: serializeAuxiliaryRequiredSelection(nextValue),
    } as any);
    ElMessage.success('辅助核算必填项已更新');
  } catch (error: any) {
    row.auxiliary_required = previousValue;
    ElMessage.error(error?.message || '更新辅助核算必填项失败');
  }
}

function handleInitializeSubjects() {
  resetConfirmed.value = false;
  resetDialogVisible.value = true;
}

async function handleConfirmResetSubjects() {
  if (!resetConfirmed.value) {
    ElMessage.warning('请先勾选确认已知晓操作风险');
    return;
  }
  initSubmitting.value = true;
  const loadingInstance = ElLoading.service({ text: '恢复默认科目中...' });
  try {
    const res = await resetCurrentAccountSubjectsToTemplate();
    ElMessage.success(
      `恢复成功：恢复 ${Number(res?.restoredCount || 0)} 条，补回 ${Number(res?.addedCount || 0)} 条，清理新增 ${Number(res?.deletedCount || 0)} 条`,
    );
    resetDialogVisible.value = false;
    await handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message || '恢复默认科目失败');
  } finally {
    initSubmitting.value = false;
    loadingInstance.close();
  }
}

function saveBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function getFallbackSubjectScheme(): SubjectImportScheme {
  return {
    config: { sheet: 0, sheetName: '科目', titleIndex: 1, dataIndex: 2 },
    fields: SUBJECT_IMPORT_TEMPLATE_COLUMNS.map((item, index) => ({
      index: String.fromCharCode(65 + index),
      name: item.key,
      title: item.header,
    })),
  };
}

async function loadSubjectImportScheme() {
  const detail = await getSubjectImportSchemeDetail();
  if (!detail?.config || !Array.isArray(detail.fields) || detail.fields.length === 0) {
    return getFallbackSubjectScheme();
  }

  const fields = detail.fields
    .filter((field) => field?.index && field?.name && field?.title)
    .map((field) => ({
      index: String(field.index || '').trim().toUpperCase(),
      name: String(field.name || '').trim(),
      title: String(field.title || '').trim(),
    }));

  return {
    config: {
      sheet: Number(detail.config.sheet || 0),
      sheetName: detail.config.sheetName || '科目',
      titleIndex: Number(detail.config.titleIndex || 1),
      dataIndex: Number(detail.config.dataIndex || 2),
    },
    fields: fields.length > 0 ? fields : getFallbackSubjectScheme().fields,
  };
}

function getSubjectTypeByNumber(subjectNumber: string) {
  const first = normalizeSubjectCode(subjectNumber).slice(0, 1);
  return /^[1-5]$/.test(first) ? first : String(activeTab.value);
}

function normalizeImportedBoolean(value: unknown, defaultValue: number) {
  const text = String(value ?? '').trim();
  if (!text) return defaultValue;
  if (['1', '是', '启用', '末级', 'true', 'TRUE'].includes(text)) return 1;
  if (['0', '否', '停用', '非末级', 'false', 'FALSE'].includes(text)) return 0;
  return Number.isFinite(Number(text)) ? Number(text) : defaultValue;
}

function normalizeImportedBalanceDirection(value: unknown, subjectType: string) {
  const text = String(value ?? '').trim();
  if (['1', '借', '借方', 'debit'].includes(text)) return 1;
  if (['2', '贷', '贷方', 'credit'].includes(text)) return 2;
  return ['2', '3', '5'].includes(subjectType) ? 2 : 1;
}

function normalizeImportedSubjectType(value: unknown, subjectNumber: string) {
  const text = String(value ?? '').trim();
  const matched = SUBJECT_TYPE_TABS.find(
    (item) =>
      String(item.value) === text ||
      item.label === text ||
      item.label.replace('类', '') === text,
  );
  return String(matched?.value ?? getSubjectTypeByNumber(subjectNumber));
}

function mapSubjectRowForExport(row: SubjectRow) {
  const subjectType = String(row?.subject_type ?? getSubjectTypeByNumber(row?.subject_number || ''));
  const typeLabel = SUBJECT_TYPE_TABS.find((item) => String(item.value) === subjectType)?.label || subjectType;
  return {
    ...row,
    subject_type: typeLabel,
    balance_direction: balanceDirectionLabel(row?.balance_direction),
    parent_subject_number: row?.parent_subject_number || '',
    is_leaf_subject: Number(row?.is_leaf_subject ?? 1) === 1 ? '是' : '否',
    subject_state: Number(row?.subject_state ?? 1) === 1 ? '启用' : '停用',
    auxiliary_accounting: renderAuxiliary(row?.auxiliary_accounting, auxiliaryOptions.value),
  };
}

async function handleDownloadTemplate() {
  subjectIoSubmitting.value = true;
  try {
    const blob = await downloadSubjectExcelTemplate({ lingma_sys_is_delete: 0 });
    saveBlob(blob, getSubjectExportFileName());
    ElMessage.success('模板下载成功');
  } catch (error: any) {
    ElMessage.error(error?.message || '下载模板失败');
  } finally {
    subjectIoSubmitting.value = false;
  }
}

async function handleExportSubject() {
  subjectIoSubmitting.value = true;
  try {
    const blob = await exportSubjectExcel({ lingma_sys_is_delete: 0 });
    saveBlob(blob, getSubjectExportFileName());
    ElMessage.success('导出成功');
  } catch (error: any) {
    ElMessage.error(error?.message || '导出科目失败');
  } finally {
    subjectIoSubmitting.value = false;
  }
}

async function handleImportSubject(options: any) {
  const file = options?.file as File;
  if (!file) return;
  subjectIoSubmitting.value = true;
  try {
    const result = await importSubjectExcel(file);
    ElMessage.success('导入完成，新增' + (result?.addedCount || 0) + '条，更新' + (result?.changedCount || 0) + '条，跳过' + (result?.skippedCount || 0) + '条');
    await handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message || '导入科目失败');
  } finally {
    subjectIoSubmitting.value = false;
  }
}

function hasCustomerAux(row: SubjectRow) {
  return normalizeAuxiliarySelection(row?.auxiliary_accounting).includes('AUX001');
}

function handleMaintainCustomer(row: SubjectRow) {
  router.push({
    path: '/finance/settings/auxiliary',
    query: {
      tab: 'customer',
      subjectId: String(row?.rowid || ''),
      subjectNumber: String(row?.subject_number || ''),
      subjectName: String(row?.subject_name || ''),
      accountSetId: String(row?.account_set_id || accountSetStore.currentId || ''),
    },
  });
}

async function handleDelete(row: SubjectRow) {
  const rowId = String(row?.rowid || '').trim();
  if (!rowId) {
    ElMessage.error('缺少科目标识，无法删除');
    return;
  }

  try {
    const effect = await getDeleteSubjectEffect(rowId);
    await ElMessageBox.confirm(effect.confirmMessage, '删除提醒', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      distinguishCancelAndClose: true,
    });
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') {
      return;
    }
    ElMessage.error(error?.message || '删除预检查失败');
    return;
  }

  const loadingInstance = ElLoading.service({ text: '删除中...' });
  try {
    const res: any = await deleteSubject(rowId);
    if (Number(res?.movedCount || 0) > 0) {
      ElMessage.success(
        `删除成功，已将 ${res.movedCount} 条凭证分录及凭证中的科目归属转移到父级科目`,
      );
    } else if (res?.parentBecameLeaf) {
      ElMessage.success('删除成功，父级科目已转为末级科目');
    } else {
      ElMessage.success('删除成功');
    }
    await handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message || '删除失败');
  } finally {
    loadingInstance.close();
  }
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />

    <div class="subject-setting-page">
      <div class="subject-setting-page__toolbar">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane
            v-for="item in SUBJECT_TYPE_TABS"
            :key="item.value"
            :label="item.label"
            :name="item.value"
          />
        </el-tabs>

        <div class="subject-setting-page__toolbar-actions">
          <el-button @click="handleToggleExpand">
            {{ isExpanded ? '折叠' : '展开' }}
          </el-button>
          <el-button @click="handleOpenCodeRuleDialog">
            编码设置
          </el-button>
          <el-button :loading="subjectIoSubmitting" @click="handleDownloadTemplate">
            下载模板
          </el-button>
          <el-upload
            :show-file-list="false"
            :http-request="handleImportSubject"
            accept=".xls,.xlsx"
          >
            <el-button :loading="subjectIoSubmitting">导入科目</el-button>
          </el-upload>
          <el-button :loading="subjectIoSubmitting" @click="handleExportSubject">
            导出科目
          </el-button>
          <el-button :icon="RefreshRight" circle @click="handleRefresh" />
          <el-button
            v-if="hasPermission('data:add')"
            :loading="initSubmitting"
            @click="handleInitializeSubjects"
          >
            恢复默认科目
          </el-button>
          <el-button
            v-if="hasPermission('data:add')"
            type="primary"
            @click="handleCreateRoot"
          >
            新增科目
          </el-button>
        </div>
      </div>

      <el-card shadow="never" class="subject-setting-page__card">
        <template #header>
          <div class="subject-setting-page__card-header">科目设置</div>
        </template>

        <el-table
          :key="tableRenderKey"
          v-loading="loading"
          :data="tableData"
          row-key="subject_number"
          border
          :tree-props="{ children: 'children' }"
          :default-expand-all="isExpanded"
          :max-height="tableMaxHeight"
          class="subject-setting-page__table"
        >
          <el-table-column
            prop="subject_number"
            label="科目编码"
            min-width="160"
          />
          <el-table-column
            prop="subject_name"
            label="科目名称"
            min-width="220"
          />
          <el-table-column label="余额方向" width="120">
            <template #default="{ row }">
              {{ balanceDirectionLabel(row.balance_direction) }}
            </template>
          </el-table-column>
          <el-table-column label="辅助核算" min-width="360">
            <template #default="{ row }">
              <div class="subject-setting-page__aux-wrap">
                <el-select
                  :model-value="normalizeAuxiliarySelection(row.auxiliary_accounting)"
                  multiple
                  collapse-tags
                  collapse-tags-tooltip
                  clearable
                  filterable
                  :disabled="functionAuxiliaryDisabled(row)"
                  placeholder="请选择辅助核算"
                  class="subject-setting-page__aux-select"
                  @change="(value) => handleAuxiliaryChange(row, value)"
                >
                  <el-option
                    v-for="item in auxiliaryOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  >
                    <div class="subject-setting-page__aux-option">
                      <span class="subject-setting-page__aux-option-label">
                        {{ item.label }}
                      </span>
                      <div
                        v-if="normalizeAuxiliarySelection(row.auxiliary_accounting).includes(item.value)"
                        class="subject-setting-page__aux-option-required"
                        @click.stop
                      >
                        <span class="subject-setting-page__aux-option-required-text">
                          是否必填
                        </span>
                        <el-switch
                          :model-value="isAuxiliaryRequired(row, item.value)"
                          inline-prompt
                          active-text="必填"
                          inactive-text="不必填"
                          :disabled="functionAuxiliaryDisabled(row)"
                          @change="(checked) => handleAuxiliaryRequiredToggle(row, item.value, Boolean(checked))"
                        />
                      </div>
                    </div>
                  </el-option>
                </el-select>
              </div>
              <span class="subject-setting-page__aux-text">
                {{ renderAuxiliary(row.auxiliary_accounting, auxiliaryOptions) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120" align="center">
            <template #default="{ row }">
              <el-switch
                :model-value="Number(row.subject_state) === 1"
                disabled
                inline-prompt
                active-text="启"
                inactive-text="停"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="260" fixed="right">
            <template #default="{ row }">
              <div class="subject-setting-page__actions">
                <el-button
                  v-if="hasPermission('data:add')"
                  link
                  type="primary"
                  :disabled="Number(row?.can_add_subordinate ?? 1) !== 1"
                  @click="handleCreateChild(row)"
                >
                  新增
                </el-button>
                <el-button
                  v-if="hasPermission('row:edit', row.rowid)"
                  link
                  type="primary"
                  @click="handleEdit(row)"
                >
                  编辑
                </el-button>
                <el-button
                  v-if="hasPermission('row:view', row.rowid)"
                  link
                  type="primary"
                  @click="handleDetail(row)"
                >
                  查看
                </el-button>
                <el-button
                  v-if="hasCustomerAux(row)"
                  link
                  type="primary"
                  @click="handleMaintainCustomer(row)"
                >
                  维护客户
                </el-button>
                <el-button
                  v-if="hasPermission('row:delete', row.rowid)"
                  link
                  type="danger"
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
      <ElDialog
        v-model="codeRuleDialogVisible"
        title="科目编码设置"
        width="640px"
        :close-on-click-modal="!codeRuleSubmitting"
        :close-on-press-escape="!codeRuleSubmitting"
      >
        <div class="subject-code-rule-dialog">
          <div class="subject-code-rule-dialog__row">
            <span class="subject-code-rule-dialog__label">科目级次：</span>
            <ElSelect
              v-model="codeRuleForm.subject_level"
              class="subject-code-rule-dialog__level-select"
              @change="syncCodeRuleSegments"
            >
              <ElOption
                v-for="item in codeRuleLevelOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
            <span class="subject-code-rule-dialog__tip">
              注：默认 3 级，顶级编码长度 4 位，最长支持 6 级
            </span>
          </div>

          <div class="subject-code-rule-dialog__row">
            <span class="subject-code-rule-dialog__label">编码长度：</span>
            <div class="subject-code-rule-dialog__segments">
              <ElSelect
                v-for="(_, index) in codeRuleForm.segment_rule"
                :key="index"
                v-model="codeRuleForm.segment_rule[index]"
                class="subject-code-rule-dialog__segment-select"
                :disabled="index === 0"
              >
                <ElOption
                  v-for="item in codeRuleLengthOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </div>
          </div>

          <div class="subject-code-rule-dialog__example">
            示例：{{ formatSubjectCodeExample(codeRuleForm) }}
          </div>
        </div>

        <template #footer>
          <ElButton :disabled="codeRuleSubmitting" @click="codeRuleDialogVisible = false">
            取消
          </ElButton>
          <ElButton type="primary" :loading="codeRuleSubmitting" @click="handleSaveCodeRule">
            确定
          </ElButton>
        </template>
      </ElDialog>

      <ElDialog
        v-model="resetDialogVisible"
        width="min(920px, 94vw)"
        :show-close="!initSubmitting"
        :close-on-click-modal="!initSubmitting"
        :close-on-press-escape="!initSubmitting"
        class="subject-reset-dialog"
      >
        <div class="subject-reset-panel">
          <h1 class="subject-reset-title">
            重新初始化将彻底清空您在账套中录入的所有数据，并不可恢复，请慎重！！
          </h1>

          <div class="subject-reset-content">
            <p class="subject-reset-backup-warning">
              请务必先备份当前账套数据，确认备份可用后再执行重新初始化。
            </p>
            <p class="subject-reset-summary">
              您将要重新初始化账套：{{ accountSetName }}，以下数据将被永久删除：
            </p>

            <ul class="subject-reset-list">
              <li v-for="item in resetScopes" :key="item">{{ item }}</li>
            </ul>

            <ElCheckbox v-model="resetConfirmed" class="subject-reset-confirm">
              我已完成当前账套数据备份，并清楚重新初始化将会清空所有数据
            </ElCheckbox>
          </div>

          <div class="subject-reset-actions">
            <ElButton
              :disabled="!resetConfirmed"
              :loading="initSubmitting"
              @click="handleConfirmResetSubjects"
            >
              重新初始化
            </ElButton>
          </div>
        </div>
      </ElDialog>
    </div>
  </Page>
</template>

<style scoped>
.subject-setting-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subject-setting-page__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.subject-setting-page__toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.subject-setting-page__card-header {
  font-size: 16px;
  font-weight: 600;
}

.subject-setting-page__table {
  width: 100%;
}

.subject-setting-page__aux-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subject-setting-page__aux-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.subject-setting-page__aux-option-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subject-setting-page__aux-option-required {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.subject-setting-page__aux-option-required-text {
  font-size: 12px;
  color: #606266;
}

.subject-setting-page__aux-select {
  width: 100%;
}


.subject-setting-page__aux-text {
  display: none;
}

.subject-setting-page__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.subject-code-rule-dialog {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 12px 8px 4px;
}

.subject-code-rule-dialog__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.subject-code-rule-dialog__label {
  width: 86px;
  flex-shrink: 0;
  color: #303133;
  text-align: right;
}

.subject-code-rule-dialog__segments {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.subject-code-rule-dialog__level-select,
.subject-code-rule-dialog__segment-select {
  width: 88px;
}


.subject-code-rule-dialog__tip {
  color: #909399;
  font-size: 13px;
}

.subject-code-rule-dialog__tip::first-letter {
  color: #f56c6c;
}

.subject-code-rule-dialog__example {
  padding-left: 98px;
  color: #67c23a;
}

:deep(.subject-reset-dialog .el-dialog__header) {
  display: none;
}

:deep(.subject-reset-dialog .el-dialog__body) {
  padding: clamp(28px, 5vh, 44px) clamp(28px, 6vw, 64px) 44px;
}

.subject-reset-panel {
  color: #111827;
}

.subject-reset-title {
  margin: 0 0 32px;
  color: #ff3b47;
  font-size: clamp(18px, 1.85vw, 24px);
  font-weight: 700;
  line-height: 1.6;
  white-space: nowrap;
}

.subject-reset-content {
  font-size: clamp(15px, 1.55vw, 21px);
  font-weight: 600;
  line-height: 1.85;
}

.subject-reset-summary {
  margin: 0 0 32px;
  font-weight: 700;
}

.subject-reset-backup-warning {
  margin: 0 0 16px;
  color: #e6a23c;
  font-weight: 700;
}

.subject-reset-list {
  margin: 0 0 52px 56px;
  padding: 0;
  list-style: none;
}

.subject-reset-list li {
  margin: 0;
}

.subject-reset-confirm {
  margin-bottom: 46px;
  color: #111827;
  font-size: clamp(15px, 1.55vw, 21px);
  font-weight: 600;
  white-space: normal;
}

.subject-reset-confirm :deep(.el-checkbox__inner) {
  border-color: #9ca3af;
}

.subject-reset-confirm:hover :deep(.el-checkbox__inner) {
  border-color: #6b7280;
}

.subject-reset-actions {
  text-align: center;
}

.subject-reset-actions :deep(.el-button) {
  min-width: 152px;
  height: 48px;
  border-radius: 2px;
  font-size: clamp(16px, 1.5vw, 20px);
  font-weight: 700;
}

@media (max-width: 980px) {
  .subject-reset-title {
    white-space: normal;
  }
}

@media (max-width: 760px) {
  :deep(.subject-reset-dialog .el-dialog__body) {
    padding: 28px 18px 36px;
  }

  .subject-reset-title {
    margin-bottom: 24px;
    font-size: 18px;
    line-height: 1.55;
  }

  .subject-reset-content,
  .subject-reset-confirm {
    font-size: 15px;
    line-height: 1.75;
  }

  .subject-reset-summary {
    margin-bottom: 22px;
  }

  .subject-reset-list {
    margin: 0 0 36px 24px;
  }

  .subject-reset-confirm {
    margin-bottom: 34px;
  }

  .subject-reset-actions :deep(.el-button) {
    min-width: 128px;
    height: 40px;
    font-size: 16px;
  }
}

@media (max-width: 640px) {
  :deep(.subject-reset-dialog .el-dialog__body) {
    padding: 24px 16px 32px;
  }

  .subject-reset-title {
    font-size: 16px;
  }

  .subject-reset-list {
    margin-left: 0;
  }
}
</style>
