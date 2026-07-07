<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';


import {
  getCurrentAppDatabasePage,
  getCurrentAppTablePage,
  getTableFieldPage,
  type FinanceBusinessSourceSystemApi,
} from '#/api/erp/finance/settings/basic_data/business_standardization';
import {
  createEmptyImportConfig,
  createEmptyImportField,
  deleteImportConfig,
  getImportConfigsBySchemeId,
  getImportFieldsByConfigId,
  saveImportDesign,
  type ImportConfigRow,
  type ImportFieldRow,
} from '#/api/erp/import-design';
import {
  createImportSolution,
  getImportSolutions,
  updateImportSolution,
  type ImportSolutionRow,
} from '#/api/erp/import-solution';

import BaseSettingForm from './BaseSettingForm.vue';
import DynamicDictEditor from './DynamicDictEditor.vue';
import FieldMappingTable from './FieldMappingTable.vue';
import SchemeTreePane from './SchemeTreePane.vue';
import TransformSettingForm from './TransformSettingForm.vue';
import { cloneConfig, cloneFieldRows } from './types';
import type { ExcelSchemeDesignerNode, FieldTableSavePayload } from './types';

import {
  ElButton,
  ElEmpty,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElTabPane,
  ElTabs,
} from 'element-plus';

defineOptions({ name: 'ExcelSchemeDesigner' });

const props = withDefaults(
  defineProps<{
    schemeId?: string;
    schemeName?: string;
    readonly?: boolean;
    compact?: boolean;
    showTree?: boolean;
    allowChildNode?: boolean;
  }>(),
  {
    readonly: false,
    compact: true,
    showTree: true,
    allowChildNode: true,
  },
);

const emit = defineEmits<{
  loaded: [solution: ImportSolutionRow | null];
  save: [payload: { solution: ImportSolutionRow | null; config: ImportConfigRow | null }];
  change: [payload: { solution: ImportSolutionRow | null; config: ImportConfigRow | null }];
  'select-node': [config: ImportConfigRow | null];
}>();

const loading = ref(false);
const saving = ref(false);
const solution = ref<ImportSolutionRow | null>(null);
const nodes = ref<ExcelSchemeDesignerNode[]>([]);
const activeNodeId = ref('');
const activeConfig = ref<ImportConfigRow | null>(null);
const fieldRows = ref<ImportFieldRow[]>([]);
const parentTableFieldRows = ref<ImportFieldRow[]>([]);
const activeConfigTab = ref<'base' | 'transform'>('base');
const activeRightTab = ref<'fields' | 'dict'>('fields');
const selectedAppCode = ref('');
const selectedAppName = ref('');
const selectedDbName = ref('');
const selectedTableId = ref('');

const solutionName = computed({
  get: () => solution.value?.solutionName || '',
  set: (value: string) => {
    if (!solution.value) return;
    solution.value = {
      ...solution.value,
      solutionName: value,
    };
  },
});

const parentFieldOptions = computed(() => {
  return parentTableFieldRows.value.map((item) => ({
    value: String(item.name || ''),
    label: [item.name, item.title].filter(Boolean).join(' / ') || String(item.name || ''),
  }));
});

const foreignKeyFieldOptions = computed(() => {
  return fieldRows.value.map((item) => ({
    value: String(item.name || ''),
    label: [item.name, item.title].filter(Boolean).join(' / ') || String(item.name || ''),
  }));
});

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

function sortTableFields(tableFields: FinanceBusinessSourceSystemApi.TableFieldRow[] = []) {
  return [...tableFields].sort((a, b) => {
    const aPKey = Number(a?.IsPKey || 0) === 1 ? 1 : 0;
    const bPKey = Number(b?.IsPKey || 0) === 1 ? 1 : 0;
    if (aPKey !== bPKey) return bPKey - aPKey;
    const aOrd = Number(a?.ordIdx || 0);
    const bOrd = Number(b?.ordIdx || 0);
    if (aOrd !== bOrd) return aOrd - bOrd;
    return String(a?.enname || '').localeCompare(String(b?.enname || ''), 'en');
  });
}

