<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  ArrowRight,
  Bell,
  Box,
  Goods,
  Histogram,
  Money,
  Plus,
  Promotion,
  ShoppingCart,
  Tickets,
  TrendCharts,
  Warning,
} from '@element-plus/icons-vue';

import {
  ElButton,
  ElCard,
  ElIcon,
  ElProgress,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'SupplyWorkbench' });

const router = useRouter();
const route = useRoute();

const moduleScope = computed(() => String(route.query.moduleScope || 'supply'));

const formatMoney = (value: number) => `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 0 })}`;
const formatDelta = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

const metrics = computed(() => [
  {
    title: '今日销售额',
    value: formatMoney(128560),
    delta: formatDelta(12.5),
    hint: '较昨日',
    icon: Money,
    iconClass: 'metric-icon success',
    deltaClass: 'metric-delta up',
  },
  {
    title: '今日订单数',
    value: '86',
    delta: '销售68 / 采购18',
    hint: '销售68 / 采购18',
    icon: ShoppingCart,
    iconClass: 'metric-icon primary',
    deltaClass: 'metric-delta neutral',
  },
  {
    title: '今日毛利',
    value: formatMoney(32140),
    delta: formatDelta(8.3),
    hint: '较昨日',
    icon: TrendCharts,
    iconClass: 'metric-icon purple',
    deltaClass: 'metric-delta up',
  },
  {
    title: '待办事项',
    value: '12',
    delta: '待审核8 / 待处理4',
    hint: '待审核8 / 待处理4',
    icon: Tickets,
    iconClass: 'metric-icon orange',
    deltaClass: 'metric-delta neutral',
  },
]);

const trendData = [
  { label: '周一', sales: 68, purchase: 42 },
  { label: '周二', sales: 75, purchase: 48 },
  { label: '周三', sales: 82, purchase: 36 },
  { label: '周四', sales: 92, purchase: 55 },
  { label: '周五', sales: 88, purchase: 51 },
  { label: '周六', sales: 65, purchase: 28 },
  { label: '周日', sales: 58, purchase: 32 },
];

const trendMax = Math.max(...trendData.flatMap((item) => [item.sales, item.purchase]));
const getTrendHeight = (value: number) => `${Math.max((value / trendMax) * 100, 12)}%`;

const inventoryWarnings = [
  {
    title: 'iPhone 15 Pro Max 256G',
    stock: 3,
    safe: 10,
    level: 'danger',
  },
  {
    title: 'AirPods Pro 2',
    stock: 5,
    safe: 15,
    level: 'danger',
  },
  {
    title: 'MacBook Air M2',
    stock: 2,
    safe: 5,
    level: 'danger',
  },
  {
    title: 'iPad Air 5',
    stock: 8,
    safe: 10,
    level: 'warning',
  },
  {
    title: 'Apple Watch S9',
    stock: 6,
    safe: 12,
    level: 'warning',
  },
];

const quickActions = [
  { title: '销售订单', icon: ShoppingCart, path: '/erp/sale/order' },
  { title: '采购订单', icon: Goods, path: '/erp/purchase/order' },
  { title: '库存查询', icon: Box, path: '/erp/stock/productAstock' },
  { title: '商品资料', icon: Plus, path: '/erp/product/product' },
  { title: '库存盘点', icon: Histogram, path: '/erp/stock/check' },
];

const recentOrders = [
  {
    no: 'XS-2024-1201',
    type: '销售',
    customer: '深圳市某某科技公司',
    amount: '¥12,800',
    status: '已完成',
    statusType: 'success',
    owner: '李华',
    time: '10分钟前',
  },
  {
    no: 'CG-2024-0899',
    type: '采购',
    customer: '东莞市蓝海电子有限公司',
    amount: '¥45,600',
    status: '待审核',
    statusType: 'warning',
    owner: '王芳',
    time: '30分钟前',
  },
  {
    no: 'XS-2024-1200',
    type: '销售',
    customer: '广州市星耀贸易公司',
    amount: '¥8,900',
    status: '待发货',
    statusType: 'primary',
    owner: '张明',
    time: '1小时前',
  },
  {
    no: 'PD-2024-0045',
    type: '盘点',
    customer: '-',
    amount: '-',
    status: '已完成',
    statusType: 'success',
    owner: '陈静',
    time: '2小时前',
  },
  {
    no: 'CG-2024-0898',
    type: '采购',
    customer: '惠州市创合供应链',
    amount: '¥28,000',
    status: '已完成',
    statusType: 'success',
    owner: '王芳',
    time: '3小时前',
  },
];

