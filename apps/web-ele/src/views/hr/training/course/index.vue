<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  createTrainingCourse,
  deleteTrainingCourse,
  getTrainingList,
  updateTrainingCourse,
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

defineOptions({ name: 'HrTrainingCoursePage' });

const loading = ref(false);
const saving = ref(false);
const courses = ref<any[]>([]);
const evaluations = ref<any[]>([]);
const detailVisible = ref(false);
const detailCourse = ref<any>(null);
const dialogOpen = ref(false);
const editing = ref<any>(null);

const queryForm = reactive({
  keyword: '',
  status: 'all',
  category: 'all',
});

const form = reactive({
  courseName: '',
  courseCode: '',
  category: '',
  trainerName: '',
  courseHours: '',
  status: '已发布',
  description: '',
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

function isPublished(status: unknown) {
  const s = text(status).toLowerCase();
  return s === '已发布' || s === 'open' || s === '发布' || s === '启用';
}

function isClosed(status: unknown) {
  const s = text(status).toLowerCase();
  return s === '已下架' || s === 'closed' || s === '下架' || s === '禁用';
}

function statusTagType(status: unknown) {
  if (isPublished(status)) return 'success';
  if (isClosed(status)) return 'info';
  return undefined;
}

function statusDisplay(status: unknown) {
  const s = text(status);
  if (isPublished(status)) return '已发布';
  if (isClosed(status)) return '已下架';
  return s || '-';
}

const categoryOptions = computed(() => {
  const set = new Set<string>();
  for (const c of courses.value) {
    const cat = text(c?.category);
    if (cat) set.add(cat);
  }
  return Array.from(set);
});

const filteredCourses = computed(() => {
  let rows = courses.value;
  if (queryForm.status !== 'all') {
    rows = rows.filter((row) => text(row?.status) === queryForm.status);
  }
  if (queryForm.category !== 'all') {
    rows = rows.filter((row) => text(row?.category) === queryForm.category);
  }
  const term = queryForm.keyword.trim();
  if (term) {
    rows = rows.filter((row) =>
      [
        pickValue(row, ['courseName', 'name', 'title']),
        pickValue(row, ['courseCode', 'code']),
        pickValue(row, ['trainerName', 'trainer', 'lecturer']),
      ].some((field) => text(field).toLowerCase().includes(term.toLowerCase())),
    );
  }
  rows = [...rows].sort((a, b) => text(a?.courseCode).localeCompare(text(b?.courseCode)));
  return rows;
});

function relatedEvaluationsForCourse(course: any) {
  if (!course) return [];
  const cName = text(pickValue(course, ['courseName', 'name', 'title']));
  const cCode = text(pickValue(course, ['courseCode', 'code']));
  return evaluations.value.filter((row) => {
    const eName = text(pickValue(row, ['courseName', 'name', 'title']));
    const eCode = text(pickValue(row, ['courseCode', 'code']));
    // 评估记录缺少关联课程信息时不匹配
    const nameOk = eName && eName !== '-' && cName && cName !== '-';
    const codeOk = eCode && eCode !== '-' && cCode && cCode !== '-';
    if (!nameOk && !codeOk) return false;
    if (codeOk && eCode === cCode) return true;
    if (nameOk && eName === cName) return true;
    if (nameOk && (eName.includes(cName) || cName.includes(eName))) return true;
    if (codeOk && (eCode.includes(cCode) || cCode.includes(eCode))) return true;
    return false;
  });
}

const metrics = computed(() => [
  { label: '课程总数', value: courses.value.length, tip: '课程主数据' },
  { label: '已发布课程', value: courses.value.filter((row) => isPublished(row?.status)).length, tip: '已发布状态课程' },
  { label: '累计课时', value: courses.value.reduce((sum, c) => sum + (Number(c?.courseHours) || 0), 0), tip: '所有课程课时合计' },
  { label: '评估记录总数', value: evaluations.value.length, tip: '培训评估记录' },
]);

const drawerSummary = computed(() => {
  const row = detailCourse.value;
  if (!row) return [];
  return [
    { label: '课程名称', value: pickValue(row, ['courseName', 'name', 'title']) },
    { label: '课程编码', value: pickValue(row, ['courseCode', 'code']) },
    { label: '分类', value: pickValue(row, ['category', 'categoryName']) },
    { label: '讲师', value: pickValue(row, ['trainerName', 'trainer']) },
    { label: '状态', value: statusDisplay(row?.status) },
  ];
});

const detailRelatedEvaluations = computed(() => relatedEvaluationsForCourse(detailCourse.value));

async function loadData() {
  loading.value = true;
  try {
    const [courseRes, evaluationRes] = await Promise.all([
      getTrainingList('Bil_HR_Training_Course', { index: 1, page: 500 }),
      getTrainingList('Bil_HR_Training_Evaluation', { index: 1, page: 500 }),
    ]);
    courses.value = courseRes.list || [];
    evaluations.value = evaluationRes.list || [];
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  // 筛选由 computed 处理，这里可以扩展为服务端筛选
}

function handleReset() {
  queryForm.keyword = '';
  queryForm.status = 'all';
  queryForm.category = 'all';
}

function resetForm() {
  form.courseName = '';
  form.courseCode = '';
  form.category = '';
  form.trainerName = '';
  form.courseHours = '';
  form.status = '已发布';
  form.description = '';
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: any) {
  editing.value = row;
  form.courseName = row?.courseName || '';
  form.courseCode = row?.courseCode || '';
  form.category = row?.category || '';
  form.trainerName = row?.trainerName || '';
  form.courseHours = row?.courseHours != null ? String(row.courseHours) : '';
  form.status = text(row?.status) || '已发布';
  form.description = row?.description || row?.remark || '';
  dialogOpen.value = true;
}

function createCourseCode() {
  const year = new Date().getFullYear();
  let maxNum = 0;
  for (const c of courses.value) {
    const code = text(c?.courseCode);
    const match = code.match(new RegExp(`^KC-${year}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const next = String(maxNum + 1).padStart(3, '0');
  return `KC-${year}-${next}`;
}

async function submit() {
  if (!form.courseName.trim()) {
    ElMessage.warning('请输入课程名称');
    return;
  }
  const code = form.courseCode.trim() || createCourseCode();
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const payload: any = {
    courseName: form.courseName.trim(),
    courseCode: code,
    category: form.category.trim() || null,
    trainerName: form.trainerName.trim() || null,
    courseHours: form.courseHours === '' ? null : Number(form.courseHours),
    status: form.status,
    description: form.description.trim() || null,
  };
  saving.value = true;
  try {
    if (editing.value?.id) {
      payload.updateTime = nowStr;
      await updateTrainingCourse(editing.value.id, payload);
      ElMessage.success('更新成功');
    } else {
      payload.publishTime = nowStr;
      await createTrainingCourse(payload);
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
      `确认删除课程「${row.courseName || row.courseCode || row.id}」吗？`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  await deleteTrainingCourse(row.id);
  ElMessage.success('删除成功');
  await loadData();
}

function openDetail(row: any) {
  detailCourse.value = row;
  detailVisible.value = true;
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-training-course-page">
      <HrPageIntro
        title="课程库"
        description="维护培训课程主数据，支持按分类、讲师、状态筛选，并联动查看课程相关评估。"
        :tags="['Sprint3', 'HR-TRAIN-01']"
      >
        <template #actions>
          <ElButton type="primary" @click="openCreate">+ 新增课程</ElButton>
          <ElButton @click="loadData">刷新</ElButton>
        </template>
      </HrPageIntro>

      <HrAnalyticsPanel :metrics="metrics" />

      <ElCard class="query-card" shadow="never">
        <ElForm :model="queryForm" inline @submit.prevent>
          <ElFormItem label="状态">
            <ElSelect v-model="queryForm.status" style="width: 140px">
              <ElOption label="全部" value="all" />
              <ElOption label="已发布" value="已发布" />
              <ElOption label="已下架" value="已下架" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="分类">
            <ElSelect v-model="queryForm.category" style="width: 160px">
              <ElOption label="全部分类" value="all" />
              <ElOption v-for="cat in categoryOptions" :key="cat" :label="cat" :value="cat" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="关键词">
            <ElInput v-model="queryForm.keyword" clearable placeholder="课程名称 / 编码 / 讲师" style="width: 280px" @keyup.enter="handleSearch" />
          </ElFormItem>
          <ElFormItem>
            <ElButton type="primary" @click="handleSearch">查询</ElButton>
            <ElButton @click="handleReset">重置</ElButton>
          </ElFormItem>
          <div class="query-total">共 {{ filteredCourses.length }} 门课程</div>
        </ElForm>
      </ElCard>

      <ElCard shadow="never">
        <template #header><div class="card-title">课程列表</div></template>
        <ElTable v-loading="loading" :data="filteredCourses" row-key="id" border height="100%">
          <ElTableColumn label="课程名称" min-width="180">
            <template #default="{ row } = { row: null }">
              <div v-if="row">
                <div class="font-medium">{{ pickValue(row, ['courseName', 'name', 'title']) }}</div>
                <div class="text-xs text-gray-500">{{ pickValue(row, ['courseCode', 'code']) }}</div>
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn label="分类" width="120">
            <template #default="{ row } = { row: null }">{{ row ? pickValue(row, ['category', 'categoryName', 'type']) : '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="讲师" width="140">
            <template #default="{ row } = { row: null }">{{ row ? pickValue(row, ['trainerName', 'trainer', 'lecturer']) : '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="课时" width="90" align="center">
            <template #default="{ row } = { row: null }">{{ row?.courseHours ?? '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="100" align="center">
            <template #default="{ row } = { row: null }">
              <ElTag v-if="row" :type="statusTagType(row.status)" effect="plain" size="small">{{ statusDisplay(row.status) }}</ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="创建/发布时间" width="170">
            <template #default="{ row } = { row: null }">{{ row ? pickValue(row, ['publishTime', 'createtime', 'createTime']) : '-' }}</template>
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

      <HrDetailDrawer v-model="detailVisible" title="课程详情" :summary="drawerSummary">
        <ElCard shadow="never" class="mb-3">
          <template #header><div class="card-title">课程信息</div></template>
          <ElDescriptions border :column="2">
            <ElDescriptionsItem label="课程名称">{{ pickValue(detailCourse, ['courseName', 'name', 'title']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="课程编码">{{ pickValue(detailCourse, ['courseCode', 'code']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="分类">{{ pickValue(detailCourse, ['category', 'categoryName']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="讲师">{{ pickValue(detailCourse, ['trainerName', 'trainer']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="课时">{{ detailCourse?.courseHours ?? '-' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="状态">{{ statusDisplay(detailCourse?.status) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="说明" :span="2">{{ pickValue(detailCourse, ['remark', 'description', 'summary']) }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElCard>

        <ElCard shadow="never">
          <template #header><div class="card-title">关联评估</div></template>
          <ElTable v-if="detailRelatedEvaluations.length" :data="detailRelatedEvaluations" border size="small">
            <ElTableColumn label="评估编码" min-width="160">
              <template #default="{ row }">{{ row ? pickValue(row, ['evaluationCode', 'code']) : '-' }}</template>
            </ElTableColumn>
            <ElTableColumn label="参评对象" width="120">
              <template #default="{ row }">{{ row ? pickValue(row, ['employeeName', 'employee_name']) : '-' }}</template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="100">
              <template #default="{ row }">{{ row ? pickValue(row, ['status', 'state']) : '-' }}</template>
            </ElTableColumn>
          </ElTable>
          <div v-else class="text-sm text-gray-500 py-4 text-center">暂无关联评估记录</div>
        </ElCard>
      </HrDetailDrawer>

      <ElDialog v-model="dialogOpen" :title="editing ? '编辑课程' : '新增课程'" width="720px" destroy-on-close>
        <ElForm :model="form" label-width="100px">
          <ElRow :gutter="16">
            <ElCol :span="12">
              <ElFormItem label="课程名称" required>
                <ElInput v-model="form.courseName" placeholder="请输入课程名称" />
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="课程编码">
                <ElInput v-model="form.courseCode" placeholder="留空自动生成" />
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="分类">
                <ElSelect v-model="form.category" filterable allow-create placeholder="选择或输入分类" style="width: 100%">
                  <ElOption v-for="cat in categoryOptions" :key="cat" :label="cat" :value="cat" />
                </ElSelect>
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="讲师">
                <ElInput v-model="form.trainerName" placeholder="请输入讲师" />
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="课时">
                <ElInput v-model="form.courseHours" type="number" placeholder="请输入课时" />
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="状态">
                <ElSelect v-model="form.status" style="width: 100%">
                  <ElOption label="已发布" value="已发布" />
                  <ElOption label="已下架" value="已下架" />
                </ElSelect>
              </ElFormItem>
            </ElCol>
            <ElCol :span="24">
              <ElFormItem label="说明">
                <ElInput v-model="form.description" :rows="3" type="textarea" placeholder="请输入课程说明" />
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
.hr-training-course-page {
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
.font-medium {
  font-weight: 500;
}
.text-xs {
  font-size: 12px;
}
.text-sm {
  font-size: 14px;
}
.text-gray-500 {
  color: var(--el-text-color-secondary);
}
.text-gray-300 {
  color: var(--el-border-color);
}
.mb-3 {
  margin-bottom: 12px;
}
.py-4 {
  padding-top: 16px;
  padding-bottom: 16px;
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
</style>
