<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { RefreshRight } from '@element-plus/icons-vue';


import { getProjectStatistics } from '#/api/erp/finance/project/statistics';
import { getProjectManageSimpleList } from '#/api/erp/project/manage';

import {
  ElButton,
  ElCard,
  ElEmpty,
  ElMessage,
  ElOption,
  ElProgress,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinanceProjectStatisticsPage' });

const loading = ref(false);
const period = ref('year');
const summary = ref({ totalBudget: 0, totalUsed: 0, totalRemaining: 0, usageRate: 0 });
const projectExpenses = ref<any[]>([]);
const expenseCategories = ref<any[]>([]);
const monthlyExpenses = ref<any[]>([]);
const reportList = ref<any[]>([]);
const projectOptions = ref<any[]>([]);

const usageStatus = computed(() => {
  const rate = Number(summary.value.usageRate || 0);
  if (rate >= 100) return { label: '超支', type: 'danger' as const };
  if (rate >= 80) return { label: '预警', type: 'warning' as const };
  return { label: '正常', type: 'success' as const };
});

onMounted(async () => {
  await Promise.all([handleQuery(), loadProjectOptions()]);
});

function formatMoney(value: unknown) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '--';
  if (text.includes('T')) return text.split('T')[0];
  if (text.includes(' ')) return text.split(' ')[0];
  return text.length >= 10 ? text.slice(0, 10) : text;
}

async function loadProjectOptions() {
  try {
    const list = await getProjectManageSimpleList();
    projectOptions.value = Array.isArray(list) ? list : [];
  } catch {
    projectOptions.value = [];
  }
}

function getProjectName(row: Record<string, any> | null | undefined) {
  const projectId = String(row?.id || row?.project_id || '').trim();
  const projectName = String(row?.project_name || '').trim();
  const matched = projectOptions.value.find((item) => String(item?.rowid || '') === projectId);
  return String(matched?.project_name || projectName || projectId || '--');
}

