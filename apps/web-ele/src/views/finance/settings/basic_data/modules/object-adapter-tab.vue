<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';


import type { FinanceBusinessSourceSystemApi } from '#/api/erp/finance/settings/basic_data/business_standardization';
import {
  createBusinessAdapter,
  createBusinessSourceSystem,
  deleteBusinessAdapter,
  deleteBusinessSourceSystem,
  getBusinessAdapterPage,
  getBusinessFieldMappingList,
  getBusinessSourceSystemPage,
  saveBusinessFieldMappings,
  updateBusinessAdapter,
  updateBusinessSourceSystem,
} from '#/api/erp/finance/settings/basic_data/business_standardization';
import { AppDbSelectModal } from '#/components/app-db-selector';
import { AppSelectModal } from '#/components/app-selector';
import { FieldSelectModal } from '#/components/field-selector';
import { BusinessObjectSelectorBlock } from '#/components/business-object-selector';
import { getStoredAccountSetId, getStoredAccountSetName } from '#/utils/accountSet';

import {
  ElAlert,
  ElButton,
  ElCol,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElRow,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

const loading = ref(false);
const sourceLoading = ref(false);
const mappingLoading = ref(false);
const saveMappingLoading = ref(false);
const sourceList = ref<any[]>([]);
const adapterList = ref<any[]>([]);
const mappingList = ref<any[]>([]);
const currentSourceId = ref('');
const currentSourceCode = ref('');
const currentSourceName = ref('');
const currentAdapterId = ref('');
const currentAdapterName = ref('');
const runtimeHint = ref('');
const currentAccountSetId = ref(getStoredAccountSetId() || '');
const currentAccountSetName = ref(getStoredAccountSetName() || '');

const sourceDialogVisible = ref(false);
const adapterDialogVisible = ref(false);
const mappingDialogVisible = ref(false);
const sourceDialogMode = ref<'create' | 'edit'>('create');
const adapterDialogMode = ref<'create' | 'edit'>('create');
const mappingDialogMode = ref<'create' | 'edit'>('create');
const editingMappingIndex = ref(-1);

const sourceFormRef = ref();
const adapterFormRef = ref();
const mappingFormRef = ref();
const sourceAppSelectModalRef = ref();
const sourceObjectSelectModalRef = ref();
const sourceFieldSelectModalRef = ref();
const standardFieldSelectModalRef = ref();
const financeFieldSelectModalRef = ref();

const adapterSourceSelection = reactive<any>({
  appCode: '',
  appName: '',
  dbName: '',
  tableName: '',
  tableId: '',
});

const sourceForm = reactive<any>({
  rowid: '',
  source_code: '',
  source_name: '',
  source_type: '',
  protocol_type: 'db',
  endpoint_config: '',
  status: 'ENABLED',
  remark: '',
});

const adapterForm = reactive<any>({
  rowid: '',
  adapter_code: '',
  adapter_name: '',
  source_system_id: '',
  source_biz_code: '',
  standard_object_code: '',
  finance_object_code: '',
  account_set_id: '',
  status: 'DRAFT',
  version_no: '1.0.0',
  rule_json: '',
  sample_payload: '',
  remark: '',
});

const mappingForm = reactive<any>({
  rowid: '',
  adapter_id: '',
  source_field: '',
  standard_field: '',
  finance_field: '',
  adapt_rule: '',
  default_value: '',
  is_required: 0,
  validate_rule: '',
  sort_no: 1,
  remark: '',
});

const sourceRules = {
  source_code: [{ required: true, message: '请选择来源应用', trigger: 'change' }],
  source_name: [{ required: true, message: '请选择来源应用', trigger: 'change' }],
};

const adapterRules = {
  adapter_code: [{ required: true, message: '请输入适配器编码', trigger: 'blur' }],
  adapter_name: [{ required: true, message: '请输入适配器名称', trigger: 'blur' }],
  source_system_id: [{ required: true, message: '请选择来源系统', trigger: 'change' }],
};

const mappingRules = {
  source_field: [{ required: true, message: '请输入来源字段', trigger: 'blur' }],
  standard_field: [{ required: true, message: '请输入标准字段', trigger: 'blur' }],
};

const statCards = computed(() => []);

const adapterSourceOptions = computed(() =>
  sourceList.value.map((item) => ({
    label: item?.source_name || item?.source_code || '-',
    value: String(item?.rowid || ''),
    sourceCode: String(item?.source_code || ''),
    sourceName: String(item?.source_name || item?.source_code || ''),
  })),
);

const currentAccountSetText = computed(() => currentAccountSetName.value || currentAccountSetId.value || '未选择当前账套');

function statusType(status: string) {
  if (status === 'PUBLISHED' || status === 'ENABLED' || status === '运行中') return 'success';
  if (status === 'TESTING' || status === 'DRAFT' || status === '预发布') return 'warning';
  if (status === 'OFFLINE' || status === '异常告警' || status === 'DISABLED') return 'danger';
  return 'info';
}

function getSourceRecordById(sourceSystemId?: string) {
  const targetId = String(sourceSystemId || adapterForm.source_system_id || currentSourceId.value || '');
  return sourceList.value.find((item) => String(item?.rowid || '') === targetId) || null;
}

function getSourceCodeById(sourceSystemId?: string) {
  return String(getSourceRecordById(sourceSystemId)?.source_code || '');
}

function getSourceNameById(sourceSystemId?: string) {
  return String(getSourceRecordById(sourceSystemId)?.source_name || getSourceRecordById(sourceSystemId)?.source_code || '');
}

function getCurrentAdapterRecord() {
  return adapterList.value.find((item) => String(item?.rowid || '') === String(currentAdapterId.value || '')) || null;
}

function syncCurrentAccountSet() {
  currentAccountSetId.value = getStoredAccountSetId() || '';
  currentAccountSetName.value = getStoredAccountSetName() || '';
}

function resetSourceForm() {
  Object.assign(sourceForm, {
    rowid: '',
    source_code: '',
    source_name: '',
    source_type: '',
    protocol_type: 'db',
    endpoint_config: '',
    status: 'ENABLED',
    remark: '',
  });
}

function syncAdapterSourceSelectionFromForm(row?: any) {
  const target = row || adapterForm;
  const source = getSourceRecordById(target?.source_system_id);
  let dbName = '';
  let tableName = '';
  let tableId = String(target?.source_biz_code || '');
  try {
    const ruleJson = JSON.parse(String(target?.rule_json || '{}'));
    dbName = String(ruleJson?.request?.filter?.dbName || ruleJson?.request?.dbName || '');
    tableName = String(ruleJson?.sourceName || ruleJson?.sourceDesc || '');
    tableId = String(ruleJson?.sourceObject || tableId || '');
  } catch (e) {}
  const remarkText = String(target?.remark || '');
  if (!dbName) {
    const match = remarkText.match(/来源库：([^\n]+)/);
    dbName = match?.[1]?.trim?.() || '';
  }
  if (!tableName) {
    const match = remarkText.match(/来源表：([^\n]+)/);
    tableName = match?.[1]?.trim?.() || '';
  }
  Object.assign(adapterSourceSelection, {
    appCode: String(source?.source_code || ''),
    appName: String(source?.source_name || source?.source_code || ''),
    dbName,
    tableName,
    tableId,
  });
}

function handleSelectAdapterSourceApp(app: any) {
  const appCode = String(app?.rowid || '');
  const matched = sourceList.value.find((item) => String(item?.source_code || '') === appCode || String(item?.source_name || '') === String(app?.AppName || ''));
  if (!matched) {
    ElMessage.warning('请先在来源系统中维护该应用，再回来选择');
    return;
  }
  adapterForm.source_system_id = String(matched?.rowid || '');
  handleAdapterSourceSystemChange();
}

function resetAdapterForm() {
  syncCurrentAccountSet();
  Object.assign(adapterForm, {
    rowid: '',
    adapter_code: '',
    adapter_name: '',
    source_system_id: currentSourceId.value || '',
    source_biz_code: '',
    standard_object_code: '',
    finance_object_code: '',
    account_set_id: currentAccountSetId.value || '',
    status: 'DRAFT',
    version_no: '1.0.0',
    rule_json: '',
    sample_payload: '',
    remark: '',
  });
  syncAdapterSourceSelectionFromForm(adapterForm);
}

function resetMappingForm() {
  Object.assign(mappingForm, {
    rowid: '',
    adapter_id: currentAdapterId.value,
    source_field: '',
    standard_field: '',
    finance_field: '',
    adapt_rule: '',
    default_value: '',
    is_required: 0,
    validate_rule: '',
    sort_no: mappingList.value.length + 1,
    remark: '',
  });
}

function clearAdapterSelection() {
  currentAdapterId.value = '';
  currentAdapterName.value = '';
  mappingList.value = [];
}

function openCreateSourceDialog() {
  sourceDialogMode.value = 'create';
  resetSourceForm();
  sourceDialogVisible.value = true;
}

function openEditSourceDialog(row: any) {
  sourceDialogMode.value = 'edit';
  resetSourceForm();
  Object.assign(sourceForm, {
    ...row,
    protocol_type: row?.protocol_type || 'db',
    endpoint_config: row?.endpoint_config || '',
  });
  sourceDialogVisible.value = true;
}

function openCreateAdapterDialog() {
  if (!currentSourceId.value) {
    ElMessage.warning('请先选择来源系统');
    return;
  }
  adapterDialogMode.value = 'create';
  resetAdapterForm();
  adapterDialogVisible.value = true;
}

function openEditAdapterDialog(row: any) {
  adapterDialogMode.value = 'edit';
  resetAdapterForm();
  Object.assign(adapterForm, {
    ...row,
    source_system_id: row?.source_system_id || currentSourceId.value || '',
    account_set_id: currentAccountSetId.value || row?.account_set_id || '',
  });
  syncAdapterSourceSelectionFromForm(row);
  adapterDialogVisible.value = true;
}

function openCreateMappingDialog() {
  if (!currentAdapterId.value) {
    ElMessage.warning('请先选择适配器');
    return;
  }
  mappingDialogMode.value = 'create';
  editingMappingIndex.value = -1;
  resetMappingForm();
  mappingDialogVisible.value = true;
}

function openEditMappingDialog(row: any, index: number) {
  mappingDialogMode.value = 'edit';
  editingMappingIndex.value = index;
  resetMappingForm();
  Object.assign(mappingForm, {
    ...row,
    adapter_id: currentAdapterId.value,
    is_required: Number(row?.is_required || 0),
    sort_no: Number(row?.sort_no || index + 1),
  });
  mappingDialogVisible.value = true;
}

function openSourceAppSelectDialog() {
  sourceAppSelectModalRef.value?.open?.();
}

function handleAdapterSourceSystemChange() {
  adapterForm.source_biz_code = '';
  adapterForm.rule_json = '';
  adapterForm.sample_payload = '';
  Object.assign(adapterSourceSelection, {
    appCode: getSourceCodeById(adapterForm.source_system_id),
    appName: getSourceNameById(adapterForm.source_system_id),
    dbName: '',
    tableName: '',
    tableId: '',
  });
}

function openSourceObjectSelectDialog() {
  const sysid = getSourceCodeById(adapterForm.source_system_id);
  if (!sysid) {
    ElMessage.warning('请先选择来源系统');
    return;
  }
  sourceObjectSelectModalRef.value?.open?.(sysid);
}

function buildSourceObjectRuleJson(row: FinanceBusinessSourceSystemApi.AppTableRow & { dbRow?: FinanceBusinessSourceSystemApi.AppDatabaseRow }) {
  const sourceCode = getSourceCodeById(adapterForm.source_system_id);
  const dbRow = row?.dbRow || {};
  return JSON.stringify(
    {
      mode: 'dialog',
      sourceType: 'remote-api',
      sourceSystemId: adapterForm.source_system_id,
      sourceSystemCode: sourceCode,
      sourceSystemName: getSourceNameById(adapterForm.source_system_id),
      sourceObject: row?.id || row?.rowid || '',
      sourceName: row?.tblname || '',
      sourceDesc: row?.tbldesc || '',
      table: 'View_TblRelation_List',
      api: {
        url: '/api/DataOperation/GetData',
        method: 'POST',
      },
      request: {
        filter: {
          sysid: sourceCode,
          dbid: dbRow?.Id || dbRow?.rowid || '',
        },
        pageParam: {
          index: 1,
          size: 15,
        },
      },
      mapping: {
        id: 'id',
        tableName: 'tblname',
        tableDesc: 'tbldesc',
        dbid: 'dbid',
        sysid: 'sysid',
      },
      dialog: {
        component: 'AppDbSelectModal',
        title: '选择来源对象',
      },
    },
    null,
    2,
  );
}

function buildSourceObjectSamplePayload(row: FinanceBusinessSourceSystemApi.AppTableRow & { dbRow?: FinanceBusinessSourceSystemApi.AppDatabaseRow }) {
  const sourceCode = getSourceCodeById(adapterForm.source_system_id);
  const dbRow = row?.dbRow || {};
  return JSON.stringify(
    {
      Table: [
        {
          Name: 'View_TblRelation_List',
          Filter: {
            Type: 'and',
            Filters: [
              {
                Type: 'and',
                Filters: [
                  { Type: 'cond', Field: 'sysid', Operator: 'equal', Value: sourceCode },
                  { Type: 'cond', Field: 'dbid', Operator: 'equal', Value: dbRow?.Id || dbRow?.rowid || '' },
                ],
              },
            ],
          },
          selectedObject: {
            id: row?.id || row?.rowid || '',
            tableName: row?.tblname || '',
            tableDesc: row?.tbldesc || '',
            dbid: row?.dbid || dbRow?.Id || dbRow?.rowid || '',
          },
        },
      ],
      PageParam: {
        index: 1,
        size: 15,
      },
    },
    null,
    2,
  );
}

function handleSelectSourceObject(row: FinanceBusinessSourceSystemApi.AppTableRow & { dbRow?: FinanceBusinessSourceSystemApi.AppDatabaseRow }) {
  const dbRow = row?.dbRow || {};
  adapterForm.source_biz_code = String(row?.id || row?.rowid || row?.tblname || '');
  Object.assign(adapterSourceSelection, {
    appCode: getSourceCodeById(adapterForm.source_system_id),
    appName: getSourceNameById(adapterForm.source_system_id),
    dbName: String(dbRow?.ValueName || dbRow?.Name || dbRow?.conName || ''),
    tableName: String(row?.tbldesc || row?.tblname || ''),
    tableId: String(row?.id || row?.rowid || row?.tblname || ''),
  });
  if (!String(adapterForm.standard_object_code || '').trim()) {
    adapterForm.standard_object_code = String(row?.tbldesc || row?.tblname || '');
  }
  if (!String(adapterForm.finance_object_code || '').trim()) {
    adapterForm.finance_object_code = String(row?.tblname || row?.tbldesc || '');
  }
  adapterForm.rule_json = buildSourceObjectRuleJson(row);
  adapterForm.sample_payload = buildSourceObjectSamplePayload(row);
  const sourceObjectRemark = [
    adapterForm.remark,
    `来源系统：${getSourceNameById(adapterForm.source_system_id) || '-'}`,
    dbRow?.ValueName || dbRow?.Name ? `来源库：${dbRow?.ValueName || dbRow?.Name || '-'}` : '',
    `来源表：${row?.tblname || '-'}`,
    row?.tbldesc ? `中文名称：${row.tbldesc}` : '',
    dbRow?.ServerName ? `服务器：${dbRow.ServerName}` : '',
    dbRow?.SchemaName ? `架构：${dbRow.SchemaName}` : '',
    dbRow?.type || dbRow?.Type ? `类型：${dbRow?.type || dbRow?.Type}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  adapterForm.remark = sourceObjectRemark;
}

function handleSelectSourceApp(app: FinanceBusinessSourceSystemApi.AppRow) {
  const nextRemark = [
    sourceForm.remark,
    app?.DeveloperName ? `开发者：${app.DeveloperName}` : '',
    app?.WebUrl ? `访问地址：${app.WebUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  sourceForm.source_code = String(app?.rowid || app?.AppName || '');
  sourceForm.source_name = String(app?.AppName || app?.NameStr || app?.rowid || '');
  sourceForm.source_type = String(app?.AppType || '应用');
  sourceForm.endpoint_config = JSON.stringify(
    {
      appRowId: app?.rowid || '',
      appName: app?.AppName || '',
      appType: app?.AppType || '',
      developerName: app?.DeveloperName || '',
      webUrl: app?.WebUrl || '',
      appDesc: app?.AppDesc || '',
      icon: app?.Icon || '',
      entShortName: app?.EntShortName || '',
    },
    null,
    2,
  );
  sourceForm.remark = nextRemark;
}


function resolveFieldSelectTblid(type: 'finance' | 'source' | 'standard') {
  const currentAdapter = getCurrentAdapterRecord();
  if (!currentAdapter) return '';
  if (type === 'source') return String(currentAdapter?.source_biz_code || '');
  if (type === 'standard') return String(currentAdapter?.standard_object_code || '');
  return String(currentAdapter?.finance_object_code || '');
}

function openFieldSelectDialog(type: 'finance' | 'source' | 'standard') {
  const currentAdapter = getCurrentAdapterRecord();
  if (!currentAdapter) {
    ElMessage.warning('请先在适配器主表中选中一条适配器');
    return;
  }
  const tblid = resolveFieldSelectTblid(type);
  if (!tblid) {
    const tips = {
      source: '请先在适配器主表中选择来源对象',
      standard: '请先在适配器主表中选择标准对象',
      finance: '请先在适配器主表中选择财务对象',
    };
    ElMessage.warning(tips[type]);
    return;
  }
  const titleMap = {
    source: '选择来源字段',
    // standard: '选择标准字段',
    finance: '选择财务字段',
  };
  const refMap = {
    source: sourceFieldSelectModalRef,
    standard: standardFieldSelectModalRef,
    finance: financeFieldSelectModalRef,
  };
  refMap[type].value?.open?.({ title: titleMap[type], tblid });
}

function handleSelectSourceField(row: FinanceBusinessSourceSystemApi.TableFieldRow) {
  mappingForm.source_field = String(row?.enname || row?.cnname || '');
}

function handleSelectStandardField(row: FinanceBusinessSourceSystemApi.TableFieldRow) {
  mappingForm.standard_field = String(row?.enname || row?.cnname || '');
}

function handleSelectFinanceField(row: FinanceBusinessSourceSystemApi.TableFieldRow) {
  mappingForm.finance_field = String(row?.enname || row?.cnname || '');
}

async function loadSourceList() {
  sourceLoading.value = true;
  try {
    const res = await getBusinessSourceSystemPage({ pageNo: 1, page: 50 });
    sourceList.value = res.list || [];
    if (!sourceList.value.length) {
      currentSourceId.value = '';
      currentSourceCode.value = '';
      currentSourceName.value = '';
      clearAdapterSelection();
      adapterList.value = [];
      return;
    }

    const current = sourceList.value.find((item) => String(item.rowid) === currentSourceId.value) || sourceList.value[0];
    await handleSelectSource(current);
  } finally {
    sourceLoading.value = false;
  }
}

async function loadAdapterList(sourceSystemId?: string) {
  loading.value = true;
  try {
    const previousAdapterId = currentAdapterId.value;
    const sourceId = String(sourceSystemId || currentSourceId.value || '');
    const res = await getBusinessAdapterPage({
      pageNo: 1,
      page: 100,
      ...(sourceId ? { source_system_id: sourceId } : {}),
    });
    adapterList.value = res.list || [];

    if (adapterList.value.length === 0) {
      clearAdapterSelection();
      return;
    }

    const target = adapterList.value.find((item) => String(item.rowid) === previousAdapterId) || adapterList.value[0];
    await handleSelectAdapter(target);
  } finally {
    loading.value = false;
  }
}

async function handleSelectSource(row: any) {
  currentSourceId.value = String(row?.rowid || '');
  currentSourceCode.value = String(row?.source_code || '');
  currentSourceName.value = String(row?.source_name || row?.source_code || '');
  clearAdapterSelection();
  await loadAdapterList(currentSourceId.value);
}

async function handleSelectAdapter(row: any) {
  currentAdapterId.value = String(row?.rowid || '');
  currentAdapterName.value = String(row?.adapter_name || row?.adapter_code || '');
  if (!currentAdapterId.value) {
    mappingList.value = [];
    return;
  }
  mappingLoading.value = true;
  try {
    mappingList.value = (await getBusinessFieldMappingList(currentAdapterId.value)) || [];
  } finally {
    mappingLoading.value = false;
  }
}

async function loadAll() {
  runtimeHint.value = '';
  syncCurrentAccountSet();
  try {
    await loadSourceList();
  } catch (error: any) {
    console.error(error);
    runtimeHint.value = '当前 API 已按财务现有写法接好；若页面未返回数据，请确认 3 张表都挂在 formId=E31199497829CDEB93998F96A8D033FE 下且字段名与页面一致。';
    ElMessage.warning(error?.message || '业务数据标准化接口调用失败');
  }
}

async function submitSourceForm() {
  const valid = await sourceFormRef.value?.validate?.().catch(() => false);
  if (!valid) return;
  try {
    const payload = {
      ...sourceForm,
      protocol_type: 'db',
    };
    if (sourceDialogMode.value === 'create') {
      await createBusinessSourceSystem(payload);
      ElMessage.success('来源系统新增成功');
    } else {
      await updateBusinessSourceSystem(payload);
      ElMessage.success('来源系统更新成功');
    }
    sourceDialogVisible.value = false;
    await loadSourceList();
  } catch (error: any) {
    ElMessage.error(error?.message || '来源系统保存失败');
  }
}

async function submitAdapterForm() {
  const valid = await adapterFormRef.value?.validate?.().catch(() => false);
  if (!valid) return;
  try {
    syncCurrentAccountSet();
    const payload = {
      ...adapterForm,
      account_set_id: currentAccountSetId.value || '',
    };
    if (adapterDialogMode.value === 'create') {
      await createBusinessAdapter(payload);
      ElMessage.success('适配器新增成功');
    } else {
      await updateBusinessAdapter(payload);
      ElMessage.success('适配器保存成功');
    }
    adapterDialogVisible.value = false;
    if (String(payload.source_system_id || '') !== currentSourceId.value) {
      const nextSource = getSourceRecordById(payload.source_system_id);
      if (nextSource) {
        await handleSelectSource(nextSource);
        return;
      }
    }
    await loadAdapterList(currentSourceId.value);
  } catch (error: any) {
    ElMessage.error(error?.message || '适配器保存失败');
  }
}

async function submitMappingForm() {
  const valid = await mappingFormRef.value?.validate?.().catch(() => false);
  if (!valid) return;
  const payload = {
    ...mappingForm,
    adapter_id: currentAdapterId.value,
    is_required: Number(mappingForm.is_required || 0),
    sort_no: Number(mappingForm.sort_no || 1),
  };
  if (mappingDialogMode.value === 'create') {
    mappingList.value.push(payload);
    ElMessage.success('字段映射已加入待保存列表');
  } else if (editingMappingIndex.value >= 0) {
    mappingList.value.splice(editingMappingIndex.value, 1, payload);
    ElMessage.success('字段映射已更新到待保存列表');
  }
  mappingDialogVisible.value = false;
}

async function handleDeleteSource(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除来源系统“${row?.source_name || row?.source_code || ''}”吗？`, '删除确认', {
      type: 'warning',
    });
    await deleteBusinessSourceSystem(String(row.rowid));
    ElMessage.success('来源系统删除成功');
    await loadSourceList();
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    ElMessage.error(error?.message || '来源系统删除失败');
  }
}

async function handleDeleteAdapter(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除适配器“${row?.adapter_name || row?.adapter_code || ''}”吗？`, '删除确认', {
      type: 'warning',
    });
    await deleteBusinessAdapter(String(row.rowid));
    ElMessage.success('适配器删除成功');
    await loadAdapterList(currentSourceId.value);
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    ElMessage.error(error?.message || '适配器删除失败');
  }
}

async function handleDeleteMapping(index: number) {
  try {
    await ElMessageBox.confirm('确认删除这条字段映射吗？', '删除确认', {
      type: 'warning',
    });
    mappingList.value.splice(index, 1);
    ElMessage.success('已从当前编辑列表移除，记得点击保存映射');
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    ElMessage.error(error?.message || '删除失败');
  }
}

async function handleSaveMappings() {
  if (!currentAdapterId.value) {
    ElMessage.warning('请先选择适配器');
    return;
  }
  const invalidIndex = mappingList.value.findIndex(
    (item) => !String(item.source_field || '').trim() || !String(item.standard_field || '').trim(),
  );
  if (invalidIndex >= 0) {
    ElMessage.warning(`第 ${invalidIndex + 1} 行缺少必填字段，请先补全来源字段和标准字段`);
    return;
  }
  saveMappingLoading.value = true;
  try {
    const payload = mappingList.value.map((item, index) => ({
      ...item,
      adapter_id: currentAdapterId.value,
      sort_no: Number(item.sort_no ?? index + 1),
      is_required: Number(item.is_required || 0),
    }));
    await saveBusinessFieldMappings(currentAdapterId.value, payload);
    ElMessage.success('字段映射保存成功');
    await handleSelectAdapter(
      adapterList.value.find((item) => String(item.rowid) === currentAdapterId.value) || {},
    );
  } catch (error: any) {
    ElMessage.error(error?.message || '字段映射保存失败');
  } finally {
    saveMappingLoading.value = false;
  }
}

onMounted(loadAll);
</script>

<template>
  <div class="finance-object-adapter-tab">
    <div class="hero-card">
      <div>
        <div class="hero-title">业务数据标准化适配</div>
        <div class="hero-desc">
        </div>
      </div>
      <div class="hero-meta">
        <div><span>当前来源：</span>{{ currentSourceName || '未选择' }}</div>
        <div><span>当前适配器：</span>{{ currentAdapterName || '未选择' }}</div>
        <div><span>当前账套：</span>{{ currentAccountSetText }}</div>
      </div>
    </div>

    <el-alert v-if="runtimeHint" type="warning" :closable="false" :title="runtimeHint" />

    <el-row :gutter="16">
      <el-col v-for="item in statCards" :key="item.label" :lg="6" :md="12" :sm="12" :xs="24">
        <div class="stat-card">
          <div class="stat-label">{{ item.label }}</div>
          <div class="stat-value">{{ item.value }}</div>
          <div class="stat-tip">{{ item.tip }}</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :lg="10" :md="24" :sm="24" :xs="24">
        <div class="panel-card" v-loading="sourceLoading">
          <div class="panel-header row-between">
            <div>
              <div class="panel-title">来源系统</div>
              <div class="panel-subtitle">点击来源系统后切换右侧适配器主表</div>
            </div>
            <el-button type="primary" @click="openCreateSourceDialog">新增</el-button>
          </div>
          <el-table
            :data="sourceList"
            border
            stripe
            highlight-current-row
            row-key="rowid"
            :current-row-key="currentSourceId"
            @current-change="handleSelectSource"
          >
            <el-table-column label="来源编码" min-width="140" prop="source_code" />
            <el-table-column label="来源名称" min-width="150" prop="source_name" />
            <!-- <el-table-column label="来源类型" min-width="100" prop="source_type" /> -->
            <!-- <el-table-column label="状态" min-width="100">
              <template #default="scope">
                <el-tag :type="statusType(scope.row.status)">{{ scope.row.status || '-' }}</el-tag>
              </template>
            </el-table-column> -->
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="scope">
                <div class="table-actions">
                  <el-button link type="primary" @click.stop="openEditSourceDialog(scope.row)">编辑</el-button>
                  <el-button link type="danger" @click.stop="handleDeleteSource(scope.row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>

      <el-col :lg="14" :md="24" :sm="24" :xs="24">
        <div class="panel-card" v-loading="loading">
          <div class="panel-header row-between">
            <div>
              <div class="panel-title">适配器主表</div>
              <div class="panel-subtitle">标准化与财务写入的核心配置入口，按来源系统过滤</div>
            </div>
            <div class="toolbar-actions">
              <el-button type="primary" @click="openCreateAdapterDialog">新增</el-button>
              <el-button @click="loadAdapterList(currentSourceId)">刷新</el-button>
            </div>
          </div>
          <el-empty v-if="!currentSourceId" description="请先选择来源系统" />
          <el-table
            v-else
            :data="adapterList"
            border
            stripe
            highlight-current-row
            row-key="rowid"
            :current-row-key="currentAdapterId"
            @current-change="handleSelectAdapter"
          >
            <!-- <el-table-column label="适配器编码" min-width="150" prop="adapter_code" /> -->
            <el-table-column label="适配器名称" min-width="150" prop="adapter_name" />
            <el-table-column label="来源对象" min-width="130" prop="source_biz_code" />
            <el-table-column label="标准对象" min-width="150" prop="standard_object_code" />
            <el-table-column label="财务对象" min-width="150" prop="finance_object_code" />

            <el-table-column label="操作" width="160" fixed="right">
              <template #default="scope">
                <div class="table-actions">
                  <el-button link type="primary" @click.stop="openEditAdapterDialog(scope.row)">编辑</el-button>
                  <el-button link type="danger" @click.stop="handleDeleteAdapter(scope.row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>

    <div class="panel-card" v-loading="mappingLoading || saveMappingLoading">
      <div class="panel-header row-between">
        <div>
          <div class="panel-title">字段映射</div>
          <div class="panel-subtitle">
            当前来源系统：{{ currentSourceName || '未选择' }}；当前适配器：{{ currentAdapterName || '未选择' }}。
          </div>
        </div>
        <div class="toolbar-actions">
          <el-button @click="openCreateMappingDialog">新增</el-button>
          <el-button type="primary" @click="handleSaveMappings">保存映射</el-button>
        </div>
      </div>
      <el-empty v-if="!currentAdapterId" description="请先选择一个适配器" />
      <el-table v-else :data="mappingList" border>
        <el-table-column label="来源字段" min-width="160" prop="source_field" />
        <!-- <el-table-column label="标准字段" min-width="160" prop="standard_field" /> -->
        <el-table-column label="财务字段" min-width="160" prop="finance_field" />
        <el-table-column label="适配规则" min-width="200" prop="adapt_rule" />
        <el-table-column label="默认值" min-width="120" prop="default_value" />
        <el-table-column label="必填" min-width="80">
          <template #default="scope">
            {{ Number(scope.row.is_required || 0) === 1 ? '是' : '否' }}
          </template>
        </el-table-column>
        <el-table-column label="校验规则" min-width="160" prop="validate_rule" />
        <el-table-column label="排序" min-width="80" prop="sort_no" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="scope">
            <div class="table-actions">
              <el-button link type="primary" @click="openEditMappingDialog(scope.row, scope.$index)">编辑</el-button>
              <el-button link type="danger" @click="handleDeleteMapping(scope.$index)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="sourceDialogVisible"
      :title="sourceDialogMode === 'create' ? '新增来源系统' : '编辑来源系统'"
      width="820px"
    >
      <el-form ref="sourceFormRef" :model="sourceForm" :rules="sourceRules" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="来源应用" prop="source_code">
              <div class="app-select-box">
                <el-input v-model="sourceForm.source_name" readonly placeholder="请选择来源应用" />
                <el-button type="primary" @click="openSourceAppSelectDialog">选择应用</el-button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="来源编码" prop="source_code">
              <el-input v-model="sourceForm.source_code" readonly placeholder="选择应用后自动回填" />
            </el-form-item>
          </el-col>
          <!-- <el-col :span="12">
            <el-form-item label="来源类型">
              <el-input v-model="sourceForm.source_type" readonly placeholder="选择应用后自动回填" />
            </el-form-item>
          </el-col> -->
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="sourceForm.status" class="w-full">
                <el-option label="启用" value="ENABLED" />
                <el-option label="禁用" value="DISABLED" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="连接方式">
              <el-input v-model="sourceForm.protocol_type" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="应用配置">
              <el-input
                v-model="sourceForm.endpoint_config"
                type="textarea"
                :rows="6"
                readonly
                placeholder="选择应用后自动保存应用元数据"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="sourceForm.remark" type="textarea" :rows="3" placeholder="可补充业务说明" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="sourceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSourceForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="adapterDialogVisible"
      :title="adapterDialogMode === 'create' ? '新增适配器' : '编辑适配器'"
      width="860px"
    >
      <el-form ref="adapterFormRef" :model="adapterForm" :rules="adapterRules" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="适配器编码" prop="adapter_code">
              <el-input v-model="adapterForm.adapter_code" placeholder="请输入适配器编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="适配器名称" prop="adapter_name">
              <el-input v-model="adapterForm.adapter_name" placeholder="请输入适配器名称" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <BusinessObjectSelectorBlock
              title="来源业务对象"
              :app-name="adapterSourceSelection.appName"
              :app-code="adapterSourceSelection.appCode"
              :db-name="adapterSourceSelection.dbName"
              :table-name="adapterSourceSelection.tableName"
              :table-id="adapterSourceSelection.tableId"
              :show-field="false"
              @select-app="handleSelectAdapterSourceApp"
              @select-object="handleSelectSourceObject"
            />
          </el-col>
          <el-col :span="12">
            <el-form-item label="标准对象">
              <el-input v-model="adapterForm.standard_object_code" placeholder="请输入标准对象编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="财务对象">
              <el-input v-model="adapterForm.finance_object_code" placeholder="请输入财务对象编码" />
            </el-form-item>
          </el-col>
          <!-- <el-col :span="12" >
            <el-form-item label="当前账套">
              <el-input :model-value="currentAccountSetText" readonly  visiable/>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="账套ID">
              <el-input v-model="adapterForm.account_set_id" readonly placeholder="自动带入当前账套ID" />
            </el-form-item>
          </el-col> -->
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="adapterForm.status" class="w-full">
                <el-option label="草稿" value="DRAFT" />
                <el-option label="测试中" value="TESTING" />
                <el-option label="已发布" value="PUBLISHED" />
                <el-option label="已下线" value="OFFLINE" />
              </el-select>
            </el-form-item>
          </el-col>
          <!-- <el-col :span="12">
            <el-form-item label="版本">
              <el-input v-model="adapterForm.version_no" placeholder="如 1.0.0" />
            </el-form-item>
          </el-col> -->
          <el-col :span="24">
            <el-form-item label="规则 JSON">
              <el-input v-model="adapterForm.rule_json" type="textarea" :rows="3" placeholder="请输入规则 JSON" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="样例报文">
              <el-input v-model="adapterForm.sample_payload" type="textarea" :rows="3" placeholder="请输入样例报文" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="adapterForm.remark" type="textarea" :rows="3" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="adapterDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdapterForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="mappingDialogVisible"
      :title="mappingDialogMode === 'create' ? '新增字段映射' : '编辑字段映射'"
      width="760px"
    >
      <el-form ref="mappingFormRef" :model="mappingForm" :rules="mappingRules" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="24">
            <BusinessObjectSelectorBlock
              title="来源字段选择"
              :app-name="adapterSourceSelection.appName"
              :app-code="adapterSourceSelection.appCode"
              :db-name="adapterSourceSelection.dbName"
              :table-name="adapterSourceSelection.tableName"
              :table-id="adapterSourceSelection.tableId"
              :field-name="mappingForm.source_field"
              :app-disabled="true"
              :object-disabled="true"
              @select-field="handleSelectSourceField"
            />
          </el-col>
          <!-- <el-col :span="12">
            <el-form-item label="标准字段" prop="standard_field">
              <div class="app-select-box">
                <el-input v-model="mappingForm.standard_field" placeholder="请选择标准字段" readonly />
                <el-button type="primary" @click="openFieldSelectDialog('standard')">选择字段</el-button>
              </div>
            </el-form-item>
          </el-col> -->
          <el-col :span="12">
            <el-form-item label="财务字段">
              <div class="app-select-box">
                <el-input v-model="mappingForm.finance_field" placeholder="请选择财务字段" readonly />
                <el-button type="primary" @click="openFieldSelectDialog('finance')">选择字段</el-button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number v-model="mappingForm.sort_no" :min="1" class="!w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="适配规则">
              <el-input v-model="mappingForm.adapt_rule" type="textarea" :rows="3" placeholder="请输入适配规则" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="默认值">
              <el-input v-model="mappingForm.default_value" placeholder="请输入默认值" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="必填">
              <el-switch v-model="mappingForm.is_required" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="校验规则">
              <el-input v-model="mappingForm.validate_rule" placeholder="请输入校验规则" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="mappingForm.remark" type="textarea" :rows="3" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="mappingDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitMappingForm">确定</el-button>
      </template>
    </el-dialog>

    <AppSelectModal ref="sourceAppSelectModalRef" @confirm="handleSelectSourceApp" />
    <AppDbSelectModal ref="sourceObjectSelectModalRef" @confirm="handleSelectSourceObject" />
    <FieldSelectModal ref="sourceFieldSelectModalRef" @confirm="handleSelectSourceField" />
    <FieldSelectModal ref="standardFieldSelectModalRef" @confirm="handleSelectStandardField" />
    <FieldSelectModal ref="financeFieldSelectModalRef" @confirm="handleSelectFinanceField" />
  </div>
</template>

<style scoped>
.finance-object-adapter-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-card,
.panel-card,
.stat-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  background: linear-gradient(135deg, rgb(64 158 255 / 10%), rgb(103 194 58 / 8%));
}

.hero-title {
  margin-bottom: 8px;
  font-size: 22px;
  font-weight: 700;
  color: #303133;
}

.hero-desc {
  max-width: 760px;
  line-height: 1.8;
  color: #606266;
}

.hero-meta {
  min-width: 220px;
  display: grid;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.hero-meta span {
  font-weight: 700;
  color: #303133;
}

.stat-card {
  padding: 16px 18px;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.stat-value {
  margin: 8px 0 6px;
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  word-break: break-word;
}

.stat-tip {
  font-size: 12px;
  color: #909399;
}

.panel-card {
  padding: 16px;
}

.panel-header {
  margin-bottom: 12px;
}

.row-between {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.panel-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #606266;
}

.toolbar-actions,
.table-actions,
.app-select-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-select-box {
  width: 100%;
}

.app-select-box :deep(.el-input) {
  flex: 1;
}

.w-full {
  width: 100%;
}

@media screen and (width <= 900px) {
  .hero-card {
    flex-direction: column;
  }

  .hero-meta {
    min-width: auto;
  }

  .row-between,
  .app-select-box {
    flex-direction: column;
  }
}
</style>
