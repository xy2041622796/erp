<script lang="ts" setup>
import type { HrOnboardingEntryApi } from '#/api/erp/human-resources/onboarding/entry';
import type { HrRecruitmentJobPostingApi } from '#/api/erp/human-resources/recruitment/job-posting';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { listDeptJobOptions } from '#/api/erp/human-resources/onboarding/entry';
import {
  createJobPosting,
  deleteJobPosting,
  listJobPostingsWithPerm,
  updateJobPosting,
} from '#/api/erp/human-resources/recruitment/job-posting';

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

defineOptions({ name: 'HrRecruitmentJobPostingPage' });

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editing = ref<HrRecruitmentJobPostingApi.JobPosting | null>(null);
const rows = ref<HrRecruitmentJobPostingApi.JobPosting[]>([]);
const jobOptions = ref<HrOnboardingEntryApi.JobOption[]>([]);

const queryForm = reactive({ q: '', status: 'all' });
const form = reactive({
  job_code: '',
  title: '',
  jobOptionKey: '',
  headcount: 1,
  salary_min: '',
  salary_max: '',
  requirements: '',
  responsibilities: '',
  status: 'open',
  published_at: '',
  deadline: '',
});

function jobOptionKey(item: HrOnboardingEntryApi.JobOption) {
  return `${item.depId}__${item.jobRowid}`;
}

function selectedJob() {
  return jobOptions.value.find(
    (item) => jobOptionKey(item) === form.jobOptionKey,
  );
}

async function loadJobOptions() {
  jobOptions.value = await listDeptJobOptions();
}

