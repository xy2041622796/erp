<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { RefreshRight } from '@element-plus/icons-vue';

import {
  createEmptyDimensionDictItem,
  createEmptyDimensionDictType,
  deleteDimensionDictItem,
  deleteDimensionDictType,
  getDimensionDictItemList,
  getDimensionDictTypeList,
  saveDimensionDictItem,
  saveDimensionDictType,
  type DimensionDictItem,
  type DimensionDictType,
} from '#/api/erp/finance/dimension/dict';

import {
  ElButton,
  ElCard,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ManagementsysDimensionDict' });

const loading = ref(false);
const itemLoading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const typeKeyword = ref('');
const itemKeyword = ref('');
const currentType = ref<DimensionDictType | null>(null);
const typeRows = ref<DimensionDictType[]>([]);
const itemRows = ref<DimensionDictItem[]>([]);
const typeEditorVisible = ref(false);
const itemEditorVisible = ref(false);
const typeEditorMode = ref<'create' | 'edit'>('create');
const itemEditorMode = ref<'create' | 'edit'>('create');

const typeEditor = reactive<DimensionDictType>(createEmptyDimensionDictType());
const itemEditor = reactive<DimensionDictItem>(createEmptyDimensionDictItem());

const filteredTypeRows = computed(() => {
  const keyword = typeKeyword.value.trim().toLowerCase();
  if (!keyword) return typeRows.value;
  return typeRows.value.filter((item) => [
    item.dict_type_code,
    item.dict_type_name,
    item.description,
  ].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword)));
});

const filteredItemRows = computed(() => {
  const keyword = itemKeyword.value.trim().toLowerCase();
  if (!keyword) return itemRows.value;
  return itemRows.value.filter((item) => [
    item.item_code,
    item.item_name,
    item.item_value,
    item.parent_code,
    item.description,
  ].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword)));
});

const typeOptions = computed(() => typeRows.value.map((item) => ({
  label: `${item.dict_type_name || item.dict_type_code}（${item.dict_type_code}）`,
  value: item.dict_type_code,
})));

const parentCodeOptions = computed(() => {
  const values = new Set<string>();
  for (const item of itemRows.value) {
    const value = String(item.parent_code || '').trim();
    if (value) values.add(value);
  }
  return Array.from(values).map((value) => ({ label: value, value }));
});

function bitText(value: any) {
  return Number(value || 0) === 1 ? '是' : '否';
}

function assignTypeEditor(row: DimensionDictType) {
  Object.assign(typeEditor, {
    rowid: row.rowid || '',
    dict_type_code: row.dict_type_code || '',
    dict_type_name: row.dict_type_name || '',
    description: row.description || '',
    sort_no: Number(row.sort_no || 1),
    status: Number(row.status || 0),
    builtin_flag: Number(row.builtin_flag || 0),
    account_set_id: row.account_set_id || '',
    lingma_sys_ent: row.lingma_sys_ent || '',
  });
}

function assignItemEditor(row: DimensionDictItem) {
  Object.assign(itemEditor, {
    rowid: row.rowid || '',
    dict_type_code: row.dict_type_code || currentType.value?.dict_type_code || '',
    item_code: row.item_code || '',
    item_name: row.item_name || '',
    item_value: row.item_value || '',
    parent_code: row.parent_code || '',
    description: row.description || '',
    sort_no: Number(row.sort_no || 1),
    status: Number(row.status || 0),
    builtin_flag: Number(row.builtin_flag || 0),
    account_set_id: row.account_set_id || '',
    lingma_sys_ent: row.lingma_sys_ent || '',
  });
}

async function loadTypes(targetTypeCode?: string) {
  loading.value = true;
  try {
    typeRows.value = await getDimensionDictTypeList(true);
    const next = typeRows.value.find((item) => item.dict_type_code === targetTypeCode)
      || (currentType.value ? typeRows.value.find((item) => item.rowid === currentType.value?.rowid) : null)
      || typeRows.value[0]
      || null;
    currentType.value = next;
    await loadItems();
  } finally {
    loading.value = false;
  }
}

