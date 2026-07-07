<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';


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
import type { FinanceBusinessSourceSystemApi } from '#/api/erp/finance/settings/basic_data/business_standardization';
import AppDbSelectModal from '#/components/app-db-selector/AppDbSelectModal.vue';
import AppSelectModal from '#/components/app-selector/AppSelectModal.vue';

import {
  ElAlert,
  ElButton,
  ElCard,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElPopconfirm,
  ElScrollbar,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTree,
} from 'element-plus';

interface TreeNode extends ImportConfigRow {
  children?: TreeNode[];
}

const props = withDefaults(
  defineProps<{
    schemeId: string;
    embedded?: boolean;
  }>(),
  {
    embedded: false,
  },
);

const emit = defineEmits<{
  saved: [];
}>();

const loading = ref(false);
const treeLoading = ref(false);
const saveLoading = ref(false);
const keyword = ref('');
const treeData = ref<TreeNode[]>([]);
const flatConfigs = ref<ImportConfigRow[]>([]);
const serverConfigIds = ref<string[]>([]);
const currentNodeId = ref('');
const currentConfig = ref<ImportConfigRow>(createEmptyImportConfig(props.schemeId));
const fieldRows = ref<ImportFieldRow[]>([]);
const deletedFieldRowIds = ref<string[]>([]);
const logLines = ref<string[]>([]);
const appSelectRef = ref<InstanceType<typeof AppSelectModal>>();
const appDbSelectRef = ref<InstanceType<typeof AppDbSelectModal>>();