function buildNodeTree(list: ImportConfigRow[]) {
  const map = new Map<string, ExcelSchemeDesignerNode>();
  const result: ExcelSchemeDesignerNode[] = [];

  list
    .slice()
    .sort((a, b) => {
      const sheetDiff = Number(a.sheet || 0) - Number(b.sheet || 0);
      if (sheetDiff !== 0) return sheetDiff;
      return String(a.rowid || '').localeCompare(String(b.rowid || ''), 'en');
    })
    .forEach((item) => {
      map.set(item.rowid, {
        ...item,
        children: [],
      });
    });

  map.forEach((node) => {
    if (node.pid && map.has(node.pid)) {
      map.get(node.pid)?.children?.push(node);
      return;
    }
    result.push(node);
  });

  return result;
}

function flattenNodes(list: ExcelSchemeDesignerNode[]): ExcelSchemeDesignerNode[] {
  return list.flatMap((item) => [item, ...flattenNodes(item.children || [])]);
}

function resetObjectSelectorState() {
  selectedAppCode.value = '';
  selectedAppName.value = '';
  selectedDbName.value = '';
  selectedTableId.value = '';
}

function syncObjectSelectorState(config: ImportConfigRow | null) {
  selectedAppCode.value = String(config?.relatedappid || '');
  selectedAppName.value = String(config?.relatedAppName || '');
  const tableValue = String(config?.table || '');
  const parts = tableValue.split('@');
  selectedDbName.value = parts.length > 1 ? parts[0] : '';
  selectedTableId.value = '';
}

function splitTablePath(tableValue?: string | null) {
  const raw = String(tableValue || '').trim();
  const parts = raw.split('@');
  if (parts.length < 2) {
    return {
      dbName: '',
      tableName: raw,
    };
  }
  return {
    dbName: String(parts[0] || '').trim(),
    tableName: String(parts.slice(1).join('@') || '').trim(),
  };
}

async function resolveTableIdByConfig(config: ImportConfigRow | null) {
  const sysid = String(config?.relatedappid || '').trim();
  const { dbName, tableName } = splitTablePath(config?.table);
  if (!sysid || !dbName || !tableName) return '';

  const dbRes = await getCurrentAppDatabasePage({ pageNo: 1, page: 200, sysid, keyword: dbName });
  const dbRow = (dbRes.list || []).find((item) => {
    const candidates = [item?.conName, item?.Name, item?.ValueName, item?.cnName, item?.NameStr]
      .map((v) => String(v || '').trim().toLowerCase())
      .filter(Boolean);
    return candidates.includes(dbName.toLowerCase());
  }) || dbRes.list?.[0];

  const dbid = String(dbRow?.Id || dbRow?.rowid || '').trim();
  if (!dbid) return '';

  const tableRes = await getCurrentAppTablePage({ pageNo: 1, page: 200, sysid, dbid, keyword: tableName });
  const tableRow = (tableRes.list || []).find((item) => String(item?.tblname || '').trim().toLowerCase() === tableName.toLowerCase())
    || (tableRes.list || []).find((item) => String(item?.tbldesc || '').trim().toLowerCase() === tableName.toLowerCase())
    || tableRes.list?.[0];

  return String(tableRow?.rowid || tableRow?.id || '').trim();
}

function buildTableName(row: FinanceBusinessSourceSystemApi.AppTableRow & { dbRow?: FinanceBusinessSourceSystemApi.AppDatabaseRow }) {
  const dbName = String(
    row?.dbRow?.conName || row?.dbRow?.Name || row?.dbRow?.ValueName || selectedDbName.value || '',
  ).trim();
  const tableName = String(row?.tblname || '').trim();
  return dbName && tableName ? `${dbName}@${tableName}` : tableName;
}

function createFieldRowsFromTableFields(tableFields: FinanceBusinessSourceSystemApi.TableFieldRow[], configId: string) {
  return sortTableFields(tableFields).map((field, index) => {
    const row = createEmptyImportField(configId);
    row.name = String(field.enname || field.AsName || '').trim();
    row.title = String(field.cnname || field.description || row.name || '').trim();
    row.index = getExcelColumnName(index);
    row.refTable = '';
    row.refTableDesc = '';
    row.filterField = '';
    row.filterValue = '';
    return row;
  });
}

async function getTableFieldsByTblid(tblid: string, configId: string) {
  if (!tblid) return [];
  const res = await getTableFieldPage({ pageNo: 1, page: 0, tblid });
  return createFieldRowsFromTableFields(res.list || [], configId);
}

async function hydrateFieldRowsByTableId(tblid: string) {
  if (!activeConfig.value || !tblid) return;
  fieldRows.value = await getTableFieldsByTblid(tblid, activeConfig.value.rowid);
  activeRightTab.value = 'fields';
  ElMessage.success(`已根据目标表自动填充 ${fieldRows.value.length} 个字段`);
}

