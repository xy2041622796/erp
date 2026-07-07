<script lang="ts" setup>
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  DataAnalysis,
  DataBoard,
  Document,
  List,
  Money,
  Tickets,
  TrendCharts,
} from '@element-plus/icons-vue';
import { ElCard, ElIcon, ElTag } from 'element-plus';

defineOptions({ name: 'FinanceReportsIndex' });

const router = useRouter();

type ReportItem = {
  category: string;
  desc: string;
  icon: unknown;
  path: string;
  title: string;
};

const reportItems: ReportItem[] = [
  {
    title: '资产负债表',
    desc: '反映企业在某一特定日期的财务状况',
    icon: Tickets,
    path: '/finance/reports/balance-sheet',
    category: '财务报表',
  },
  {
    title: '利润表',
    desc: '反映企业在一定期间的经营成果',
    icon: DataAnalysis,
    path: '/finance/reports/profit-statement',
    category: '财务报表',
  },
  {
    title: '现金流量表',
    desc: '反映企业现金流入、流出及净额变化',
    icon: Money,
    path: '/finance/reports/cash-flow',
    category: '财务报表',
  },
  {
    title: '标准现金流量表',
    desc: '按标准项目口径展示现金流量数据',
    icon: TrendCharts,
    path: '/finance/reports/standard-cash-flow',
    category: '财务报表',
  },
  {
    title: '费用明细表',
    desc: '按费用明细口径查询发生数据',
    icon: List,
    path: '/finance/reports/breakdown',
    category: '明细报表',
  },
];

function openReport(item: ReportItem) {
  router.push({
    path: item.path,
    query: {
      moduleScope: 'finance',
      source: 'finance-reports',
      report: item.title,
    },
  });
}
</script>

<template>
  <Page auto-content-height class="h-full">
    <div class="report-center h-full min-h-0">
      <div class="report-center__header">
        <div>
          <div class="report-center__title">财务报表</div>
          <div class="report-center__desc">集中查看资产负债表、利润表、现金流量表和核算项目报表</div>
        </div>
      </div>

      <div class="report-grid">
        <ElCard
          v-for="item in reportItems"
          :key="item.path"
          shadow="hover"
          class="report-card"
          @click="openReport(item)"
        >
          <div class="report-card__top">
            <div class="report-card__icon">
              <ElIcon><component :is="item.icon" /></ElIcon>
            </div>
            <ElTag effect="plain" type="primary">{{ item.category }}</ElTag>
          </div>
          <div class="report-card__title">{{ item.title }}</div>
          <div class="report-card__desc">{{ item.desc }}</div>
        </ElCard>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.report-center {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px;
}

.report-center__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  background: var(--el-fill-color-blank);
}

.report-center__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.report-center__desc {
  margin-top: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.report-card {
  cursor: pointer;
  border-radius: 12px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.report-card:hover {
  transform: translateY(-2px);
}

.report-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.report-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: 24px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 10px;
}

.report-card__title {
  margin-top: 16px;
  font-size: 17px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.report-card__desc {
  min-height: 40px;
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--el-text-color-secondary);
}
</style>
