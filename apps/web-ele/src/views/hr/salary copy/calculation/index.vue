<script lang="ts" setup>
import type { HrAttendanceApi } from '#/api/erp/human-resources/attendance';
import type { HrSalaryCalculationApi } from '#/api/erp/human-resources/salary/calculation';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { listUserDjOptions } from '#/api/erp/human-resources/attendance';
import {
  createSalaryCalculation,
  deleteSalaryCalculation,
  listSalaryCalculations,
  updateSalaryCalculation,
} from '#/api/erp/human-resources/salary/calculation';

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

defineOptions({ name: 'HrSalaryCalculationPage' });

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editing = ref<HrSalaryCalculationApi.Calculation | null>(null);
const rows = ref<HrSalaryCalculationApi.Calculation[]>([]);
const userDjOptions = ref<HrAttendanceApi.UserDjOption[]>([]);

const queryForm = reactive({
  year: '2026',
  month: '03',
  q: '',
  status: 'all',
});

const form = reactive({
  calc_code: '',
  user_dj_rowid: '',
  base_salary: 0,
  bonus: 0,
  allowance: 0,
  deduction: 0,
  tax: 0,
  status: '待发放',
  remark: '',
});

const totalActual = computed(() => rows.value.reduce((sum, row) => sum + Number(row.actual_salary || 0), 0));
const pendingCount = computed(() => rows.value.filter((row) => row.status === '待发放').length);
const paidCount = computed(() => rows.value.filter((row) => row.status === '已发放').length);
const actualSalary = computed(() => Number(form.base_salary || 0) + Number(form.bonus || 0) + Number(form.allowance || 0) - Number(form.deduction || 0) - Number(form.tax || 0));

async function loadUserOptions() {
  userDjOptions.value = await listUserDjOptions({ q: queryForm.q.trim() || undefined });
}