async function handleQuery() {
  loading.value = true;
  try {
    const res = await getProjectStatistics(period.value);
    summary.value = res?.data?.summary || summary.value;
    projectExpenses.value = res?.data?.projectExpenses || [];
    expenseCategories.value = res?.data?.expenseCategories || [];
    monthlyExpenses.value = res?.data?.monthlyExpenses || [];
    reportList.value = res?.data?.reportList || [];
  } catch (error: any) {
    ElMessage.error(error?.message || '加载统计数据失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Page auto-content-height>
    <div class="project-statistics-page">
      <div class="project-statistics-page__header">
        <div>
          <div class="project-statistics-page__title">开支费用统计</div>
          <div class="project-statistics-page__subtitle">保留源项目“总览 + 项目对比 + 类别分布 + 月度趋势 + 报表列表”的统计结构，不退化成普通列表。</div>
        </div>
        <div class="project-statistics-page__header-actions">
          <el-select v-model="period" style="width: 140px" @change="handleQuery">
            <el-option label="本年度" value="year" />
            <el-option label="本季度" value="quarter" />
            <el-option label="本月" value="month" />
          </el-select>
          <el-button :icon="RefreshRight" @click="handleQuery">刷新</el-button>
        </div>
      </div>

      <div class="project-statistics-page__summary-grid">
        <el-card shadow="never"><div class="summary-card"><span>总预算</span><strong>¥{{ formatMoney(summary.totalBudget) }}</strong></div></el-card>
        <el-card shadow="never"><div class="summary-card"><span>已使用</span><strong class="warning">¥{{ formatMoney(summary.totalUsed) }}</strong></div></el-card>
        <el-card shadow="never"><div class="summary-card"><span>剩余预算</span><strong class="success">¥{{ formatMoney(summary.totalRemaining) }}</strong></div></el-card>
        <el-card shadow="never"><div class="summary-card"><span>执行率</span><strong class="primary">{{ Number(summary.usageRate || 0).toFixed(1) }}%</strong><el-tag :type="usageStatus.type">{{ usageStatus.label }}</el-tag></div></el-card>
      </div>

      <div class="project-statistics-page__two-column">
        <el-card shadow="never">
          <template #header><span>项目费用对比</span></template>
          <el-table v-loading="loading" :data="projectExpenses" border height="360">
            <el-table-column prop="project_name" label="项目名称" min-width="180">
              <template #default="{ row }">{{ getProjectName(row) }}</template>
            </el-table-column>
            <el-table-column label="预算" min-width="120" align="right"><template #default="{ row }">¥{{ formatMoney(row.budget) }}</template></el-table-column>
            <el-table-column label="已使用" min-width="120" align="right"><template #default="{ row }">¥{{ formatMoney(row.used) }}</template></el-table-column>
            <el-table-column label="剩余" min-width="120" align="right"><template #default="{ row }">¥{{ formatMoney(row.remaining) }}</template></el-table-column>
            <el-table-column label="执行率" min-width="160">
              <template #default="{ row }">
                <div class="rate-row">
                  <el-progress :percentage="Math.min(Number(row.usage_rate || 0), 100)" :status="row.status === 'over' ? 'exception' : row.status === 'warning' ? 'warning' : 'success'" />
                  <el-tag :type="row.status === 'over' ? 'danger' : row.status === 'warning' ? 'warning' : 'success'">{{ Number(row.usage_rate || 0).toFixed(1) }}%</el-tag>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card shadow="never">
          <template #header><span>费用类型分布</span></template>
          <div class="distribution-list">
            <div v-for="item in expenseCategories" :key="item.name" class="distribution-item">
              <div class="distribution-item__head">
                <span>{{ item.name }}</span>
                <span>¥{{ formatMoney(item.value) }} / {{ Number(item.percent || 0).toFixed(1) }}%</span>
              </div>
              <el-progress :percentage="Math.min(Number(item.percent || 0), 100)" :color="item.color" />
            </div>
            <el-empty v-if="!expenseCategories.length" description="暂无费用分类数据" />
          </div>
        </el-card>
      </div>

      <el-card shadow="never">
        <template #header><span>月度费用趋势</span></template>
        <el-table v-loading="loading" :data="monthlyExpenses" border height="320">
          <el-table-column prop="month" label="月份" width="120" />
          <el-table-column label="月度预算" min-width="140" align="right"><template #default="{ row }">¥{{ formatMoney(row.budget) }}</template></el-table-column>
          <el-table-column label="实际支出" min-width="140" align="right"><template #default="{ row }">¥{{ formatMoney(row.amount) }}</template></el-table-column>
          <el-table-column label="差额" min-width="140" align="right">
            <template #default="{ row }">
              <span :class="Number(row.budget || 0) - Number(row.amount || 0) < 0 ? 'danger' : 'success'">
                ¥{{ formatMoney(Number(row.budget || 0) - Number(row.amount || 0)) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="执行率" min-width="120" align="center">
            <template #default="{ row }">
              {{ Number(row.budget || 0) > 0 ? ((Number(row.amount || 0) / Number(row.budget || 0)) * 100).toFixed(1) : '0.0' }}%
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header><span>统计报表记录</span></template>
        <el-table v-loading="loading" :data="reportList" border height="240">
          <el-table-column prop="report_code" label="报表编号" min-width="140" />
          <el-table-column prop="report_name" label="报表名称" min-width="220" />
          <el-table-column prop="period_text" label="统计周期" min-width="120" />
          <el-table-column prop="status" label="状态" min-width="120" />
          <el-table-column prop="updateTime" label="更新日期" min-width="140">
            <template #default="{ row }">{{ formatDate(row.updateTime) }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </Page>
</template>

<style scoped>
.project-statistics-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.project-statistics-page__header,
.project-statistics-page__header-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.project-statistics-page__title {
  font-size: 20px;
  font-weight: 600;
}
.project-statistics-page__subtitle {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
}
.project-statistics-page__summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.summary-card strong {
  font-size: 22px;
}
.project-statistics-page__two-column {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
}
.rate-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}
.distribution-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 320px;
}
.distribution-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}
.primary { color: var(--el-color-primary); }
.success { color: var(--el-color-success); }
.warning { color: var(--el-color-warning); }
.danger { color: var(--el-color-danger); }
@media (max-width: 1200px) {
  .project-statistics-page__summary-grid,
  .project-statistics-page__two-column {
    grid-template-columns: 1fr;
  }
}
</style>
