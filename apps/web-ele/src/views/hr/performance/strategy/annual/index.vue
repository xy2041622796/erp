<script lang="ts" setup>
import type { HrPerformanceStrategyAnnualApi } from '#/api/erp/human-resources/performance/strategy-annual';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  createPerformanceStrategyAnnual,
  listPerformanceStrategyAnnuals,
  updatePerformanceStrategyAnnual,
} from '#/api/erp/human-resources/performance/strategy-annual';

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
  ElOption,
  ElProgress,
  ElRow,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

/** siweiOA 年度指标下达真实迁移页 */
defineOptions({ name: 'HrPerformanceStrategyAnnualPage' });

const CURRENT_YEAR = new Date().getFullYear();
const statusOptions = ['草稿', '已下达', '执行中', '已完成'];
const typeOptions = ['KPI', 'OKR'];

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const viewOpen = ref(false);
const editing = ref<HrPerformanceStrategyAnnualApi.Annual | null>(null);
const viewing = ref<HrPerformanceStrategyAnnualApi.Annual | null>(null);
const rows = ref<HrPerformanceStrategyAnnualApi.Annual[]>([]);

const queryForm = reactive({
  year: String(CURRENT_YEAR),
  departmentName: 'all',
  type: 'all',
});

const form = reactive({
  indicatorCode: '',
  indicatorName: '',
  departmentName: '',
  year: String(CURRENT_YEAR),
  targetValue: '',
  weight: '',
  status: '执行中',
  remark: '',
});

const years = computed(() => {
  const values = new Set<string>();
  for (let year = CURRENT_YEAR - 5; year <= CURRENT_YEAR + 1; year += 1) values.add(String(year));
  rows.value.forEach((row) => {
    if (row.year) values.add(String(row.year));
  });
  return [...values].sort((a, b) => Number(b) - Number(a));
});

const departmentOptions = computed(() => {
  const values = new Set<string>();
  rows.value.forEach((row) => {
    if (row.departmentName) values.add(String(row.departmentName));
  });
  return [...values].sort();
});

const filteredRows = computed(() => {
  return rows.value.filter((row) => {
    const departmentOk = queryForm.departmentName === 'all' || String(row.departmentName || '') === queryForm.departmentName;
    const typeOk = queryForm.type === 'all' || inferType(row) === queryForm.type;
    return departmentOk && typeOk;
  });
});

function inferType(row: HrPerformanceStrategyAnnualApi.Annual): 'KPI' | 'OKR' {
  const code = String(row.indicatorCode || '');
  const name = String(row.indicatorName || '');
  if (/OKR/i.test(code) || /OKR/i.test(name)) return 'OKR';
  return 'KPI';
}

function progressByStatus(status?: string) {
  if (status === '已完成') return 100;
  if (status === '执行中') return 70;
  if (status === '已下达') return 15;
  return 0;
}

function statusTagType(status?: string) {
  if (status === '已完成') return 'success';
  if (status === '执行中') return 'warning';
  if (status === '已下达') return 'primary';
  return 'info';
}

function resetForm() {
  form.indicatorCode = '';
  form.indicatorName = '';
  form.departmentName = '';
  form.year = queryForm.year;
  form.targetValue = '';
  form.weight = '';
  form.status = '执行中';
  form.remark = '';
}

