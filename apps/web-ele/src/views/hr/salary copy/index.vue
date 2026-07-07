<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { getSalaryDetailList, getSalaryInfoList } from '#/api/erp/human-resources/salary';

import {
  ElButton,
  ElCard,
  ElInput,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
} from 'element-plus';

const loading = ref(false);
const keyword = ref('');
const activeTab = ref('info');
const rows = ref<any[]>([]);

async function loadData() {
  loading.value = true;
  try {
    const res = activeTab.value === 'detail'
      ? await getSalaryDetailList({ keyword: keyword.value })
      : await getSalaryInfoList({ keyword: keyword.value });
    rows.value = res.list || [];
  } catch (error: any) {
    ElMessage.warning(error?.message || '薪酬数据暂未接通，请先执行迁移脚本或配置接口 FormKey');
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

function changeTab() {
  rows.value = [];
  void loadData();
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-sub-page">
      <div class="title-row">
        <div>
          <h2>薪酬管理</h2>
          <p>承接 siweiOA 薪资核算、薪资明细、薪酬政策、薪资报表和薪酬设置。</p>
        </div>
      </div>

      <ElCard shadow="never">
        <div class="filter-row">
          <ElInput v-model="keyword" clearable placeholder="薪资编号/员工/部门" @keyup.enter="loadData" />
          <ElButton type="primary" @click="loadData">查询</ElButton>
        </div>

        <ElTabs v-model="activeTab" @tab-change="changeTab">
          <ElTabPane label="薪资批次" name="info" />
          <ElTabPane label="薪资明细" name="detail" />
        </ElTabs>

        <ElTable v-loading="loading" border :data="rows" size="small">
          <ElTableColumn label="编号" min-width="160">
            <template #default="{ row = {}} = {}">{{ row.salary_no || row.rowid || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="员工/部门" min-width="160">
            <template #default="{ row = {}} = {}">{{ row.employee_name || row.depart_name || row.department_name || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="应发" min-width="100">
            <template #default="{ row = {}} = {}">{{ row.total_should_pay || row.gross_salary || row.basic_salary || 0 }}</template>
          </ElTableColumn>
          <ElTableColumn label="实发" min-width="100">
            <template #default="{ row = {}} = {}">{{ row.total_actual_pay || row.net_salary || 0 }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" min-width="100">
            <template #default="{ row = {}} = {}">{{ row.status || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="备注" min-width="180">
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