async function hydrateParentTableFieldRows(current: ImportConfigRow | null) {
  if (!current || !solution.value || !current.pid || current.pid === solution.value.rowid) {
    parentTableFieldRows.value = [];
    return;
  }
  const flatNodes = flattenNodes(nodes.value);
  const parentNode = flatNodes.find((item) => item.rowid === current.pid) || null;
  if (!parentNode) {
    parentTableFieldRows.value = [];
    return;
  }
  const parentTblid = await resolveTableIdByConfig(parentNode);
  if (!parentTblid) {
    parentTableFieldRows.value = [];
    return;
  }
  parentTableFieldRows.value = await getTableFieldsByTblid(parentTblid, parentNode.rowid);
}

async function handleSelectApp(row: FinanceBusinessSourceSystemApi.AppRow) {
  if (!activeConfig.value) return;
  const appCode = String(row?.rowid || '').trim();
  const appName = String(row?.AppDesc || row?.NameStr || row?.AppName || '').trim();
  selectedAppCode.value = appCode;
  selectedAppName.value = appName;
  selectedDbName.value = '';
  selectedTableId.value = '';
  fieldRows.value = [];
  activeConfig.value = {
    ...activeConfig.value,
    relatedappid: appCode,
    relatedAppName: appName,
    table: '',
    tableDesc: '',
    foreignKeyField: '',
  };
}

async function handleSelectObject(
  row: FinanceBusinessSourceSystemApi.AppTableRow & { dbRow?: FinanceBusinessSourceSystemApi.AppDatabaseRow },
) {
  if (!activeConfig.value) return;
  selectedDbName.value = String(
    row?.dbRow?.conName || row?.dbRow?.Name || row?.dbRow?.ValueName || '',
  ).trim();
  selectedTableId.value = String(row?.rowid || row?.id || '').trim();
  activeConfig.value = {
    ...activeConfig.value,
    table: buildTableName(row),
    tableDesc: String(row?.tbldesc || '').trim(),
    foreignKeyField: activeConfig.value.foreignKeyField || '',
  };
  await hydrateFieldRowsByTableId(selectedTableId.value);
}

async function resolveSolution() {
  const list = await getImportSolutions();
  if (props.schemeId) {
    return list.find((item) => item.rowid === props.schemeId) || null;
  }
  if (props.schemeName) {
    return list.find((item) => item.solutionName === props.schemeName) || null;
  }
  return list[0] || null;
}

async function loadNodeDetail(nodeId: string) {
  const flatNodes = flattenNodes(nodes.value);
  const current = flatNodes.find((item) => item.rowid === nodeId) || null;
  activeNodeId.value = nodeId;
  activeConfig.value = cloneConfig(current);
  fieldRows.value = current ? cloneFieldRows(await getImportFieldsByConfigId(current.rowid)) : [];
  await hydrateParentTableFieldRows(activeConfig.value);
  syncObjectSelectorState(activeConfig.value);
  activeConfigTab.value = 'base';
  activeRightTab.value = 'fields';
  emit('select-node', activeConfig.value);
  emit('change', { solution: solution.value, config: activeConfig.value });
}

async function reload(preferNodeId?: string) {
  loading.value = true;
  try {
    solution.value = await resolveSolution();
    if (!solution.value) {
      nodes.value = [];
      activeNodeId.value = '';
      activeConfig.value = null;
      fieldRows.value = [];
      parentTableFieldRows.value = [];
      resetObjectSelectorState();
      emit('loaded', null);
      return;
    }

    const configs = await getImportConfigsBySchemeId(solution.value.rowid);
    nodes.value = buildNodeTree(configs);
    const firstNode = flattenNodes(nodes.value)[0] || null;
    const nextNodeId = preferNodeId || activeNodeId.value || firstNode?.rowid || '';

    if (nextNodeId) {
      await loadNodeDetail(nextNodeId);
    } else {
      activeNodeId.value = '';
      activeConfig.value = null;
      fieldRows.value = [];
      parentTableFieldRows.value = [];
      resetObjectSelectorState();
    }

    emit('loaded', solution.value);
  } finally {
    loading.value = false;
  }
}

async function handleSelect(nodeId: string) {
  await loadNodeDetail(nodeId);
}

