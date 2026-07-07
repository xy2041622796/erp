<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Delete, EditPen, Plus, Search, View } from '@element-plus/icons-vue';

import {
  createTrainingGapAnalysis,
  deleteTrainingGapAnalysis,
  getTrainingList,
  updateTrainingGapAnalysis,
} from '#/api/erp/human-resources/training';

import HrDetailDrawer from '../../../components/HrDetailDrawer.vue';

import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'HrTrainingLearningPathGapAnalysisPage' });

const loading = ref(false);
const keyword = ref('');
const statusFilter = ref('all');
const rows = ref<any[]>([]);
const detailVisible = ref(false);
const detailRow = ref<any>(null);
const formVisible = ref(false);
const formSaving = ref(false);
const editingRow = ref<any>(null);
const form = reactive({
  analysisSummary: '',
  employeeName: '',
  gapCode: '',
  gapLevel: '中',
  status: '待分析',
  targetCompetency: '',
});

function createGapCode() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `GAP-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(Date.now()).slice(-5)}`;
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

function getObject(row: any) {
  return pickValue(row, ['employeeName', 'employee_name', 'name']);
}

function getCompetency(row: any) {
  return pickValue(row, ['targetCompetency', 'competencyName', 'title']);
}

function getConclusion(row: any) {
  return pickValue(row, ['analysisSummary', 'result', 'summary', 'remark', 'description']);
}

function getStatus(row: any) {
  return pickValue(row, ['status', 'state']);
}

function isHighGap(row: any) {
  const content = `${getConclusion(row)} ${pickValue(row, ['gapLevel'])}`;
  return /高|重点|严重|大/.test(content);
}

const filteredRows = computed(() => {
  const term = keyword.value.trim().toLowerCase();
  return rows.value.filter((row) => {
    const statusMatched = statusFilter.value === 'all' || text(getStatus(row)) === statusFilter.value;
    const keywordMatched = !term || [
      getObject(row),
      getCompetency(row),
      getConclusion(row),
    ].some((field) => text(field).toLowerCase().includes(term));
    return statusMatched && keywordMatched;
  });
});

const statusOptions = computed(() => {
  const values = Array.from(new Set(rows.value.map((row) => text(getStatus(row))).filter((item) => item && item !== '-')));
  return values.length ? values : ['待分析', '已分析', '已关闭'];
});
const highGapCount = computed(() => filteredRows.value.filter((row) => isHighGap(row)).length);
const currentRate = computed(() => rows.value.length ? Math.round((filteredRows.value.length / rows.value.length) * 100) : 0);
const objectCount = computed(() => new Set(filteredRows.value.map((row) => text(getObject(row))).filter(Boolean)).size);
function handleSearch() {
  // 客户端筛选由 computed 处理
}

function handleReset() {
  keyword.value = '';
  statusFilter.value = 'all';
}

const drawerSummary = computed(() => {
  const row = detailRow.value;
  if (!row) return [];
  return [
    { label: '分析对象', value: getObject(row) },
    { label: '能力项', value: getCompetency(row) },
    { label: '差距结论', value: getConclusion(row) },
    { label: '状态', value: getStatus(row) },
  ];
});

async function loadData() {
  loading.value = true;
  try {
    const res = await getTrainingList('Bil_HR_Training_Gap_Analysis', { index: 1, page: 500 });
    rows.value = res.list || [];
  } finally {
    loading.value = false;
  }
}

function openDetail(row: any) {
  detailRow.value = row;
  detailVisible.value = true;
}

function resetForm() {
  Object.assign(form, {
    analysisSummary: '',
    employeeName: '',
    gapCode: createGapCode(),
    gapLevel: '中',
    status: '待分析',
    targetCompetency: '',
  });
}

function openCreate() {
  editingRow.value = null;
  resetForm();
  formVisible.value = true;
}

function openEdit(row: any) {
  editingRow.value = row;
  Object.assign(form, {
    analysisSummary: text(getConclusion(row)) === '-' ? '' : text(getConclusion(row)),
    employeeName: text(getObject(row)) === '-' ? '' : text(getObject(row)),
    gapCode: text(pickValue(row, ['gapCode', 'code'])) === '-' ? createGapCode() : text(pickValue(row, ['gapCode', 'code'])),
    gapLevel: text(pickValue(row, ['gapLevel'])) === '-' ? '中' : text(pickValue(row, ['gapLevel'])),
    status: text(getStatus(row)) === '-' ? '待分析' : text(getStatus(row)),
    targetCompetency: text(getCompetency(row)) === '-' ? '' : text(getCompetency(row)),
  });
  formVisible.value = true;
}

