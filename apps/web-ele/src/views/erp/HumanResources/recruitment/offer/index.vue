<script lang="ts" setup>
import type { HrOnboardingEntryApi } from '#/api/erp/human-resources/onboarding/entry';
import type { HrRecruitmentOfferApi } from '#/api/erp/human-resources/recruitment/offer';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { listDeptJobOptions } from '#/api/erp/human-resources/onboarding/entry';
import {
  createOffer,
  deleteOffer,
  getOfferApprovalMeta,
  listOffersWithPerm,
  updateOffer,
} from '#/api/erp/human-resources/recruitment/offer';

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

defineOptions({ name: 'HrRecruitmentOfferPage' });

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editing = ref<HrRecruitmentOfferApi.Offer | null>(null);
const rows = ref<HrRecruitmentOfferApi.Offer[]>([]);
const candidates = ref<Array<{ id: string; name: string; entryNo?: string; department?: string }>>([]);
const jobOptions = ref<HrOnboardingEntryApi.JobOption[]>([]);

const queryForm = reactive({ q: '', status: 'all' });
const form = reactive({
  offer_code: '',
  candidate_id: '',
  jobOptionKey: '',
  salary: '',
  probation_salary: '',
  probation_months: 3,
  start_date: '',
  work_location: '',
  status: 'pending',
  remark: '',
});

function jobOptionKey(item: HrOnboardingEntryApi.JobOption) {
  return `${item.depId}__${item.jobRowid}`;
}

function selectedJob() {
  return jobOptions.value.find((item) => jobOptionKey(item) === form.jobOptionKey);
}

async function loadMeta() {
  const [meta, jobs] = await Promise.all([getOfferApprovalMeta(), listDeptJobOptions()]);
  candidates.value = Array.isArray(meta?.candidates) ? meta.candidates : [];
  jobOptions.value = jobs;
}