async function load() {
  loading.value = true;
  try {
    const data = await listPerformanceStrategyAnnuals({ year: queryForm.year });
    rows.value = Array.isArray(data) ? data : [];
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: HrPerformanceStrategyAnnualApi.Annual) {
  editing.value = row;
  form.indicatorCode = row.indicatorCode || '';
  form.indicatorName = row.indicatorName || '';
  form.departmentName = row.departmentName || '';
  form.year = row.year || queryForm.year;
  form.targetValue = row.targetValue || '';
  form.weight = row.weight || '';
  form.status = row.status || '执行中';
  form.remark = row.remark || '';
  dialogOpen.value = true;
}

function openView(row: HrPerformanceStrategyAnnualApi.Annual) {
  viewing.value = row;
  viewOpen.value = true;
}

function importTodo() {
  ElMessage.info('批量导入功能待接入导入组件');
}

function exportTodo() {
  ElMessage.info('导出功能待接入导出服务');
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
  if (!form.departmentName.trim()) {
    ElMessage.warning('请输入部门');
    return;
  }
  if (!form.year.trim()) {
    ElMessage.warning('请输入年度');
    return;
  }

  const payload: HrPerformanceStrategyAnnualApi.Annual = {
    indicatorCode: form.indicatorCode,
    indicatorName: form.indicatorName,
    departmentName: form.departmentName,
    year: form.year,
    targetValue: form.targetValue,
    weight: form.weight,
    status: form.status,
    remark: form.remark,
  };

  saving.value = true;
  try {
    if (editing.value?.id) await updatePerformanceStrategyAnnual(editing.value.id, payload);
    else await createPerformanceStrategyAnnual(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    queryForm.year = payload.year || queryForm.year;
    await load();
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-performance-strategy-annual">
      <div class="page-header">
        <div>
          <h2>年度指标下达</h2>
          <p>按年度维护部门 KPI / OKR 指标、目标值、权重和执行状态。</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="openCreate">下达指标</el-button>
          <el-button @click="importTodo">批量导入</el-button>
          <el-button @click="exportTodo">导出</el-button>
        </div>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="年度">
            <el-select v-model="queryForm.year" style="width: 140px" @change="load">
              <el-option v-for="item in years" :key="item" :label="`${item}年`" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="部门">
            <el-select v-model="queryForm.departmentName" clearable style="width: 180px">
              <el-option label="全部部门" value="all" />
              <el-option v-for="item in departmentOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="queryForm.type" style="width: 140px">
              <el-option label="全部类型" value="all" />
              <el-option v-for="item in typeOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="load">查询</el-button>
            <el-button
              @click="
                queryForm.year = String(CURRENT_YEAR);
                queryForm.departmentName = 'all';
                queryForm.type = 'all';
                load();
              "
            >
              重置
            </el-button>
          </el-form-item>
          <div class="query-total">共 {{ filteredRows.length }} 条指标</div>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="card-title">年度指标列表</div>
        </template>
        <el-table v-loading="loading" :data="filteredRows" row-key="id" border height="100%">
          <el-table-column prop="departmentName" label="部门" min-width="140" show-overflow-tooltip />
          <el-table-column label="类型" width="90">
            <template #default="{ row = {}} = {}">
              <el-tag :type="inferType(row) === 'KPI' ? 'primary' : 'warning'" effect="plain">{{ inferType(row) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="indicatorName" label="指标名称" min-width="220" show-overflow-tooltip />
          <el-table-column prop="targetValue" label="目标值" min-width="130" show-overflow-tooltip />
          <el-table-column prop="weight" label="权重" width="100" />
          <el-table-column label="周期" width="90">年度</el-table-column>
          <el-table-column label="进度" min-width="190">
            <template #default="{ row = {}} = {}">
              <div class="progress-cell">
                <el-progress :percentage="progressByStatus(row.status)" :show-text="false" />
                <span>{{ progressByStatus(row.status) }}%</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row = {}} = {}">
              <el-tag :type="statusTagType(row.status)" effect="plain">{{ row.status || '草稿' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="130">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openView(row)">查看</el-button>
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑指标' : '下达指标'" width="760px" destroy-on-close>
        <el-form :model="form" label-width="100px">
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
              <el-form-item label="部门" required>
                <el-input v-model="form.departmentName" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="年度" required>
                <el-input v-model="form.year" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="目标值">
                <el-input v-model="form.targetValue" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="权重">
                <el-input v-model="form.weight" />
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
                <el-input v-model="form.remark" :rows="3" type="textarea" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button :disabled="saving" @click="dialogOpen = false">取消</el-button>
          <el-button :loading="saving" type="primary" @click="submit">保存</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="viewOpen" title="指标详情" width="640px">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="指标编号">{{ viewing?.indicatorCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="指标名称">{{ viewing?.indicatorName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ viewing?.departmentName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="年度">{{ viewing?.year || '-' }}</el-descriptions-item>
          <el-descriptions-item label="目标值">{{ viewing?.targetValue || '-' }}</el-descriptions-item>
          <el-descriptions-item label="权重">{{ viewing?.weight || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ viewing?.status || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ viewing?.remark || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-performance-strategy-annual {
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

.card-title {
  font-weight: 600;
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

.progress-cell {
  display: grid;
  grid-template-columns: minmax(80px, 1fr) 42px;
  align-items: center;
  gap: 10px;
}
</style>
