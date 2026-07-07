<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ArchiveCategory, ArchiveFile } from './api';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { downloadFileFromBlobPart } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import QB from '#/api/qyapi';

import {
  ARCHIVES_FORM_ID,
  ATTACHMENT_CATEGORY_FIELD,
  ATTACHMENT_OWNER_TYPE,
  createArchiveCategory,
  createArchiveFile,
  deleteArchiveCategory,
  deleteArchiveFile,
  downloadArchiveFile,
  getArchiveCategories,
  getArchiveFiles,
  getCurrentAccountSetId,
  ROOT_PARENT_ID,
  updateArchiveCategory,
  uploadArchiveFile,
} from './api';
import {
  buildTreeData,
  formatFileSize,
  getFileExtension,
  splitArchivePath,
  useFileGridColumns,
} from './data';
import TreeModal from './tree-modal.vue';

import {
  ElButton,
  ElCard,
  ElDialog,
  ElEmpty,
  ElMessage,
  ElMessageBox,
  ElScrollbar,
  ElTree,
} from 'element-plus';

const MAX_FILE_SIZE = 524_288_000;
const ALLOWED_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'pdf']);

const userStore = useUserStore();
const categoryRows = ref<ArchiveCategory[]>([]);
const selectedCategory = ref<ArchiveCategory | null>(null);
const categoryLoading = ref(false);
const fileTable = ref<any>(null);
const treeModalVisible = ref(false);
const treeModalMode = ref<'add' | 'edit'>('add');
const uploadLoading = ref(false);

const treeData = computed(() => buildTreeData(categoryRows.value));
const selectedCategoryName = computed(() => selectedCategory.value?.Name || '未选择');

function getCurrentUserId() {
  const info = (userStore.userInfo || {}) as any;
  const raw = (info.rawUserInfo || {}) as any;
  return String(
    info.userId || info.id || info.rowid || raw.ROWID || raw.rowid || info.username || '',
  ).trim();
}

function getCurrentUserName() {
  const info = (userStore.userInfo || {}) as any;
  const raw = (info.rawUserInfo || {}) as any;
  return String(
    info.nickname || raw.UserName || raw.userName || raw.Name || raw.name || info.username || getCurrentUserId(),
  ).trim();
}

function getUploadUserDisplayName(row: ArchiveFile) {
  const value = String(row.createuser || '').trim();
  if (!value) return '-';
  if (value === getCurrentUserId()) return getCurrentUserName();
  return value;
}

