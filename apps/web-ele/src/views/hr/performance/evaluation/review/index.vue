<script lang="ts" setup>
import type { HrAttendanceApi } from '#/api/erp/human-resources/attendance';
import type { HrPerformanceReviewApi } from '#/api/erp/human-resources/performance/evaluation-review';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { listUserDjOptions } from '#/api/erp/human-resources/attendance';
import {
  createPerformanceEvaluationReview,
  deletePerformanceEvaluationReview,
  listPerformanceEvaluationReviews,
  updatePerformanceEvaluationReview,
} from '#/api/erp/human-resources/performance/evaluation-review';

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

/** siweiOA 考核评价真实迁移页 */
defineOptions({ name: 'HrPerformanceEvaluationReviewPage' });

const statusOptions = ['待评价', '已提交', '已完成'];

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editing = ref<HrPerformanceReviewApi.Review | null>(null);
const rows = ref<HrPerformanceReviewApi.Review[]>([]);
const userDjOptions = ref<HrAttendanceApi.UserDjOption[]>([]);

const queryForm = reactive({
  q: '',
  status: 'all',
});

const form = reactive({
  reviewCode: '',
  employeeUserDjRowid: '',
  periodText: '',
  score: '',
  status: '待评价',
  comment: '',
});

async function loadUserOptions() {
  userDjOptions.value = await listUserDjOptions({ q: queryForm.q.trim() || undefined });
}

async function load() {
  loading.value = true;
  try {
    const [data] = await Promise.all([
      listPerformanceEvaluationReviews({
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
  form.reviewCode = '';
  form.employeeUserDjRowid = '';
  form.periodText = '';
  form.score = '';
  form.status = '待评价';
  form.comment = '';
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: HrPerformanceReviewApi.Review) {
  editing.value = row;
  form.reviewCode = row.reviewCode || '';
  form.employeeUserDjRowid = row.employeeNameId || '';
  form.periodText = row.periodText || '';
  form.score = String(row.score ?? '');
  form.status = row.status || '待评价';
  form.comment = row.comment || '';

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
  if (!form.reviewCode.trim()) {
    ElMessage.warning('请输入评价编号');
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

  const payload: HrPerformanceReviewApi.Review = {
    reviewCode: form.reviewCode,
    employeeName: employee.userName,
    employeeNameId: employee.userDjRowid,
    employeeNameDepId: employee.depId,
    employeeNameDepName: employee.depName,
    periodText: form.periodText,
    score: form.score || '',
    status: form.status,
    comment: form.comment || '',
  };

  saving.value = true;
  try {
    if (editing.value?.id) await updatePerformanceEvaluationReview(editing.value.id, payload);
    else await createPerformanceEvaluationReview(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: HrPerformanceReviewApi.Review) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(`确认删除评价「${row.reviewCode || row.employeeName || row.id}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await deletePerformanceEvaluationReview(row.id);
  ElMessage.success('删除成功');
  await load();
}

async function markSubmitted(row: HrPerformanceReviewApi.Review) {
  if (!row.id) return;
  await updatePerformanceEvaluationReview(row.id, { status: '已提交' });
  ElMessage.success('已提交评价');
  await load();
}

async function markFinished(row: HrPerformanceReviewApi.Review) {
  if (!row.id) return;
  await updatePerformanceEvaluationReview(row.id, { status: '已完成' });
  ElMessage.success('已完成评价');
  await load();
}

onMounted(() => {
  void load();
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-performance-review">
      <div class="page-header">
        <div>
          <h2>考核评价</h2>
          <p>维护员工绩效评价、考核周期、评分和评价意见。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input v-model="queryForm.q" clearable placeholder="评价编号 / 员工 / 考核周期" style="width: 300px" @keyup.enter="load" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryForm.status" style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option label="待评价" value="待评价" />
              <el-option label="已提交" value="已提交" />
              <el-option label="已完成" value="已完成" />
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
          <div class="card-title">评价列表</div>
        </template>
        <el-table v-loading="loading" :data="rows" row-key="id" border height="100%">
          <el-table-column prop="reviewCode" label="评价编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="employeeName" label="员工" min-width="140" show-overflow-tooltip />
          <el-table-column prop="employeeNameDepName" label="部门" min-width="140" show-overflow-tooltip />
          <el-table-column prop="periodText" label="考核周期" min-width="120" show-overflow-tooltip />
          <el-table-column prop="score" label="得分" width="100" />
          <el-table-column label="状态" width="100">
            <template #default="{ row = {}} = {}">
              <el-tag :type="row.status === '已完成' ? 'success' : row.status === '已提交' ? 'warning' : 'info'" effect="plain">{{ row.status || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="comment" label="评价意见" min-width="240" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" width="230">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="warning" :disabled="row.status !== '待评价'" @click="markSubmitted(row)">提交</el-button>
              <el-button link type="success" :disabled="row.status === '已完成'" @click="markFinished(row)">完成</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑考核评价' : '新增考核评价'" width="720px" destroy-on-close>
        <el-form :model="form" label-width="110px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="评价编号" required>
                <el-input v-model="form.reviewCode" />
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
              <el-form-item label="评分">
                <el-input v-model="form.score" type="number" />
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
              <el-form-item label="评价意见">
                <el-input v-model="form.comment" type="textarea" :rows="4" />
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
.hr-performance-review {
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
