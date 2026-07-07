<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { getHrProjectHoursList } from '#/api/erp/human-resources/project-hours';

import {
  ElButton,
  ElCard,
  ElInput,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const loading = ref(false);
const keyword = ref('');
const rows = ref<any[]>([]);

async function loadData() {
  loading.value = true;
  try {
    const res = await getHrProjectHoursList({ keyword: keyword.value });
    rows.value = res.list || [];
  } catch (error: any) {
    ElMessage.warning(error?.message || '项目工时数据暂未接通，请先执行迁移脚本或配置接口 FormKey');
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-sub-page">
      <div class="title-row">
        <div>
          <h2>项目工时</h2>
          <p>承接 siweiOA `project_resource_hours`，用于项目维度的人力成本和工时统计。</p>
        </div>
      </div>

      <ElCard shadow="never">
        <div class="filter-row">
          <ElInput v-model="keyword" clearable placeholder="工时编号/员工/项目" @keyup.enter="loadData" />
          <ElButton type="primary" @click="loadData">查询</ElButton>
        </div>

        <ElTable v-loading="loading" border :data="rows" size="small">
          <ElTableColumn label="工时编号" min-width="160">
            <template #default="{ row = {}} = {}">{{ row.hours_code || row.rowid || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="项目ID" min-width="150">
            <template #default="{ row = {}} = {}">{{ row.project_id || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="员工" min-width="140">
            <template #default="{ row = {}} = {}">{{ row.employee_name || row.employee_id || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="工作日期" min-width="130">
            <template #default="{ row = {}} = {}">{{ row.work_date || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="工时" min-width="100">
            <template #default="{ row = {}} = {}">{{ row.hours || 0 }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" min-width="100">
            <template #default="{ row = {}} = {}">{{ row.status || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="备注" min-width="220">
            <template #default="{ row = {}} = {}">{{ row.remark || row.description || '-' }}</template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </div>
  </Page>
</template>

<style scoped>
.hr-sub-page {
  padding: 16px;
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
.filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.filter-row .el-input {
  width: 260px;
}
</style>
