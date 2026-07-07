<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  createTrainingEvaluation,
  deleteTrainingEvaluation,
  getTrainingList,
  updateTrainingEvaluation,
} from '#/api/erp/human-resources/training';

import HrAnalyticsPanel from '../../components/HrAnalyticsPanel.vue';
import HrDetailDrawer from '../../components/HrDetailDrawer.vue';
import HrPageIntro from '../../components/HrPageIntro.vue';

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

defineOptions({ name: 'HrTrainingEvaluationPage' });

const loading = ref(false);
const saving = ref(false);
const evaluations = ref<any[]>([]);
const courses = ref<any[]>([]);
const detailVisible = ref(false);
const detailEvaluation = ref<any>(null);
const dialogOpen = ref(false);
const editing = ref<any>(null);

const queryForm = reactive({
  keyword: '',
  status: 'all',
});

const form = reactive({
  evaluationCode: '',
  courseName: '',
  employeeName: '',
  departmentName: '',
  score: '',
  status: '已评估',
  summary: '',
});

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

function statusTagType(status: unknown) {
  const s = text(status).toLowerCase();
  if (s === '已评估' || s === 'completed' || s === '完成') return 'success';
  if (s === '待评估' || s === 'pending' || s === '待处理') return 'warning';
  return undefined;
}

function statusDisplay(status: unknown) {
  const s = text(status);
  if (!s) return '-';
  return s;
}

const courseOptions = computed(() => {
  const set = new Set<string>();
  for (const c of courses.value) {
    const name = text(c?.courseName);
    if (name) set.add(name);
  }
  return Array.from(set);
});

const filteredEvaluations = computed(() => {
  let rows = evaluations.value;
  if (queryForm.status !== 'all') {
    rows = rows.filter((row) => text(row?.status) === queryForm.status);
  }
  const term = queryForm.keyword.trim();
  if (term) {
    rows = rows.filter((row) =>
      [
        pickValue(row, ['courseName', 'name', 'title']),
        pickValue(row, ['employeeName', 'employee_name']),
        pickValue(row, ['departmentName', 'depName']),
        pickValue(row, ['evaluationCode', 'code']),
      ].some((field) => text(field).toLowerCase().includes(term.toLowerCase())),
    );
  }
  rows = [...rows].sort((a, b) => text(a?.evaluateTime).localeCompare(text(b?.evaluateTime)));
  return rows;
});

function relatedCourseForEvaluation(evaluation: any) {
  if (!evaluation) return null;
  const keys = [pickValue(evaluation, ['courseName', 'name', 'title']), pickValue(evaluation, ['courseCode', 'code'])].map(text).filter(Boolean);
  return courses.value.find((course) => {
    const fields = [pickValue(course, ['courseName', 'name', 'title']), pickValue(course, ['courseCode', 'code'])].map(text);
    return keys.some((key) => fields.some((field) => field.includes(key) || key.includes(field)));
  }) || null;
}

const metrics = computed(() => [
  { label: '评估记录', value: evaluations.value.length, tip: '培训评估总数' },
  { label: '已评估课程', value: new Set(evaluations.value.map((e) => text(e?.courseName)).filter(Boolean)).size, tip: '涉及课程数' },
  { label: '平均评分', value: evaluations.value.length ? (evaluations.value.reduce((sum, e) => sum + (Number(e?.score) || 0), 0) / evaluations.value.length).toFixed(1) : '-', tip: '平均分' },
  { label: '待处理', value: evaluations.value.filter((e) => text(e?.status).includes('待')).length, tip: '待评估记录' },
]);

const drawerSummary = computed(() => {
  const row = detailEvaluation.value;
  if (!row) return [];
  return [
    { label: '课程名称', value: pickValue(row, ['courseName', 'name', 'title']) },
    { label: '参评对象', value: pickValue(row, ['employeeName', 'employee_name']) },
    { label: '部门', value: pickValue(row, ['departmentName', 'depName']) },
    { label: '评分', value: row?.score ?? '-' },
    { label: '状态', value: statusDisplay(row?.status) },
  ];
});

const detailRelatedCourse = computed(() => relatedCourseForEvaluation(detailEvaluation.value));

