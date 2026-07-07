<script lang="ts" setup>
import type { HrAttendanceApi } from '#/api/erp/human-resources/attendance';
import type { HrPerformanceInterviewApi } from '#/api/erp/human-resources/performance/evaluation-interview';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { listUserDjOptions } from '#/api/erp/human-resources/attendance';
import {
  createPerformanceEvaluationInterview,
  deletePerformanceEvaluationInterview,
  listPerformanceEvaluationInterviews,
  updatePerformanceEvaluationInterview,
} from '#/api/erp/human-resources/performance/evaluation-interview';

import {
  ElButton,
  ElCard,
  ElCol,
  ElDatePicker,
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

/** siweiOA 绩效面谈真实迁移页 */
defineOptions({ name: 'HrPerformanceEvaluationInterviewPage' });

const statusOptions = ['待面谈', '已完成', '已归档'];

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editing = ref<HrPerformanceInterviewApi.Interview | null>(null);
const rows = ref<HrPerformanceInterviewApi.Interview[]>([]);
const userDjOptions = ref<HrAttendanceApi.UserDjOption[]>([]);

const queryForm = reactive({
  q: '',
  status: 'all',
});

const form = reactive({
  interviewCode: '',
  employeeUserDjRowid: '',
  interviewerUserDjRowid: '',
  interviewTime: '',
  status: '待面谈',
  summary: '',
});

function toDatetimeLocal(value?: null | string) {
  return value ? String(value).slice(0, 16).replace(' ', 'T') : '';
}

function normalizeDateTime(value?: null | string) {
  return value ? String(value).slice(0, 16).replace('T', ' ') : '-';
}

async function loadUserOptions() {
  userDjOptions.value = await listUserDjOptions({ q: queryForm.q.trim() || undefined });
}

async function load() {
  loading.value = true;
  try {
    const [data] = await Promise.all([
      listPerformanceEvaluationInterviews({
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

function findUser(userDjRowid: string) {
  return userDjOptions.value.find((item) => String(item.userDjRowid) === String(userDjRowid));
}

function addSyntheticUser(row: HrPerformanceInterviewApi.Interview, field: 'employee' | 'interviewer') {
  const idKey = field === 'employee' ? 'employeeNameId' : 'interviewerNameId';
  const depIdKey = field === 'employee' ? 'employeeNameDepId' : 'interviewerNameDepId';
  const depNameKey = field === 'employee' ? 'employeeNameDepName' : 'interviewerNameDepName';
  const nameKey = field === 'employee' ? 'employeeName' : 'interviewerName';
  const userDjRowid = row[idKey];
  if (userDjRowid && !userDjOptions.value.some((item) => String(item.userDjRowid) === String(userDjRowid))) {
    userDjOptions.value = [
      ...userDjOptions.value,
      {
        userDjRowid,
        userRowid: userDjRowid,
        depId: row[depIdKey] || '',
        depName: row[depNameKey] || '',
        jobRowid: '',
        jobName: '',
        userName: row[nameKey] || userDjRowid,
      },
    ];
  }
}

function resetForm() {
  form.interviewCode = '';
  form.employeeUserDjRowid = '';
  form.interviewerUserDjRowid = '';
  form.interviewTime = '';
  form.status = '待面谈';
  form.summary = '';
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: HrPerformanceInterviewApi.Interview) {
  editing.value = row;
  addSyntheticUser(row, 'employee');
  addSyntheticUser(row, 'interviewer');
  form.interviewCode = row.interviewCode || '';
  form.employeeUserDjRowid = row.employeeNameId || '';
  form.interviewerUserDjRowid = row.interviewerNameId || '';
  form.interviewTime = toDatetimeLocal(row.interviewTime);
  form.status = row.status || '待面谈';
  form.summary = row.summary || '';
  dialogOpen.value = true;
}

async function submit() {
  const employee = findUser(form.employeeUserDjRowid);
  const interviewer = findUser(form.interviewerUserDjRowid);
  if (!form.interviewCode.trim()) {
    ElMessage.warning('请输入面谈编号');
    return;
  }
  if (!employee) {
    ElMessage.warning('请选择员工');
    return;
  }
  if (!interviewer) {
    ElMessage.warning('请选择面谈人');
    return;
  }

  const payload: HrPerformanceInterviewApi.Interview = {
    interviewCode: form.interviewCode,
    employeeName: employee.userName,
    employeeNameId: employee.userDjRowid,
    employeeNameDepId: employee.depId,
    employeeNameDepName: employee.depName,
    interviewerName: interviewer.userName,
    interviewerNameId: interviewer.userDjRowid,
    interviewerNameDepId: interviewer.depId,
    interviewerNameDepName: interviewer.depName,
    interviewTime: form.interviewTime || '',
    status: form.status,
    summary: form.summary || '',
  };

  saving.value = true;
  try {
    if (editing.value?.id) await updatePerformanceEvaluationInterview(editing.value.id, payload);
    else await createPerformanceEvaluationInterview(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: HrPerformanceInterviewApi.Interview) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(`确认删除面谈「${row.interviewCode || row.employeeName || row.id}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await deletePerformanceEvaluationInterview(row.id);
  ElMessage.success('删除成功');
  await load();
}

async function markFinished(row: HrPerformanceInterviewApi.Interview) {
  if (!row.id) return;
  await updatePerformanceEvaluationInterview(row.id, { status: '已完成' });
  ElMessage.success('已完成面谈');
  await load();
}

async function archiveInterview(row: HrPerformanceInterviewApi.Interview) {
  if (!row.id) return;
  await updatePerformanceEvaluationInterview(row.id, { status: '已归档' });
  ElMessage.success('已归档面谈');
  await load();
}

onMounted(() => {
  void load();
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-performance-interview">
      <div class="page-header">
        <div>
          <h2>绩效面谈</h2>
          <p>维护员工绩效面谈、面谈人、面谈时间、状态和纪要。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input v-model="queryForm.q" clearable placeholder="面谈编号 / 员工 / 面谈人" style="width: 300px" @keyup.enter="load" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryForm.status" style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option label="待面谈" value="待面谈" />
              <el-option label="已完成" value="已完成" />
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
          <div class="card-title">面谈列表</div>
        </template>
        <el-table v-loading="loading" :data="rows" row-key="id" border height="100%">
          <el-table-column prop="interviewCode" label="面谈编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="employeeName" label="员工" min-width="130" show-overflow-tooltip />
          <el-table-column prop="employeeNameDepName" label="员工部门" min-width="140" show-overflow-tooltip />
          <el-table-column prop="interviewerName" label="面谈人" min-width="130" show-overflow-tooltip />
          <el-table-column prop="interviewerNameDepName" label="面谈人部门" min-width="140" show-overflow-tooltip />
          <el-table-column label="面谈时间" min-width="160">
            <template #default="{ row = {}} = {}">{{ normalizeDateTime(row.interviewTime) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row = {}} = {}">
              <el-tag :type="row.status === '已归档' ? 'success' : row.status === '已完成' ? 'warning' : 'info'" effect="plain">{{ row.status || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="summary" label="面谈纪要" min-width="240" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" width="230">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="warning" :disabled="row.status !== '待面谈'" @click="markFinished(row)">完成</el-button>
              <el-button link type="success" :disabled="row.status === '已归档'" @click="archiveInterview(row)">归档</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑绩效面谈' : '新增绩效面谈'" width="760px" destroy-on-close>
        <el-form :model="form" label-width="110px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="面谈编号" required>
                <el-input v-model="form.interviewCode" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="面谈时间">
                <el-date-picker v-model="form.interviewTime" type="datetime" value-format="YYYY-MM-DDTHH:mm" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="员工" required>
                <el-select v-model="form.employeeUserDjRowid" filterable placeholder="选择员工" style="width: 100%" @focus="loadUserOptions">
                  <el-option
                    v-for="item in userDjOptions"
                    :key="`employee-${item.userDjRowid}`"
                    :label="`${item.userName} / ${item.depName} / ${item.jobName}`"
                    :value="item.userDjRowid"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="面谈人" required>
                <el-select v-model="form.interviewerUserDjRowid" filterable placeholder="选择面谈人" style="width: 100%" @focus="loadUserOptions">
                  <el-option
                    v-for="item in userDjOptions"
                    :key="`interviewer-${item.userDjRowid}`"
                    :label="`${item.userName} / ${item.depName} / ${item.jobName}`"
                    :value="item.userDjRowid"
                  />
                </el-select>
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
              <el-form-item label="面谈纪要">
                <el-input v-model="form.summary" type="textarea" :rows="4" />
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
.hr-performance-interview {
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
