<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

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


defineOptions({ name: 'HrSalaryCrudPage' });

interface OptionItem {
  label: string;
  value: string;
}

interface FieldItem {
  key: string;
  label: string;
  type?: 'date' | 'number' | 'select' | 'textarea' | 'text';
  required?: boolean;
  options?: OptionItem[];
  placeholder?: string;
  disabled?: boolean;
}

interface ColumnItem {
  key: string;
  label: string;
  width?: number | string;
  tag?: boolean;
  type?: 'date' | 'datetime' | 'text';
}


const props = defineProps<{
  title: string;
  description: string;
  columns: ColumnItem[];
  fields: FieldItem[];
  initialValues: Record<string, any>;
  statusOptions?: OptionItem[];
  keywordPlaceholder?: string;
  listApi: (params?: any) => Promise<any[]>;
  createApi: (payload: any) => Promise<any>;
  updateApi: (id: string, payload: any) => Promise<any>;
  deleteApi: (id: string) => Promise<boolean>;
  filters?: FieldItem[];
}>();

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const viewOpen = ref(false);
const editing = ref<any>(null);
const viewing = ref<any>(null);
const rows = ref<any[]>([]);
const queryForm = reactive<Record<string, any>>({ q: '', status: 'all' });
const form = reactive<Record<string, any>>({});

const visibleRows = computed(() => rows.value);

function initQuery() {
  (props.filters || []).forEach((item) => {
    queryForm[item.key] = item.type === 'select' ? 'all' : '';
  });
}

function resetForm() {
  Object.keys(form).forEach((key) => delete form[key]);
  Object.assign(form, props.initialValues || {});
}

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = { q: queryForm.q?.trim() || undefined };
    if (queryForm.status && queryForm.status !== 'all') params.status = queryForm.status;
    (props.filters || []).forEach((item) => {
      const value = queryForm[item.key];
      if (value !== undefined && value !== null && value !== '' && value !== 'all') params[item.key] = value;
    });
    const data = await props.listApi(params);
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

function openEdit(row: any) {
  editing.value = row;
  resetForm();
  props.fields.forEach((field) => {
    form[field.key] = row[field.key] ?? form[field.key] ?? '';
    if (field.type === 'date' && form[field.key]) form[field.key] = String(form[field.key]).slice(0, 10);
  });
  dialogOpen.value = true;
}

function openView(row: any) {
  viewing.value = row;
  viewOpen.value = true;
}

async function submit() {
  for (const field of props.fields) {
    if (field.required && !String(form[field.key] ?? '').trim()) {
      ElMessage.warning(`请输入${field.label}`);
      return;
    }
  }
  const payload = { ...form };
  saving.value = true;
  try {
    if (editing.value?.id) await props.updateApi(editing.value.id, payload);
    else await props.createApi(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: any) {
  if (!row.id) return;
  await ElMessageBox.confirm('确认删除该记录吗？', '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  });
  await props.deleteApi(row.id);
  ElMessage.success('删除成功');
  await load();
}

function isDateColumn(column: ColumnItem) {
  return column.type === 'date' || column.type === 'datetime' || /date|time/i.test(column.key);
}

function formatColumnValue(column: ColumnItem, row: Record<string, any>) {
  const value = row?.[column.key];
  if (value === undefined || value === null || value === '') return '-';
  if (!isDateColumn(column)) return value;
  const text = String(value);
  return column.type === 'datetime' || /time/i.test(column.key) ? text.replace('T', ' ').slice(0, 19) : text.slice(0, 10);
}

function tagType(value: any) {
  const text = String(value || '');
  if (['有效', '生效', '已生成', '已完成', '已签批'].includes(text)) return 'success';
  if (['草稿', '待处理', '待签批', '进行中'].includes(text)) return 'warning';
  if (['已驳回', '停用', '失效'].includes(text)) return 'danger';
  return 'info';
}

onMounted(() => {
  initQuery();
  resetForm();
  void load();
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-salary-crud-page">
      <div class="page-header">
        <div>
          <h2>{{ title }}</h2>
          <p>{{ description }}</p>
        </div>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input v-model="queryForm.q" clearable :placeholder="keywordPlaceholder || '请输入关键词'" style="width: 280px" @keyup.enter="load" />
          </el-form-item>
          <el-form-item v-if="statusOptions?.length" label="状态">
            <el-select v-model="queryForm.status" style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item v-for="item in filters" :key="item.key" :label="item.label">
            <el-select v-if="item.type === 'select'" v-model="queryForm[item.key]" style="width: 150px">
              <el-option label="全部" value="all" />
              <el-option v-for="option in item.options || []" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
            <el-input v-else v-model="queryForm[item.key]" clearable style="width: 150px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="load">查询</el-button>
            <el-button
              @click="
                queryForm.q = '';
                queryForm.status = 'all';
                (filters || []).forEach((item) => (queryForm[item.key] = item.type === 'select' ? 'all' : ''));
                load();
              "
            >
              重置
            </el-button>
          </el-form-item>
          <div class="query-total">共 {{ visibleRows.length }} 条</div>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="card-title">列表</div>
        </template>
        <el-table v-loading="loading" :data="visibleRows" row-key="id" border height="100%">
          <el-table-column v-for="column in columns" :key="column.key" :prop="column.key" :label="column.label" :width="column.width" min-width="120" show-overflow-tooltip>
            <template #default="{ row = {}} = {}">
              <el-tag v-if="column.tag" :type="tagType(row[column.key])" effect="plain">{{ row[column.key] || '-' }}</el-tag>
              <span v-else>{{ formatColumnValue(column, row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="150">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openView(row)">查看</el-button>
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? `编辑${title}` : `新增${title}`" width="760px" destroy-on-close>
        <el-form :model="form" label-width="110px">
          <el-row :gutter="16">
            <el-col v-for="field in fields" :key="field.key" :span="field.type === 'textarea' ? 24 : 12">
              <el-form-item :label="field.label" :required="field.required">
                <el-select v-if="field.type === 'select'" v-model="form[field.key]" :disabled="field.disabled" style="width: 100%">
                  <el-option v-for="option in field.options || []" :key="option.value" :label="option.label" :value="option.value" />
                </el-select>
                <el-input v-else-if="field.type === 'textarea'" v-model="form[field.key]" :disabled="field.disabled" :placeholder="field.placeholder" :rows="4" type="textarea" />
                <el-input v-else-if="field.type === 'date'" v-model="form[field.key]" :disabled="field.disabled" type="date" />
                <el-input v-else-if="field.type === 'number'" v-model="form[field.key]" :disabled="field.disabled" type="number" />
                <el-input v-else v-model="form[field.key]" :disabled="field.disabled" :placeholder="field.placeholder" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button :disabled="saving" @click="dialogOpen = false">取消</el-button>
          <el-button :loading="saving" type="primary" @click="submit">保存</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="viewOpen" :title="`${title}详情`" width="680px">
        <el-descriptions :column="1" border>
          <el-descriptions-item v-for="column in columns" :key="column.key" :label="column.label">{{ formatColumnValue(column, viewing || {}) }}</el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-salary-crud-page {
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
