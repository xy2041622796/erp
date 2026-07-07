<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { computed, ref } from 'vue';

import { Document, FolderOpened, RefreshRight, Warning } from '@element-plus/icons-vue';

import { uploadFile } from '#/api/infra/file';
import { checkCompletion, createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/deliverable';
import ProjectPicker from '#/components/project-picker/ProjectPicker.vue';
import { getProjectManageSimpleList } from '#/api/erp/project/manage';
import ProjectSubmoduleCrudPage from '#/views/project/_shared/ProjectSubmoduleCrudPage.vue';
import { normalizeDateFields } from '#/views/project/_shared/crud';

import { deliverableConfig } from './data';

import {
  ElButton,
  ElIcon,
  ElMessage,
  ElMessageBox,
  ElTag,
} from 'element-plus';

interface DeliverableTreeNode {
  key: string;
  label: string;
  query?: string;
  required?: boolean;
  children?: DeliverableTreeNode[];
}

const apis = { listData, getDetail, createData, updateData, deleteData };
const normalizers = {
  afterLoad(values: Record<string, any>) { return normalizeDateFields(values, ['submit_date']); },
  beforeSubmit(values: Record<string, any>) { return normalizeDateFields(values, ['submit_date']); },
};
const projectOptions = ref<Record<string, any>[]>([]);
const selectedProjectId = ref('');
const selectedGroupKey = ref('raw');
const refreshingProjects = ref(false);
const uploadInputRef = ref<HTMLInputElement>();
const uploadRefreshKey = ref(0);
const uploading = ref(false);
const treeData: DeliverableTreeNode[] = [
  { key: 'raw', label: '01_原始数据', query: '原始', required: true, children: [{ key: 'raw-control', label: '外业像控点', query: '像控点', required: true }, { key: 'raw-image', label: '原始影像', query: '影像', required: true }] },
  { key: 'process', label: '02_过程数据', query: '过程', children: [{ key: 'process-check', label: '中间检查文件', query: '检查' }, { key: 'process-draft', label: '编辑草稿', query: '草稿' }] },
  { key: 'result', label: '03_最终成果', query: '成果', required: true, children: [{ key: 'result-map', label: '标准分幅图', query: '分幅图', required: true }, { key: 'result-gdb', label: '矢量数据GDB', query: 'GDB', required: true }, { key: 'result-meta', label: '元数据', query: '元数据', required: true }] },
  { key: 'doc', label: '04_文档', query: '文档', required: true, children: [{ key: 'doc-design', label: '技术设计书', query: '设计书', required: true }, { key: 'doc-report', label: '检查报告', query: '检查报告', required: true }, { key: 'doc-accept', label: '验收意见书', query: '验收意见', required: true }] },
];
function flattenNodes(nodes: DeliverableTreeNode[]) { return nodes.flatMap((node) => [node, ...(node.children ? flattenNodes(node.children) : [])]); }
const flatTreeNodes = flattenNodes(treeData);
const currentNode = computed(() => flatTreeNodes.find((item) => item.key === selectedGroupKey.value) || treeData[0]);
const currentQuery = computed(() => String(currentNode.value?.query || '').trim());
const currentDirectoryQuery = computed(() => `DIR:${selectedGroupKey.value}`);
const gridKey = computed(() => `${selectedProjectId.value || 'empty'}-${selectedGroupKey.value}-${currentDirectoryQuery.value}-${uploadRefreshKey.value}`);
const activeFilterText = computed(() => currentNode.value?.label || '01_原始数据');
const isDirectoryNode = computed(() => Array.isArray(currentNode.value?.children) && currentNode.value.children.length > 0);
async function loadProjects() {
  refreshingProjects.value = true;
  try {
    const rows = await getProjectManageSimpleList();
    projectOptions.value = Array.isArray(rows) ? rows : [];
    if (!selectedProjectId.value && projectOptions.value.length > 0) selectedProjectId.value = String(projectOptions.value[0]?.rowid || '');
  } finally {
    refreshingProjects.value = false;
  }
}
void loadProjects();
function onSelectGroup(key: string) { selectedGroupKey.value = key; }
async function handleCheckCompletion(row: Record<string, any>) {
  const projectId = String(row?.project_id || selectedProjectId.value || '').trim();
  const res = await checkCompletion(projectId);
  const content = res.canComplete ? res.summary : res.summary + '\n\n阻塞项：\n' + res.blockers.map((item: string) => '- ' + item).join('\n');
  await ElMessageBox.alert(content, '项目完成条件检查', { type: res.canComplete ? 'success' : 'warning' });
}

function getFileBaseName(fileName: string) {
  const index = fileName.lastIndexOf('.');
  return index > 0 ? fileName.slice(0, index) : fileName;
}

function getFileExt(fileName: string) {
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index + 1).toUpperCase() : 'FILE';
}

function formatUploadDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function triggerUpload() {
  if (uploading.value) return;
  if (isDirectoryNode.value) {
    ElMessage.warning('父级目录不能上传附件，请选择子级目录');
    return;
  }
  if (!selectedProjectId.value) {
    ElMessage.warning('请先选择项目');
    return;
  }
  uploadInputRef.value?.click();
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!selectedProjectId.value) {
    ElMessage.warning('请先选择项目');
    return;
  }
  uploading.value = true;
  try {
    const uploadRes = await uploadFile({
      file,
      customPath: 'project/deliverable/' + selectedGroupKey.value,
      appType: 'wwwroot',
      isReplace: false,
      isCrossEnt: false,
    });
    const fileUrl = uploadRes.url || uploadRes.filePath || '';
    if (!fileUrl) throw new Error('上传成功但未返回文件地址');
    const baseName = getFileBaseName(file.name);
    await createData({
      project_id: selectedProjectId.value,
      deliverable_code: getFileExt(file.name) + '-' + Date.now(),
      deliverable_name: file.name,
      file_url: fileUrl,
      submit_date: formatUploadDate(),
      status: '已上传',
      remark: '文件大小：' + (file.size / 1024).toFixed(1) + ' KB',
      description: 'DIR:' + selectedGroupKey.value + '; NAME:' + baseName,
    });
    ElMessage.success('上传成功');
    uploadRefreshKey.value++;
  } catch (error: any) {
    console.error('[project-deliverable] upload failed:', error);
    ElMessage.error(error?.message || '上传失败');
  } finally {
    uploading.value = false;
  }
}

function getAttachmentUrl(row: Record<string, any>) {
  return String(row?.file_url || '').trim();
}


function downloadAttachment(row: Record<string, any>) {
  const url = getAttachmentUrl(row);
  if (!url) {
    ElMessage.warning('附件地址为空');
    return;
  }
  const link = document.createElement('a');
  link.href = url;
  link.download = String(row?.deliverable_name || row?.deliverable_code || '附件');
  link.target = '_blank';
  document.body.append(link);
  link.click();
  link.remove();
}

async function deleteAttachment(row: Record<string, any>, refresh?: () => void) {
  const id = String(row?.id || '').trim();
  if (!id) return;
  await ElMessageBox.confirm('确认删除当前附件？', '提示', { type: 'warning' });
  await deleteData(id);
  ElMessage.success('删除成功');
  if (typeof refresh === 'function') refresh();
  else uploadRefreshKey.value++;
}

</script>

<template>
  <div class="deliverable-page">
    <input ref="uploadInputRef" class="deliverable-hidden-upload" type="file" @change="handleFileChange" />
    <div class="deliverable-page__inner">
      <div class="deliverable-hero">
        <div class="deliverable-hero__actions">
