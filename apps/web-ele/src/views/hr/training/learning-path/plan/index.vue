<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  createTrainingPlan,
  deleteTrainingPlan,
  getTrainingList,
  updateTrainingPlan,
} from '#/api/erp/human-resources/training';

import HrDetailDrawer from '../../../components/HrDetailDrawer.vue';
import HrPageIntro from '../../../components/HrPageIntro.vue';

import {
  Delete,
  Download,
  EditPen,
  Plus,
  Search,
  View,
} from '@element-plus/icons-vue';
import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'HrTrainingLearningPathPlanPage' });

const loading = ref(false);
const keyword = ref('');
const planType = ref('all');
const statusFilter = ref('all');
const rows = ref<any[]>([]);
const detailVisible = ref(false);
const detailRow = ref<any>(null);
const formVisible = ref(false);
const formSaving = ref(false);
const editingRow = ref<any>(null);
const form = reactive({
  description: '',
  employeeName: '',
  employeeNameDepName: '',
  endTime: '',
  period: '',
  planCode: '',
  planName: '',
  planType: '专项计划',
  startTime: '',
  status: '草稿',
});

function createPlanCode() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `PLAN-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(Date.now()).slice(-5)}`;
}

function text(v: unknown) {
  return String(v ?? '').trim();
}

