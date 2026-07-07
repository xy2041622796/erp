<script lang="ts" setup>
import type { HrAttendanceApi } from '#/api/erp/human-resources/attendance';
import type { HrPerformanceStrategyMonthlyApi } from '#/api/erp/human-resources/performance/strategy-monthly';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { listUserDjOptions } from '#/api/erp/human-resources/attendance';
import {
  createPerformanceStrategyMonthly,
  deletePerformanceStrategyMonthly,
  listPerformanceStrategyMonthlies,
  updatePerformanceStrategyMonthly,
} from '#/api/erp/human-resources/performance/strategy-monthly';

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
  ElProgress,
  ElRow,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

/** siweiOA 月度计划填报真实迁移页 */
defineOptions({ name: 'HrPerformanceStrategyMonthlyPage' });

const statusOptions = ['草稿', '已提交', '已完成'];

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const viewOpen = ref(false);
const editing = ref<HrPerformanceStrategyMonthlyApi.Monthly | null>(null);
const viewing = ref<HrPerformanceStrategyMonthlyApi.Monthly | null>(null);
const rows = ref<HrPerformanceStrategyMonthlyApi.Monthly[]>([]);
const userDjOptions = ref<HrAttendanceApi.UserDjOption[]>([]);

const queryForm = reactive({
  q: '',
  status: 'all',
});

const form = reactive({
  planCode: '',
  planName: '',
  departmentName: '',
  monthText: '',
  ownerName: '',
  ownerNameId: '',
  ownerNameDepId: '',
  ownerNameDepName: '',
  status: '草稿',
  content: '',
  completionRate: '',
});

const completedCount = computed(() => rows.value.filter((row) => row.status === '已完成').length);
const submittedCount = computed(() => rows.value.filter((row) => row.status === '已提交').length);

function completionRate(row: HrPerformanceStrategyMonthlyApi.Monthly) {
  if (row.completionRate) return row.completionRate;
  if (row.status === '已完成') return '100%';
  if (row.status === '已提交') return '90%';
  if (row.status === '草稿') return '75%';
  return '';
}