<ProjectPicker v-model="selectedProjectId" class="deliverable-project-select" placeholder="请选择项目" />
          <ElButton :loading="refreshingProjects" @click="loadProjects"><ElIcon><RefreshRight /></ElIcon><span>刷新项目</span></ElButton>
        </div>
      </div>

      <div class="deliverable-layout">
        <aside class="deliverable-tree-card">
          <div class="deliverable-tree-card__header">
            <div class="deliverable-tree-card__title">附件目录</div>
            <!-- <div class="deliverable-tree-card__desc">点击左侧目录后，右侧列表只显示该目录下上传的附件。</div> -->
          </div>
          <div class="deliverable-tree">
            <template v-for="node in treeData" :key="node.key">
              <button type="button" class="deliverable-tree__item" :class="{ 'is-active': selectedGroupKey === node.key }" @click="onSelectGroup(node.key)">
                <span class="deliverable-tree__icon"><ElIcon><FolderOpened /></ElIcon></span>
                <span class="deliverable-tree__text">{{ node.label }}</span>
                <span v-if="node.required" class="deliverable-tree__required">*</span>
              </button>
              <button v-for="child in node.children || []" :key="child.key" type="button" class="deliverable-tree__item is-child" :class="{ 'is-active': selectedGroupKey === child.key }" @click="onSelectGroup(child.key)">
                <span class="deliverable-tree__icon"><ElIcon><Document /></ElIcon></span>
                <span class="deliverable-tree__text">{{ child.label }}</span>
                <span v-if="child.required" class="deliverable-tree__required">*</span>
              </button>
            </template>
          </div>
        </aside>

        <section class="deliverable-main-card">
          <div class="deliverable-main-card__header">
            <div>
              <div class="deliverable-main-card__title">{{ activeFilterText }}</div>
            </div>
            <!-- <ElTag type="info" round><ElIcon class="mr-1"><Warning /></ElIcon>附件表，业务仍沿用 web-ele CRUD</ElTag> -->
          </div>

          <div class="deliverable-grid-area">
            <ProjectSubmoduleCrudPage :key="gridKey" :config="deliverableConfig" :apis="apis" :normalizers="normalizers" :project-only-filter="true" :hide-search="true" :hide-header="true" :hide-project-selector="true" :external-project-id="selectedProjectId" :external-query="{ q: currentDirectoryQuery }" :grid-height="520" :table-min-height="520" :add-button-label="isDirectoryNode ? '父级不可上传' : '上传'" :add-button-handler="triggerUpload" :hide-default-row-actions="true">
              <template #row-actions="{ row, refresh }">
                <ElButton type="primary" link @click="downloadAttachment(row)">下载</ElButton>
                <ElButton type="danger" link @click="deleteAttachment(row, refresh)">删除</ElButton>
              </template>
            </ProjectSubmoduleCrudPage>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deliverable-page { min-height: 760px; background: #fff; padding: 0; box-sizing: border-box; }
.deliverable-hidden-upload { display: none; }
.deliverable-page__inner { display: flex; min-height: 0; flex-direction: column; gap: 20px; }
.deliverable-hero,.deliverable-tree-card,.deliverable-main-card { border: 0; border-radius: 0; background: #fff; box-shadow: none; }
.deliverable-hero { display: flex; flex-shrink: 0; justify-content: flex-start; padding: 14px 18px; }
.deliverable-hero__actions { display: flex; width: 100%; align-items: center; justify-content: flex-start; gap: 14px; }
.deliverable-project-select { width: 50%; min-width: 640px; max-width: calc(100% - 130px); }
.deliverable-project-select :deep(.el-select__wrapper),
.deliverable-project-select :deep(.el-input__wrapper) { min-height: 44px; font-size: 15px; }
.deliverable-layout { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 20px; align-items: start; }
.deliverable-tree-card { min-height: max-content; overflow: visible; padding: 10px 12px; align-self: start; }
.deliverable-tree-card__header { padding: 4px 6px 8px; }
.deliverable-tree-card__title { color: #0f172a; font-size: 16px; font-weight: 600; }
.deliverable-tree-card__desc { margin-top: 4px; color: #64748b; font-size: 12px; line-height: 16px; }
.deliverable-tree { display: flex; overflow: visible; flex-direction: column; gap: 4px; }
.deliverable-tree__item { display: flex; width: 100%; align-items: center; gap: 8px; border: none; border-radius: 12px; background: transparent; padding: 7px 10px; color: #0f172a; font-size: 13px; line-height: 18px; text-align: left; cursor: pointer; transition: all 0.2s ease; }
.deliverable-tree__item:hover { background: #f8fafc; }
.deliverable-tree__item.is-active { background: #eef4ff; color: #2563eb; }
.deliverable-tree__item.is-child { padding-left: 30px; }
.deliverable-tree__icon { display: inline-flex; align-items: center; color: #64748b; }
.deliverable-tree__item.is-active .deliverable-tree__icon { color: #2563eb; }
.deliverable-tree__text { flex: 1; min-width: 0; }
.deliverable-tree__required { color: #f43f5e; font-weight: 700; }
.deliverable-main-card { display: flex; min-width: 0; overflow: hidden; flex-direction: column; }
.deliverable-main-card__header { display: flex; flex-shrink: 0; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--el-border-color-lighter); padding: 14px 20px; }
.deliverable-main-card__title { color: #0f172a; font-size: 18px; font-weight: 600; }
.deliverable-grid-area { min-height: 520px; overflow: hidden; }
.deliverable-grid-area :deep(.project-fixed-page),
.deliverable-grid-area :deep(.vben-page) { background: #fff; padding: 0; }
.deliverable-grid-area :deep(.el-card.project-submodule-card),
.deliverable-grid-area :deep(.project-submodule-table-card),
.deliverable-grid-area :deep(.project-grid-fill-card) { border: none; border-radius: 0; background: #fff; box-shadow: none; }
.deliverable-grid-area :deep(.project-submodule-table-card .el-card__body) { padding: 0; }
@media (max-width: 1200px) { .deliverable-layout { grid-template-columns: 1fr; } }
@media (max-width: 768px) {
  .deliverable-page { min-height: 0; padding: 16px; }
  .deliverable-hero,.deliverable-main-card__header { flex-direction: column; align-items: stretch; }
  .deliverable-hero__actions { flex-direction: column; align-items: stretch; }
  .deliverable-project-select { width: 100%; }
}
</style>
