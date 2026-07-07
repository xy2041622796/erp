<script lang="ts" setup>
import type { HrAttendanceApi } from '#/api/erp/human-resources/attendance';
import type { HrResignationApi } from '#/api/erp/human-resources/onboarding/resignation';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { listUserDjOptions } from '#/api/erp/human-resources/attendance';
import {
  approveResignationRequest,
  createResignationRequest,
  deleteResignationRequest,
  listResignationRequests,
  updateResignationRequest,
} from '#/api/erp/human-resources/onboarding/resignation';

import {
  ElButton,
  ElCard,
  ElCol,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElRow,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'HrOnboardingResignationPage' });

const statusOptions = ['待审批', '已离职'];
const handoverStatusOptions = ['待开始', '进行中', '已完成'];
const salaryStatusOptions = ['待结算', '已结算'];
const resignTypeOptions = ['主动离职', '协商解除', '合同到期', '试用期离职'];

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const viewOpen = ref(false);
const editing = ref<HrResignationApi.ResignationRequest | null>(null);
const viewing = ref<HrResignationApi.ResignationRequest | null>(null);
const rows = ref<HrResignationApi.ResignationRequest[]>([]);
const userOptions = ref<HrAttendanceApi.UserDjOption[]>([]);

const queryForm = reactive({ q: '', status: 'all' });
const form = reactive({
  resign_no: '',
  user_dj_rowid: '',
  apply_date: '',
  last_day: '',
  handover_status: '待开始',
  salary_status: '待结算',
  certificate_issued: false,
  status: '待审批',
  resign_type: '主动离职',
  resign_reason: '',
  remark: '',
});

const pendingCount = computed(() => rows.value.filter((row) => row.status !== '已离职').length);
const finishedCount = computed(() => rows.value.filter((row) => row.status === '已离职').length);

function selectedUser() {
  return userOptions.value.find((item) => String(item.userDjRowid) === String(form.user_dj_rowid));
}

async function loadUserOptions() {
  userOptions.value = await listUserDjOptions({ q: queryForm.q.trim() || undefined });
}

