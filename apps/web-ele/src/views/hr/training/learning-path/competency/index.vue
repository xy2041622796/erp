<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Delete, Edit, Plus, Search, View } from '@element-plus/icons-vue';

import { createTrainingCompetency, deleteTrainingCompetency, getTrainingList, updateTrainingCompetency } from '#/api/erp/human-resources/training';

import HrDetailDrawer from '../../../components/HrDetailDrawer.vue';
import HrPageIntro from '../../../components/HrPageIntro.vue';

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
  ElOption,
  ElPopconfirm,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'HrTrainingLearningPathCompetencyPage' });

type CategoryKey = '全部类别' | '通用能力' | '专业能力' | '领导力';

withDefaults(defineProps<{ pageTitle?: string }>(), {
  pageTitle: '学习路径能力模型',
});

const loading = ref(false);
const keyword = ref('');
const categoryFilter = ref<CategoryKey>('全部类别');
const rows = ref<any[]>([]);
const detailVisible = ref(false);
const detailRow = ref<any>(null);
const createVisible = ref(false);
const editingRow = ref<any>(null);
const saving = ref(false);
const deletingId = ref<string | number | null>(null);
const createForm = ref({
  category: '通用能力',
  competencyCode: '',
  competencyName: '',
  requiredLevel: 'L3',
  status: '启用',
  description: '',
});

const categoryOptions: CategoryKey[] = ['全部类别', '通用能力', '专业能力', '领导力'];

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

function pickText(row: any, fields: string[]) {
  const value = pickValue(row, fields);
  return value === '-' ? '' : text(value);
}

function getJobName(row: any) {
  return pickText(row, ['targetJobName', 'jobName', 'targetName']);
}

function getDepartmentName(row: any) {
  return pickText(row, ['targetJobNameDepName', 'departmentName', 'employeeNameDepName']);
}

function parseLevel(row: any) {
  const raw = text(pickValue(row, ['requiredLevel', 'levelName', 'level', 'grade']));
  const numberText = raw.replace(/[^0-9]/g, '');
  const value = Number(numberText || 3);
  if (!Number.isFinite(value)) return 3;
  return Math.min(Math.max(value, 1), 5);
}

function inferCategory(row: any): Exclude<CategoryKey, '全部类别'> {
  const category = pickText(row, ['category', 'categoryName', 'type']);
  if (['通用能力', '专业能力', '领导力'].includes(category)) return category as Exclude<CategoryKey, '全部类别'>;
  const name = text(pickValue(row, ['competencyName', 'name', 'title']));
  const job = getJobName(row);
  const dep = getDepartmentName(row);
  const description = text(pickValue(row, ['description', 'remark', 'summary', 'content']));
  const content = `${name} ${job} ${dep} ${description}`;
  if (content.includes('领导力')) return '领导力';
  if (content.includes('专业能力')) return '专业能力';
  if (content.includes('通用能力')) return '通用能力';
  if (/领导|管理|战略|变革|决策|经理|主管/.test(content)) return '领导力';
  if (/技术|开发|工程|产品|设计|法务|财务|测量|数据|运营|销售|招聘|培训/.test(content)) return '专业能力';
  return '通用能力';
}

function indicators(row: any) {
  const name = text(pickValue(row, ['competencyName', 'name', 'title']));
  const description = text(pickValue(row, ['description', 'remark', 'summary', 'content']));
  const content = `${name} ${description}`;
  if (/沟通|协调|表达/.test(content)) return ['清晰表达', '倾听理解', '书面沟通', '演讲展示'];
  if (/协作|团队/.test(content)) return ['配合度', '冲突解决', '资源共享', '团队氛围'];
  if (/问题|分析|解决/.test(content)) return ['问题识别', '分析能力', '方案制定', '执行落地'];
  if (/领导|管理/.test(content)) return ['目标管理', '人才培养', '激励团队', '决策能力'];
  return ['指标1', '指标2', '指标3'];
}

const dictRows = computed(() => rows.value.map((row) => ({
  raw: row,
  id: pickValue(row, ['id', 'source_id', 'ReportID']),
  name: pickValue(row, ['competencyName', 'name', 'title', 'competencyCode']),
  category: inferCategory(row),
  level: parseLevel(row),
  description: pickValue(row, ['description', 'remark', 'summary', 'content']),
  indicators: indicators(row),
  status: pickValue(row, ['status', 'state']),
})));