async function load() {
  loading.value = true;
  try {
    const [data] = await Promise.all([
      listSalaryCalculations({
        year: queryForm.year,
        month: queryForm.month,
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

function selectedUser() {
  return userDjOptions.value.find((item) => String(item.userDjRowid) === String(form.user_dj_rowid));
}

function resetForm() {
  form.calc_code = '';
  form.user_dj_rowid = '';
  form.base_salary = 0;
  form.bonus = 0;
  form.allowance = 0;
  form.deduction = 0;
  form.tax = 0;
  form.status = '待发放';
  form.remark = '';
}

function ensureUserOption(row: HrSalaryCalculationApi.Calculation) {
  if (!row.user_dj_rowid || userDjOptions.value.some((item) => String(item.userDjRowid) === String(row.user_dj_rowid))) return;
  userDjOptions.value = [
    ...userDjOptions.value,
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

function openEdit(row: HrSalaryCalculationApi.Calculation) {
  editing.value = row;
  ensureUserOption(row);
  form.calc_code = row.calc_code || '';
  form.user_dj_rowid = row.user_dj_rowid || '';
  form.base_salary = Number(row.base_salary || 0);
  form.bonus = Number(row.bonus || 0);
  form.allowance = Number(row.allowance || 0);
  form.deduction = Number(row.deduction || 0);
  form.tax = Number(row.tax || 0);
  form.status = row.status || '待发放';
  form.remark = row.remark || '';
  dialogOpen.value = true;
}

async function submit() {
  const user = selectedUser();
  if (!user) {
    ElMessage.warning('请选择人员');
    return;
  }
  const payload: HrSalaryCalculationApi.Calculation = {
    calc_code: form.calc_code || null,
    salary_year: queryForm.year,
    salary_month: queryForm.month,
    user_rowid: user.userRowid,
    user_dj_rowid: user.userDjRowid,
    dep_id: user.depId,
    job_rowid: user.jobRowid,
    base_salary: Number(form.base_salary || 0),
    bonus: Number(form.bonus || 0),
    allowance: Number(form.allowance || 0),
    deduction: Number(form.deduction || 0),
    tax: Number(form.tax || 0),
    actual_salary: actualSalary.value,
    status: form.status,
    remark: form.remark || null,
  };
  saving.value = true;
  try {
    if (editing.value?.id) await updateSalaryCalculation(editing.value.id, payload);
    else await createSalaryCalculation(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: HrSalaryCalculationApi.Calculation) {
  if (!row.id) return;
  await ElMessageBox.confirm(`确认删除薪资核算「${row.calc_code || row.userName || row.id}」吗？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  });
  await deleteSalaryCalculation(row.id);
  ElMessage.success('删除成功');
  await load();
}

async function markPaid(row: HrSalaryCalculationApi.Calculation) {
  if (!row.id) return;
  await updateSalaryCalculation(row.id, { status: '已发放' });
  ElMessage.success('已标记发放');
  await load();
}

onMounted(() => {
  void load();
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-salary-calculation">
      <div class="page-header">
        <div>
          <h2>薪资核算</h2>
          <p>核算员工基本工资、奖金、补贴、扣款、个税和实发薪资，核算编号保存后自动生成。</p>
        </div>
        <div class="header-actions">
          <el-button @click="load">刷新</el-button>
          <el-button type="primary" @click="openCreate">新增</el-button>
        </div>
      </div>

      <div class="summary-grid">
        <el-card shadow="never">
          <div class="summary-number">{{ rows.length }}</div>
          <div class="summary-label">核算记录</div>
        </el-card>
        <el-card shadow="never">
          <div class="summary-number">{{ pendingCount }}</div>
          <div class="summary-label">待发放</div>
        </el-card>
        <el-card shadow="never">
          <div class="summary-number">{{ paidCount }}</div>
          <div class="summary-label">已发放</div>
        </el-card>
        <el-card shadow="never">
          <div class="summary-number">{{ totalActual.toFixed(2) }}</div>
          <div class="summary-label">实发合计</div>
        </el-card>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="年度">
            <el-input v-model="queryForm.year" style="width: 100px" />
          </el-form-item>
          <el-form-item label="月份">
            <el-input v-model="queryForm.month" style="width: 100px" />
          </el-form-item>
          <el-form-item label="关键词">
            <el-input v-model="queryForm.q" clearable placeholder="核算编号 / 姓名 / 部门 / 岗位" style="width: 300px" @keyup.enter="load" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryForm.status" style="width: 130px">
              <el-option label="全部" value="all" />
              <el-option label="待发放" value="待发放" />
              <el-option label="已发放" value="已发放" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="load">查询</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="card-title">薪资核算列表</div>
        </template>
        <el-table v-loading="loading" :data="rows" row-key="id" border height="100%">
          <el-table-column prop="calc_code" label="核算编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="userName" label="人员" min-width="120" show-overflow-tooltip />
          <el-table-column prop="departmentName" label="部门" min-width="120" show-overflow-tooltip />
          <el-table-column prop="jobName" label="岗位" min-width="120" show-overflow-tooltip />
          <el-table-column prop="base_salary" label="基本" width="100" />
          <el-table-column prop="bonus" label="奖金" width="100" />
          <el-table-column prop="allowance" label="补贴" width="100" />
          <el-table-column prop="deduction" label="扣款" width="100" />
          <el-table-column prop="tax" label="个税" width="100" />
          <el-table-column prop="actual_salary" label="实发" width="110" />
          <el-table-column label="周期" width="110">
            <template #default="{ row = {}} = {}">{{ `${row.salary_year || '-'}-${row.salary_month || '-'}` }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row = {}} = {}">
              <el-tag :type="row.status === '已发放' ? 'success' : 'warning'" effect="plain">{{ row.status || '待发放' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="180">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="success" :disabled="row.status === '已发放'" @click="markPaid(row)">发放</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑薪资核算' : '新增薪资核算'" width="780px" destroy-on-close>
        <el-form :model="form" label-width="110px">
          <el-row :gutter="16">
            <el-col :span="24">
              <el-form-item label="核算编号">
                <el-input v-model="form.calc_code" disabled placeholder="保存后自动生成" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="人员" required>
                <el-select v-model="form.user_dj_rowid" filterable placeholder="选择人员" style="width: 100%" @focus="loadUserOptions">
                  <el-option
                    v-for="item in userDjOptions"
                    :key="item.userDjRowid"
                    :label="`${item.userName} / ${item.depName} / ${item.jobName}`"
                    :value="item.userDjRowid"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12"><el-form-item label="基本工资"><el-input v-model="form.base_salary" type="number" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="绩效奖金"><el-input v-model="form.bonus" type="number" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="补贴"><el-input v-model="form.allowance" type="number" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="扣款"><el-input v-model="form.deduction" type="number" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="个税"><el-input v-model="form.tax" type="number" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="实发薪资"><el-input :model-value="actualSalary.toFixed(2)" disabled /></el-form-item></el-col>
            <el-col :span="12">
              <el-form-item label="状态">
                <el-select v-model="form.status" style="width: 100%">
                  <el-option label="待发放" value="待发放" />
                  <el-option label="已发放" value="已发放" />
                </el-select>
              </el-form-item>
            </el-col>
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
.hr-salary-calculation {
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

.header-actions {
  display: flex;
  gap: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-number {
  font-size: 24px;
  font-weight: 700;
}

.summary-label {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
}

.query-card :deep(.el-card__body) {
  padding-bottom: 2px;
}

.card-title {
  font-weight: 600;
}
</style>
