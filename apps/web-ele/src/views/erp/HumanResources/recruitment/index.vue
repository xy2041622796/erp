<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { getRecruitmentList, type HrRecruitmentTable } from '#/api/erp/human-resources/recruitment';

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
const tableName = ref<HrRecruitmentTable>('Bil_HR_Recruitment_Job_Postings');
const rows = ref<any[]>([]);

const tableOptions = [
  { label: '招聘职位', value: 'Bil_HR_Recruitment_Job_Postings' },
  { label: 'Offer 审批', value: 'Bil_HR_Recruitment_Offers' },
] as const;

async function loadData() {
  loading.value = true;
  try {
    const res = await getRecruitmentList(tableName.value, { keyword: keyword.value });
    rows.value = res.list || [];
  } catch (error: any) {
    ElMessage.warning(error?.message || '招聘数据暂未接通，请先执行迁移脚本或配置接口 FormKey');
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
          <h2>招聘管理</h2>
          <p>承接 siweiOA 招聘职位与 Offer 审批数据。</p>
        </div>
      </div>

      <ElCard shadow="never">
        <div class="filter-row">
          <ElSelect v-model="tableName" class="table-select" @change="loadData">
            <ElOption v-for="item in tableOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
          <ElInput v-model="keyword" clearable placeholder="职位/编码/候选人" @keyup.enter="loadData" />
          <ElButton type="primary" @click="loadData">查询</ElButton>
        </div>

        <ElTable v-loading="loading" border :data="rows" size="small">
          <ElTableColumn label="编码" min-width="150">
            <template #default="{ row = {}} = {}">{{ row.job_code || row.offer_code || row.rowid || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="职位/候选人" min-width="180">
            <template #default="{ row = {}} = {}">{{ row.title || row.candidate_id || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="部门/岗位" min-width="150">
            <template #default="{ row = {}} = {}">{{ row.dep_id || row.job_rowid || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="薪资" min-width="140">
            <template #default="{ row = {}} = {}">{{ row.salary || (row.salary_min && row.salary_max ? `${row.salary_min} - ${row.salary_max}` : '-') }}</template>
          </ElTableColumn>
          <ElTableColumn label="日期" min-width="160">
            <template #default="{ row = {}} = {}">{{ row.published_at || row.deadline || row.start_date || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" min-width="100">
            <template #default="{ row = {}} = {}">{{ row.status || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="说明" min-width="220">
            <template #default="{ row = {}} = {}">{{ row.requirements || row.responsibilities || row.remark || row.description || '-' }}</template>
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
