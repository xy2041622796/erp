<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { getPerformanceList, type HrPerformanceTable } from '#/api/erp/human-resources/performance';

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
const tableName = ref<HrPerformanceTable>('Bil_HR_Performance_Config_Indicator');
const rows = ref<any[]>([]);

const tableOptions = [
  { label: '指标库', value: 'Bil_HR_Performance_Config_Indicator' },
  { label: '关系矩阵', value: 'Bil_HR_Performance_Config_Matrix' },
  { label: '考核模板', value: 'Bil_HR_Performance_Config_Template' },
  { label: '年度指标', value: 'Bil_HR_Performance_Strategy_Annual' },
  { label: '月度计划', value: 'Bil_HR_Performance_Strategy_Monthly' },
  { label: '考核评价', value: 'Bil_HR_Performance_Evaluation_Review' },
  { label: '考核结果', value: 'Bil_HR_Performance_Evaluation_Result' },
  { label: '绩效面谈', value: 'Bil_HR_Performance_Evaluation_Interview' },
] as const;

async function loadData() {
  loading.value = true;
  try {
    const res = await getPerformanceList(tableName.value, { keyword: keyword.value });
    rows.value = res.list || [];
  } catch (error: any) {
    ElMessage.warning(error?.message || '绩效数据暂未接通，请先执行迁移脚本或配置接口 FormKey');
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
          <h2>绩效管理</h2>
          <p>承接 siweiOA 绩效配置、年度/月度策略、考核评价、结果与面谈。</p>
        </div>
      </div>

      <ElCard shadow="never">
        <div class="filter-row">
          <ElSelect v-model="tableName" class="table-select" @change="loadData">
            <ElOption v-for="item in tableOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
          <ElInput v-model="keyword" clearable placeholder="指标/模板/员工/计划" @keyup.enter="loadData" />
          <ElButton type="primary" @click="loadData">查询</ElButton>
        </div>

        <ElTable v-loading="loading" border :data="rows" size="small">
          <ElTableColumn label="编码" min-width="150">
            <template #default="{ row = {}} = {}">{{ row.indicatorCode || row.templateCode || row.planCode || row.reviewCode || row.resultCode || row.interviewCode || row.rowid || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="名称/员工" min-width="180">
            <template #default="{ row = {}} = {}">{{ row.indicatorName || row.templateName || row.planName || row.employeeName || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="周期/部门" min-width="150">
            <template #default="{ row = {}} = {}">{{ row.periodText || row.departmentName || row.monthText || row.year || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="分数/权重" min-width="120">
            <template #default="{ row = {}} = {}">{{ row.finalScore || row.score || row.weight || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" min-width="100">
            <template #default="{ row = {}} = {}">{{ row.status || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="说明" min-width="220">
            <template #default="{ row = {}} = {}">{{ row.definition || row.description || row.remark || row.summary || '-' }}</template>
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
.table-select {
  width: 180px;
}
.filter-row .el-input {
  width: 260px;
}
</style>