function pickValue(row: any, fields: string[]) {
  for (const field of fields) {
    const value = row?.[field];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '-';
}

function parseMeta(content: unknown) {
  if (!content) return {};
  if (typeof content === 'object') return content as Record<string, any>;
  const raw = String(content).trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function formatDate(value: unknown) {
  const raw = text(value);
  return raw && raw !== '-' ? raw.slice(0, 10) : '-';
}

function formatDateTime(value: unknown) {
  const raw = text(value);
  if (!raw || raw === '-') return '-';
  return raw.replace('T', ' ').slice(0, 16);
}

function formatDateTimeRange(row: any) {
  const start = formatDateTime(pickValue(row, ['startTime']));
  const end = formatDateTime(pickValue(row, ['endTime']));
  if (start === '-' && end === '-') return '-';
  return `${start} / ${end}`;
}

function formatPeriod(row: any, meta: Record<string, any>) {
  if (meta.period || meta.period_text) return text(meta.period || meta.period_text);
  const start = text(pickValue(row, ['startTime', 'createtime']));
  if (!start || start === '-') return '-';
  const month = start.slice(0, 7);
  return month.length === 7 ? `${month.slice(0, 4)}年${month.slice(5, 7)}月` : start;
}

function normalizeRow(row: any) {
  const meta = parseMeta(row.content);
  const required = Number(meta.requiredCount ?? meta.required ?? 0) || 0;
  const elective = Number(meta.electiveCount ?? meta.elective ?? 0) || 0;
  const assignedDone = Number(meta.assignedDone ?? meta.doneCount ?? 0) || 0;
  const assignedTotal = Number(meta.assignedTotal ?? meta.totalCount ?? 0) || 0;
  const progress = Number(meta.progressPercent ?? meta.progress ?? 0) || 0;

  return {
    raw: row,
    id: pickValue(row, ['id', 'rowid']),
    planCode: pickValue(row, ['planCode', 'code']),
    planName: pickValue(row, ['planName', 'name', 'title']),
    planType: text(meta.planType || meta.type || pickValue(row, ['planType', 'category'])) || '专项计划',
    period: formatPeriod(row, meta),
    target: text(meta.targetGroup || meta.target || pickValue(row, ['employeeNameDepName', 'employeeName', 'targetName'])) || '-',
    required,
    elective,
    assignedDone,
    assignedTotal,
    progress: Math.max(0, Math.min(100, Math.round(progress))),
    status: text(pickValue(row, ['status', 'state'])) || '草稿',
    date: formatDate(pickValue(row, ['createtime', 'startTime', 'updateTime'])),
  };
}

const mappedRows = computed(() =>
  rows.value
    .filter((row) => String(row?.lingma_sys_is_delete ?? 0) === '0')
    .map((row) => normalizeRow(row)),
);

const filteredRows = computed(() => {
  const term = keyword.value.trim();
  return mappedRows.value
    .filter((row) => (planType.value === 'all' ? true : row.planType === planType.value))
    .filter((row) => (statusFilter.value === 'all' ? true : row.status === statusFilter.value))
    .filter((row) => {
      if (!term) return true;
      return [row.planName, row.planCode, row.target, row.status].some((field) => text(field).includes(term));
    });
});

const drawerSummary = computed(() => {
  const row = detailRow.value;
  if (!row) return [];
  return [
    { label: '计划名称', value: pickValue(row, ['planName', 'name', 'title']) },
    { label: '对象', value: pickValue(row, ['employeeNameDepName', 'employeeName', 'targetName']) },
    { label: '状态', value: pickValue(row, ['status', 'state']) },
    { label: '说明', value: pickValue(row, ['remark', 'summary', 'description']) },
  ];
});

async function loadData() {
  loading.value = true;
  try {
    const res = await getTrainingList('Bil_HR_Training_Plan', {
      index: 1,
      keyword: keyword.value,
      page: 500,
      status: statusFilter.value,
    });
    rows.value = res.list || [];
  } finally {
    loading.value = false;
  }
}

function openDetail(row: any) {
  detailRow.value = row.raw || row;
  detailVisible.value = true;
}

function resetForm() {
  Object.assign(form, {
    description: '',
    employeeName: '',
    employeeNameDepName: '',
    endTime: '',
    period: '',
    planCode: createPlanCode(),
    planName: '',
    planType: '专项计划',
    startTime: '',
    status: '草稿',
  });
}

function toDatetimeInput(value: unknown) {
  const raw = text(value);
  if (!raw || raw === '-') return '';
  const normalized = raw.replace('T', ' ');
  return normalized.length === 16 ? `${normalized}:00` : normalized.slice(0, 19);
}

function openCreate() {
  editingRow.value = null;
  resetForm();
  formVisible.value = true;
}

function openEdit(row: any) {
  const raw = row.raw || row;
  const meta = parseMeta(raw.content);
  editingRow.value = raw;
  Object.assign(form, {
    description: text(pickValue(raw, ['description', 'remark'])) === '-' ? '' : text(pickValue(raw, ['description', 'remark'])),
    employeeName: text(pickValue(raw, ['employeeName', 'targetName'])) === '-' ? '' : text(pickValue(raw, ['employeeName', 'targetName'])),
    employeeNameDepName: text(meta.targetGroup || pickValue(raw, ['employeeNameDepName'])) === '-' ? '' : text(meta.targetGroup || pickValue(raw, ['employeeNameDepName'])),
    endTime: toDatetimeInput(pickValue(raw, ['endTime'])),
    period: text(meta.period || meta.period_text) || '',
    planCode: text(pickValue(raw, ['planCode', 'code'])) === '-' ? createPlanCode() : text(pickValue(raw, ['planCode', 'code'])),
    planName: text(pickValue(raw, ['planName', 'name', 'title'])) === '-' ? '' : text(pickValue(raw, ['planName', 'name', 'title'])),
    planType: text(meta.planType || meta.type) || '专项计划',
    startTime: toDatetimeInput(pickValue(raw, ['startTime'])),
    status: text(pickValue(raw, ['status', 'state'])) || '草稿',
  });
  formVisible.value = true;
}

function buildPlanPayload() {
  const content = {
    planType: form.planType,
    period: form.period,
    targetGroup: form.employeeNameDepName,
  };
  return {
    content: JSON.stringify(content),
    description: form.description,
    employeeName: form.employeeName,
    employeeNameDepName: form.employeeNameDepName,
    endTime: form.endTime,
    planCode: form.planCode || createPlanCode(),
    planName: form.planName,
    startTime: form.startTime,
    status: form.status,
  };
}

async function submitForm() {
  if (!form.planName.trim()) {
    ElMessage.warning('请输入计划名称');
    return;
  }
  formSaving.value = true;
  try {
    const payload = buildPlanPayload();
    const editingId = editingRow.value?.id || editingRow.value?.rowid;
    if (editingId) {
      await updateTrainingPlan(editingId, payload);
      ElMessage.success('编辑成功');
    } else {
      await createTrainingPlan(payload);
      ElMessage.success('新增成功');
    }
    formVisible.value = false;
    await loadData();
  } catch (error: any) {
    ElMessage.error(error?.message || '保存失败');
  } finally {
    formSaving.value = false;
  }
}

async function handleDelete(row: any) {
  const raw = row.raw || row;
  const id = raw.id || raw.rowid;
  if (!id) {
    ElMessage.warning('缺少计划ID，无法删除');
    return;
  }
  try {
    await ElMessageBox.confirm('确认删除该培训计划吗？', '删除确认', {
      cancelButtonText: '取消',
      confirmButtonText: '删除',
      type: 'warning',
    });
  } catch {
    return;
  }
  try {
    await deleteTrainingPlan(id);
    ElMessage.success('删除成功');
    await loadData();
  } catch (error: any) {
    ElMessage.error(error?.message || '删除失败');
  }
}

function exportPlan() {
  const headers = ['计划名称', '类型', '周期', '目标人群', '必修', '选修', '指派人数', '完成进度', '状态', '日期'];
  const lines = filteredRows.value.map((row) => [
    row.planName,
    row.planType,
    row.period,
    row.target,
    row.required,
    row.elective,
    `${row.assignedDone}/${row.assignedTotal}`,
    `${row.progress}%`,
    row.status,
    row.date,
  ]);
  const csv = [headers, ...lines]
    .map((line) => line.map((item) => `"${String(item ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '培训计划.csv';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="training-plan-page">
      <HrPageIntro
        title="培训计划管理"
        description="将学习计划占位页替换为计划管理页面，用于查看计划对象、状态和计划说明。"
        :tags="['Sprint3', 'HR-TRAIN-07']"
      >
        <template #actions>
          <ElButton :icon="Download" @click="exportPlan">导出计划</ElButton>
          <ElButton type="primary" :icon="Plus" @click="openCreate">新建计划</ElButton>
        </template>
      </HrPageIntro>

      <ElCard shadow="never" class="filter-card">
        <div class="filter-row">
          <div class="filter-item">
            <span>计划类型：</span>
            <ElSelect v-model="planType" class="filter-select">
              <ElOption label="全部类型" value="all" />
              <ElOption label="年度计划" value="年度计划" />
              <ElOption label="月度计划" value="月度计划" />
              <ElOption label="专项计划" value="专项计划" />
            </ElSelect>
          </div>
          <div class="filter-item">
            <span>状态：</span>
            <ElSelect v-model="statusFilter" class="status-select" @change="loadData">
              <ElOption label="全部" value="all" />
              <ElOption label="草稿" value="草稿" />
              <ElOption label="待审批" value="待审批" />
              <ElOption label="进行中" value="进行中" />
              <ElOption label="已完成" value="已完成" />
            </ElSelect>
          </div>
          <ElInput
            v-model="keyword"
            clearable
            class="keyword-input"
            placeholder="搜索计划名称"
            @keyup.enter="loadData"
          >
            <template #prefix>
              <ElIcon><Search /></ElIcon>
            </template>
          </ElInput>
          <ElButton @click="loadData">查询</ElButton>
          <div class="total-text">共 {{ filteredRows.length }} 个计划</div>
        </div>
      </ElCard>

      <ElCard shadow="never" class="table-card">
        <ElTable v-loading="loading" border :data="filteredRows" size="small">
          <ElTableColumn label="计划名称" min-width="180">
            <template #default="{ row }">
              {{ row.planName }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="对象" min-width="160">
            <template #default="{ row }">
              {{ row.target }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="开始/结束时间" min-width="210">
            <template #default="{ row }">
              {{ formatDateTimeRange(row.raw) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="120">
            <template #default="{ row }">
              {{ row.status }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <div class="icon-actions">
                <ElButton :icon="View" link @click="openDetail(row)" />
                <ElButton :icon="EditPen" link @click="openEdit(row)" />
                <ElButton :icon="Delete" link @click="handleDelete(row)" />
              </div>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>

      <ElDialog v-model="formVisible" :title="editingRow ? '编辑计划' : '新增计划'" width="720px">
        <ElForm label-width="96px">
          <div class="form-grid">
            <ElFormItem label="计划编号" required>
              <ElInput v-model="form.planCode" placeholder="请输入计划编号" />
            </ElFormItem>
            <ElFormItem label="计划名称" required>
              <ElInput v-model="form.planName" placeholder="请输入计划名称" />
            </ElFormItem>
            <ElFormItem label="计划类型">
              <ElSelect v-model="form.planType">
                <ElOption label="年度计划" value="年度计划" />
                <ElOption label="月度计划" value="月度计划" />
                <ElOption label="专项计划" value="专项计划" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="周期">
              <ElInput v-model="form.period" placeholder="如 2024年 / 2026年03月" />
            </ElFormItem>
            <ElFormItem label="对象">
              <ElInput v-model="form.employeeName" placeholder="请输入对象" />
            </ElFormItem>
            <ElFormItem label="目标人群">
              <ElInput v-model="form.employeeNameDepName" placeholder="请输入目标人群" />
            </ElFormItem>
            <ElFormItem label="开始时间">
              <ElDatePicker
                v-model="form.startTime"
                format="YYYY-MM-DD HH:mm"
                placeholder="请选择开始时间"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </ElFormItem>
            <ElFormItem label="结束时间">
              <ElDatePicker
                v-model="form.endTime"
                format="YYYY-MM-DD HH:mm"
                placeholder="请选择结束时间"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </ElFormItem>
            <ElFormItem label="状态">
              <ElSelect v-model="form.status">
                <ElOption label="草稿" value="草稿" />
                <ElOption label="待审批" value="待审批" />
                <ElOption label="进行中" value="进行中" />
                <ElOption label="已完成" value="已完成" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem class="form-full" label="说明">
              <ElInput v-model="form.description" :rows="3" placeholder="请输入计划说明" type="textarea" />
            </ElFormItem>
          </div>
        </ElForm>
        <template #footer>
          <ElButton @click="formVisible = false">取消</ElButton>
          <ElButton type="primary" :loading="formSaving" @click="submitForm">保存</ElButton>
        </template>
      </ElDialog>

      <HrDetailDrawer v-model="detailVisible" title="学习计划详情" :summary="drawerSummary">
        <ElCard shadow="never">
          <ElDescriptions border :column="1">
            <ElDescriptionsItem label="计划说明">{{ pickValue(detailRow, ['content', 'description', 'remark']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="原始数据">{{ JSON.stringify(detailRow || {}, null, 2) }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElCard>
      </HrDetailDrawer>
    </div>
  </Page>
</template>

<style scoped>
.training-plan-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.filter-card,
.table-card {
  border-color: #e2e8f0;
  border-radius: 10px;
}
.filter-card :deep(.el-card__body) {
  padding: 30px;
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 22px;
}
.filter-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #334155;
  white-space: nowrap;
}
.filter-select {
  width: 150px;
}
.status-select {
  width: 120px;
}
.keyword-input {
  width: 380px;
}
.total-text {
  margin-left: auto;
  color: #64748b;
  white-space: nowrap;
}
.table-card :deep(.el-card__body) {
  padding: 0;
}
.icon-actions {
  display: flex;
  gap: 8px;
}
.icon-actions :deep(.el-button) {
  color: #475569;
  font-size: 16px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 14px;
}
.form-grid :deep(.el-select),
.form-grid :deep(.el-date-editor) {
  width: 100%;
}
.form-full {
  grid-column: 1 / -1;
}
@media (max-width: 1200px) {
  .filter-row {
    align-items: stretch;
    flex-direction: column;
  }
  .filter-item,
  .keyword-input,
  .filter-select,
  .status-select {
    width: 100%;
  }
  .total-text {
    margin-left: 0;
  }
}
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