async function loadData() {
  loading.value = true;
  try {
    const [evaluationRes, courseRes] = await Promise.all([
      getTrainingList('Bil_HR_Training_Evaluation', { index: 1, page: 500 }),
      getTrainingList('Bil_HR_Training_Course', { index: 1, page: 500 }),
    ]);
    evaluations.value = evaluationRes.list || [];
    courses.value = courseRes.list || [];
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  // 筛选由 computed 处理
}

function handleReset() {
  queryForm.keyword = '';
  queryForm.status = 'all';
}

function resetForm() {
  form.evaluationCode = '';
  form.courseName = '';
  form.employeeName = '';
  form.departmentName = '';
  form.score = '';
  form.status = '已评估';
  form.summary = '';
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: any) {
  editing.value = row;
  form.evaluationCode = row?.evaluationCode || '';
  form.courseName = row?.courseName || '';
  form.employeeName = row?.employeeName || '';
  form.departmentName = row?.departmentName || '';
  form.score = row?.score != null ? String(row.score) : '';
  form.status = text(row?.status) || '已评估';
  form.summary = row?.summary || row?.description || '';
  dialogOpen.value = true;
}

function nowTime() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function createEvaluationCode() {
  const year = new Date().getFullYear();
  let maxNum = 0;
  for (const e of evaluations.value) {
    const code = text(e?.evaluationCode);
    const match = code.match(new RegExp(`^PG-${year}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const next = String(maxNum + 1).padStart(3, '0');
  return `PG-${year}-${next}`;
}

async function submit() {
  if (!form.courseName.trim()) {
    ElMessage.warning('请选择课程');
    return;
  }
  if (!form.employeeName.trim()) {
    ElMessage.warning('请输入参评对象');
    return;
  }
  const code = form.evaluationCode.trim() || createEvaluationCode();
  const payload: any = {
    evaluationCode: code,
    courseName: form.courseName.trim(),
    employeeName: form.employeeName.trim(),
    departmentName: form.departmentName.trim() || null,
    score: form.score === '' ? null : Number(form.score),
    status: form.status,
    summary: form.summary.trim() || null,
  };
  saving.value = true;
  try {
    if (editing.value?.id) {
      payload.updateTime = nowTime();
      await updateTrainingEvaluation(editing.value.id, payload);
      ElMessage.success('更新成功');
    } else {
      payload.evaluateTime = nowTime();
      await createTrainingEvaluation(payload);
      ElMessage.success('创建成功');
    }
    dialogOpen.value = false;
    await loadData();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: any) {
  if (!row?.id) return;
  try {
    await ElMessageBox.confirm(
      `确认删除评估记录吗？`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  await deleteTrainingEvaluation(row.id);
  ElMessage.success('删除成功');
  await loadData();
}

function openDetail(row: any) {
  detailEvaluation.value = row;
  detailVisible.value = true;
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-training-evaluation-page">
      <HrPageIntro
        title="培训评估"
        description="查看与管理培训评估记录，支持按课程、员工、状态筛选，并联动查看课程信息。"
        :tags="['Sprint3', 'HR-TRAIN-02']"
      >
        <template #actions>
          <ElButton type="primary" @click="openCreate">+ 新增评估</ElButton>
          <ElButton @click="loadData">刷新</ElButton>
        </template>
      </HrPageIntro>

      <HrAnalyticsPanel :metrics="metrics" />

      <ElCard class="query-card" shadow="never">
        <ElForm :model="queryForm" inline @submit.prevent>
          <ElFormItem label="状态">
            <ElSelect v-model="queryForm.status" style="width: 140px">
              <ElOption label="全部" value="all" />
              <ElOption label="已评估" value="已评估" />
              <ElOption label="待评估" value="待评估" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="关键词">
            <ElInput v-model="queryForm.keyword" clearable placeholder="课程 / 员工 / 部门" style="width: 280px" @keyup.enter="handleSearch" />
          </ElFormItem>
          <ElFormItem>
            <ElButton type="primary" @click="handleSearch">查询</ElButton>
            <ElButton @click="handleReset">重置</ElButton>
          </ElFormItem>
          <div class="query-total">共 {{ filteredEvaluations.length }} 条记录</div>
        </ElForm>
      </ElCard>

      <ElCard shadow="never">
        <template #header><div class="card-title">评估列表</div></template>
        <ElTable v-loading="loading" :data="filteredEvaluations" row-key="id" border height="100%">
          <ElTableColumn label="评估编码" width="140">
            <template #default="{ row } = { row: null }">{{ row ? pickValue(row, ['evaluationCode', 'code']) : '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="课程名称" min-width="160">
            <template #default="{ row } = { row: null }">{{ row ? pickValue(row, ['courseName', 'name', 'title']) : '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="参评对象" width="120">
            <template #default="{ row } = { row: null }">{{ row ? pickValue(row, ['employeeName', 'employee_name']) : '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="部门" width="140">
            <template #default="{ row } = { row: null }">{{ row ? pickValue(row, ['departmentName', 'depName']) : '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="评分" width="90" align="center">
            <template #default="{ row } = { row: null }">{{ row?.score ?? '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="100" align="center">
            <template #default="{ row } = { row: null }">
              <ElTag v-if="row" :type="statusTagType(row.status)" effect="plain" size="small">{{ statusDisplay(row.status) }}</ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="评估时间" width="170">
            <template #default="{ row } = { row: null }">{{ row ? pickValue(row, ['evaluateTime', 'createtime', 'createTime']) : '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="操作" fixed="right" width="180" align="center">
            <template #default="{ row }">
              <div v-if="row" class="flex justify-center gap-1">
                <ElButton link type="primary" @click="openDetail(row)">详情</ElButton>
                <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
                <ElButton link type="danger" @click="handleDelete(row)">删除</ElButton>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>

      <HrDetailDrawer v-model="detailVisible" title="评估详情" :summary="drawerSummary">
        <ElCard shadow="never" class="mb-3">
          <template #header><div class="card-title">评估信息</div></template>
          <ElDescriptions border :column="2">
            <ElDescriptionsItem label="课程名称">{{ pickValue(detailEvaluation, ['courseName', 'name', 'title']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="参评对象">{{ pickValue(detailEvaluation, ['employeeName', 'employee_name']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="部门">{{ pickValue(detailEvaluation, ['departmentName', 'depName']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="评分">{{ detailEvaluation?.score ?? '-' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="状态">{{ statusDisplay(detailEvaluation?.status) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="评估时间">{{ pickValue(detailEvaluation, ['evaluateTime', 'createtime']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="总结" :span="2">{{ pickValue(detailEvaluation, ['summary', 'description', 'remark']) }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElCard>

        <ElCard v-if="detailRelatedCourse" shadow="never">
          <template #header><div class="card-title">关联课程</div></template>
          <ElDescriptions border :column="2">
            <ElDescriptionsItem label="课程名称">{{ pickValue(detailRelatedCourse, ['courseName', 'name', 'title']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="课程编码">{{ pickValue(detailRelatedCourse, ['courseCode', 'code']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="分类">{{ pickValue(detailRelatedCourse, ['category', 'categoryName']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="讲师">{{ pickValue(detailRelatedCourse, ['trainerName', 'trainer']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="课时">{{ detailRelatedCourse?.courseHours ?? '-' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="状态">{{ statusDisplay(detailRelatedCourse?.status) }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElCard>
        <div v-else class="text-sm text-gray-500 py-4 text-center">暂无关联课程</div>
      </HrDetailDrawer>

      <ElDialog v-model="dialogOpen" :title="editing ? '编辑评估' : '新增评估'" width="720px" destroy-on-close>
        <ElForm :model="form" label-width="100px">
          <ElRow :gutter="16">
            <ElCol :span="12">
              <ElFormItem label="课程名称" required>
                <ElSelect v-model="form.courseName" filterable placeholder="选择课程" style="width: 100%">
                  <ElOption v-for="name in courseOptions" :key="name" :label="name" :value="name" />
                </ElSelect>
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="评估编码">
                <ElInput v-model="form.evaluationCode" placeholder="留空自动生成" />
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="参评对象" required>
                <ElInput v-model="form.employeeName" placeholder="请输入员工姓名" />
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="部门">
                <ElInput v-model="form.departmentName" placeholder="请输入部门" />
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="评分">
                <ElInput v-model="form.score" type="number" placeholder="请输入评分" />
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="状态">
                <ElSelect v-model="form.status" style="width: 100%">
                  <ElOption label="已评估" value="已评估" />
                  <ElOption label="待评估" value="待评估" />
                </ElSelect>
              </ElFormItem>
            </ElCol>
            <ElCol :span="24">
              <ElFormItem label="总结">
                <ElInput v-model="form.summary" :rows="3" type="textarea" placeholder="请输入评估总结" />
              </ElFormItem>
            </ElCol>
          </ElRow>
        </ElForm>
        <template #footer>
          <div class="flex justify-end gap-3">
            <ElButton :disabled="saving" @click="dialogOpen = false">取消</ElButton>
            <ElButton :loading="saving" type="primary" @click="submit">保存</ElButton>
          </div>
        </template>
      </ElDialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-training-evaluation-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 12px;
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
.flex {
  display: flex;
}
.justify-center {
  justify-content: center;
}
.justify-end {
  justify-content: flex-end;
}
.gap-1 {
  gap: 4px;
}
.gap-3 {
  gap: 12px;
}
.mb-3 {
  margin-bottom: 12px;
}
.py-4 {
  padding-top: 16px;
  padding-bottom: 16px;
}
</style>
