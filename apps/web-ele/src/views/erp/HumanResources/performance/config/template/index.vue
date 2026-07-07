<script lang="ts" setup>
import type { HrPerformanceTemplateApi } from '#/api/erp/human-resources/performance/config-template';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  createPerformanceConfigTemplate,
  deletePerformanceConfigTemplate,
  listPerformanceConfigTemplates,
  updatePerformanceConfigTemplate,
} from '#/api/erp/human-resources/performance/config-template';

import {
  ElButton,
  ElCard,
  ElCol,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElRow,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

/** siweiOA 考核模板管理真实迁移页 */
defineOptions({ name: 'HrPerformanceConfigTemplatePage' });

const statusOptions = ['启用', '停用'];

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editing = ref<HrPerformanceTemplateApi.Template | null>(null);
const rows = ref<HrPerformanceTemplateApi.Template[]>([]);

const queryForm = reactive({
  q: '',
  status: 'all',
});

const form = reactive({
  templateCode: '',
  templateName: '',
  assessmentType: '',
  versionNo: 'V1.0',
  status: '启用',
  description: '',
});

async function load() {
  loading.value = true;
  try {
    const data = await listPerformanceConfigTemplates({
      q: queryForm.q.trim() || undefined,
      status: queryForm.status,
    });
    rows.value = Array.isArray(data) ? data : [];
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.templateCode = '';
  form.templateName = '';
  form.assessmentType = '';
  form.versionNo = 'V1.0';
  form.status = '启用';
  form.description = '';
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: HrPerformanceTemplateApi.Template) {
  editing.value = row;
  form.templateCode = row.templateCode || '';
  form.templateName = row.templateName || '';
  form.assessmentType = row.assessmentType || '';
  form.versionNo = row.versionNo || 'V1.0';
  form.status = row.status || '启用';
  form.description = row.description || '';
  dialogOpen.value = true;
}

async function submit() {
  if (!form.templateCode.trim()) {
    ElMessage.warning('请输入模板编号');
    return;
  }
  if (!form.templateName.trim()) {
    ElMessage.warning('请输入模板名称');
    return;
  }
  if (!form.assessmentType.trim()) {
    ElMessage.warning('请输入考核类型');
    return;
  }

  const payload: HrPerformanceTemplateApi.Template = {
    templateCode: form.templateCode,
    templateName: form.templateName,
    assessmentType: form.assessmentType,
    versionNo: form.versionNo || 'V1.0',
    status: form.status,
    description: form.description || '',
  };

  saving.value = true;
  try {
    if (editing.value?.id) await updatePerformanceConfigTemplate(editing.value.id, payload);
    else await createPerformanceConfigTemplate(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: HrPerformanceTemplateApi.Template) {
  if (!row.id) return;
  await ElMessageBox.confirm(`确认删除模板「${row.templateName || row.templateCode || row.id}」吗？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  });
  await deletePerformanceConfigTemplate(row.id);
  ElMessage.success('删除成功');
  await load();
}

onMounted(() => {
  void load();
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-performance-template">
      <div class="page-header">
        <div>
          <h2>考核模板管理</h2>
          <p>维护绩效考核模板、考核类型、版本和启停状态。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input v-model="queryForm.q" clearable placeholder="模板编号 / 模板名称 / 考核类型" style="width: 320px" @keyup.enter="load" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryForm.status" style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option label="启用" value="启用" />
              <el-option label="停用" value="停用" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="load">查询</el-button>
            <el-button
              @click="
                queryForm.q = '';
                queryForm.status = 'all';
                load();
              "
            >
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="card-title">模板列表</div>
        </template>
        <el-table v-loading="loading" :data="rows" row-key="id" border height="100%">
          <el-table-column prop="templateCode" label="模板编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="templateName" label="模板名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="assessmentType" label="考核类型" min-width="140" show-overflow-tooltip />
          <el-table-column prop="versionNo" label="版本" width="100" />
          <el-table-column label="状态" width="100">
            <template #default="{ row = {}} = {}">
              <el-tag :type="row.status === '启用' ? 'success' : 'info'" effect="plain">{{ row.status || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="模板说明" min-width="240" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" width="150">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑考核模板' : '新增考核模板'" width="680px" destroy-on-close>
        <el-form :model="form" label-width="110px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="模板编号" required>
                <el-input v-model="form.templateCode" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="模板名称" required>
                <el-input v-model="form.templateName" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="考核类型" required>
                <el-input v-model="form.assessmentType" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="版本号">
                <el-input v-model="form.versionNo" placeholder="如 V1.0" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态">
                <el-select v-model="form.status" style="width: 100%">
                  <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="模板说明">
                <el-input v-model="form.description" type="textarea" :rows="4" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button :disabled="saving" @click="dialogOpen = false">取消</el-button>
          <el-button :loading="saving" type="primary" @click="submit">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-performance-template {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.page-header p {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
}

.card-title {
  font-weight: 600;
}

.query-card :deep(.el-card__body) {
  padding-bottom: 2px;
}
</style>