async function loadItems() {
  itemLoading.value = true;
  try {
    itemRows.value = await getDimensionDictItemList({
      dict_type_code: currentType.value?.dict_type_code || '',
      includeDisabled: true,
    });
  } finally {
    itemLoading.value = false;
  }
}

function handleTypeRowClick(row: DimensionDictType) {
  currentType.value = row;
  itemKeyword.value = '';
  void loadItems();
}

function openCreateType() {
  assignTypeEditor(createEmptyDimensionDictType());
  typeEditorMode.value = 'create';
  typeEditorVisible.value = true;
}

function openEditType(row?: DimensionDictType) {
  const target = row || currentType.value;
  if (!target) {
    ElMessage.warning('请先选择字典类型');
    return;
  }
  assignTypeEditor(target);
  typeEditorMode.value = 'edit';
  typeEditorVisible.value = true;
}

function openCreateItem() {
  if (!currentType.value?.dict_type_code) {
    ElMessage.warning('请先选择字典类型');
    return;
  }
  assignItemEditor(createEmptyDimensionDictItem(currentType.value.dict_type_code));
  itemEditorMode.value = 'create';
  itemEditorVisible.value = true;
}

function openEditItem(row: DimensionDictItem) {
  assignItemEditor(row);
  itemEditorMode.value = 'edit';
  itemEditorVisible.value = true;
}

async function handleSaveType() {
  const code = String(typeEditor.dict_type_code || '').trim();
  const name = String(typeEditor.dict_type_name || '').trim();
  if (!code || !name) {
    ElMessage.warning('请填写字典类型编码和名称');
    return;
  }
  saving.value = true;
  try {
    await saveDimensionDictType({ ...typeEditor }, { forceCreate: typeEditorMode.value === 'create' });
    ElMessage.success(typeEditorMode.value === 'create' ? '字典类型已新增' : '字典类型已保存');
    typeEditorVisible.value = false;
    await loadTypes(code);
  } finally {
    saving.value = false;
  }
}

async function handleSaveItem() {
  const typeCode = String(itemEditor.dict_type_code || '').trim();
  const itemCode = String(itemEditor.item_code || '').trim();
  const itemName = String(itemEditor.item_name || '').trim();
  if (!typeCode || !itemCode || !itemName) {
    ElMessage.warning('请填写字典类型、字典项编码和名称');
    return;
  }
  saving.value = true;
  try {
    await saveDimensionDictItem({ ...itemEditor }, { forceCreate: itemEditorMode.value === 'create' });
    ElMessage.success(itemEditorMode.value === 'create' ? '字典项已新增' : '字典项已保存');
    itemEditorVisible.value = false;
    await loadItems();
  } finally {
    saving.value = false;
  }
}

async function handleDeleteType(row?: DimensionDictType) {
  const target = row || currentType.value;
  if (!target?.rowid) {
    ElMessage.warning('请先选择字典类型');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定删除字典类型“${target.dict_type_name || target.dict_type_code}”吗？请确认该类型下字典项已不再使用。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' },
    );
  } catch (error: any) {
    if (error === 'cancel' || error === 'close' || error?.message === 'cancel') return;
    throw error;
  }
  deleting.value = true;
  try {
    await deleteDimensionDictType(target.rowid);
    ElMessage.success('字典类型已删除');
    if (currentType.value?.rowid === target.rowid) currentType.value = null;
    await loadTypes();
  } finally {
    deleting.value = false;
  }
}

