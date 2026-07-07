<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { queryHrMigratedTable } from '#/api/erp/human-resources/migration';

import {
  ElButton,
  ElCard,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

interface TableOption {
  label: string;
  value: string;
}

interface SourcePage {
  title: string;
  sourcePath: string;
  tableOptions: TableOption[];
  searchFields?: string[];
  description?: string;
  embedded?: boolean;
}

const props = defineProps<SourcePage>();

const loading = ref(false);
const keyword = ref('');
const tableName = ref(props.tableOptions[0]?.value || '');
const rows = ref<any[]>([]);

const activeTableLabel = computed(() => props.tableOptions.find((item) => item.value === tableName.value)?.label || tableName.value);

function pickValue(row: any, fields: string[]) {
  for (const field of fields) {
    const value = row?.[field];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '-';
}

async function loadData() {
  if (!tableName.value) {
    rows.value = [];
    return;
  }

  loading.value = true;
  try {
    const res = await queryHrMigratedTable(tableName.value, {
      keyword: keyword.value,
      searchFields: props.searchFields || ['name', 'title', 'employeeName', 'employee_name', 'code', 'status'],
    });
    rows.value = res.list || [];
  } catch (error: any) {
    ElMessage.warning(error?.message || '迁移数据暂未接通，请确认 HR 迁移表和 FormKey 配置');
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <component :is="embedded ? 'div' : Page" :auto-content-height="embedded ? undefined : true">
    <div class="hr-migrated-sub-page" :class="{ embedded }">
      <div class="title-row">
        <div>
          <h2>{{ title }}</h2>
          <p>{{ description || '承接 siweiOA 子级导航页面，按原页面归入当前 HR 模块。' }}</p>
          <div class="meta-row">
            <ElTag type="info">源页面：{{ sourcePath }}</ElTag>
            <ElTag>当前表：{{ activeTableLabel }}</ElTag>
          </div>
        </div>
      </div>

      <ElCard shadow="never">
        <div class="filter-row">
          <ElSelect v-model="tableName" class="table-select" @change="loadData">
            <ElOption v-for="item in tableOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
          <ElInput v-model="keyword" clearable placeholder="编码/名称/员工/状态" @keyup.enter="loadData" />
          <ElButton type="primary" @click="loadData">查询</ElButton>
        </div>

        <ElTable v-loading="loading" border :data="rows" size="small">
          <ElTableColumn label="编码" min-width="150">
            <template #default="{ row = {}} = {}">{{ pickValue(row, ['code', 'employeeCode', 'employee_code', 'job_code', 'offer_code', 'planCode', 'reviewCode', 'resultCode', 'indicatorCode', 'templateCode', 'rowid']) }}</template>
          </ElTableColumn>
          <ElTableColumn label="名称/员工" min-width="180">
            <template #default="{ row = {}} = {}">{{ pickValue(row, ['name', 'title', 'employeeName', 'employee_name', 'candidateName', 'candidate_name', 'indicatorName', 'templateName', 'courseName', 'planName']) }}</template>
          </ElTableColumn>
          <ElTableColumn label="部门/周期" min-width="150">
            <template #default="{ row = {}} = {}">{{ pickValue(row, ['departmentName', 'department_name', 'deptName', 'periodText', 'monthText', 'year', 'scheduleName']) }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" min-width="110">
            <template #default="{ row = {}} = {}">{{ pickValue(row, ['status', 'state', 'approvalStatus', 'approval_status']) }}</template>
          </ElTableColumn>
          <ElTableColumn label="说明" min-width="240">
            <template #default="{ row = {}} = {}">{{ pickValue(row, ['description', 'remark', 'summary', 'definition', 'content']) }}</template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </div>
  </component>
</template>

<style scoped>
.hr-migrated-sub-page {
  padding: 16px;
}
.hr-migrated-sub-page.embedded {
  padding: 0;
}
.title-row {
  margin-bottom: 16px;
  padding: 18px;
  background: #fff;
  border-radius: 8px;
}
.title-row h2 {
  margin: 0;
  font-size: 20px;
}
.title-row p {
  margin: 8px 0 0;
  color: #909399;
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.table-select {
  width: 220px;
}
.filter-row .el-input {
  width: 280px;
}
</style>