function buildPayload() {
  return {
    analysisSummary: form.analysisSummary,
    employeeName: form.employeeName,
    gapCode: form.gapCode || createGapCode(),
    gapLevel: form.gapLevel,
    status: form.status,
    targetCompetency: form.targetCompetency,
  };
}

async function submitForm() {
  if (!form.employeeName.trim()) {
    ElMessage.warning('请输入分析对象');
    return;
  }
  if (!form.targetCompetency.trim()) {
    ElMessage.warning('请输入能力项');
    return;
  }
  formSaving.value = true;
  try {
    const payload = buildPayload();
    const id = editingRow.value?.id || editingRow.value?.rowid;
    if (id) {
      await updateTrainingGapAnalysis(id, payload);
      ElMessage.success('编辑成功');
    } else {
      await createTrainingGapAnalysis(payload);
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
  const id = row?.id || row?.rowid;
  if (!id) {
    ElMessage.warning('当前记录缺少ID，无法删除');
    return;
  }
  try {
    await ElMessageBox.confirm('确认删除该差距分析记录吗？', '删除确认', {
      cancelButtonText: '取消',
      confirmButtonText: '删除',
      type: 'warning',
    });
  } catch {
    return;
  }
  try {
    await deleteTrainingGapAnalysis(id);
    ElMessage.success('删除成功');
    await loadData();
  } catch (error: any) {
    ElMessage.error(error?.message || '删除失败');
  }
}

function exportReport() {
  window.print();
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="gap-page">
      <section class="page-intro">
        <div>
          <h1>能力差距分析</h1>
          <p>查看与管理能力差距分析记录，支持按对象、能力项、结论筛选。</p>
          <div class="intro-tags">
            <span>Sprint3</span>
            <span>HR-TRAIN-04</span>
          </div>
        </div>
        <div class="intro-actions">
          <ElButton type="primary" :icon="Plus" @click="openCreate">新增分析</ElButton>
          <ElButton type="primary" @click="loadData">重新分析</ElButton>
          <ElButton @click="exportReport">导出报告</ElButton>
        </div>
      </section>

      <div class="summary-grid">
        <ElCard shadow="never" class="summary-card summary-card--danger">
          <div>
            <p>差距记录</p>
            <strong>{{ rows.length }}</strong>
            <span>能力差距总数</span>
          </div>
        </ElCard>
        <ElCard shadow="never" class="summary-card">
          <div>
            <p>当前检索</p>
            <strong>{{ filteredRows.length }}</strong>
            <span>{{ currentRate }}% 匹配</span>
          </div>
        </ElCard>
        <ElCard shadow="never" class="summary-card">
          <div>
            <p>重点差距</p>
            <strong>{{ highGapCount }}</strong>
            <span>高优先记录</span>
          </div>
        </ElCard>
        <ElCard shadow="never" class="summary-card">
          <div>
            <p>涉及对象</p>
            <strong>{{ objectCount || rows.length }}</strong>
            <span>员工/对象数量</span>
          </div>
        </ElCard>
      </div>

      <ElCard shadow="never" class="filter-card">
        <div class="filter-bar">
          <label>关键词</label>
          <ElInput v-model="keyword" clearable class="search-input" placeholder="对象 / 能力项 / 结论" :prefix-icon="Search" @keyup.enter="handleSearch" />
          <label>状态</label>
          <ElSelect v-model="statusFilter" class="status-select">
            <ElOption label="全部" value="all" />
            <ElOption v-for="item in statusOptions" :key="item" :label="item" :value="item" />
          </ElSelect>
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
          <ElButton @click="handleReset">重置</ElButton>
          <div class="filter-total">共 {{ filteredRows.length }} 条记录</div>
        </div>
      </ElCard>

      <ElCard shadow="never" class="table-card">
        <template #header>
          <div class="card-title">差距分析列表</div>
        </template>
        <ElTable v-loading="loading" border :data="filteredRows" size="small">
          <ElTableColumn label="分析对象" min-width="160">
            <template #default="{ row = {} } = {}">{{ pickValue(row, ['employeeName', 'employee_name', 'name']) }}</template>
          </ElTableColumn>
          <ElTableColumn label="能力项" min-width="160">
            <template #default="{ row = {} } = {}">{{ getCompetency(row) }}</template>
          </ElTableColumn>
          <ElTableColumn label="差距结论" min-width="220">
            <template #default="{ row = {} } = {}">{{ getConclusion(row) }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="120">
            <template #default="{ row = {} } = {}">{{ pickValue(row, ['status', 'state']) }}</template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="120" fixed="right" align="center">
            <template #default="{ row = {} } = {}">
              <div class="operation-icons">
                <ElButton :icon="View" link type="primary" @click="openDetail(row)" />
                <ElButton :icon="EditPen" link type="primary" @click="openEdit(row)" />
                <ElButton :icon="Delete" link type="danger" @click="handleDelete(row)" />
              </div>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>

      <ElDialog v-model="formVisible" :title="editingRow ? '编辑差距分析' : '新增差距分析'" width="680px">
        <ElForm label-width="96px">
          <div class="form-grid">
            <ElFormItem label="分析编号" required>
              <ElInput v-model="form.gapCode" placeholder="请输入分析编号" />
            </ElFormItem>
            <ElFormItem label="分析对象" required>
              <ElInput v-model="form.employeeName" placeholder="请输入分析对象" />
            </ElFormItem>
            <ElFormItem label="能力项" required>
              <ElInput v-model="form.targetCompetency" placeholder="请输入能力项" />
            </ElFormItem>
            <ElFormItem label="差距等级">
              <ElSelect v-model="form.gapLevel">
                <ElOption label="高" value="高" />
                <ElOption label="中" value="中" />
                <ElOption label="低" value="低" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="状态">
              <ElSelect v-model="form.status">
                <ElOption label="待分析" value="待分析" />
                <ElOption label="已分析" value="已分析" />
                <ElOption label="已关闭" value="已关闭" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem class="form-full" label="分析结论">
              <ElInput v-model="form.analysisSummary" :rows="4" placeholder="请输入分析结论" type="textarea" />
            </ElFormItem>
          </div>
        </ElForm>
        <template #footer>
          <ElButton @click="formVisible = false">取消</ElButton>
          <ElButton type="primary" :loading="formSaving" @click="submitForm">保存</ElButton>
        </template>
      </ElDialog>

      <HrDetailDrawer v-model="detailVisible" title="差距分析详情" :summary="drawerSummary">
        <ElCard shadow="never">
          <ElDescriptions border :column="1">
            <ElDescriptionsItem label="分析对象">{{ detailRow ? getObject(detailRow) : '-' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="能力项">{{ detailRow ? getCompetency(detailRow) : '-' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="差距结论">{{ detailRow ? getConclusion(detailRow) : '-' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="状态">{{ detailRow ? getStatus(detailRow) : '-' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="分析说明">{{ pickValue(detailRow, ['content', 'description', 'remark', 'summary']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="原始数据">{{ JSON.stringify(detailRow || {}, null, 2) }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElCard>
      </HrDetailDrawer>
    </div>
  </Page>
</template>

<style scoped>
.gap-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 12px;
  background: #f3f5f8;
}

.page-intro {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px;
  border-radius: 8px;
  background: #fff;
}

.page-intro h1 {
  margin: 0;
  color: #303133;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.page-intro p {
  margin: 12px 0 0;
  color: #909399;
  font-size: 16px;
  font-weight: 600;
}

.intro-tags {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}

.intro-tags span {
  padding: 4px 12px;
  border-radius: 999px;
  background: #f0f2f5;
  color: #909399;
  font-size: 13px;
}

.intro-actions {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  border: 0;
  border-radius: 8px;
}

.summary-card :deep(.el-card__body) {
  min-height: 104px;
  padding: 22px 24px;
}

.summary-card p {
  margin: 0 0 10px;
  color: #909399;
  font-size: 15px;
  font-weight: 600;
}

.summary-card strong {
  display: block;
  color: #303133;
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.summary-card span {
  display: block;
  margin-top: 10px;
  color: #909399;
  font-size: 13px;
}

.filter-card,
.table-card {
  border-radius: 4px;
}

.filter-card :deep(.el-card__body) {
  padding: 24px 28px 12px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 20px;
}

.filter-bar label {
  color: #303133;
  font-size: 16px;
  font-weight: 700;
}

.search-input {
  width: 320px;
}

.status-select {
  width: 150px;
}

.filter-total {
  margin-left: auto;
  color: #909399;
  font-size: 16px;
  white-space: nowrap;
}

.card-title {
  color: #303133;
  font-size: 18px;
  font-weight: 700;
}

.table-card :deep(.el-card__header) {
  padding: 20px 28px;
}

.table-card :deep(.el-card__body) {
  padding: 28px;
}

.table-card :deep(.el-table th) {
  color: #909399;
  font-weight: 700;
}

.operation-icons {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 14px;
}

.form-grid :deep(.el-select) {
  width: 100%;
}

.form-full {
  grid-column: 1 / -1;
}

@media (max-width: 1100px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .page-intro {
    flex-direction: column;
  }

  .filter-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }

  .status-select {
    width: 100%;
  }

  .filter-total {
    margin-left: 0;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