const notices = [
  {
    title: '关于年末库存盘点工作的通知',
    time: '今天 09:00',
    highlight: true,
  },
  {
    title: '新增商品条码扫描功能已上线',
    time: '昨天 14:30',
    highlight: false,
  },
  {
    title: 'iPhone 16 系列即将到货到货通知',
    time: '12-18',
    highlight: false,
  },
];

const go = (path: string) => router.push(path);
const goAllWarnings = () => router.push({ path: '/erp/purchase/workbench', query: { view: 'inventory-warnings' } });
const goAllOrders = () => router.push({ path: '/erp/purchase/workbench', query: { view: 'recent-orders' } });
</script>

<template>
  <Page>
    <div class="supply-workbench-page">
      <div class="metric-grid">
        <ElCard v-for="item in metrics" :key="item.title" shadow="never" class="metric-card">
          <div class="metric-top">
            <div>
              <div class="metric-title">{{ item.title }}</div>
              <div class="metric-value">{{ item.value }}</div>
              <div :class="item.deltaClass">{{ item.delta }}</div>
            </div>
            <div :class="item.iconClass">
              <ElIcon><component :is="item.icon" /></ElIcon>
            </div>
          </div>
        </ElCard>
      </div>

      <div class="content-grid top-grid">
        <ElCard shadow="never" class="panel-card trend-card">
          <template #header>
            <div class="panel-header">
              <div class="panel-title-wrap">
                <ElIcon class="panel-title-icon chart"><TrendCharts /></ElIcon>
                <span class="panel-title">近7日进销存趋势</span>
              </div>
              <div class="legend-group">
                <span class="legend-item"><i class="legend-dot sales"></i>销售额</span>
                <span class="legend-item"><i class="legend-dot purchase"></i>采购额</span>
              </div>
            </div>
          </template>
          <div class="chart-wrap">
            <div v-for="item in trendData" :key="item.label" class="chart-column">
              <div class="bars-wrap">
                <div class="bar sales-bar" :style="{ height: getTrendHeight(item.sales) }"></div>
                <div class="bar purchase-bar" :style="{ height: getTrendHeight(item.purchase) }"></div>
              </div>
              <div class="chart-label">{{ item.label }}</div>
            </div>
          </div>
        </ElCard>

        <ElCard shadow="never" class="panel-card inventory-card">
          <template #header>
            <div class="panel-header">
              <div class="panel-title-wrap">
                <ElIcon class="panel-title-icon warning"><Warning /></ElIcon>
                <span class="panel-title">库存预警</span>
              </div>
              <ElButton link type="primary" @click="goAllWarnings">查看全部</ElButton>
            </div>
          </template>
          <div class="warning-list">
            <div v-for="item in inventoryWarnings" :key="item.title" class="warning-item">
              <div :class="['warning-badge', item.level]">
                <ElIcon><Warning /></ElIcon>
              </div>
              <div class="warning-main">
                <div class="warning-title">{{ item.title }}</div>
                <div class="warning-desc">
                  当前库存：{{ item.stock }} / 最低库存：{{ item.safe }}
                </div>
                <ElProgress
                  :percentage="Math.round((item.stock / item.safe) * 100)"
                  :show-text="false"
                  :status="item.level === 'danger' ? 'exception' : 'warning'"
                />
              </div>
              <ElIcon class="arrow-icon"><ArrowRight /></ElIcon>
            </div>
          </div>
        </ElCard>
      </div>

      <ElCard shadow="never" class="panel-card quick-card">
        <template #header>
          <div class="panel-header">
            <span class="panel-title">快捷功能</span>
            <ElTag size="small" effect="plain">{{ moduleScope.toUpperCase() }}</ElTag>
          </div>
        </template>
        <div class="quick-grid">
          <button v-for="item in quickActions" :key="item.title" type="button" class="quick-item" @click="go(item.path)">
            <div class="quick-icon-box">
              <ElIcon><component :is="item.icon" /></ElIcon>
            </div>
            <span class="quick-text">{{ item.title }}</span>
          </button>
        </div>
      </ElCard>

      <div class="content-grid bottom-grid">
        <ElCard shadow="never" class="panel-card table-card">
          <template #header>
            <div class="panel-header">
              <div class="panel-title-wrap">
                <ElIcon class="panel-title-icon order"><Bell /></ElIcon>
                <span class="panel-title">最近单据</span>
              </div>
              <ElButton link type="primary" @click="goAllOrders">查看全部</ElButton>
            </div>
          </template>
          <div class="table-wrap">
            <div class="table-head table-row">
              <span>单号</span>
              <span>类型</span>
              <span>客户/供应商</span>
              <span>金额</span>
              <span>状态</span>
              <span>操作人</span>
              <span>时间</span>
            </div>
            <div v-for="item in recentOrders" :key="item.no" class="table-row table-body-row">
              <span class="order-no">{{ item.no }}</span>
              <span>
                <ElTag size="small" effect="plain">{{ item.type }}</ElTag>
              </span>
              <span class="cell-text">{{ item.customer }}</span>
              <span>{{ item.amount }}</span>
              <span>
                <ElTag size="small" :type="item.statusType as any">{{ item.status }}</ElTag>
              </span>
              <span>{{ item.owner }}</span>
              <span class="time-text">{{ item.time }}</span>
            </div>
          </div>
        </ElCard>

        <ElCard shadow="never" class="panel-card notice-card">
          <template #header>
            <div class="panel-header">
              <div class="panel-title-wrap">
                <ElIcon class="panel-title-icon notice"><Promotion /></ElIcon>
                <span class="panel-title">系统公告</span>
              </div>
            </div>
          </template>
          <div class="notice-list">
            <div v-for="item in notices" :key="item.title" :class="['notice-item', { highlight: item.highlight }]">
              <div class="notice-dot"></div>
              <div class="notice-main">
                <div class="notice-title">{{ item.title }}</div>
                <div class="notice-time">{{ item.time }}</div>
              </div>
            </div>
            <ElButton class="notice-more" plain>查看更多公告</ElButton>
          </div>
        </ElCard>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.supply-workbench-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 8px;
}