async function load() {
  loading.value = true;
  try {
    const res = await listJobPostingsWithPerm({
      q: queryForm.q.trim() || undefined,
      status: queryForm.status === 'all' ? undefined : queryForm.status,
    });
    rows.value = Array.isArray(res?.items) ? res.items : [];
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.job_code = '';
  form.title = '';
  form.jobOptionKey = '';
  form.headcount = 1;
  form.salary_min = '';
  form.salary_max = '';
  form.requirements = '';
  form.responsibilities = '';
  form.status = 'open';
  form.published_at = '';
  form.deadline = '';
}

function ensureJobOption(row: HrRecruitmentJobPostingApi.JobPosting) {
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

function openEdit(row: HrRecruitmentJobPostingApi.JobPosting) {
  editing.value = row;
  ensureJobOption(row);
  form.job_code = row.job_code || '';
  form.title = row.title || '';
  form.jobOptionKey =
    row.dep_id && row.job_rowid ? `${row.dep_id}__${row.job_rowid}` : '';
  form.headcount = Number(row.headcount ?? 1);
  form.salary_min = row.salary_min == null ? '' : String(row.salary_min);
  form.salary_max = row.salary_max == null ? '' : String(row.salary_max);
  form.requirements = row.requirements || '';
  form.responsibilities = row.responsibilities || '';
  form.status = row.status || 'open';
  form.published_at = row.published_at
    ? String(row.published_at).slice(0, 10)
    : '';
  form.deadline = row.deadline ? String(row.deadline).slice(0, 10) : '';
  dialogOpen.value = true;
}

async function submit() {
  const job = selectedJob();
  if (!form.title.trim()) {
    ElMessage.warning('请输入标题');
    return;
  }
  if (!job) {
    ElMessage.warning('请选择部门 / 岗位');
    return;
  }
  const payload: HrRecruitmentJobPostingApi.JobPosting = {
    job_code: form.job_code || null,
    title: form.title,
    dep_id: job.depId,
    job_rowid: job.jobRowid,
    headcount: Number(form.headcount ?? 1),
    salary_min: form.salary_min === '' ? null : Number(form.salary_min),
    salary_max: form.salary_max === '' ? null : Number(form.salary_max),
    requirements: form.requirements || null,
    responsibilities: form.responsibilities || null,
    status: form.status,
    published_at: form.published_at || null,
    deadline: form.deadline || null,
  };
  saving.value = true;
  try {
    if (editing.value?.id) await updateJobPosting(editing.value.id, payload);
    else await createJobPosting(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: HrRecruitmentJobPostingApi.JobPosting) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(
      `确认删除职位「${row.title || row.job_code || row.id}」吗？`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  await deleteJobPosting(row.id);
  ElMessage.success('删除成功');
  await load();
}

onMounted(() => {
  void Promise.all([loadJobOptions(), load()]);
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-recruitment-job-posting">
      <div class="page-header">
        <div>
          <h2>招聘职位</h2>
          <p>维护招聘职位、部门岗位、招聘人数、薪资范围和发布状态。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增职位</el-button>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input
              v-model="queryForm.q"
              clearable
              placeholder="职位编号 / 标题 / 部门 / 岗位"
              style="width: 320px"
              @keyup.enter="load"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryForm.status" style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option label="招聘中" value="open" />
              <el-option label="已关闭" value="closed" />
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
        <template #header><div class="card-title">职位列表</div></template>
        <el-table
          v-loading="loading"
          :data="rows"
          row-key="id"
          border
          height="100%"
        >
          <el-table-column
            prop="job_code"
            label="职位编号"
            min-width="150"
            show-overflow-tooltip
          />
          <el-table-column
            prop="title"
            label="标题"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column
            prop="depName"
            label="部门"
            min-width="130"
            show-overflow-tooltip
          />
          <el-table-column
            prop="jobName"
            label="岗位"
            min-width="130"
            show-overflow-tooltip
          />
          <el-table-column prop="headcount" label="人数" width="80" />
          <el-table-column label="薪资范围" min-width="140">
            <template #default="{ row = {} } = {}">{{
              row.salary_min != null || row.salary_max != null
                ? `${row.salary_min ?? '-'} ~ ${row.salary_max ?? '-'}`
                : '-'
            }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row = {} } = {}"
              ><el-tag
                :type="row.status === 'open' ? 'success' : 'info'"
                effect="plain"
                >{{ row.status === 'open' ? '招聘中' : '已关闭' }}</el-tag
              ></template
            >
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="130">
            <template #default="{ row = {} } = {}">
              <el-button link type="primary" @click="openEdit(row)"
                >编辑</el-button
              >
              <el-button link type="danger" @click="handleDelete(row)"
                >删除</el-button
              >
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog
        v-model="dialogOpen"
        :title="editing ? '编辑职位' : '新增职位'"
        width="780px"
        destroy-on-close
      >
        <el-form :model="form" label-width="110px">
          <el-row :gutter="16">
            <el-col :span="12"
              ><el-form-item label="职位编号"
                ><el-input
                  v-model="form.job_code"
                  disabled
                  placeholder="保存后自动生成" /></el-form-item
            ></el-col>
            <el-col :span="12"
              ><el-form-item label="标题" required
                ><el-input v-model="form.title" /></el-form-item
            ></el-col>
            <el-col :span="24">
              <el-form-item label="部门 / 岗位" required>
                <el-select
                  v-model="form.jobOptionKey"
                  filterable
                  placeholder="选择部门与岗位"
                  style="width: 100%"
                  @focus="loadJobOptions"
                >
                  <el-option
                    v-for="item in jobOptions"
                    :key="jobOptionKey(item)"
                    :label="`${item.depName} / ${item.jobName}`"
                    :value="jobOptionKey(item)"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12"
              ><el-form-item label="招聘人数"
                ><el-input
                  v-model="form.headcount"
                  type="number" /></el-form-item
            ></el-col>
            <el-col :span="12">
              <el-form-item label="状态">
                <el-select v-model="form.status" style="width: 100%"
                  ><el-option label="招聘中" value="open" /><el-option
                    label="已关闭"
                    value="closed"
                /></el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12"
              ><el-form-item label="最低薪资"
                ><el-input
                  v-model="form.salary_min"
                  type="number" /></el-form-item
            ></el-col>
            <el-col :span="12"
              ><el-form-item label="最高薪资"
                ><el-input
                  v-model="form.salary_max"
                  type="number" /></el-form-item
            ></el-col>
            <el-col :span="12"
              ><el-form-item label="发布日期"
                ><el-input
                  v-model="form.published_at"
                  type="date" /></el-form-item
            ></el-col>
            <el-col :span="12"
              ><el-form-item label="截止日期"
                ><el-input v-model="form.deadline" type="date" /></el-form-item
            ></el-col>
            <el-col :span="24"
              ><el-form-item label="任职要求"
                ><el-input
                  v-model="form.requirements"
                  :rows="3"
                  type="textarea" /></el-form-item
            ></el-col>
            <el-col :span="24"
              ><el-form-item label="岗位职责"
                ><el-input
                  v-model="form.responsibilities"
                  :rows="3"
                  type="textarea" /></el-form-item
            ></el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button :disabled="saving" @click="dialogOpen = false"
            >取消</el-button
          >
          <el-button :loading="saving" type="primary" @click="submit"
            >保存</el-button
          >
        </template>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-recruitment-job-posting {
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
.query-card :deep(.el-card__body) {
  padding-bottom: 2px;
}
.query-total {
  margin-left: auto;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 32px;
}
.card-title {
  font-weight: 600;
}
</style>
