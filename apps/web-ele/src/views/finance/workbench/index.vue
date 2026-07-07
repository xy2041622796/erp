<script lang="ts" setup>
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  ArrowRight,
  DataAnalysis,
  DataBoard,
  Document,
  DocumentAdd,
  Files,
  Grid,
  List,
  Reading,
} from '@element-plus/icons-vue';
import { ElCard, ElIcon, ElTag } from 'element-plus';

defineOptions({ name: 'FinanceWorkbench' });

const router = useRouter();

type QuickEntry = {
  color: string;
  desc: string;
  icon: unknown;
  path?: string;
  title: string;
  type?: 'createVoucher';
};

type ReportItem = {
  desc: string;
  icon: unknown;
  path: string;
  title: string;
};

const quickEntries: QuickEntry[] = [
  {
    title: '凭证列表',
    desc: '查看与管理所有凭证记录',
    icon: Files,
    color: 'green',
    path: '/finance/Voucher',
  },
  {
    title: '报表中心',
    desc: '常用报表查询与分析',
    icon: DataBoard,
    color: 'orange',
    path: '/finance/reports',
  },
  {
    title: '更多应用',
    desc: '探索更多功能与工具',
    icon: Grid,
    color: 'purple',
    path: '/finance/workbench',
  },
];

const reportItems: ReportItem[] = [
  {
    title: '资产负债表',
    desc: '反映企业在某一特定日期的财务状况',
    icon: DataBoard,
    path: '/finance/reports/balance-sheet',
  },
  {
    title: '利润表',
    desc: '反映企业在一定期间的经营成果',
    icon: DataAnalysis,
    path: '/finance/reports/profit-statement',
  },
  {
    title: '科目余额表',
    desc: '反映各会计科目在所选期间的期初、借方、贷方和期末余额',
    icon: List,
    path: '/finance/ledger/subject-balance',
  },
  {
    title: '明细账',
    desc: '按科目查看业务发生、借贷方向和余额变化明细',
    icon: Document,
    path: '/finance/ledger/detail',
  },
];

function pushPath(path: string, query: Record<string, string> = {}) {
  router.push({
    path,
    query: {
      moduleScope: 'finance',
      source: 'finance-workbench',
      ...query,
    },
  });
}

function openCreateVoucher() {
  router.push({
    name: 'FinanceVoucherCreate',
    query: {
      moduleScope: 'finance',
      source: 'finance-workbench',
    },
  }).catch(() => {
    pushPath('/finance/Voucher', { action: 'create' });
  });
}

function openQuickEntry(item: QuickEntry) {
  if (item.type === 'createVoucher') {
    openCreateVoucher();
    return;
  }
  if (item.path) pushPath(item.path, { entry: item.title });
}

function openReport(item: ReportItem) {
  pushPath(item.path, { report: item.title });
}
</script>

<template>
  <Page>
    <div class="finance-workbench-simple">
      <ElCard shadow="never" class="workbench-card quick-card">
        <template #header>
          <div class="section-title"><span></span>快捷入口</div>
        </template>

        <div class="create-panel" role="button" tabindex="0" @click="openCreateVoucher" @keydown.enter="openCreateVoucher">
          <div class="create-content">
            <div class="app-icon icon-blue create-icon">
              <ElIcon><DocumentAdd /></ElIcon>
            </div>
            <div class="create-copy">
              <div class="create-title">新增凭证</div>
              <div class="create-desc">快速录入会计凭证，记录业务发生</div>
            </div>
            <button class="create-button" type="button" @click.stop="openCreateVoucher">
              立即录入
              <ElIcon><ArrowRight /></ElIcon>
            </button>
          </div>
          <div class="create-watermark">
            <Reading />
          </div>
        </div>

        <button
          v-for="item in quickEntries"
          :key="item.title"
          class="quick-row"
          type="button"
          @click="openQuickEntry(item)"
        >
          <div class="quick-left">
            <div class="app-icon" :class="`icon-${item.color}`">
              <ElIcon><component :is="item.icon" /></ElIcon>
            </div>
            <div>
              <div class="quick-title">{{ item.title }}</div>
              <div class="quick-desc">{{ item.desc }}</div>
            </div>
          </div>
          <ElIcon class="row-arrow"><ArrowRight /></ElIcon>
        </button>
      </ElCard>

      <ElCard shadow="never" class="workbench-card report-card">
        <template #header>
          <div class="section-header">
            <div class="section-title"><span></span>常用报表</div>
            <button class="view-all" type="button" @click="pushPath('/finance/reports')">
              查看全部
              <ElIcon><ArrowRight /></ElIcon>
            </button>
          </div>
        </template>

        <div class="report-grid">
          <button
            v-for="item in reportItems"
            :key="item.title"
            class="report-item"
            type="button"
            @click="openReport(item)"
          >
            <ElTag class="report-tag" effect="plain" type="primary">常用</ElTag>
            <div class="report-icon-wrap">
              <ElIcon><component :is="item.icon" /></ElIcon>
            </div>
            <div class="report-main">
              <div class="report-title">{{ item.title }}</div>
              <div class="report-desc">{{ item.desc }}</div>
            </div>
          </button>
        </div>
      </ElCard>
    </div>
  </Page>
</template>

<style scoped>
.finance-workbench-simple {
  display: grid;
  grid-template-columns: minmax(360px, 0.72fr) minmax(560px, 1.15fr);
  gap: 18px;
  min-height: calc(100vh - 104px);
}