.metric-grid,
.content-grid,
.quick-grid {
  display: grid;
  gap: 16px;
}

.metric-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.top-grid {
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.95fr);
}

.bottom-grid {
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.85fr);
}

.metric-card,
.panel-card {
  border: none;
  border-radius: 18px;
}

:deep(.el-card__header) {
  padding: 18px 20px 12px;
  border-bottom: none;
}

:deep(.el-card__body) {
  padding: 0 20px 20px;
}

.metric-card :deep(.el-card__body) {
  padding-top: 18px;
}

.metric-top,
.panel-header,
.panel-title-wrap,
.legend-group,
.legend-item,
.quick-item,
.warning-item,
.notice-item {
  display: flex;
  align-items: center;
}

.metric-top,
.panel-header {
  justify-content: space-between;
}

.metric-title,
.chart-label,
.warning-desc,
.notice-time,
.time-text {
  color: #94a3b8;
}

.metric-title {
  font-size: 13px;
  font-weight: 600;
}

.metric-value {
  margin-top: 12px;
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  color: #0f172a;
}

.metric-delta {
  margin-top: 12px;
  font-size: 12px;
}

.metric-delta.up {
  color: #16a34a;
}

.metric-delta.neutral {
  color: #94a3b8;
}

.metric-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  font-size: 20px;
  border-radius: 14px;
}

.metric-icon.success {
  color: #16a34a;
  background: #dcfce7;
}

.metric-icon.primary {
  color: #2563eb;
  background: #dbeafe;
}

.metric-icon.purple {
  color: #9333ea;
  background: #f3e8ff;
}

.metric-icon.orange {
  color: #ea580c;
  background: #ffedd5;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.panel-title-icon {
  margin-right: 8px;
  font-size: 16px;
}

