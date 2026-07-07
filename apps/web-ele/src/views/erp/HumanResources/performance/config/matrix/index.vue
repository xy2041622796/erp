<script lang="ts" setup>
import type { HrPerformanceMatrixApi } from '#/api/erp/human-resources/performance/config-matrix';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  createPerformanceConfigMatrix,
  deletePerformanceConfigMatrix,
  listPerformanceConfigMatrixes,
  updatePerformanceConfigMatrix,
} from '#/api/erp/human-resources/performance/config-matrix';

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

/** siweiOA 关系矩阵定义真实迁移页 */
defineOptions({ name: 'HrPerformanceConfigMatrixPage' });

const statusOptions = ['启用', '停用'];

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editing = ref<HrPerformanceMatrixApi.Matrix | null>(null);
const rows = ref<HrPerformanceMatrixApi.Matrix[]>([]);

const queryForm = reactive({
  q: '',
  status: 'all',
});

const form = reactive({
  matrixCode: '',
  evaluatorRole: '',
  evaluateeRole: '',
  weight: '',
  status: '启用',
  description: '',
});

async function load() {
  loading.value = true;
  try {
    const data = await listPerformanceConfigMatrixes({
      q: queryForm.q.trim() || undefined,
      status: queryForm.status,
    });
    rows.value = Array.isArray(data) ? data : [];
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.matrixCode = '';
  form.evaluatorRole = '';
  form.evaluateeRole = '';
  form.weight = '';
  form.status = '启用';
  form.description = '';
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: HrPerformanceMatrixApi.Matrix) {
  editing.value = row;
  form.matrixCode = row.matrixCode || '';
  form.evaluatorRole = row.evaluatorRole || '';
  form.evaluateeRole = row.evaluateeRole || '';
  form.weight = String(row.weight ?? '');
  form.status = row.status || '启用';
  form.description = row.description || '';
  dialogOpen.value = true;
}

async function submit() {
  if (!form.matrixCode.trim()) {
    ElMessage.warning('请输入矩阵编号');
    return;
  }
  if (!form.evaluatorRole.trim()) {
    ElMessage.warning('请输入评价角色');
    return;
  }
  if (!form.evaluateeRole.trim()) {
    ElMessage.warning('请输入被评价角色');
    return;
  }

  const payload: HrPerformanceMatrixApi.Matrix = {
    matrixCode: form.matrixCode,
    evaluatorRole: form.evaluatorRole,
    evaluateeRole: form.evaluateeRole,
    weight: form.weight || '',
    status: form.status,
    description: form.description || '',
  };

  saving.value = true;
  try {
    if (editing.value?.id) await updatePerformanceConfigMatrix(editing.value.id, payload);
    else await createPerformanceConfigMatrix(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: HrPerformanceMatrixApi.Matrix) {
  if (!row.id) return;
  await ElMessageBox.confirm(`确认删除矩阵「${row.matrixCode || row.id}」吗？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  });
  await deletePerformanceConfigMatrix(row.id);
  ElMessage.success('删除成功');
  await load();
}

onMounted(() => {
  void load();
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-performance-matrix">
      <div class="page-header">
        <div>
          <h2>关系矩阵定义</h2>
          <p>维护评价角色、被评价角色、权重和矩阵启停状态。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input v-model="queryForm.q" clearable placeholder="矩阵编号 / 评价角色 / 被评价角色" style="width: 320px" @keyup.enter="load" />
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
          <div class="card-title">关系矩阵列表</div>
        </template>
        <el-table v-loading="loading" :data="rows" row-key="id" border height="100%">
          <el-table-column prop="matrixCode" label="矩阵编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="evaluatorRole" label="评价角色" min-width="150" show-overflow-tooltip />
          <el-table-column prop="evaluateeRole" label="被评价角色" min-width="150" show-overflow-tooltip />
          <el-table-column prop="weight" label="权重" width="110" />
          <el-table-column label="状态" width="100">
            <template #default="{ row = {}} = {}">
              <el-tag :type="row.status === '启用' ? 'success' : 'info'" effect="plain">{{ row.status || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" width="150">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑关系矩阵' : '新增关系矩阵'" width="680px" destroy-on-close>
        <el-form :model="form" label-width="120px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="矩阵编号" required>
                <el-input v-model="form.matrixCode" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="评价角色" required>
                <el-input v-model="form.evaluatorRole" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="被评价角色" required>
                <el-input v-model="form.evaluateeRole" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="权重">
                <el-input v-model="form.weight" placeholder="如 40% 或 40" />
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
              <el-form-item label="说明">
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
.hr-performance-matrix {
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
