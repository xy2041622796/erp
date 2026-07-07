<script lang="ts" setup>
import type { HrPerformanceIndicatorApi } from '#/api/erp/human-resources/performance/config-indicator';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  createPerformanceConfigIndicator,
  deletePerformanceConfigIndicator,
  listPerformanceConfigIndicators,
  updatePerformanceConfigIndicator,
} from '#/api/erp/human-resources/performance/config-indicator';

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

/** siweiOA 指标库管理真实迁移页 */
defineOptions({ name: 'HrPerformanceConfigIndicatorPage' });

const statusOptions = ['启用', '停用'];

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editing = ref<HrPerformanceIndicatorApi.Indicator | null>(null);
const rows = ref<HrPerformanceIndicatorApi.Indicator[]>([]);

const queryForm = reactive({
  q: '',
  status: 'all',
});

const form = reactive({
  indicatorCode: '',
  indicatorName: '',
  indicatorType: '',
  measurementUnit: '',
  status: '启用',
  definition: '',
});

async function load() {
  loading.value = true;
  try {
    const data = await listPerformanceConfigIndicators({
      q: queryForm.q.trim() || undefined,
      status: queryForm.status,
    });
    rows.value = Array.isArray(data) ? data : [];
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.indicatorCode = '';
  form.indicatorName = '';
  form.indicatorType = '';
  form.measurementUnit = '';
  form.status = '启用';
  form.definition = '';
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: HrPerformanceIndicatorApi.Indicator) {
  editing.value = row;
  form.indicatorCode = row.indicatorCode || '';
  form.indicatorName = row.indicatorName || '';
  form.indicatorType = row.indicatorType || '';
  form.measurementUnit = row.measurementUnit || '';
  form.status = row.status || '启用';
  form.definition = row.definition || '';
  dialogOpen.value = true;
}

async function submit() {
  if (!form.indicatorCode.trim()) {
    ElMessage.warning('请输入指标编号');
    return;
  }
  if (!form.indicatorName.trim()) {
    ElMessage.warning('请输入指标名称');
    return;
  }
  if (!form.indicatorType.trim()) {
    ElMessage.warning('请输入指标类型');
    return;
  }

  const payload: HrPerformanceIndicatorApi.Indicator = {
    indicatorCode: form.indicatorCode,
    indicatorName: form.indicatorName,
    indicatorType: form.indicatorType,
    measurementUnit: form.measurementUnit || '',
    status: form.status,
    definition: form.definition || '',
  };

  saving.value = true;
  try {
    if (editing.value?.id) await updatePerformanceConfigIndicator(editing.value.id, payload);
    else await createPerformanceConfigIndicator(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: HrPerformanceIndicatorApi.Indicator) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(`确认删除指标「${row.indicatorName || row.indicatorCode || row.id}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await deletePerformanceConfigIndicator(row.id);
  ElMessage.success('删除成功');
  await load();
}

onMounted(() => {
  void load();
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-performance-indicator">
      <div class="page-header">
        <div>
          <h2>指标库管理</h2>
          <p>维护绩效指标编号、名称、类型、计量单位、状态和指标定义。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input v-model="queryForm.q" clearable placeholder="指标编号 / 指标名称 / 指标类型" style="width: 300px" @keyup.enter="load" />
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
          <div class="card-title">指标列表</div>
        </template>
        <el-table v-loading="loading" :data="rows" row-key="id" border height="100%">
          <el-table-column prop="indicatorCode" label="指标编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="indicatorName" label="指标名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="indicatorType" label="指标类型" min-width="130" show-overflow-tooltip />
          <el-table-column prop="measurementUnit" label="计量单位" width="120" />
          <el-table-column label="状态" width="100">
            <template #default="{ row = {}} = {}">
              <el-tag :type="row.status === '启用' ? 'success' : 'info'" effect="plain">{{ row.status || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="definition" label="指标定义" min-width="220" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" width="150">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑指标' : '新增指标'" width="680px" destroy-on-close>
        <el-form :model="form" label-width="110px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="指标编号" required>
                <el-input v-model="form.indicatorCode" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="指标名称" required>
                <el-input v-model="form.indicatorName" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="指标类型" required>
                <el-input v-model="form.indicatorType" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="计量单位">
                <el-input v-model="form.measurementUnit" />
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
              <el-form-item label="指标定义">
                <el-input v-model="form.definition" type="textarea" :rows="4" />
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
.hr-performance-indicator {
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