async function handleCreateRoot() {
  if (props.readonly) return;
  const currentSolution = solution.value;
  if (!currentSolution) {
    const result = await createImportSolution('新建 Excel 导入导出方案', {
      includeChildConfig: false,
      includeDefaultFieldRows: false,
    });
    if (!result.success) {
      ElMessage.error(result.message || '新增方案失败');
      return;
    }
    ElMessage.success(result.message || '新增方案成功');
    await reload();
    return;
  }

  const row = createEmptyImportConfig(currentSolution.rowid, currentSolution.rowid);
  row.sheet = flattenNodes(nodes.value).length;
  row.sheetName = `Sheet${row.sheet + 1}`;
  const result = await saveImportDesign({ config: row, fields: [] });
  if (!result.success) {
    ElMessage.error(result.message || '新增节点失败');
    return;
  }
  ElMessage.success('新增节点成功');
  await reload(row.rowid);
}

async function handleCreateChild(nodeId: string) {
  if (props.readonly || !solution.value || !props.allowChildNode) return;
  const row = createEmptyImportConfig(solution.value.rowid, nodeId);
  row.sheet = flattenNodes(nodes.value).length;
  row.sheetName = `子级${row.sheet}`;
  const result = await saveImportDesign({ config: row, fields: [] });
  if (!result.success) {
    ElMessage.error(result.message || '新增子级失败');
    return;
  }
  ElMessage.success('新增子级成功');
  await reload(row.rowid);
}

async function handleRemove(nodeId: string) {
  if (props.readonly) return;
  const flatNodes = flattenNodes(nodes.value);
  const target = flatNodes.find((item) => item.rowid === nodeId);
  if (!target) return;

  try {
    await ElMessageBox.confirm(`确认删除节点“${target.sheetName || target.tableDesc || target.table}”吗？`, '删除确认', {
      type: 'warning',
    });
  } catch {
    return;
  }

  const result = await deleteImportConfig(target);
  if (!result.success) {
    ElMessage.error(result.message || '删除失败');
    return;
  }
  ElMessage.success('删除成功');
  await reload();
}

async function handleSave() {
  if (props.readonly || !solution.value || !activeConfig.value) return;
  saving.value = true;
  try {
    const solutionResult = await updateImportSolution(solution.value);
    if (!solutionResult.success) {
      ElMessage.error(solutionResult.message || '方案保存失败');
      return;
    }

    const configResult = await saveImportDesign({
      config: activeConfig.value,
      fields: fieldRows.value,
      deletedFieldRowIds: [],
    });
    if (!configResult.success) {
      ElMessage.error(configResult.message || '配置保存失败');
      return;
    }

    ElMessage.success('方案保存成功');
    emit('save', { solution: solution.value, config: activeConfig.value });
    await reload(activeConfig.value.rowid);
  } finally {
    saving.value = false;
  }
}

async function handleFieldSave(payload: FieldTableSavePayload) {
  if (props.readonly || !activeConfig.value) return;
  const result = await saveImportDesign({
    config: activeConfig.value,
    fields: payload.rows,
    deletedFieldRowIds: payload.deletedRowIds,
  });
  if (!result.success) {
    ElMessage.error(result.message || '字段保存失败');
    return;
  }
  ElMessage.success('字段保存成功');
  fieldRows.value = cloneFieldRows(payload.rows);
  await reload(activeConfig.value.rowid);
}

const showEmpty = computed(() => !solution.value && !loading.value);

defineExpose({
  reload,
  save: handleSave,
  getData: () => ({
    solution: solution.value,
    config: activeConfig.value,
    fields: fieldRows.value,
  }),
});

onMounted(() => {
  reload();
});
</script>