const filteredDictRows = computed(() => {
  const term = keyword.value.trim();
  return dictRows.value.filter((row) => {
    const categoryMatched = categoryFilter.value === '全部类别' || row.category === categoryFilter.value;
    const keywordMatched = !term || [
      row.name,
      row.description,
      row.status,
      ].some((field) => text(field).includes(term));
    return categoryMatched && keywordMatched;
  });
});

const drawerSummary = computed(() => {
  const row = detailRow.value;
  if (!row) return [];
  return [
    { label: '能力项', value: pickValue(row, ['competencyName', 'name', 'title']) },
    { label: '目标岗位', value: pickValue(row, ['targetJobName', 'jobName', 'targetName']) },
    { label: '所属部门', value: pickValue(row, ['targetJobNameDepName', 'departmentName', 'employeeNameDepName']) },
    { label: '要求等级', value: pickValue(row, ['requiredLevel', 'levelName', 'level', 'grade']) },
    { label: '状态', value: pickValue(row, ['status', 'state']) },
  ];
});

async function loadData() {
  loading.value = true;
  try {
const res = await getTrainingList('Bil_HR_Training_Competency', { index: 1, page: 500 });
    rows.value = res.list || [];
  } finally {
    loading.value = false;
  }
}

function levelBlocks(level: number) {
  return Array.from({ length: 5 }, (_, index) => index < level);
}

function openDetail(row: any) {
  detailRow.value = row;
  detailVisible.value = true;
}

function openCreate() {
  editingRow.value = null;
  createForm.value = {
    category: '通用能力',
    competencyCode: '',
    competencyName: '',
    requiredLevel: 'L3',
    status: '启用',
    description: '',
  };
  createVisible.value = true;
}

function openEdit(row: any) {
  editingRow.value = row;
  createForm.value = {
    category: inferCategory(row),
    competencyCode: pickText(row, ['competencyCode', 'code']),
    competencyName: pickText(row, ['competencyName', 'name', 'title']),
    requiredLevel: pickText(row, ['requiredLevel', 'levelName', 'level', 'grade']) || 'L3',
    status: pickText(row, ['status', 'state']) || '启用',
    description: pickText(row, ['description', 'remark', 'summary', 'content']),
  };
  createVisible.value = true;
}

async function submitCreate() {
  if (!createForm.value.competencyName.trim()) {
    ElMessage.warning('请填写能力名称');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      ...createForm.value,
      description: createForm.value.description || createForm.value.category,
    };
    if (editingRow.value) {
      await updateTrainingCompetency({
        ...payload,
        id: pickValue(editingRow.value, ['id']) as string | number,
      });
      ElMessage.success('编辑能力项成功');
    } else {
      await createTrainingCompetency(payload);
      ElMessage.success('新增能力项成功');
    }
    createVisible.value = false;
    editingRow.value = null;
    await loadData();
  } catch (error: any) {
    const message = error?.response?.data?.Message || error?.response?.data?.message || error?.message || '新增能力项失败';
    ElMessage.error(message);
  } finally {
    saving.value = false;
  }
}