async function load() {
  loading.value = true;
  try {
    rows.value = await listResignationRequests({
      q: queryForm.q.trim() || undefined,
      status: queryForm.status,
    });
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.resign_no = '';
  form.user_dj_rowid = '';
  form.apply_date = '';
  form.last_day = '';
  form.handover_status = '待开始';
  form.salary_status = '待结算';
  form.certificate_issued = false;
  form.status = '待审批';
  form.resign_type = '主动离职';
  form.resign_reason = '';
  form.remark = '';
}

function ensureUserOption(row: HrResignationApi.ResignationRequest) {
  if (!row.user_dj_rowid || userOptions.value.some((item) => String(item.userDjRowid) === String(row.user_dj_rowid))) return;
  userOptions.value = [
    ...userOptions.value,
    {
      userDjRowid: row.user_dj_rowid,
      userRowid: row.user_rowid || '',
      depId: row.dep_id || '',
      depName: row.departmentName || row.dep_id || '',
      jobRowid: row.job_rowid || '',
      jobName: row.jobName || row.job_rowid || '',
      userName: row.userName || row.user_rowid || '',
    },
  ];
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: HrResignationApi.ResignationRequest) {
  editing.value = row;
  ensureUserOption(row);
  form.resign_no = row.resign_no || '';
  form.user_dj_rowid = row.user_dj_rowid || '';
  form.apply_date = row.apply_date ? String(row.apply_date).slice(0, 10) : '';
  form.last_day = row.last_day ? String(row.last_day).slice(0, 10) : '';
  form.handover_status = row.handover_status || '待开始';
  form.salary_status = row.salary_status || '待结算';
  form.certificate_issued = Number(row.certificate_issued || 0) === 1;
  form.status = row.status || '待审批';
  form.resign_type = row.resign_type || '主动离职';
  form.resign_reason = row.resign_reason || '';
  form.remark = row.remark || '';
  dialogOpen.value = true;
}

function openView(row: HrResignationApi.ResignationRequest) {
  viewing.value = row;
  viewOpen.value = true;
}

async function submit() {
  const user = selectedUser();
  if (!user) {
    ElMessage.warning('请选择离职人员');
    return;
  }
  if (!form.apply_date) {
    ElMessage.warning('请选择申请日期');
    return;
  }

  const payload: HrResignationApi.ResignationRequest = {
    resign_no: form.resign_no || null,
    user_rowid: user.userRowid,
    user_dj_rowid: user.userDjRowid,
    dep_id: user.depId,
    job_rowid: user.jobRowid,
    apply_date: form.apply_date,
    last_day: form.last_day || null,
    handover_status: form.handover_status,
    salary_status: form.salary_status,
    certificate_issued: form.certificate_issued,
    status: form.status,
    resign_type: form.resign_type || null,
    resign_reason: form.resign_reason || null,
    remark: form.remark || null,
  };

  saving.value = true;
  try {
    if (editing.value?.id) await updateResignationRequest(editing.value.id, payload);
    else await createResignationRequest(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function approve(row: HrResignationApi.ResignationRequest) {
  if (!row.id) return;
  await approveResignationRequest(row.id);
  ElMessage.success('已完成离职审批');
  await load();
}

async function remove(row: HrResignationApi.ResignationRequest) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(`确认删除离职申请「${row.resign_no || row.userName || row.id}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await deleteResignationRequest(row.id);
  ElMessage.success('删除成功');
  await load();
}

onMounted(() => {
  void Promise.all([loadUserOptions(), load()]);
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-onboarding-resignation">
      <div class="page-header">
        <div>
          <h2>离职申请</h2>
          <p>维护离职人员、申请日期、最后工作日、交接结算和离职审批状态。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </div>

      <div class="summary-grid">
        <el-card shadow="never"><div class="summary-number">{{ rows.length }}</div><div class="summary-label">申请总数</div></el-card>
        <el-card shadow="never"><div class="summary-number">{{ pendingCount }}</div><div class="summary-label">待审批</div></el-card>
        <el-card shadow="never"><div class="summary-number">{{ finishedCount }}</div><div class="summary-label">已离职</div></el-card>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input v-model="queryForm.q" clearable placeholder="离职编号 / 人员 / 部门 / 岗位" style="width: 300px" @keyup.enter="load" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryForm.status" style="width: 130px">
              <el-option label="全部" value="all" />
              <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="load">查询</el-button>
            <el-button @click="queryForm.q = ''; queryForm.status = 'all'; load();">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <template #header><div class="card-title">离职申请列表</div></template>
        <el-table v-loading="loading" :data="rows" row-key="id" border height="100%">
          <el-table-column prop="resign_no" label="离职编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="userName" label="人员" min-width="120" show-overflow-tooltip />
          <el-table-column prop="departmentName" label="部门" min-width="130" show-overflow-tooltip />
          <el-table-column prop="jobName" label="岗位" min-width="130" show-overflow-tooltip />
          <el-table-column prop="apply_date" label="申请日期" width="130" />
          <el-table-column prop="last_day" label="最后工作日" width="130" />
          <el-table-column label="交接" width="100"><template #default="{ row = {}} = {}"><el-tag effect="plain">{{ row.handover_status || '-' }}</el-tag></template></el-table-column>
          <el-table-column label="状态" width="110"><template #default="{ row = {}} = {}"><el-tag :type="row.status === '已离职' ? 'success' : 'warning'" effect="plain">{{ row.status || '-' }}</el-tag></template></el-table-column>
          <el-table-column label="操作" fixed="right" width="190">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openView(row)">查看</el-button>
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="success" :disabled="row.status === '已离职'" @click="approve(row)">通过</el-button>
              <el-button link type="danger" @click="remove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑离职申请' : '新增离职申请'" width="780px" destroy-on-close>
        <el-form :model="form" label-width="120px">
          <el-row :gutter="16">
            <el-col :span="24">
              <el-form-item label="离职人员" required>
                <el-select v-model="form.user_dj_rowid" filterable placeholder="选择离职人员" style="width: 100%" @focus="loadUserOptions">
                  <el-option v-for="item in userOptions" :key="item.userDjRowid" :label="`${item.userName} / ${item.depName} / ${item.jobName}`" :value="item.userDjRowid" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12"><el-form-item label="离职编号"><el-input v-model="form.resign_no" disabled placeholder="保存后自动生成" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="申请日期" required><el-input v-model="form.apply_date" type="date" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="最后工作日"><el-input v-model="form.last_day" type="date" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="状态"><el-select v-model="form.status" style="width: 100%"><el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="交接状态"><el-select v-model="form.handover_status" style="width: 100%"><el-option v-for="item in handoverStatusOptions" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="薪资状态"><el-select v-model="form.salary_status" style="width: 100%"><el-option v-for="item in salaryStatusOptions" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="离职类型"><el-select v-model="form.resign_type" style="width: 100%"><el-option v-for="item in resignTypeOptions" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="离职证明"><el-switch v-model="form.certificate_issued" active-text="已开具" inactive-text="未开具" /></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="离职原因"><el-input v-model="form.resign_reason" :rows="3" type="textarea" /></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="备注"><el-input v-model="form.remark" :rows="3" type="textarea" /></el-form-item></el-col>
          </el-row>
        </el-form>
        <template #footer><el-button :disabled="saving" @click="dialogOpen = false">取消</el-button><el-button :loading="saving" type="primary" @click="submit">保存</el-button></template>
      </el-dialog>

      <el-dialog v-model="viewOpen" title="离职申请详情" width="680px">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="离职编号">{{ viewing?.resign_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="人员">{{ viewing?.userName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ viewing?.departmentName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="岗位">{{ viewing?.jobName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="申请日期">{{ viewing?.apply_date || '-' }}</el-descriptions-item>
          <el-descriptions-item label="最后工作日">{{ viewing?.last_day || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ viewing?.status || '-' }}</el-descriptions-item>
          <el-descriptions-item label="离职原因">{{ viewing?.resign_reason || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-onboarding-resignation { display: flex; min-height: 100%; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
.page-header p { margin: 6px 0 0; color: var(--el-text-color-secondary); }
.summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.summary-number { font-size: 24px; font-weight: 700; }
.summary-label { margin-top: 4px; color: var(--el-text-color-secondary); }
.query-card :deep(.el-card__body) { padding-bottom: 2px; }
.card-title { font-weight: 600; }
</style>