<template>
  <div class="excel-scheme-designer" :class="{ 'excel-scheme-designer--compact': compact }">
    <div class="excel-scheme-designer__toolbar">
      <div class="excel-scheme-designer__toolbar-left">
        <span class="excel-scheme-designer__toolbar-title">方案名称</span>
        <el-input v-model="solutionName" :disabled="readonly || !solution" placeholder="请输入方案名称"
          class="excel-scheme-designer__name-input" />
      </div>
      <div class="excel-scheme-designer__toolbar-right">
        <el-button :loading="loading" size="small" @click="reload(activeNodeId)">刷新</el-button>
        <el-button v-if="!readonly" :loading="saving" size="small" type="primary" @click="handleSave">
          保存方案
        </el-button>
      </div>
    </div>

    <div v-if="showEmpty" class="excel-scheme-designer__empty">
      <el-empty description="当前没有可用方案">
        <el-button v-if="!readonly" type="primary" @click="handleCreateRoot">新建方案</el-button>
      </el-empty>
    </div>

    <div v-else class="excel-scheme-designer__body excel-scheme-designer__body--three-cols">
      <div v-if="showTree" class="excel-scheme-designer__col excel-scheme-designer__col--tree">
        <SchemeTreePane :solution="solution" :nodes="nodes" :active-node-id="activeNodeId" :loading="loading"
          :readonly="readonly" :allow-child-node="allowChildNode" @select="handleSelect" @add-root="handleCreateRoot"
          @add-child="handleCreateChild" @remove="handleRemove" />
      </div>

      <div class="excel-scheme-designer__col excel-scheme-designer__col--config">
        <div class="excel-scheme-designer__config-card">
          <div class="excel-scheme-designer__config-tabs">
            <el-tabs v-model="activeConfigTab" stretch>
              <el-tab-pane label="基本设置" name="base" />
              <el-tab-pane label="行列转换配置" name="transform" />
            </el-tabs>
          </div>

          <div class="excel-scheme-designer__config-panel">
            <BaseSettingForm v-if="activeConfigTab === 'base'" v-model="activeConfig" :readonly="readonly"
              :app-code="selectedAppCode" :app-name="selectedAppName" :db-name="selectedDbName"
              :table-id="selectedTableId" :parent-field-options="parentFieldOptions"
              :foreign-key-field-options="foreignKeyFieldOptions" @select-app="handleSelectApp"
              @select-object="handleSelectObject" />
            <TransformSettingForm v-else v-model="activeConfig" :readonly="readonly" />
          </div>
        </div>
      </div>

      <div class="excel-scheme-designer__col excel-scheme-designer__col--right">
        <div class="excel-scheme-designer__right-card">
          <div class="excel-scheme-designer__right-tabs">
            <el-tabs v-model="activeRightTab" stretch>
              <el-tab-pane label="字段配置" name="fields" />
              <el-tab-pane label="动态字典" name="dict" />
            </el-tabs>
          </div>

          <div class="excel-scheme-designer__right-panel">
            <FieldMappingTable v-if="activeRightTab === 'fields'" :config-id="activeConfig?.rowid" :rows="fieldRows"
              :readonly="readonly" @save="handleFieldSave" />
            <DynamicDictEditor v-else v-model="activeConfig" :readonly="readonly" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.excel-scheme-designer {
  display: flex;
  height: 100%;
  min-height: 640px;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.excel-scheme-designer__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.excel-scheme-designer__toolbar-left,
.excel-scheme-designer__toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.excel-scheme-designer__toolbar-title {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
}

.excel-scheme-designer__name-input {
  width: 280px;
}

.excel-scheme-designer__empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
}

.excel-scheme-designer__body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.excel-scheme-designer__col {
  min-height: 0;
}

.excel-scheme-designer__col--tree {
  width: 260px;
  min-width: 260px;
  border-right: 1px solid var(--el-border-color-lighter);
}

.excel-scheme-designer__col--config {
  flex: 0 0 38%;
  min-width: 420px;
  border-right: 1px solid var(--el-border-color-lighter);
}

.excel-scheme-designer__col--right {
  flex: 1;
  min-width: 0;
}

.excel-scheme-designer__config-card,
.excel-scheme-designer__right-card {
  display: flex;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
}

.excel-scheme-designer__config-tabs,
.excel-scheme-designer__right-tabs {
  padding: 0 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.excel-scheme-designer__config-panel,
.excel-scheme-designer__right-panel {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.excel-scheme-designer--compact :deep(.el-form-item) {
  margin-bottom: 8px;
}

.excel-scheme-designer--compact :deep(.el-input__wrapper),
.excel-scheme-designer--compact :deep(.el-textarea__inner),
.excel-scheme-designer--compact :deep(.el-select__wrapper) {
  min-height: 30px;
}

.excel-scheme-designer--compact :deep(.el-tabs__header) {
  margin-bottom: 0;
}

@media (max-width: 1360px) {
  .excel-scheme-designer__body--three-cols {
    flex-direction: column;
  }

  .excel-scheme-designer__col--tree,
  .excel-scheme-designer__col--config,
  .excel-scheme-designer__col--right {
    width: 100%;
    min-width: 0;
    flex: none;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .excel-scheme-designer__col--right {
    border-bottom: 0;
    flex: 1;
  }
}
</style>
