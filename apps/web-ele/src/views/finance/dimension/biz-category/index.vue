<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  createDimensionBizCategory,
  deleteDimensionBizCategory,
  getDimensionBizCategoryList,
  saveDimensionBizCategory,
  type DimensionBizCategoryOption,
} from '#/api/erp/finance/dimension/config';

import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinanceDimensionBizCategoryManage' });

const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const keyword = ref('');
const dialogVisible = ref(false);
const editorMode = ref<'create' | 'edit'>('create');
const currentRow = ref<DimensionBizCategoryOption | null>(null);
const tableData = ref<DimensionBizCategoryOption[]>([]);

const editor = reactive<DimensionBizCategoryOption>({
  rowid: '',
  biz_category_code: '',
  biz_category_name: '',
  status: 1,
  sort_no: 1,
  description: '',
});

const filteredData = computed(() => {
  const text = keyword.value.trim();
  if (!text) return tableData.value;
  return tableData.value.filter((item) =>
    [item.biz_category_code, item.biz_category_name, item.description]
      .filter(Boolean)
      .some((value) => String(value).includes(text)),
  );
});

const dialogTitle = computed(() => (editorMode.value === 'create' ? '新增业务分类' : '编辑业务分类'));

function assignEditor(row: DimensionBizCategoryOption) {
  editor.rowid = String(row.rowid || '');
  editor.biz_category_code = String(row.biz_category_code || '');
  editor.biz_category_name = String(row.biz_category_name || '');
  editor.status = Number(row.status || 0);
  editor.sort_no = Number(row.sort_no || 0);
  editor.description = String(row.description || '');
}

async function loadData(targetRowId?: string) {
  loading.value = true;
  try {
    tableData.value = await getDimensionBizCategoryList({ includeDisabled: true });
    currentRow.value = tableData.value.find((item) => item.rowid === targetRowId) || tableData.value[0] || null;
  } finally {
    loading.value = false;
  }
}

function handleRowClick(row: DimensionBizCategoryOption) {
  currentRow.value = row;
}

async function openCreateEditor() {
  const item = await createDimensionBizCategory();
  assignEditor(item);
  editorMode.value = 'create';
  dialogVisible.value = true;
}

function openEditEditor(row?: DimensionBizCategoryOption) {
  const target = row || currentRow.value;
  if (!target?.rowid) {
    ElMessage.warning('请先选择需要编辑的业务分类');
    return;
  }
  currentRow.value = target;
  assignEditor(target);
  editorMode.value = 'edit';
  dialogVisible.value = true;
}

async function handleDelete(row?: DimensionBizCategoryOption) {
  const target = row || currentRow.value;
  const rowid = String(target?.rowid || '').trim();
  if (!rowid) {
    ElMessage.warning('请先选择需要删除的业务分类');
    return;
  }
  try {
    await ElMessageBox.confirm(
      '确定删除业务分类“' + (target?.biz_category_name || target?.biz_category_code || '该分类') + '”吗？',
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
      },
    );
  } catch (error: any) {
    if (error === 'cancel' || error === 'close' || error?.message === 'cancel') return;
    throw error;
  }
  deleting.value = true;
  try {
    await deleteDimensionBizCategory(rowid);
    ElMessage.success('业务分类已删除');
    await loadData();
  } finally {
    deleting.value = false;
  }
}

async function handleSave() {
  if (!editor.biz_category_code.trim()) {
    ElMessage.warning('请先填写业务分类编码');
    return;
  }
  if (!editor.biz_category_name.trim()) {
    ElMessage.warning('请先填写业务分类名称');
    return;
  }
  saving.value = true;
  try {
    const saved = await saveDimensionBizCategory(
      {
        rowid: editor.rowid,
        biz_category_code: editor.biz_category_code,
        biz_category_name: editor.biz_category_name,
        status: Number(editor.status || 0),
        sort_no: Number(editor.sort_no || 0),
        description: editor.description,
      },
      { forceCreate: editorMode.value === 'create' },
    );
    ElMessage.success(editorMode.value === 'create' ? '业务分类已新增' : '业务分类已保存');
    dialogVisible.value = false;
    await loadData(saved?.rowid || editor.rowid);
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="biz-category-page">
      <ElCard shadow="never">
        <template #header>
          <div class="biz-category-page__header">
            <div>
              <div class="biz-category-page__title">业务分类管理</div>
              <div class="biz-category-page__sub-title">维护维度规则中可选的业务分类字典，供规则编辑页下拉选择使用。</div>
            </div>
            <div class="biz-category-page__toolbar">
              <ElButton type="primary" @click="openCreateEditor">新增业务分类</ElButton>
              <ElButton @click="openEditEditor()">编辑当前分类</ElButton>
              <ElButton type="danger" plain :loading="deleting" @click="handleDelete()">删除当前分类</ElButton>
              <ElInput v-model="keyword" placeholder="搜索分类编码 / 分类名称" clearable class="biz-category-page__search" />
            </div>
          </div>
        </template>

        <ElTable
          v-loading="loading"
          :data="filteredData"
          border
          row-key="rowid"
          highlight-current-row
          @row-click="handleRowClick"
        >
          <ElTableColumn prop="biz_category_code" label="分类编码" min-width="180" />
          <ElTableColumn prop="biz_category_name" label="分类名称" min-width="180" />
          <ElTableColumn prop="sort_no" label="排序号" width="100" />
          <ElTableColumn label="状态" width="100">
            <template #default="{ row }">
              <ElTag :type="Number(row.status) === 1 ? 'success' : 'info'">
                {{ Number(row.status) === 1 ? '启用' : '停用' }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="description" label="说明" min-width="260" />
          <ElTableColumn label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <ElButton type="primary" link @click.stop="openEditEditor(row)">编辑</ElButton>
              <ElButton type="danger" link :loading="deleting && currentRow?.rowid === row.rowid" @click.stop="handleDelete(row)">删除</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>

      <ElDialog v-model="dialogVisible" :title="dialogTitle" width="680px" :close-on-click-modal="false">
        <ElForm label-width="110px">
          <ElFormItem label="分类编码">
            <ElInput v-model="editor.biz_category_code" placeholder="请输入业务分类编码" />
          </ElFormItem>
          <ElFormItem label="分类名称">
            <ElInput v-model="editor.biz_category_name" placeholder="请输入业务分类名称" />
          </ElFormItem>
          <ElFormItem label="排序号">
            <ElInputNumber v-model="editor.sort_no" :min="1" :step="1" class="biz-category-page__full-input" />
          </ElFormItem>
          <ElFormItem label="启用状态">
            <ElSwitch v-model="editor.status" :active-value="1" :inactive-value="0" />
          </ElFormItem>
          <ElFormItem label="说明">
            <ElInput v-model="editor.description" type="textarea" :rows="3" />
          </ElFormItem>
        </ElForm>
        <template #footer>
          <div class="biz-category-page__dialog-footer">
            <ElButton @click="dialogVisible = false">取消</ElButton>
            <ElButton type="primary" :loading="saving" @click="handleSave">{{ editorMode === 'create' ? '保存并新增' : '保存修改' }}</ElButton>
          </div>
        </template>
      </ElDialog>
    </div>
  </Page>
</template>

<style scoped>
.biz-category-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.biz-category-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.biz-category-page__title {
  font-size: 16px;
  font-weight: 600;
}

.biz-category-page__sub-title {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.biz-category-page__toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.biz-category-page__search {
  width: 320px;
}

.biz-category-page__full-input {
  width: 100%;
}

.biz-category-page__dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