.panel-title-icon.chart {
  color: #2563eb;
}

.panel-title-icon.warning {
  color: #f59e0b;
}

.panel-title-icon.order {
  color: #64748b;
}

.panel-title-icon.notice {
  color: #f97316;
}

.legend-group {
  gap: 16px;
}

.legend-item {
  gap: 6px;
  font-size: 12px;
  color: #64748b;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.sales {
  background: #10b981;
}

.legend-dot.purchase {
  background: #60a5fa;
}

.chart-wrap {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 22px;
  align-items: end;
  min-height: 260px;
  padding: 8px 6px 0;
}

.chart-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  height: 100%;
}

.bars-wrap {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 220px;
}

.bar {
  width: 18px;
  min-height: 16px;
  border-radius: 10px 10px 0 0;
}

.sales-bar {
  background: linear-gradient(180deg, #34d399 0%, #10b981 100%);
}

.purchase-bar {
  background: linear-gradient(180deg, #93c5fd 0%, #60a5fa 100%);
}

.chart-label {
  font-size: 12px;
}

.warning-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.warning-item {
  gap: 12px;
  padding: 14px 12px;
  background: #f8fafc;
  border-radius: 14px;
}

.warning-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  font-size: 16px;
}

.warning-badge.danger {
  color: #ef4444;
  background: #fee2e2;
}

.warning-badge.warning {
  color: #f59e0b;
  background: #fef3c7;
}

.warning-main {
  flex: 1;
}

.warning-title,
.notice-title,
.order-no {
  font-weight: 600;
  color: #0f172a;
}

.warning-desc {
  margin: 4px 0 10px;
  font-size: 12px;
}

.arrow-icon {
  color: #94a3b8;
}

.quick-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.quick-item {
  gap: 10px;
  flex-direction: column;
  justify-content: center;
  padding: 14px 10px;
  cursor: pointer;
  background: #f8fafc;
  border: 1px solid transparent;
  border-radius: 16px;
  transition: all 0.2s ease;
}

.quick-item:hover {
  border-color: #bfdbfe;
  background: #eff6ff;
  transform: translateY(-2px);
}

.quick-icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: 20px;
  color: #fff;
  border-radius: 14px;
  background: linear-gradient(135deg, #10b981 0%, #0ea5e9 100%);
}

.quick-text {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.table-wrap {
  display: flex;
  flex-direction: column;
}

.table-row {
  display: grid;
  grid-template-columns: 1.1fr 0.7fr 1.8fr 0.9fr 0.8fr 0.8fr 0.8fr;
  gap: 12px;
  align-items: center;
}

.table-head {
  padding: 10px 0 14px;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.table-body-row {
  min-height: 56px;
  padding: 8px 0;
  font-size: 13px;
  color: #334155;
  border-top: 1px solid #f1f5f9;
}

.cell-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notice-item {
  gap: 12px;
  padding: 14px 14px;
  background: #f8fafc;
  border-radius: 14px;
}

.notice-item.highlight {
  background: #fff7ed;
}

.notice-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.notice-main {
  min-width: 0;
}

.notice-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notice-time {
  margin-top: 6px;
  font-size: 12px;
}

.notice-more {
  margin-top: 6px;
}

@media (max-width: 1440px) {
  .quick-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1200px) {
  .metric-grid,
  .top-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 992px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quick-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .table-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding: 10px 0;
  }

  .table-head {
    display: none;
  }

  .table-body-row {
    gap: 8px;
    border-top: 1px solid #f1f5f9;
  }
}

@media (max-width: 768px) {
  .metric-grid,
  .quick-grid,
  .chart-wrap {
    grid-template-columns: 1fr;
  }

  .legend-group {
    display: none;
  }

  .bars-wrap {
    width: 100%;
    justify-content: flex-start;
  }

  .chart-column {
    align-items: flex-start;
    padding-bottom: 8px;
    border-bottom: 1px dashed #e2e8f0;
  }

  .warning-item,
  .notice-item,
  .panel-header {
    align-items: flex-start;
  }

  .panel-header {
    gap: 10px;
    flex-direction: column;
  }
}
</style>