function completionPercent(row: HrPerformanceStrategyMonthlyApi.Monthly) {
  const rate = completionRate(row);
  const match = String(rate).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function statusTagType(status?: string) {
  if (status === '已完成') return 'success';
  if (status === '已提交') return 'warning';
  return 'info';
}

async function loadUserOptions() {
  userDjOptions.value = await listUserDjOptions({ q: queryForm.q.trim() || undefined });
}

async function load() {
  loading.value = true;
  try {
    const [data] = await Promise.all([
      listPerformanceStrategyMonthlies({
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

function selectedOwner() {
  return userDjOptions.value.find((item) => String(item.userDjRowid) === String(form.ownerNameId));
}

function resetForm() {
  form.planCode = '';
  form.planName = '';
  form.departmentName = '';
  form.monthText = '';
  form.ownerName = '';
  form.ownerNameId = '';
  form.ownerNameDepId = '';
  form.ownerNameDepName = '';
  form.status = '草稿';
  form.content = '';
  form.completionRate = '';
}

function ensureOwnerOption(row: HrPerformanceStrategyMonthlyApi.Monthly) {
  if (!row.ownerNameId || userDjOptions.value.some((item) => String(item.userDjRowid) === String(row.ownerNameId))) return;
  userDjOptions.value = [
    ...userDjOptions.value,
    {
      userDjRowid: row.ownerNameId,
      userRowid: row.ownerNameId,
      depId: row.ownerNameDepId || '',
      depName: row.ownerNameDepName || row.departmentName || '',
      jobRowid: '',
      jobName: '',
      userName: row.ownerName || row.ownerNameId,
    },
  ];
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: HrPerformanceStrategyMonthlyApi.Monthly) {
  editing.value = row;
  ensureOwnerOption(row);
  form.planCode = row.planCode || '';
  form.planName = row.planName || '';
  form.departmentName = row.departmentName || '';
  form.monthText = row.monthText || '';
  form.ownerName = row.ownerName || '';
  form.ownerNameId = row.ownerNameId || '';
  form.ownerNameDepId = row.ownerNameDepId || '';
  form.ownerNameDepName = row.ownerNameDepName || '';
  form.status = row.status || '草稿';
  form.content = row.content || '';
  form.completionRate = row.completionRate || '';
  dialogOpen.value = true;
}

function openView(row: HrPerformanceStrategyMonthlyApi.Monthly) {
  viewing.value = row;
  viewOpen.value = true;
}

async function submit() {
  if (!form.planCode.trim()) {
    ElMessage.warning('请输入计划编号');
    return;
  }
  if (!form.planName.trim()) {
    ElMessage.warning('请输入计划名称');
    return;
  }
  if (!form.departmentName.trim()) {
    ElMessage.warning('请输入部门');
    return;
  }
  if (!form.monthText.trim()) {
    ElMessage.warning('请输入月份');
    return;
  }

  const owner = selectedOwner();
  const payload: HrPerformanceStrategyMonthlyApi.Monthly = {
    planCode: form.planCode,
    planName: form.planName,
    departmentName: form.departmentName,
    monthText: form.monthText,
    ownerName: owner?.userName || form.ownerName,
    ownerNameId: owner?.userDjRowid || form.ownerNameId,
    ownerNameDepId: owner?.depId || form.ownerNameDepId,
    ownerNameDepName: owner?.depName || form.ownerNameDepName,
    status: form.status,
    content: form.content,
    completionRate: form.completionRate,
  };

  saving.value = true;
  try {
    if (editing.value?.id) await updatePerformanceStrategyMonthly(editing.value.id, payload);
    else await createPerformanceStrategyMonthly(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: HrPerformanceStrategyMonthlyApi.Monthly) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(`确认删除月度计划「${row.planName || row.planCode || row.id}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await deletePerformanceStrategyMonthly(row.id);
  ElMessage.success('删除成功');
  await load();
}

async function markSubmitted(row: HrPerformanceStrategyMonthlyApi.Monthly) {
  if (!row.id) return;
  await updatePerformanceStrategyMonthly(row.id, { status: '已提交' });
  ElMessage.success('已提交月度计划');
  await load();
}

async function markFinished(row: HrPerformanceStrategyMonthlyApi.Monthly) {
  if (!row.id) return;
  await updatePerformanceStrategyMonthly(row.id, { status: '已完成', completionRate: row.completionRate || '100%' });
  ElMessage.success('已完成月度计划');
  await load();
}

onMounted(() => {
  void load();
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-performance-strategy-monthly">
      <div class="page-header">
        <div>
          <h2>月度计划填报</h2>
          <p>维护部门月度绩效计划、负责人、计划内容、完成率和状态。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增计划</el-button>
      </div>

      <div class="summary-grid">
        <el-card shadow="never">
          <div class="summary-number">{{ rows.length }}</div>
          <div class="summary-label">计划总数</div>
        </el-card>
        <el-card shadow="never">
          <div class="summary-number">{{ submittedCount }}</div>
          <div class="summary-label">已提交</div>
        </el-card>
        <el-card shadow="never">
          <div class="summary-number">{{ completedCount }}</div>
          <div class="summary-label">已完成</div>
        </el-card>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input v-model="queryForm.q" clearable placeholder="计划编号 / 计划名称 / 部门 / 月份" style="width: 320px" @keyup.enter="load" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryForm.status" style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
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
          <div class="card-title">月度计划列表</div>
        </template>
        <el-table v-loading="loading" :data="rows" row-key="id" border height="100%">
          <el-table-column prop="departmentName" label="部门" min-width="130" show-overflow-tooltip />
          <el-table-column prop="planName" label="指标名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="planCode" label="年度目标" min-width="130" show-overflow-tooltip />
          <el-table-column prop="monthText" label="月度目标" min-width="120" show-overflow-tooltip />
          <el-table-column prop="content" label="实际完成" min-width="220" show-overflow-tooltip />
          <el-table-column label="完成率" min-width="150">
            <template #default="{ row = {}} = {}">
              <div class="progress-cell">
                <el-progress :percentage="completionPercent(row)" :show-text="false" />
                <span>{{ completionRate(row) || '-' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row = {}} = {}">
              <el-tag :type="statusTagType(row.status)" effect="plain">{{ row.status || '草稿' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="ownerName" label="填报人" min-width="120" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" width="230">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openView(row)">查看</el-button>
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="warning" :disabled="row.status !== '草稿'" @click="markSubmitted(row)">提交</el-button>
              <el-button link type="success" :disabled="row.status === '已完成'" @click="markFinished(row)">完成</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑月度计划' : '新增月度计划'" width="780px" destroy-on-close>
        <el-form :model="form" label-width="110px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="计划编号" required>
                <el-input v-model="form.planCode" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="计划名称" required>
                <el-input v-model="form.planName" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="部门" required>
                <el-input v-model="form.departmentName" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="月份" required>
                <el-input v-model="form.monthText" placeholder="如 2026-03" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="负责人">
                <el-select v-model="form.ownerNameId" clearable filterable placeholder="选择负责人" style="width: 100%" @focus="loadUserOptions">
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
              <el-form-item label="状态">
                <el-select v-model="form.status" style="width: 100%">
                  <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="完成率">
                <el-input v-model="form.completionRate" placeholder="如 80%" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="计划内容">
                <el-input v-model="form.content" :rows="4" type="textarea" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button :disabled="saving" @click="dialogOpen = false">取消</el-button>
          <el-button :loading="saving" type="primary" @click="submit">保存</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="viewOpen" title="月度计划详情" width="680px">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="计划编号">{{ viewing?.planCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="计划名称">{{ viewing?.planName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ viewing?.departmentName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="月份">{{ viewing?.monthText || '-' }}</el-descriptions-item>
          <el-descriptions-item label="负责人">{{ viewing?.ownerName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="完成率">{{ viewing ? completionRate(viewing) || '-' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ viewing?.status || '-' }}</el-descriptions-item>
          <el-descriptions-item label="计划内容">{{ viewing?.content || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-performance-strategy-monthly {
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

.card-title {
  font-weight: 600;
}

.query-card :deep(.el-card__body) {
  padding-bottom: 2px;
}

.progress-cell {
  display: grid;
  grid-template-columns: minmax(80px, 1fr) 50px;
  align-items: center;
  gap: 10px;
}
</style>