async function removeRow(row: any) {
  const id = pickValue(row, ['id']);
  if (id === '-') {
    ElMessage.warning('当前记录缺少ID，无法删除');
    return;
  }
  deletingId.value = id as string | number;
  try {
    await deleteTrainingCompetency(id as string | number);
    ElMessage.success('删除成功');
    await loadData();
  } catch (error: any) {
    const message = error?.response?.data?.Message || error?.response?.data?.message || error?.message || '删除失败';
    ElMessage.error(message);
  } finally {
    deletingId.value = null;
  }
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-training-competency-page">
      <HrPageIntro
        :title="pageTitle"
        description="维护学习路径能力项、能力类别、等级要求和启停状态。"
        :tags="['Sprint3', 'HR-TRAIN-03']"
      >
        <template #actions>
          <ElButton type="primary" :icon="Plus" @click="openCreate">新增能力项</ElButton>
          <ElButton @click="loadData">刷新</ElButton>
        </template>
      </HrPageIntro>

      <ElCard shadow="never" class="filter-card">
        <div class="toolbar">
          <div class="toolbar__item">
            <span class="toolbar__label">能力类别：</span>
            <ElSelect v-model="categoryFilter" class="toolbar__select">
              <ElOption v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
            </ElSelect>
          </div>
          <ElInput
            v-model="keyword"
            clearable
            placeholder="搜索能力名称/描述/状态"
            class="toolbar__input"
            :prefix-icon="Search"
            @keyup.enter="loadData"
          />
          <ElButton @click="loadData">查询</ElButton>
          <ElTag type="info" effect="plain" class="toolbar__count">共 {{ filteredDictRows.length }} 项能力</ElTag>
        </div>
      </ElCard>

      <ElCard shadow="never" class="table-card">
        <ElTable v-loading="loading" border :data="filteredDictRows" size="small">
          <ElTableColumn label="能力名称" min-width="180">
            <template #default="{ row = {} } = {}">
              <span class="name-cell">{{ row.name }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="能力类别" width="140">
            <template #default="{ row = {} } = {}">
              <ElTag :type="row.category === '专业能力' ? 'success' : row.category === '领导力' ? 'warning' : 'primary'" effect="light">
                {{ row.category }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="最高等级" width="150">
            <template #default="{ row = {} } = {}">
              <div class="level-dots">
                <span v-for="(active, index) in levelBlocks(row.level)" :key="index" :class="{ active }"></span>
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn label="能力描述" min-width="260" show-overflow-tooltip>
            <template #default="{ row = {} } = {}">{{ row.description }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="120">
            <template #default="{ row = {} } = {}">
              <ElTag :type="String(row.status || '').includes('停') ? 'info' : 'success'" effect="light">
                {{ row.status || '-' }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="132" fixed="right" align="center">
            <template #default="{ row = {} } = {}">
              <div class="operation-icons">
                <ElButton circle link type="primary" :icon="View" @click="openDetail(row.raw)" />
                <ElButton circle link type="primary" :icon="Edit" @click="openEdit(row.raw)" />
                <ElPopconfirm title="确认删除该能力项？" @confirm="removeRow(row.raw)">
                  <template #reference>
                    <ElButton
                      circle
                      link
                      type="danger"
                      :icon="Delete"
                      :loading="deletingId === pickValue(row.raw, ['id'])"
                    />
                  </template>
                </ElPopconfirm>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>

      <HrDetailDrawer v-model="detailVisible" title="能力模型详情" :summary="drawerSummary">
        <ElCard shadow="never">
          <ElDescriptions border :column="1">
            <ElDescriptionsItem label="能力编码">{{ pickValue(detailRow, ['competencyCode', 'code']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="能力说明">{{ pickValue(detailRow, ['content', 'description', 'remark']) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="原始数据">{{ JSON.stringify(detailRow || {}, null, 2) }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElCard>
      </HrDetailDrawer>

      <ElDialog v-model="createVisible" :title="editingRow ? '编辑能力项' : '新增能力项'" width="680px">
        <ElForm :model="createForm" label-width="96px">
          <div class="form-grid">
            <ElFormItem label="能力编码">
              <ElInput v-model="createForm.competencyCode" placeholder="请输入能力编码" />
            </ElFormItem>
            <ElFormItem label="能力名称" required>
              <ElInput v-model="createForm.competencyName" placeholder="请输入能力名称" />
            </ElFormItem>
            <ElFormItem label="能力类别">
              <ElSelect v-model="createForm.category" class="w-full">
                <ElOption label="通用能力" value="通用能力" />
                <ElOption label="专业能力" value="专业能力" />
                <ElOption label="领导力" value="领导力" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="要求等级">
              <ElSelect v-model="createForm.requiredLevel" class="w-full">
                <ElOption v-for="item in ['L1', 'L2', 'L3', 'L4', 'L5']" :key="item" :label="item" :value="item" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="状态">
              <ElSelect v-model="createForm.status" class="w-full">
                <ElOption label="启用" value="启用" />
                <ElOption label="停用" value="停用" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="能力说明" class="form-grid__full">
              <ElInput
                v-model="createForm.description"
                :rows="4"
                placeholder="请输入能力说明"
                type="textarea"
              />
            </ElFormItem>
          </div>
        </ElForm>
        <template #footer>
          <ElButton @click="createVisible = false">取消</ElButton>
          <ElButton type="primary" :loading="saving" @click="submitCreate">保存</ElButton>
        </template>
      </ElDialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-training-competency-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-card,
.table-card {
  border-radius: 8px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar__item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar__label {
  flex: 0 0 auto;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.toolbar__select {
  width: 160px;
}

.toolbar__input {
  width: 360px;
}

.toolbar__count {
  margin-left: auto;
}

.name-cell {
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.level-dots {
  display: flex;
  align-items: center;
  gap: 4px;
}

.level-dots span {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: var(--el-border-color-light);
}

.level-dots span.active {
  background: var(--el-color-primary);
}

.operation-icons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 12px;
}

.form-grid__full {
  grid-column: 1 / -1;
}

.w-full {
  width: 100%;
}

@media (max-width: 900px) {
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar__count {
    justify-content: flex-start;
    margin-left: 0;
  }

  .toolbar__input,
  .toolbar__select {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
