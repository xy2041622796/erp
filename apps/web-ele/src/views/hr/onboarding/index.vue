<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { getOnboardingList, type HrOnboardingTable } from '#/api/erp/human-resources/onboarding';

import {
  ElButton,
  ElCard,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const loading = ref(false);
const keyword = ref('');
const tableName = ref<HrOnboardingTable>('Bil_HR_Onboarding_Entries');
const rows = ref<any[]>([]);

const tableOptions = [
  { label: '入离职申请', value: 'Bil_HR_Onboarding_Applications' },
  { label: '入职办理', value: 'Bil_HR_Onboarding_Entries' },
  { label: '离职办理', value: 'Bil_HR_Resignation_Requests' },
] as const;

async function loadData() {
  loading.value = true;
  try {
    const res = await getOnboardingList(tableName.value, { keyword: keyword.value });
    rows.value = res.list || [];
  } catch (error: any) {
    ElMessage.warning(error?.message || '入离职数据暂未接通，请先执行迁移脚本或配置接口 FormKey');
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
          <h2>入离职管理</h2>
          <p>承接 siweiOA 入职、离职和入离职申请数据。</p>
        </div>
      </div>

      <ElCard shadow="never">
        <div class="filter-row">
          <ElSelect v-model="tableName" class="table-select" @change="loadData">
            <ElOption v-for="item in tableOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
          <ElInput v-model="keyword" clearable placeholder="姓名/入职编号/离职编号" @keyup.enter="loadData" />
          <ElButton type="primary" @click="loadData">查询</ElButton>
        </div>

        <ElTable v-loading="loading" border :data="rows" size="small">
          <ElTableColumn label="编号" min-width="150">
            <template #default="{ row = {}} = {}">{{ row.entry_no || row.resign_no || row.rowid || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="姓名/员工" min-width="160">
            <template #default="{ row = {}} = {}">{{ row.name || row.user_rowid || row.employee_id || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="部门/岗位" min-width="150">
            <template #default="{ row = {}} = {}">{{ row.department_id || row.planned_dep_id || row.dep_id || row.position || row.job_rowid || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="日期" min-width="160">
            <template #default="{ row = {}} = {}">{{ row.entry_date || row.effective_date || row.apply_date || row.last_day || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" min-width="110">
            <template #default="{ row = {}} = {}">{{ row.status || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="说明" min-width="240">
            <template #default="{ row = {}} = {}">{{ row.reason || row.resign_reason || row.handover_notes || row.remark || row.description || '-' }}</template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </div>
  </Page>
</template>

<style scoped>
.hr-sub-page { padding: 16px; }
.title-row { margin-bottom: 16px; padding: 18px; background: #fff; border-radius: 8px; }
.title-row h2 { margin: 0; font-size: 20px; }
.title-row p { margin: 8px 0 0; color: #909399; }
.filter-row { display: flex; gap: 8px; margin-bottom: 12px; }
.table-select { width: 180px; }
.filter-row .el-input { width: 260px; }
</style>