async function load() {
  loading.value = true;
  try {
    const res = await listOffersWithPerm({ q: queryForm.q.trim() || undefined, status: queryForm.status === 'all' ? undefined : queryForm.status });
    rows.value = Array.isArray(res?.items) ? res.items : [];
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.offer_code = '';
  form.candidate_id = candidates.value[0]?.id || '';
  form.jobOptionKey = '';
  form.salary = '';
  form.probation_salary = '';
  form.probation_months = 3;
  form.start_date = '';
  form.work_location = '';
  form.status = 'pending';
  form.remark = '';
}

function ensureJobOption(row: HrRecruitmentOfferApi.Offer) {
  if (!row.dep_id || !row.job_rowid) return;
  const key = `${row.dep_id}__${row.job_rowid}`;
  if (jobOptions.value.some((item) => jobOptionKey(item) === key)) return;
  jobOptions.value = [
    ...jobOptions.value,
    {
      depId: row.dep_id,
      depName: row.depName || row.dep_id,
      jobRowid: row.job_rowid,
      jobName: row.jobName || row.job_rowid,
    },
  ];
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: HrRecruitmentOfferApi.Offer) {
  editing.value = row;
  ensureJobOption(row);
  form.offer_code = row.offer_code || '';
  form.candidate_id = row.candidate_id || '';
  form.jobOptionKey = row.dep_id && row.job_rowid ? `${row.dep_id}__${row.job_rowid}` : '';
  form.salary = row.salary == null ? '' : String(row.salary);
  form.probation_salary = row.probation_salary == null ? '' : String(row.probation_salary);
  form.probation_months = Number(row.probation_months ?? 3);
  form.start_date = row.start_date ? String(row.start_date).slice(0, 10) : '';
  form.work_location = row.work_location || '';
  form.status = row.status || 'pending';
  form.remark = row.remark || '';
  dialogOpen.value = true;
}

async function submit() {
  const job = selectedJob();
  if (!form.candidate_id) {
    ElMessage.warning('请选择候选人');
    return;
  }
  if (!job) {
    ElMessage.warning('请选择部门 / 岗位');
    return;
  }
  if (form.salary === '' || form.start_date === '') {
    ElMessage.warning('请输入薪资和入职日期');
    return;
  }
  const payload: HrRecruitmentOfferApi.Offer = {
    offer_code: form.offer_code || null,
    candidate_id: form.candidate_id,
    dep_id: job.depId,
    job_rowid: job.jobRowid,
    salary: Number(form.salary),
    probation_salary: form.probation_salary === '' ? null : Number(form.probation_salary),
    probation_months: Number(form.probation_months ?? 3),
    start_date: form.start_date,
    work_location: form.work_location || null,
    status: form.status,
    remark: form.remark || null,
  };
  saving.value = true;
  try {
    if (editing.value?.id) await updateOffer(editing.value.id, payload);
    else await createOffer(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function changeStatus(row: HrRecruitmentOfferApi.Offer, status: string) {
  if (!row.id) return;
  await updateOffer(row.id, { status });
  ElMessage.success(status === 'approved' ? '已通过' : '已驳回');
  await load();
}

async function handleDelete(row: HrRecruitmentOfferApi.Offer) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(`确认删除 Offer「${row.offer_code || row.candidateName || row.id}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await deleteOffer(row.id);
  ElMessage.success('删除成功');
  await load();
}

onMounted(() => {
  void Promise.all([loadMeta(), load()]);
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-recruitment-offer">
      <div class="page-header">
        <div>
          <h2>Offer审批</h2>
          <p>维护候选人 Offer、薪资、试用期、入职日期和审批状态。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增 Offer</el-button>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input v-model="queryForm.q" clearable placeholder="Offer编号 / 岗位关键词" style="width: 300px" @keyup.enter="load" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryForm.status" style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option label="待审批" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已驳回" value="rejected" />
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
          <div class="query-total">共 {{ rows.length }} 条</div>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <template #header><div class="card-title">Offer 列表</div></template>
        <el-table v-loading="loading" :data="rows" row-key="id" border height="100%">
          <el-table-column prop="offer_code" label="Offer编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="candidateName" label="候选人" min-width="130" show-overflow-tooltip />
          <el-table-column prop="depName" label="部门" min-width="130" show-overflow-tooltip />
          <el-table-column prop="jobName" label="岗位" min-width="130" show-overflow-tooltip />
          <el-table-column prop="salary" label="薪资" width="120" />
          <el-table-column prop="start_date" label="入职日期" width="130" />
          <el-table-column label="状态" width="110">
            <template #default="{ row = {}} = {}">
              <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'" effect="plain">
                {{ row.status === 'approved' ? '已通过' : row.status === 'rejected' ? '已驳回' : '待审批' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="230">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="success" :disabled="row.status !== 'pending'" @click="changeStatus(row, 'approved')">通过</el-button>
              <el-button link type="warning" :disabled="row.status !== 'pending'" @click="changeStatus(row, 'rejected')">驳回</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑 Offer' : '新增 Offer'" width="780px" destroy-on-close>
        <el-form :model="form" label-width="110px">
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item label="Offer编号"><el-input v-model="form.offer_code" disabled placeholder="保存后自动生成" /></el-form-item></el-col>
            <el-col :span="12">
              <el-form-item label="状态">
                <el-select v-model="form.status" style="width: 100%"><el-option label="待审批" value="pending" /><el-option label="已通过" value="approved" /><el-option label="已驳回" value="rejected" /></el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="候选人" required>
                <el-select v-model="form.candidate_id" filterable placeholder="选择候选人" style="width: 100%" @focus="loadMeta">
                  <el-option v-for="item in candidates" :key="item.id" :label="`${item.name}${item.entryNo ? `（${item.entryNo}）` : ''}`" :value="item.id" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="部门 / 岗位" required>
                <el-select v-model="form.jobOptionKey" filterable placeholder="选择部门与岗位" style="width: 100%" @focus="loadMeta">
                  <el-option v-for="item in jobOptions" :key="jobOptionKey(item)" :label="`${item.depName} / ${item.jobName}`" :value="jobOptionKey(item)" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12"><el-form-item label="薪资" required><el-input v-model="form.salary" type="number" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="试用期薪资"><el-input v-model="form.probation_salary" type="number" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="试用期（月）"><el-input v-model="form.probation_months" type="number" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="入职日期" required><el-input v-model="form.start_date" type="date" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="工作地点"><el-input v-model="form.work_location" /></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="备注"><el-input v-model="form.remark" :rows="3" type="textarea" /></el-form-item></el-col>
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
.hr-recruitment-offer { display: flex; min-height: 100%; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
.page-header p { margin: 6px 0 0; color: var(--el-text-color-secondary); }
.query-card :deep(.el-card__body) { padding-bottom: 2px; }
.query-total { margin-left: auto; color: var(--el-text-color-secondary); font-size: 14px; line-height: 32px; }
.card-title { font-weight: 600; }
</style>