function nowString() {
  const pad = (num: number) => String(num).padStart(2, '0');
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function loadCategories() {
  categoryLoading.value = true;
  try {
    const result = await getArchiveCategories();
    categoryRows.value = result.list || [];
    if (!selectedCategory.value && categoryRows.value.length > 0) {
      selectedCategory.value = categoryRows.value[0] || null;
    } else if (selectedCategory.value) {
      selectedCategory.value =
        categoryRows.value.find(
          (item) => item.rowid === selectedCategory.value?.rowid,
        ) || null;
    }
    fileGridApi.query();
  } finally {
    categoryLoading.value = false;
  }
}

function handleCategoryClick(row: ArchiveCategory) {
  selectedCategory.value = row;
  fileGridApi.query();
}

function openAddCategory() {
  treeModalMode.value = 'add';
  treeModalVisible.value = true;
}

function openEditCategory() {
  if (!selectedCategory.value) {
    ElMessage.warning('请先选择要编辑的分类');
    return;
  }
  treeModalMode.value = 'edit';
  treeModalVisible.value = true;
}

async function handleSaveCategory(name: string) {
  const current = selectedCategory.value;
  if (treeModalMode.value === 'add') {
    await createArchiveCategory({
      rowid: QB.GetNewGUID(),
      Name: name,
      Prowid: current?.rowid || ROOT_PARENT_ID,
      type: current?.type ?? 0,
      account_set_id: getCurrentAccountSetId(),
      createuser: getCurrentUserName(),
      createtime: nowString(),
    });
    ElMessage.success('新增分类成功');
  } else {
    if (!current) {
      ElMessage.warning('请先选择要编辑的分类');
      return;
    }
    await updateArchiveCategory({ rowid: current.rowid, Name: name });
    ElMessage.success('编辑分类成功');
  }
  treeModalVisible.value = false;
  await loadCategories();
}

async function handleDeleteCategory() {
  const current = selectedCategory.value;
  if (!current) {
    ElMessage.warning('请先选择要删除的分类');
    return;
  }
  const hasChild = categoryRows.value.some((item) => item.Prowid === current.rowid);
  if (hasChild) {
    ElMessage.warning('该分类存在子级分类，不允许删除');
    return;
  }
  const files = await getArchiveFiles({ categoryId: current.rowid, pageNo: 1, page: 1 });
  if ((files.total || files.list.length) > 0) {
    ElMessage.warning('该分类下存在附件，不允许删除');
    return;
  }
  await ElMessageBox.confirm(`确认删除分类【${current.Name || '-'}】吗？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  });
  await deleteArchiveCategory(current.rowid);
  ElMessage.success('删除分类成功');
  selectedCategory.value = null;
  await loadCategories();
}

function validateUploadFile(file: File) {
  if (!selectedCategory.value) {
    ElMessage.warning('请先选择分类');
    return false;
  }
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    ElMessage.warning('只允许上传 .doc、.docx、.xls、.xlsx、.pdf 文件');
    return false;
  }
  if (file.size > MAX_FILE_SIZE) {
    ElMessage.warning('文件大小不能超过 524288000 字节');
    return false;
  }
  return true;
}

function handleUpload() {
  if (!selectedCategory.value) {
    ElMessage.warning('请先选择分类');
    return;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.doc,.docx,.xls,.xlsx,.pdf';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file || !validateUploadFile(file)) return;
    uploadLoading.value = true;
    try {
      const uploadResult = await uploadArchiveFile(file);
      await createArchiveFile({
        id: QB.GetNewGUID(),
        file_name: file.name,
        file_path: uploadResult.filePath,
        file_size: file.size,
        file_type: getFileExtension(file.name),
        [ATTACHMENT_CATEGORY_FIELD]: selectedCategory.value?.rowid,
        owner_type: ATTACHMENT_OWNER_TYPE,
        account_set_id: getCurrentAccountSetId(),
        createuser: getCurrentUserName(),
        createtime: nowString(),
        lingma_sys_is_delete: 0,
      } as ArchiveFile);
      ElMessage.success('上传成功');
      fileGridApi.query();
    } finally {
      uploadLoading.value = false;
      input.value = '';
    }
  };
  input.click();
}

async function handlePreview(row: ArchiveFile) {
  if (!row.file_path) {
    ElMessage.warning('文件路径为空，无法预览');
    return;
  }
  try {
    const { fileName } = splitArchivePath(row.file_path);
    const blob = await downloadArchiveFile(row.file_name || fileName, row.file_path);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    console.error('预览附件失败:', error);
    ElMessage.error('预览附件失败');
  }
}

async function handleDownload(row: ArchiveFile) {
  if (!row.file_path || !row.file_name) {
    ElMessage.warning('附件信息不完整，无法下载');
    return;
  }
  const blob = await downloadArchiveFile(row.file_name, row.file_path);
  downloadFileFromBlobPart({ fileName: row.file_name, source: blob });
}

async function handleDeleteFile(row: ArchiveFile) {
  await deleteArchiveFile(row.id);
  ElMessage.success('删除附件成功');
  fileGridApi.query();
}

function handleExport() {
  const rows = (fileTable.value?.items || []) as ArchiveFile[];
  if (rows.length === 0) {
    ElMessage.warning('暂无可导出的附件数据');
    return;
  }
  const header = ['文件名称', '类型', '大小', '上传人', '上传时间', '存储路径'];
  const body = rows.map((row) => [
    row.file_name || '',
    row.file_type || '',
    String(row.file_size || ''),
    getUploadUserDisplayName(row),
    row.createtime || '',
    row.file_path || '',
  ]);
  const csv = [header, ...body]
    .map((line) => line.map((item) => `"${String(item).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  downloadFileFromBlobPart({ fileName: '档案资料附件.csv', source: blob });
}

function buildRowActions(row: ArchiveFile): any[] {
  return [
    {
      label: '预览',
      type: 'primary',
      link: true,
      icon: ACTION_ICON.VIEW,
      onClick: () => handlePreview(row),
    },
    {
      label: '下载',
      type: 'primary',
      link: true,
      onClick: () => handleDownload(row),
    },
    {
      label: '删除',
      type: 'danger',
      link: true,
      icon: ACTION_ICON.DELETE,
      popConfirm: {
        title: `确认删除附件【${row.file_name || '-'}】吗？`,
        confirm: () => handleDeleteFile(row),
      },
    },
  ];
}

const [FileGrid, fileGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useFileGridColumns(),
    height: '100%',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }) => {
          if (!selectedCategory.value) {
            return { list: [], total: 0 };
          }
          const response = await getArchiveFiles({
            categoryId: selectedCategory.value.rowid,
            pageNo: page.currentPage,
            page: page.page,
          });
          fileTable.value = response.dataTable;
          return response;
        },
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, zoom: true, custom: true },
  } as VxeTableGridOptions<ArchiveFile>,
});