.workbench-card {
  border: 1px solid #e6ecf5;
  border-radius: 10px;
}

:deep(.el-card__header) {
  padding: 20px 26px 12px;
  border-bottom: 0;
}

:deep(.el-card__body) {
  padding: 16px 26px 28px;
}

.section-header,
.section-title,
.view-all,
.quick-left,
.create-button {
  display: flex;
  align-items: center;
}

.section-header {
  justify-content: space-between;
}

.section-title {
  gap: 10px;
  font-size: 20px;
  font-weight: 800;
  color: #111827;
  letter-spacing: 2px;
}

.section-title span {
  width: 4px;
  height: 24px;
  background: #2563eb;
  border-radius: 999px;
}

.view-all {
  gap: 8px;
  padding: 0;
  font-size: 15px;
  color: #2563eb;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.create-panel {
  position: relative;
  min-height: 176px;
  padding: 36px 30px;
  margin-bottom: 22px;
  overflow: hidden;
  cursor: pointer;
  background:
    radial-gradient(circle at 96% 108%, rgb(37 99 235 / 12%) 0, rgb(37 99 235 / 12%) 30%, transparent 31%),
    linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid rgb(37 99 235 / 38%);
  border-radius: 8px;
  transition: all 0.18s ease;
}

.create-panel:hover,
.quick-row:hover,
.report-item:hover {
  border-color: rgb(37 99 235 / 48%);
  box-shadow: 0 16px 36px rgb(15 23 42 / 8%);
  transform: translateY(-2px);
}

.create-content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 0 28px;
  align-items: center;
}

.create-icon {
  width: 76px;
  height: 76px;
  font-size: 42px;
  border-radius: 14px;
}

.create-title {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.15;
  color: #111827;
}

.create-desc {
  margin-top: 14px;
  font-size: 15px;
  line-height: 1.5;
  color: #697386;
}

.create-button {
  grid-column: 1 / 3;
  gap: 10px;
  justify-content: center;
  width: 150px;
  height: 46px;
  margin-top: 34px;
  font-size: 16px;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border: 0;
  border-radius: 4px;
  box-shadow: 0 12px 22px rgb(37 99 235 / 24%);
}

.create-watermark {
  position: absolute;
  right: 6px;
  bottom: -30px;
  width: 180px;
  height: 180px;
  color: rgb(37 99 235 / 8%);
  transform: rotate(12deg);
}

.create-watermark svg {
  width: 100%;
  height: 100%;
}

.quick-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 98px;
  padding: 22px 26px;
  margin-top: 14px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e6ecf5;
  border-radius: 8px;
  transition: all 0.18s ease;
}

.quick-left {
  gap: 22px;
  min-width: 0;
}

.quick-title {
  font-size: 20px;
  font-weight: 800;
  color: #111827;
}

.quick-desc {
  margin-top: 9px;
  font-size: 14px;
  color: #697386;
}

.row-arrow {
  flex: 0 0 auto;
  font-size: 22px;
  color: #94a3b8;
}

.app-icon,
.report-icon-wrap {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 10px 22px rgb(15 23 42 / 12%);
}

.app-icon {
  width: 52px;
  height: 52px;
  font-size: 28px;
  border-radius: 8px;
}

.app-icon :deep(.el-icon),
.report-icon-wrap :deep(.el-icon) {
  font-size: inherit;
}

.icon-blue {
  background: linear-gradient(135deg, #409eff 0%, #2563eb 100%);
}

.icon-green {
  background: linear-gradient(135deg, #35d399 0%, #10b981 100%);
}

.icon-orange {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
}

.icon-purple {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d5dfc 100%);
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.report-item {
  position: relative;
  display: flex;
  gap: 26px;
  align-items: center;
  min-height: 148px;
  padding: 26px 32px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e6ecf5;
  border-radius: 8px;
  transition: all 0.18s ease;
}

.report-tag {
  position: absolute;
  top: 18px;
  right: 18px;
  padding: 0 8px;
  font-weight: 700;
}

.report-icon-wrap {
  width: 64px;
  height: 64px;
  font-size: 34px;
  color: #2f6fed;
  background: #f6f9ff;
  border: 1px solid #e3ecff;
  border-radius: 8px;
  box-shadow: none;
}

.report-main {
  min-width: 0;
  padding-right: 32px;
}

.report-title {
  font-size: 22px;
  font-weight: 800;
  color: #111827;
}

.report-desc {
  margin-top: 12px;
  font-size: 15px;
  line-height: 1.65;
  color: #697386;
}

@media (max-width: 1380px) {
  .finance-workbench-simple {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .report-grid {
    grid-template-columns: 1fr;
  }

  .create-content {
    grid-template-columns: 64px 1fr;
    gap: 0 18px;
  }

  .create-icon {
    width: 64px;
    height: 64px;
    font-size: 34px;
  }

  .create-title {
    font-size: 24px;
  }

  .create-button {
    grid-column: 1 / 3;
  }
}

@media (max-width: 560px) {
  :deep(.el-card__header),
  :deep(.el-card__body) {
    padding-right: 16px;
    padding-left: 16px;
  }

  .quick-row,
  .report-item,
  .create-panel {
    padding: 20px;
  }

  .quick-title,
  .report-title {
    font-size: 18px;
  }
}
</style>
