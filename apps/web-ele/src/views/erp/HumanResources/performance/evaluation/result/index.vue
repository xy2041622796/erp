<script lang="ts" setup>
import type { HrAttendanceApi } from '#/api/erp/human-resources/attendance';
import type { HrPerformanceResultApi } from '#/api/erp/human-resources/performance/evaluation-result';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { listUserDjOptions } from '#/api/erp/human-resources/attendance';
import {
  createPerformanceEvaluationResult,
  deletePerformanceEvaluationResult,
  listPerformanceEvaluationResults,
  updatePerformanceEvaluationResult,
} from '#/api/erp/human-resources/performance/evaluation-result';

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

/** siweiOA 考核结果真实迁移页 */
defineOptions({ name: 'HrPerformanceEvaluationResultPage' });

const statusOptions = ['待确认', '已确认', '已归档'];
const gradeOptions = ['A', 'B', 'C', 'D'];

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editing = ref<HrPerformanceResultApi.Result | null>(null);
const rows = ref<HrPerformanceResultApi.Result[]>([]);
const userDjOptions = ref<HrAttendanceApi.UserDjOption[]>([]);

const queryForm = reactive({
  q: '',
  status: 'all',
});

const form = reactive({
  resultCode: '',
  employeeUserDjRowid: '',
  periodText: '',
  grade: '',
  finalScore: '',
  status: '待确认',
  remark: '',
});

async function loadUserOptions() {
  userDjOptions.value = await listUserDjOptions({ q: queryForm.q.trim() || undefined });
}

async function load() {
  loading.value = true;
  try {
    const [data] = await Promise.all([
      listPerformanceEvaluationResults({
        q: queryForm.q.trim() || undefined,
        status: queryForm.status,
      }),
      loadUserOptions(),
    ]);
    rows.value = Array.isArray(data) ? data : [];
  } finally {
    loading.value = false;
  }
}

function selectedEmployee() {
  return userDjOptions.value.find((item) => String(item.userDjRowid) === String(form.employeeUserDjRowid));
}

function resetForm() {
  form.resultCode = '';
  form.employeeUserDjRowid = '';
  form.periodText = '';
  form.grade = '';
  form.finalScore = '';
  form.status = '待确认';
  form.remark = '';
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: HrPerformanceResultApi.Result) {
  editing.value = row;
  form.resultCode = row.resultCode || '';
  form.employeeUserDjRowid = row.employeeNameId || '';
  form.periodText = row.periodText || '';
  form.grade = row.grade || '';
  form.finalScore = String(row.finalScore ?? '');
  form.status = row.status || '待确认';
  form.remark = row.remark || '';

  if (row.employeeNameId && !userDjOptions.value.some((item) => String(item.userDjRowid) === String(row.employeeNameId))) {
    userDjOptions.value = [
      ...userDjOptions.value,
      {
        userDjRowid: row.employeeNameId,
        userRowid: row.employeeNameId,
        depId: row.employeeNameDepId || '',
        depName: row.employeeNameDepName || '',
        jobRowid: '',
        jobName: '',
        userName: row.employeeName || row.employeeNameId,
      },
    ];
  }

  dialogOpen.value = true;
}

async function submit() {
  const employee = selectedEmployee();
  if (!form.resultCode.trim()) {
    ElMessage.warning('请输入结果编号');
    return;
  }
  if (!employee) {
    ElMessage.warning('请选择员工');
    return;
  }
  if (!form.periodText.trim()) {
    ElMessage.warning('请输入考核周期');
    return;
  }
  if (!form.grade.trim()) {
    ElMessage.warning('请选择结果等级');
    return;
  }

  const payload: HrPerformanceResultApi.Result = {
    resultCode: form.resultCode,
    employeeName: employee.userName,
    employeeNameId: employee.userDjRowid,
    employeeNameDepId: employee.depId,
    employeeNameDepName: employee.depName,
    periodText: form.periodText,
    grade: form.grade,
    finalScore: form.finalScore || '',
    status: form.status,
    remark: form.remark || '',
  };

  saving.value = true;
  try {
    if (editing.value?.id) await updatePerformanceEvaluationResult(editing.value.id, payload);
    else await createPerformanceEvaluationResult(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: HrPerformanceResultApi.Result) {
  if (!row.id) return;
  await ElMessageBox.confirm(`确认删除结果「${row.resultCode || row.employeeName || row.id}」吗？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  });
  await deletePerformanceEvaluationResult(row.id);
  ElMessage.success('删除成功');
  await load();
}

async function confirmResult(row: HrPerformanceResultApi.Result) {
  if (!row.id) return;
  await updatePerformanceEvaluationResult(row.id, { status: '已确认' });
  ElMessage.success('已确认结果');
  await load();
}

async function archiveResult(row: HrPerformanceResultApi.Result) {
  if (!row.id) return;
  await updatePerformanceEvaluationResult(row.id, { status: '已归档' });
  ElMessage.success('已归档结果');
  await load();
}

onMounted(() => {
  void load();
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-performance-result">
      <div class="page-header">
        <div>
          <h2>考核结果</h2>
          <p>维护员工绩效结果、等级、最终得分、确认和归档状态。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input v-model="queryForm.q" clearable placeholder="结果编号 / 员工 / 周期 / 等级" style="width: 300px" @keyup.enter="load" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryForm.status" style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option label="待确认" value="待确认" />
              <el-option label="已确认" value="已确认" />
              <el-option label="已归档" value="已归档" />
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
          <div class="card-title">结果列表</div>
        </template>
        <el-table v-loading="loading" :data="rows" row-key="id" border height="100%">
          <el-table-column prop="resultCode" label="结果编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="employeeName" label="员工" min-width="140" show-overflow-tooltip />
          <el-table-column prop="employeeNameDepName" label="部门" min-width="140" show-overflow-tooltip />
          <el-table-column prop="periodText" label="考核周期" min-width="120" show-overflow-tooltip />
          <el-table-column prop="grade" label="等级" width="90" />
          <el-table-column prop="finalScore" label="最终得分" width="110" />
          <el-table-column label="状态" width="100">
            <template #default="{ row = {}} = {}">
              <el-tag :type="row.status === '已归档' ? 'success' : row.status === '已确认' ? 'warning' : 'info'" effect="plain">{{ row.status || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="220" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" width="230">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="warning" :disabled="row.status !== '待确认'" @click="confirmResult(row)">确认</el-button>
              <el-button link type="success" :disabled="row.status === '已归档'" @click="archiveResult(row)">归档</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑考核结果' : '新增考核结果'" width="720px" destroy-on-close>
        <el-form :model="form" label-width="110px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="结果编号" required>
                <el-input v-model="form.resultCode" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="考核周期" required>
                <el-input v-model="form.periodText" placeholder="如 2026-Q1" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="员工" required>
                <el-select v-model="form.employeeUserDjRowid" filterable placeholder="选择员工" style="width: 100%" @focus="loadUserOptions">
                  <el-option
                    v-for="item in userDjOptions"
                    :key="item.userDjRowid"
                    :label="`${item.userName} / ${item.depName} / ${item.jobName}`"
                    :value="item.userDjRowid"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="结果等级" required>
                <el-select v-model="form.grade" style="width: 100%">
                  <el-option v-for="item in gradeOptions" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="最终得分">
                <el-input v-model="form.finalScore" type="number" />
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
              <el-form-item label="备注">
                <el-input v-model="form.remark" type="textarea" :rows="4" />
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
.hr-performance-result {
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