async function handleDeleteItem(row: DimensionDictItem) {
  if (!row?.rowid) return;
  try {
    await ElMessageBox.confirm(
      `确定删除字典项“${row.item_name || row.item_code}”吗？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' },
    );
  } catch (error: any) {
    if (error === 'cancel' || error === 'close' || error?.message === 'cancel') return;
    throw error;
  }
  deleting.value = true;
  try {
    await deleteDimensionDictItem(row.rowid);
    ElMessage.success('字典项已删除');
    await loadItems();
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  void loadTypes();
});
</script>

<template>
  <Page auto-content-height>
    <div class="dict-page">
      <ElCard shadow="never">
        <template #header>
          <div class="dict-page__header">
            <div>
              <div class="dict-page__title">维度字典管理</div>
              <div class="dict-page__sub-title">维护维度规则页面使用的业务分类、事件编码、维度分类、维度编码、运算符、取值方式、币种等字典。</div>
            </div>
            <div class="dict-page__toolbar">
              <ElButton :icon="RefreshRight" :loading="loading || itemLoading" @click="loadTypes()">刷新</ElButton>
            </div>
          </div>
        </template>

        <div class="dict-page__layout">
          <div class="dict-page__left">
            <div class="dict-page__panel-toolbar">
              <ElInput v-model="typeKeyword" placeholder="搜索字典类型" clearable />
              <ElButton type="primary" @click="openCreateType">新增类型</ElButton>
            </div>
            <ElTable
              v-loading="loading"
              :data="filteredTypeRows"
              border
              height="640"
              highlight-current-row
              row-key="rowid"
              @row-click="handleTypeRowClick"
            >
              <ElTableColumn prop="dict_type_code" label="类型编码" min-width="190" />
              <ElTableColumn prop="dict_type_name" label="类型名称" min-width="140" />
              <ElTableColumn label="状态" width="80">
                <template #default="{ row }">
                  <ElTag :type="Number(row.status) === 1 ? 'success' : 'info'">{{ Number(row.status) === 1 ? '启用' : '停用' }}</ElTag>
                </template>
              </ElTableColumn>
              <ElTableColumn label="操作" width="120" fixed="right">
                <template #default="{ row }">
                  <ElButton type="primary" link @click.stop="openEditType(row)">编辑</ElButton>
                  <ElButton type="danger" link :loading="deleting" @click.stop="handleDeleteType(row)">删除</ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
          </div>

          <div class="dict-page__right">
            <div class="dict-page__panel-toolbar">
              <div class="dict-page__current-type">
                当前类型：
                <ElTag v-if="currentType" type="success">{{ currentType.dict_type_name }} / {{ currentType.dict_type_code }}</ElTag>
                <ElTag v-else type="info">未选择</ElTag>
              </div>
              <div class="dict-page__item-actions">
                <ElInput v-model="itemKeyword" placeholder="搜索字典项" clearable class="dict-page__item-search" />
                <ElButton type="primary" @click="openCreateItem">新增字典项</ElButton>
              </div>
            </div>

            <ElEmpty v-if="!itemLoading && !currentType" description="请选择左侧字典类型" />
            <ElTable
              v-else
              v-loading="itemLoading"
              :data="filteredItemRows"
              border
              height="640"
              row-key="rowid"
            >
              <ElTableColumn prop="item_code" label="字典项编码" min-width="180" />
              <ElTableColumn prop="item_name" label="字典项名称" min-width="150" />
              <ElTableColumn prop="item_value" label="字典项值" min-width="150" />
              <ElTableColumn prop="parent_code" label="父级编码" min-width="130" />
              <ElTableColumn prop="sort_no" label="排序" width="80" align="right" />
              <ElTableColumn label="内置" width="80">
                <template #default="{ row }">{{ bitText(row.builtin_flag) }}</template>
              </ElTableColumn>
              <ElTableColumn label="状态" width="90">
                <template #default="{ row }">
                  <ElTag :type="Number(row.status) === 1 ? 'success' : 'info'">{{ Number(row.status) === 1 ? '启用' : '停用' }}</ElTag>
                </template>
              </ElTableColumn>
              <ElTableColumn prop="description" label="说明" min-width="220" show-overflow-tooltip />
              <ElTableColumn label="操作" width="130" fixed="right">
                <template #default="{ row }">
                  <ElButton type="primary" link @click="openEditItem(row)">编辑</ElButton>
                  <ElButton type="danger" link :loading="deleting" @click="handleDeleteItem(row)">删除</ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
          </div>
        </div>
      </ElCard>
    </div>

    <ElDialog v-model="typeEditorVisible" :title="typeEditorMode === 'create' ? '新增字典类型' : '编辑字典类型'" width="720px" append-to-body>
      <ElForm label-width="110px">
        <ElFormItem label="类型编码" required>
          <ElInput v-model="typeEditor.dict_type_code" placeholder="例如 DIM_CODE" :disabled="typeEditorMode === 'edit'" />
        </ElFormItem>
        <ElFormItem label="类型名称" required>
          <ElInput v-model="typeEditor.dict_type_name" placeholder="例如 维度编码" />
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInputNumber v-model="typeEditor.sort_no" :min="1" class="dict-page__full-input" />
        </ElFormItem>
        <ElFormItem label="启用">
          <ElSwitch v-model="typeEditor.status" :active-value="1" :inactive-value="0" />
        </ElFormItem>
        <ElFormItem label="内置">
          <ElSwitch v-model="typeEditor.builtin_flag" :active-value="1" :inactive-value="0" />
        </ElFormItem>
        <ElFormItem label="说明">
          <ElInput v-model="typeEditor.description" type="textarea" :rows="3" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <div class="dict-page__dialog-footer">
          <ElButton @click="typeEditorVisible = false">取消</ElButton>
          <ElButton type="primary" :loading="saving" @click="handleSaveType">保存</ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDialog v-model="itemEditorVisible" :title="itemEditorMode === 'create' ? '新增字典项' : '编辑字典项'" width="760px" append-to-body>
      <ElForm label-width="110px">
        <ElFormItem label="字典类型" required>
          <ElSelect v-model="itemEditor.dict_type_code" filterable class="dict-page__full-input" :disabled="itemEditorMode === 'edit'">
            <ElOption v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="字典项编码" required>
          <ElInput v-model="itemEditor.item_code" placeholder="例如 CUSTOMER" :disabled="itemEditorMode === 'edit'" />
        </ElFormItem>
        <ElFormItem label="字典项名称" required>
          <ElInput v-model="itemEditor.item_name" placeholder="例如 客户" />
        </ElFormItem>
        <ElFormItem label="字典项值">
          <ElInput v-model="itemEditor.item_value" placeholder="通常与编码一致，可按业务需要填写" />
        </ElFormItem>
        <ElFormItem label="父级编码">
          <ElSelect v-model="itemEditor.parent_code" filterable allow-create clearable class="dict-page__full-input" placeholder="例如 FINANCIAL / BIZ / ANALYSIS">
            <ElOption v-for="item in parentCodeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInputNumber v-model="itemEditor.sort_no" :min="1" class="dict-page__full-input" />
        </ElFormItem>
        <ElFormItem label="启用">
          <ElSwitch v-model="itemEditor.status" :active-value="1" :inactive-value="0" />
        </ElFormItem>
        <ElFormItem label="内置">
          <ElSwitch v-model="itemEditor.builtin_flag" :active-value="1" :inactive-value="0" />
        </ElFormItem>
        <ElFormItem label="说明">
          <ElInput v-model="itemEditor.description" type="textarea" :rows="3" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <div class="dict-page__dialog-footer">
          <ElButton @click="itemEditorVisible = false">取消</ElButton>
          <ElButton type="primary" :loading="saving" @click="handleSaveItem">保存</ElButton>
        </div>
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
.dict-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dict-page__header,
.dict-page__panel-toolbar,
.dict-page__dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dict-page__title {
  font-size: 16px;
  font-weight: 600;
}

.dict-page__sub-title {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.dict-page__layout {
  display: grid;
  grid-template-columns: 520px minmax(0, 1fr);
  gap: 12px;
}

.dict-page__left,
.dict-page__right {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dict-page__current-type {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.dict-page__item-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dict-page__item-search {
  width: 260px;
}

.dict-page__full-input {
  width: 100%;
}

@media (max-width: 1280px) {
  .dict-page__layout {
    grid-template-columns: 1fr;
  }
}
</style>
