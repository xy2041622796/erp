<script lang="ts" setup>
import type { HrOnboardingEntryApi } from '#/api/erp/human-resources/onboarding/entry';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  approveOnboardingEntry,
  createOnboardingEntry,
  deleteOnboardingEntry,
  listDeptJobOptions,
  listOnboardingEntries,
  updateOnboardingEntry,
} from '#/api/erp/human-resources/onboarding/entry';

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
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'HrOnboardingEntryPage' });

const contractStatusOptions = ['待签署', '已签署', '已补签'];
const trainingStatusOptions = ['待安排', '进行中', '已完成'];
const equipmentStatusOptions = ['待领用', '已领用', '已归还'];
const healthStatusOptions = ['待提交', '审核中', '已通过'];
const statusOptions = ['待入职', '已入职'];

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const viewOpen = ref(false);
const editing = ref<HrOnboardingEntryApi.Entry | null>(null);
const viewing = ref<HrOnboardingEntryApi.Entry | null>(null);
const rows = ref<HrOnboardingEntryApi.Entry[]>([]);
const jobOptions = ref<HrOnboardingEntryApi.JobOption[]>([]);

const queryForm = reactive({ q: '', status: 'all' });
const form = reactive({
  entry_no: '',
  name: '',
  phone: '',
  email: '',
  jobOptionKey: '',
  entry_date: '',
  contract_status: '待签署',
  training_status: '待安排',
  equipment_status: '待领用',
  health_status: '待提交',
  status: '待入职',
  remark: '',
});

const pendingCount = computed(() => rows.value.filter((row) => row.status !== '已入职').length);
const finishedCount = computed(() => rows.value.filter((row) => row.status === '已入职').length);

function jobOptionKey(item: HrOnboardingEntryApi.JobOption) {
  return `${item.depId}__${item.jobRowid}`;
}

function selectedJob() {
  return jobOptions.value.find((item) => jobOptionKey(item) === form.jobOptionKey);
}

async function loadJobOptions() {
  jobOptions.value = await listDeptJobOptions();
}