function addLog(message: string) {
  logLines.value.unshift(
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] ${message}`,
  );
}

function resetState() {
  currentNodeId.value = '';
  currentConfig.value = createEmptyImportConfig(props.schemeId);
  fieldRows.value = [];
  deletedFieldRowIds.value = [];
  flatConfigs.value = [];
  serverConfigIds.value = [];
  treeData.value = [];
  keyword.value = '';
  logLines.value = [];
}

function buildTree(rows: ImportConfigRow[]) {
  const map = new Map<string, TreeNode>();
  rows.forEach((item) => {
    map.set(item.rowid, { ...item, children: [] });
  });
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.pid && map.has(node.pid)) {
      map.get(node.pid)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function resolveAppDisplayName(row: FinanceBusinessSourceSystemApi.AppRow) {
  return String(row?.AppDesc || row?.NameStr || row?.AppName || '').trim();
}

function resolveDbNameFromTableRow(
  row: FinanceBusinessSourceSystemApi.AppTableRow & {
    dbRow?: FinanceBusinessSourceSystemApi.AppDatabaseRow;
  },
) {
  const dbRow = row?.dbRow;
  return String(
    dbRow?.conName || dbRow?.Name || dbRow?.ValueName || dbRow?.cnName || '',
  ).trim();
}

function handleSelectApp() {
  appSelectRef.value?.open();
}

function handleAppSelected(row: FinanceBusinessSourceSystemApi.AppRow) {
  const appId = String(row?.rowid || '').trim();
  currentConfig.value.relatedappid = appId;
  currentConfig.value.relatedAppName = resolveAppDisplayName(row);
  currentConfig.value.table = '';
  currentConfig.value.tableDesc = '';
  addLog(`已选择应用：${currentConfig.value.relatedAppName || appId}`);
}

function handleSelectTargetTable() {
  const sysid = String(currentConfig.value.relatedappid || '').trim();
  if (!sysid) {
    ElMessage.warning('请先选择关联应用');
    return;
  }
  appDbSelectRef.value?.open(sysid);
}

function handleTargetTableSelected(
  row: FinanceBusinessSourceSystemApi.AppTableRow & {
    dbRow?: FinanceBusinessSourceSystemApi.AppDatabaseRow;
  },
) {
  const dbName = resolveDbNameFromTableRow(row);
  const tableName = String(row?.tblname || '').trim();
  currentConfig.value.table = dbName && tableName ? `${dbName}@${tableName}` : tableName;
  currentConfig.value.tableDesc = String(row?.tbldesc || '').trim();
  if (!String(currentConfig.value.relatedappid || '').trim() && row?.sysid) {
    currentConfig.value.relatedappid = String(row.sysid).trim();
  }
  addLog(`已选择目标数据表：${currentConfig.value.table || tableName}`);
}

const filteredTree = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  if (!text) return treeData.value;

  const filterNode = (nodes: TreeNode[]): TreeNode[] => {
    return nodes
      .map((node) => {
        const children = filterNode(node.children || []);
        const matched = [
          node.sheetName,
          node.table,
          node.relatedAppName,
          node.relatedappid,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(text));
        if (matched || children.length > 0) {
          return { ...node, children };
        }
        return null;
      })
      .filter(Boolean) as TreeNode[];
  };

  return filterNode(treeData.value);
});

async function loadTree(autoSelect = true) {
  if (!props.schemeId) {
    resetState();
    return;
  }
  treeLoading.value = true;
  try {
    const rows = await getImportConfigsBySchemeId(props.schemeId);
    flatConfigs.value = rows;
    serverConfigIds.value = rows.map((item) => item.rowid);
    treeData.value = buildTree(rows);
    addLog(`已加载配置节点 ${rows.length} 条`);

    if (autoSelect && rows.length > 0) {
      await selectNode(rows[0].rowid);
    }
    if (rows.length === 0) {
      currentNodeId.value = '';
      currentConfig.value = createEmptyImportConfig(props.schemeId);
      fieldRows.value = [];
    }
  } catch (error: any) {
    const msg = error?.message || String(error);
    addLog(`加载树节点失败: ${msg}`);
    ElMessage.error(msg);
  } finally {
    treeLoading.value = false;
  }
}

async function selectNode(rowid: string) {
  const node = flatConfigs.value.find((item) => item.rowid === rowid);
  if (!node) return;
  currentNodeId.value = rowid;
  currentConfig.value = { ...node };
  loading.value = true;
  deletedFieldRowIds.value = [];
  try {
    if (!serverConfigIds.value.includes(rowid)) {
      fieldRows.value = [];
      addLog('当前为未保存节点，字段映射待保存后再落库');
      return;
    }
    const rows = await getImportFieldsByConfigId(rowid);
    fieldRows.value = rows.map((item) => ({ ...item }));
    addLog(`已加载字段映射 ${rows.length} 条`);
  } catch (error: any) {
    const msg = error?.message || String(error);
    fieldRows.value = [];
    addLog(`加载字段映射失败: ${msg}`);
    ElMessage.error(msg);
  } finally {
    loading.value = false;
  }
}

function handleNodeClick(node: TreeNode) {
  selectNode(node.rowid);
}

function createSibling() {
  if (!props.schemeId) {
    ElMessage.warning('当前方案ID为空');
    return;
  }
  const current = currentConfig.value;
  const pid = current?.pid || '';
  const row = createEmptyImportConfig(props.schemeId, pid);
  row.sheetName = '新建项';
  flatConfigs.value = [...flatConfigs.value, row];
  treeData.value = buildTree(flatConfigs.value);
  currentConfig.value = { ...row };
  currentNodeId.value = row.rowid;
  fieldRows.value = [];
  deletedFieldRowIds.value = [];
  addLog('已新增同级节点（未保存）');
}

function createChild() {
  if (!props.schemeId) {
    ElMessage.warning('当前方案ID为空');
    return;
  }
  if (!currentConfig.value?.rowid) {
    ElMessage.warning('请先选择一个父节点');
    return;
  }
  const row = createEmptyImportConfig(props.schemeId, currentConfig.value.rowid);
  row.sheetName = '新建子级';
  flatConfigs.value = [...flatConfigs.value, row];
  treeData.value = buildTree(flatConfigs.value);
  currentConfig.value = { ...row };
  currentNodeId.value = row.rowid;
  fieldRows.value = [];
  deletedFieldRowIds.value = [];
  addLog('已新增子级节点（未保存）');
}

async function removeCurrentNode() {
  const current = currentConfig.value;
  if (!current?.rowid) {
    ElMessage.warning('请先选择节点');
    return;
  }

  const hasChild = flatConfigs.value.some((item) => item.pid === current.rowid);
  if (hasChild) {
    ElMessage.warning('当前节点存在子级，请先删除子级');
    return;
  }

  const existsOnServer = serverConfigIds.value.includes(current.rowid);
  if (!existsOnServer) {
    flatConfigs.value = flatConfigs.value.filter(
      (item) => item.rowid !== current.rowid,
    );
    treeData.value = buildTree(flatConfigs.value);
    currentNodeId.value = '';
    currentConfig.value = createEmptyImportConfig(props.schemeId);
    fieldRows.value = [];
    deletedFieldRowIds.value = [];
    addLog(`已删除本地未保存节点: ${current.sheetName}`);
    return;
  }

  try {
    const result = await deleteImportConfig(current);
    if (!result.success) {
      ElMessage.error(result.message);
      addLog(`删除失败: ${result.message}`);
      return;
    }
    ElMessage.success(result.message);
    addLog(`删除节点成功: ${current.sheetName}`);
    await loadTree(true);
    emit('saved');
  } catch (error: any) {
    const msg = error?.message || String(error);
    ElMessage.error(msg);
    addLog(`删除异常: ${msg}`);
  }
}

function addFieldRow() {
  const configid = currentConfig.value.rowid || '';
  fieldRows.value.push(createEmptyImportField(configid));
}

function removeFieldRow(index: number) {
  const row = fieldRows.value[index];
  if (row?.rowid) {
    deletedFieldRowIds.value.push(row.rowid);
  }
  fieldRows.value.splice(index, 1);
}

async function saveCurrent() {
  if (!props.schemeId) {
    ElMessage.warning('当前方案ID为空');
    return;
  }
  if (!currentConfig.value.sheetName) {
    ElMessage.warning('请填写工作表名称');
    return;
  }

  saveLoading.value = true;
  try {
    const payloadConfig: ImportConfigRow = {
      ...currentConfig.value,
      schemeid: props.schemeId,
    };
    const result = await saveImportDesign({
      config: payloadConfig,
      fields: fieldRows.value,
      deletedFieldRowIds: deletedFieldRowIds.value,
    });
    if (!result.success || !result.data) {
      ElMessage.error(result.message);
      addLog(`保存失败: ${result.message}`);
      return;
    }

    ElMessage.success(result.message);
    addLog(`保存成功: ${payloadConfig.sheetName}`);
    currentConfig.value = { ...result.data.config };
    fieldRows.value = result.data.fields.map((item) => ({ ...item }));
    deletedFieldRowIds.value = [];
    await loadTree(false);
    currentNodeId.value = result.data.config.rowid;
    emit('saved');
  } catch (error: any) {
    const msg = error?.message || String(error);
    ElMessage.error(msg);
    addLog(`保存异常: ${msg}`);
  } finally {
    saveLoading.value = false;
  }
}

watch(
  () => props.schemeId,
  async (value) => {
    resetState();
    if (value) {
      await loadTree(true);
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (props.schemeId) {
    loadTree(true);
  }
});
</script>

<template>
  <div class="import-design-page" :class="{ embedded: props.embedded }">
    <div class="page-header">
      <div>
        <h2>导入配置设计</h2>
        <p class="page-desc">
          左侧维护工作表层级，右侧维护目标表、关联字段、模板路径与字段映射。
        </p>
      </div>
      <div class="header-actions">
        <ElButton :loading="treeLoading" @click="loadTree(true)">刷新配置</ElButton>
        <ElButton @click="createSibling">新建同级</ElButton>
        <ElButton @click="createChild">新建子级</ElButton>
        <ElPopconfirm title="确定删除当前节点吗？" @confirm="removeCurrentNode">
          <template #reference>
            <ElButton type="danger" plain>删除节点</ElButton>
          </template>
        </ElPopconfirm>
        <ElButton type="primary" :loading="saveLoading" @click="saveCurrent">
          保存当前
        </ElButton>
      </div>
    </div>

    <ElAlert type="info" :closable="false" show-icon>
      <template #title>当前方案ID</template>
      <div>{{ props.schemeId || '未选择方案' }}</div>
    </ElAlert>

    <div class="content-grid">
      <ElCard shadow="never" class="tree-card">
        <template #header>
          <div class="card-header">
            <span>配置树</span>
            <ElInput
              v-model="keyword"
              class="tree-search"
              clearable
              placeholder="筛选工作表 / 表名 / 应用"
            />
          </div>
        </template>
        <ElScrollbar height="620px">
          <ElTree
            v-loading="treeLoading"
            :data="filteredTree"
            node-key="rowid"
            default-expand-all
            highlight-current
            empty-text="暂无节点"
            @node-click="handleNodeClick"
          >
            <template #default="{ data }">
              <div class="tree-node">
                <span class="node-title">{{ data.sheetName || '未命名节点' }}</span>
                <ElTag size="small" type="info">
                  {{ data.exportType || 'tree' }}
                </ElTag>
              </div>
            </template>
          </ElTree>
        </ElScrollbar>
      </ElCard>

      <div class="main-panel">
        <ElCard shadow="never" class="config-card">
          <template #header>
            <div class="card-header">
              <span>节点配置</span>
              <span class="sub-text">当前节点：{{ currentConfig.sheetName || '-' }}</span>
            </div>
          </template>

          <ElEmpty v-if="!props.schemeId" description="请先从列表页选择方案" />

          <ElForm v-else label-width="110px" class="config-form">
            <div class="form-grid">
              <ElFormItem label="工作表名称">
                <ElInput
                  v-model="currentConfig.sheetName"
                  placeholder="例如：主表 / 明细表"
                />
              </ElFormItem>
              <ElFormItem label="工作表索引">
                <ElInputNumber
                  v-model="currentConfig.sheet"
                  :min="0"
                  :step="1"
                  controls-position="right"
                  class="full-width"
                />
              </ElFormItem>
              <ElFormItem label="表头行">
                <ElInputNumber
                  v-model="currentConfig.titleIndex"
                  :min="0"
                  :step="1"
                  controls-position="right"
                  class="full-width"
                />
              </ElFormItem>
              <ElFormItem label="数据开始行">
                <ElInputNumber
                  v-model="currentConfig.dataIndex"
                  :min="0"
                  :step="1"
                  controls-position="right"
                  class="full-width"
                />
              </ElFormItem>
              <ElFormItem label="关联应用ID">
                <div class="inline-action-field">
                  <ElInput
                    v-model="currentConfig.relatedappid"
                    placeholder="relatedappid"
                  />
                  <ElButton type="primary" plain @click="handleSelectApp">
                    选择应用
                  </ElButton>
                </div>
              </ElFormItem>
              <ElFormItem label="关联应用名称">
                <ElInput
                  v-model="currentConfig.relatedAppName"
                  placeholder="relatedAppName"
                />
              </ElFormItem>
              <ElFormItem label="目标数据表">
                <div class="inline-action-field">
                  <ElInput
                    v-model="currentConfig.table"
                    placeholder="例如：QYVirtualPlat@Bil_Customer_Info"
                  />
                  <ElButton type="primary" plain @click="handleSelectTargetTable">
                    选择数据表
                  </ElButton>
                </div>
              </ElFormItem>
              <ElFormItem label="目标表描述">
                <ElInput v-model="currentConfig.tableDesc" placeholder="tableDesc" />
              </ElFormItem>
              <ElFormItem label="父表关联字段">
                <ElInput
                  v-model="currentConfig.parentField"
                  placeholder="parentField"
                />
              </ElFormItem>
              <ElFormItem label="父字段描述">
                <ElInput
                  v-model="currentConfig.parentFieldDesc"
                  placeholder="parentFieldDesc"
                />
              </ElFormItem>
              <ElFormItem label="关联字段">
                <ElInput
                  v-model="currentConfig.foreignKeyField"
                  placeholder="foreignKeyField"
                />
              </ElFormItem>
              <ElFormItem label="关联字段描述">
                <ElInput
                  v-model="currentConfig.foreignKeyFieldDesc"
                  placeholder="foreignKeyFieldDesc"
                />
              </ElFormItem>
              <ElFormItem label="导出格式">
                <ElInput v-model="currentConfig.exportType" placeholder="例如：tree" />
              </ElFormItem>
              <ElFormItem label="模板路径">
                <ElInput
                  v-model="currentConfig.templatePath"
                  placeholder="templatePath"
                />
              </ElFormItem>
            </div>
          </ElForm>
        </ElCard>

        <ElCard shadow="never" class="field-card">
          <template #header>
            <div class="card-header">
              <span>字段映射</span>
              <div class="header-actions small">
                <ElButton type="primary" plain @click="addFieldRow">新增字段</ElButton>
              </div>
            </div>
          </template>

          <div class="table-wrap">
            <ElTable :data="fieldRows" border stripe height="320" v-loading="loading">
              <ElTableColumn type="index" width="55" label="#" />
              <ElTableColumn label="字段名" min-width="150">
                <template #default="{ row }">
                  <ElInput v-model="row.name" size="small" placeholder="name" />
                </template>
              </ElTableColumn>
              <ElTableColumn label="标题" min-width="150">
                <template #default="{ row }">
                  <ElInput v-model="row.title" size="small" placeholder="title" />
                </template>
              </ElTableColumn>
              <ElTableColumn label="排序" width="100">
                <template #default="{ row }">
                  <ElInput v-model="row.index" size="small" placeholder="index" />
                </template>
              </ElTableColumn>
              <ElTableColumn label="类型" width="100">
                <template #default="{ row }">
                  <ElInputNumber
                    v-model="row.type"
                    :min="0"
                    :step="1"
                    size="small"
                    class="full-width"
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn label="引用表" min-width="180">
                <template #default="{ row }">
                  <ElInput v-model="row.refTable" size="small" placeholder="refTable" />
                </template>
              </ElTableColumn>
              <ElTableColumn label="引用描述" min-width="180">
                <template #default="{ row }">
                  <ElInput
                    v-model="row.refTableDesc"
                    size="small"
                    placeholder="refTableDesc"
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn label="值字段" min-width="120">
                <template #default="{ row }">
                  <ElInput
                    v-model="row.valueField"
                    size="small"
                    placeholder="valueField"
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn label="文字字段" min-width="120">
                <template #default="{ row }">
                  <ElInput
                    v-model="row.textField"
                    size="small"
                    placeholder="textField"
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn label="过滤字段" min-width="120">
                <template #default="{ row }">
                  <ElInput
                    v-model="row.filterField"
                    size="small"
                    placeholder="filterField"
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn label="过滤值" min-width="120">
                <template #default="{ row }">
                  <ElInput
                    v-model="row.filterValue"
                    size="small"
                    placeholder="filterValue"
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn label="操作" width="90" fixed="right">
                <template #default="{ $index }">
                  <ElButton type="danger" link @click="removeFieldRow($index)">
                    删除
                  </ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
          </div>
        </ElCard>

        <ElCard shadow="never">
          <template #header>
            <div class="card-header">
              <span>执行日志</span>
              <span class="sub-text">最近 {{ logLines.length }} 条</span>
            </div>
          </template>
          <div class="log-panel" v-if="logLines.length">
            <div v-for="(line, index) in logLines" :key="index" class="log-item">
              {{ line }}
            </div>
          </div>
          <ElEmpty v-else description="暂无日志" />
        </ElCard>
      </div>
    </div>

    <AppSelectModal ref="appSelectRef" @confirm="handleAppSelected" />
    <AppDbSelectModal ref="appDbSelectRef" @confirm="handleTargetTableSelected" />
  </div>
</template>

<style scoped>
.import-design-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  overflow: hidden;
}

.import-design-page.embedded {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.page-desc {
  margin: 6px 0 0;
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.header-actions.small {
  gap: 6px;
}

.content-grid {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.tree-card,
.main-panel,
.field-card,
.config-card {
  min-height: 0;
  min-width: 0;
}

.main-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.main-panel > * {
  min-width: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.tree-search {
  width: 180px;
  max-width: 100%;
}

.tree-node {
  width: 100%;
  min-width: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.node-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub-text {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.config-form {
  margin-top: 4px;
  min-width: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 4px 16px;
  min-width: 0;
}

.form-grid :deep(.el-form-item) {
  min-width: 0;
}

.form-grid :deep(.el-form-item__content) {
  min-width: 0;
}

.form-grid :deep(.el-input),
.form-grid :deep(.el-input-number),
.form-grid :deep(.el-input-number .el-input) {
  width: 100%;
}

.inline-action-field {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.inline-action-field :deep(.el-input) {
  width: 100%;
}

.full-width {
  width: 100%;
}

.table-wrap {
  min-width: 0;
  overflow-x: auto;
}

.log-panel {
  max-height: 180px;
  overflow: auto;
  background: #0f172a;
  color: #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
}

.log-item {
  line-height: 1.7;
  word-break: break-all;
}

:deep(.el-card__body) {
  min-width: 0;
  overflow: hidden;
}

@media (max-width: 1600px) {
  .form-grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
}

@media (max-width: 1400px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .inline-action-field {
    grid-template-columns: 1fr;
  }
}
</style>