onMounted(() => {
  loadCategories();
});
</script>

<template>
  <Page auto-content-height :title="'档案资料管理 / 资料管理'">
    <div class="archives-page-layout flex h-full min-h-0 gap-4">
      <ElCard class="archives-tree-card w-[300px] shrink-0" shadow="never">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium">资料分类树</span>
          </div>
        </template>
        <div class="mb-3 flex flex-wrap gap-2">
          <ElButton size="small" type="primary" @click="openAddCategory">新增分类</ElButton>
          <ElButton size="small" @click="openEditCategory">编辑分类</ElButton>
          <ElButton size="small" type="danger" @click="handleDeleteCategory">删除分类</ElButton>
        </div>
        <ElScrollbar height="calc(100vh - 255px)">
          <ElTree
            v-if="treeData.length > 0"
            v-loading="categoryLoading"
            :data="treeData"
            :expand-on-click-node="false"
            :props="{ label: 'Name', children: 'children' }"
            default-expand-all
            highlight-current
            node-key="rowid"
            @node-click="handleCategoryClick"
          />
          <ElEmpty v-else description="暂无分类" />
        </ElScrollbar>
      </ElCard>

      <ElCard class="archives-file-card min-w-0 flex-1" shadow="never">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="font-medium">资料文件列表</div>
              <div class="mt-1 text-xs text-gray-500">
                当前分类：{{ selectedCategoryName }}
              </div>
            </div>
            <div class="flex gap-2">
              <ElButton type="primary" :loading="uploadLoading" @click="handleUpload">上传</ElButton>
              <ElButton @click="handleExport">导出</ElButton>
            </div>
          </div>
        </template>
        <div class="archives-file-grid">
          <FileGrid>
            <template #fileName="{ row }">
            <ElButton type="primary" link @click="handlePreview(row)">
              {{ row.file_name || '-' }}
            </ElButton>
          </template>
            <template #fileSize="{ row }">
              {{ formatFileSize(row.file_size) }}
            </template>
            <template #uploadUser="{ row }">
              {{ getUploadUserDisplayName(row) }}
            </template>
            <template #actions="{ row }">
              <TableAction :actions="buildRowActions(row)" />
            </template>
          </FileGrid>
        </div>
      </ElCard>
    </div>

    <ElDialog
      v-model="treeModalVisible"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <TreeModal
        :mode="treeModalMode"
        :initial-name="treeModalMode === 'edit' ? selectedCategory?.Name : ''"
        :parent-name="selectedCategory?.Name || '顶级分类'"
        @close="treeModalVisible = false"
        @submit="handleSaveCategory"
      />
    </ElDialog>
  </Page>
</template>


<style scoped>
.archives-page-layout {
  overflow: hidden;
}

:deep(.archives-tree-card),
:deep(.archives-file-card) {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

:deep(.archives-tree-card > .el-card__body),
:deep(.archives-file-card > .el-card__body) {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

:deep(.archives-file-card > .el-card__body) {
  display: flex;
  flex-direction: column;
}

.archives-file-grid {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.archives-file-grid :deep(.vben-vxe-grid),
.archives-file-grid :deep(.vxe-grid),
.archives-file-grid :deep(.vxe-table) {
  height: 100%;
}
</style>