async function load() {
  loading.value = true;
  try {
    rows.value = await listOnboardingEntries({
      q: queryForm.q.trim() || undefined,
      status: queryForm.status,
    });
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.entry_no = '';
  form.name = '';
  form.phone = '';
  form.email = '';
  form.jobOptionKey = '';
  form.entry_date = '';
  form.contract_status = '待签署';
  form.training_status = '待安排';
  form.equipment_status = '待领用';
  form.health_status = '待提交';
  form.status = '待入职';
  form.remark = '';
}

function ensureJobOption(row: HrOnboardingEntryApi.Entry) {
  if (!row.planned_dep_id || !row.planned_job_rowid) return;
  const key = `${row.planned_dep_id}__${row.planned_job_rowid}`;
  if (jobOptions.value.some((item) => jobOptionKey(item) === key)) return;
  jobOptions.value = [
    ...jobOptions.value,
    {
      depId: row.planned_dep_id,
      depName: row.plannedDepName || row.planned_dep_id,
      jobRowid: row.planned_job_rowid,
      jobName: row.plannedJobName || row.planned_job_rowid,
    },
  ];
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: HrOnboardingEntryApi.Entry) {
  editing.value = row;
  ensureJobOption(row);
  form.entry_no = row.entry_no || '';
  form.name = row.name || '';
  form.phone = row.phone || '';
  form.email = row.email || '';
  form.jobOptionKey = row.planned_dep_id && row.planned_job_rowid ? `${row.planned_dep_id}__${row.planned_job_rowid}` : '';
  form.entry_date = row.entry_date ? String(row.entry_date).slice(0, 10) : '';
  form.contract_status = row.contract_status || '待签署';
  form.training_status = row.training_status || '待安排';
  form.equipment_status = row.equipment_status || '待领用';
  form.health_status = row.health_status || '待提交';
  form.status = row.status || '待入职';
  form.remark = row.remark || '';
  dialogOpen.value = true;
}

function openView(row: HrOnboardingEntryApi.Entry) {
  viewing.value = row;
  viewOpen.value = true;
}

async function submit() {
  const job = selectedJob();
  if (!form.name.trim()) {
    ElMessage.warning('请输入姓名');
    return;
  }
  if (!job) {
    ElMessage.warning('请选择拟入职部门 / 岗位');
    return;
  }
  if (!form.entry_date) {
    ElMessage.warning('请选择入职日期');
    return;
  }

  const payload: HrOnboardingEntryApi.Entry = {
    entry_no: form.entry_no || null,
    planned_dep_id: job.depId,
    planned_job_rowid: job.jobRowid,
    name: form.name,
    phone: form.phone || null,
    email: form.email || null,
    entry_date: form.entry_date,
    contract_status: form.contract_status,
    training_status: form.training_status,
    equipment_status: form.equipment_status,
    health_status: form.health_status,
    status: form.status,
    remark: form.remark || null,
  };

  saving.value = true;
  try {
    if (editing.value?.id) await updateOnboardingEntry(editing.value.id, payload);
    else await createOnboardingEntry(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function approve(row: HrOnboardingEntryApi.Entry) {
  if (!row.id) return;
  await approveOnboardingEntry(row.id);
  ElMessage.success('已完成入职审批');
  await load();
}

async function remove(row: HrOnboardingEntryApi.Entry) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(`确认删除入职申请「${row.entry_no || row.name || row.id}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await deleteOnboardingEntry(row.id);
  ElMessage.success('删除成功');
  await load();
}

onMounted(() => {
  void Promise.all([loadJobOptions(), load()]);
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-onboarding-entry">
      <div class="page-header">
        <div>
          <h2>入职申请</h2>
          <p>维护入职申请、拟入职部门岗位、入职日期和入职前准备状态。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </div>

      <div class="summary-grid">
        <el-card shadow="never"><div class="summary-number">{{ rows.length }}</div><div class="summary-label">申请总数</div></el-card>
        <el-card shadow="never"><div class="summary-number">{{ pendingCount }}</div><div class="summary-label">待入职</div></el-card>
        <el-card shadow="never"><div class="summary-number">{{ finishedCount }}</div><div class="summary-label">已入职</div></el-card>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input v-model="queryForm.q" clearable placeholder="入职编号 / 姓名 / 部门 / 岗位" style="width: 300px" @keyup.enter="load" />
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
        <template #header><div class="card-title">入职申请列表</div></template>
        <el-table v-loading="loading" :data="rows" row-key="id" border height="100%">
          <el-table-column prop="entry_no" label="入职编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="name" label="姓名" width="110" />
          <el-table-column prop="plannedDepName" label="拟入职部门" min-width="130" show-overflow-tooltip />
          <el-table-column prop="plannedJobName" label="拟入职岗位" min-width="130" show-overflow-tooltip />
          <el-table-column prop="entry_date" label="入职日期" width="130" />
          <el-table-column label="合同" width="100"><template #default="{ row = {}} = {}"><el-tag effect="plain">{{ row.contract_status || '-' }}</el-tag></template></el-table-column>
          <el-table-column label="状态" width="110"><template #default="{ row = {}} = {}"><el-tag :type="row.status === '已入职' ? 'success' : 'warning'" effect="plain">{{ row.status || '-' }}</el-tag></template></el-table-column>
          <el-table-column label="操作" fixed="right" width="190">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openView(row)">查看</el-button>
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="success" :disabled="row.status === '已入职'" @click="approve(row)">通过</el-button>
              <el-button link type="danger" @click="remove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑入职申请' : '新增入职申请'" width="780px" destroy-on-close>
        <el-form :model="form" label-width="120px">
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item label="入职编号"><el-input v-model="form.entry_no" disabled placeholder="保存后自动生成" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="姓名" required><el-input v-model="form.name" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="手机"><el-input v-model="form.phone" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item></el-col>
            <el-col :span="24">
              <el-form-item label="拟入职部门 / 岗位" required>
                <el-select v-model="form.jobOptionKey" filterable placeholder="选择拟入职岗位" style="width: 100%" @focus="loadJobOptions">
                  <el-option v-for="item in jobOptions" :key="jobOptionKey(item)" :label="`${item.depName} / ${item.jobName}`" :value="jobOptionKey(item)" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12"><el-form-item label="入职日期" required><el-input v-model="form.entry_date" type="date" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="状态"><el-select v-model="form.status" style="width: 100%"><el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="合同状态"><el-select v-model="form.contract_status" style="width: 100%"><el-option v-for="item in contractStatusOptions" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="培训状态"><el-select v-model="form.training_status" style="width: 100%"><el-option v-for="item in trainingStatusOptions" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="设备状态"><el-select v-model="form.equipment_status" style="width: 100%"><el-option v-for="item in equipmentStatusOptions" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="体检状态"><el-select v-model="form.health_status" style="width: 100%"><el-option v-for="item in healthStatusOptions" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="备注"><el-input v-model="form.remark" :rows="3" type="textarea" /></el-form-item></el-col>
          </el-row>
        </el-form>
        <template #footer><el-button :disabled="saving" @click="dialogOpen = false">取消</el-button><el-button :loading="saving" type="primary" @click="submit">保存</el-button></template>
      </el-dialog>

      <el-dialog v-model="viewOpen" title="入职申请详情" width="680px">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="入职编号">{{ viewing?.entry_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ viewing?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="拟入职部门">{{ viewing?.plannedDepName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="拟入职岗位">{{ viewing?.plannedJobName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="入职日期">{{ viewing?.entry_date || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ viewing?.status || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ viewing?.remark || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-onboarding-entry { display: flex; min-height: 100%; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
.page-header p { margin: 6px 0 0; color: var(--el-text-color-secondary); }
.summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.summary-number { font-size: 24px; font-weight: 700; }
.summary-label { margin-top: 4px; color: var(--el-text-color-secondary); }
.query-card :deep(.el-card__body) { padding-bottom: 2px; }
.card-title { font-weight: 600; }
</style>
