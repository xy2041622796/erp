<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { getTrainingList, type HrTrainingTable } from '#/api/erp/human-resources/training';

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
const tableName = ref<HrTrainingTable>('Bil_HR_Training_Course');
const rows = ref<any[]>([]);

const tableOptions = [
  { label: '课程库', value: 'Bil_HR_Training_Course' },
  { label: '培训评估', value: 'Bil_HR_Training_Evaluation' },
  { label: '胜任力模型', value: 'Bil_HR_Training_Competency' },
  { label: '差距分析', value: 'Bil_HR_Training_Gap_Analysis' },
  { label: '培养计划', value: 'Bil_HR_Training_Plan' },
  { label: '成长路线', value: 'Bil_HR_Training_Roadmap' },
] as const;

async function loadData() {
  loading.value = true;
  try {
    const res = await getTrainingList(tableName.value, { keyword: keyword.value });
    rows.value = res.list || [];
  } catch (error: any) {
    ElMessage.warning(error?.message || '培训数据暂未接通，请先执行迁移脚本或配置接口 FormKey');
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
          <h2>培训成长</h2>
          <p>承接 siweiOA 培训课程、培训评估、胜任力模型、差距分析、培养计划和成长路线。</p>
        </div>
      </div>

      <ElCard shadow="never">
        <div class="filter-row">
          <ElSelect v-model="tableName" class="table-select" @change="loadData">
            <ElOption v-for="item in tableOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
          <ElInput v-model="keyword" clearable placeholder="课程/员工/能力/计划" @keyup.enter="loadData" />
          <ElButton type="primary" @click="loadData">查询</ElButton>
        </div>

        <ElTable v-loading="loading" border :data="rows" size="small">
          <ElTableColumn label="编码" min-width="150">
            <template #default="{ row = {}} = {}">{{ row.courseCode || row.evaluationCode || row.competencyCode || row.gapCode || row.planCode || row.roadmapCode || row.rowid || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="名称/员工" min-width="180">
            <template #default="{ row = {}} = {}">{{ row.courseName || row.employeeName || row.competencyName || row.planName || row.roadmapName || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="分类/岗位" min-width="150">
            <template #default="{ row = {}} = {}">{{ row.category || row.targetJobName || row.jobName || row.departmentName || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="分数/等级" min-width="120">
            <template #default="{ row = {}} = {}">{{ row.score || row.requiredLevel || row.gapLevel || row.stageCount || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" min-width="100">
            <template #default="{ row = {}} = {}">{{ row.status || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="说明" min-width="220">
            <template #default="{ row = {}} = {}">{{ row.summary || row.analysisSummary || row.description || row.remark || row.content || '-' }}</template>
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
