<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  fetchCashFlowReport,
  type CashFlowDraftDetail,
  type CashFlowLine,
} from '#/api/erp/finance/reports';

import ReportPeriodPopover from '#/views/finance/reports/components/report-period-popover.vue';

import {
  ElButton,
  ElInput,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'FinanceCashFlowDraft' });

type DraftRow = {
  amount?: number;
  children?: DraftRow[];
  hideAmountInput?: boolean;
  isSection?: boolean;
  isSummary?: boolean;
  item: string;
  lineNo?: number | string;
  note?: string;
  rowId: string;
};

const route = useRoute();
const router = useRouter();
const now = new Date();
const monthValue = ref(String(route.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`));
const periodMode = ref<'month' | 'quarter'>(route.query.periodMode === 'quarter' ? 'quarter' : 'month');
const loading = ref(false);
const reportLines = ref<CashFlowLine[]>([]);
const draftDetails = ref<CashFlowDraftDetail[]>([]);

function money(value: unknown, showZero = false) {
  const num = Number(value || 0);
  if (!showZero && Math.abs(num) < 1e-9) return '';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const lineAmountMap = computed(() => {
  const map = new Map<number | string, number>();
  for (const line of reportLines.value || []) {
    if (line.lineNo !== '') map.set(line.lineNo, Number(line.current || 0));
  }
  return map;
});

function amountOf(lineNo: number) {
  return lineAmountMap.value.get(lineNo) || 0;
}

const detailAmountMap = computed(() => {
  const map = new Map<string, number>();
  for (const detail of draftDetails.value || []) {
    map.set(String(detail.rowId), Number(detail.current || 0));
  }
  return map;
});

function detailAmount(rowId: string) {
  return detailAmountMap.value.get(rowId) || 0;
}


function detail(rowId: string, item: string, options: Partial<Pick<DraftRow, 'hideAmountInput' | 'note'>> = {}): DraftRow {
  return { rowId, item, amount: detailAmount(rowId), note: options.note ?? '备注', ...options };
}

const draftRows = computed<DraftRow[]>(() => [
  { rowId: 'op-section', item: '一、经营活动产生的现金流量：', isSection: true },
  {
    rowId: 'op-sales',
    item: '销售产成品、商品、提供劳务收到的现金',
    lineNo: 1,
    amount: amountOf(1),
    isSummary: true,
    children: [
      detail('op-sales-revenue', '主营业务收入 发生额'),
      detail('op-sales-other-revenue', '+ 其他业务收入 发生额'),
      detail('op-sales-output-tax', '+ 销项税额 贷方发生额'),
      detail('op-sales-note-begin', '+ 应收票据 期初余额'),
      detail('op-sales-note-end', '- 应收票据 期末余额'),
      detail('op-sales-ar-begin', '+ 应收账款 期初余额'),
      detail('op-sales-ar-end', '- 应收账款 期末余额'),
      detail('op-sales-advance-end', '+ 预收账款 期末余额'),
      detail('op-sales-advance-begin', '- 预收账款 期初余额'),
      detail('op-sales-other', '+ 其他'),
    ],
  },
  {
    rowId: 'op-other-in',
    item: '收到其他与经营活动有关的现金',
    lineNo: 2,
    amount: amountOf(2),
    isSummary: true,
    children: [
      detail('op-other-in-or-begin', '其他应收款 期初余额'),
      detail('op-other-in-or-end', '- 其他应收款 期末余额'),
      detail('op-other-in-nonop', '+ 营业外收入 发生额'),
      detail('op-other-in-other', '+ 其他'),
    ],
  },
  {
    rowId: 'op-buy',
    item: '购买原材料、商品、接受劳务支付的现金',
    lineNo: 3,
    amount: amountOf(3),
    isSummary: true,
    children: [
      detail('op-buy-cost', '主营业务成本 发生额'),
      detail('op-buy-other-cost', '+ 其他业务成本 发生额'),
      detail('op-buy-input-tax', '+ 进项税额 借方发生额'),
      detail('op-buy-material-purchase-end', '+ 材料采购 期末余额'),
      detail('op-buy-material-purchase-begin', '- 材料采购 期初余额'),
      detail('op-buy-transit-end', '+ 在途物资 期末余额'),
      detail('op-buy-transit-begin', '- 在途物资 期初余额'),
      detail('op-buy-raw-end', '+ 原材料 期末余额'),
      detail('op-buy-raw-begin', '- 原材料 期初余额'),
      detail('op-buy-material-cost-diff-end', '+ 材料成本差异 期末余额'),
      detail('op-buy-material-cost-diff-begin', '- 材料成本差异 期初余额'),
      detail('op-buy-stock-end', '+ 库存商品 期末余额'),
      detail('op-buy-stock-begin', '- 库存商品 期初余额'),
      detail('op-buy-product-price-diff-begin', '+ 商品进销差价 期初余额'),
      detail('op-buy-product-price-diff-end', '- 商品进销差价 期末余额'),
      detail('op-buy-consigned-processing-end', '+ 委托加工物资 期末余额'),
      detail('op-buy-consigned-processing-begin', '- 委托加工物资 期初余额'),
      detail('op-buy-turnover-material-end', '+ 周转材料 期末余额'),
      detail('op-buy-turnover-material-begin', '- 周转材料 期初余额'),
      detail('op-buy-biological-assets-end', '+ 消耗性生物资产 期末余额'),
      detail('op-buy-biological-assets-begin', '- 消耗性生物资产 期初余额'),
      detail('op-buy-production-end', '+ 生产成本 期末余额'),
      detail('op-buy-production-begin', '- 生产成本 期初余额'),
      detail('op-buy-manufacturing-end', '+ 制造费用 期末余额'),
      detail('op-buy-manufacturing-begin', '- 制造费用 期初余额'),
      detail('op-buy-construction-end', '+ 工程施工 期末余额'),
      detail('op-buy-construction-begin', '- 工程施工 期初余额'),
      detail('op-buy-machinery-end', '+ 机械作业 期末余额'),
      detail('op-buy-machinery-begin', '- 机械作业 期初余额'),
      detail('op-buy-note-payable-begin', '+ 应付票据 期初余额'),
      detail('op-buy-note-payable-end', '- 应付票据 期末余额'),
      detail('op-buy-ap-begin', '+ 应付账款 期初余额'),
      detail('op-buy-ap-end', '- 应付账款 期末余额'),
      detail('op-buy-prepay-end', '+ 预付账款 期末余额'),
      detail('op-buy-prepay-begin', '- 预付账款 期初余额'),
      detail('op-buy-other', '+ 其他'),
    ],
  },
  {
    rowId: 'op-staff',
    item: '支付的职工薪酬',
    lineNo: 4,
    amount: amountOf(4),
    isSummary: true,
    children: [
      detail('op-staff-payroll', '应付职工薪酬 借方发生额'),
      detail('op-staff-other', '+ 其他'),
    ],
  },
  {
    rowId: 'op-tax',
    item: '支付的税费',
    lineNo: 5,
    amount: amountOf(5),
    isSummary: true,
    children: [
      detail('op-tax-paid', '已交税金 借方发生额'),
      detail('op-tax-consumption', '+ 应交消费税 借方发生额'),
      detail('op-tax-business', '+ 应交营业税 借方发生额'),
      detail('op-tax-resource', '+ 应交资源税 借方发生额'),
      detail('op-tax-income', '+ 应交所得税 借方发生额'),
      detail('op-tax-land-vat', '+ 应交土地增值税 借方发生额'),
      detail('op-tax-urban-maintenance', '+ 应交城市维护建设税 借方发生额'),
      detail('op-tax-property', '+ 应交房产税 借方发生额'),
      detail('op-tax-land-use', '+ 应交城镇土地使用税 借方发生额'),
      detail('op-tax-vehicle-vessel', '+ 应交车船使用税 借方发生额'),
      detail('op-tax-personal', '+ 应交个人所得税 借方发生额'),
      detail('op-tax-education-surcharge', '+ 教育费附加 借方发生额'),
      detail('op-tax-local-education-surcharge', '+ 地方教育费附加 借方发生额'),
      detail('op-tax-mineral-compensation', '+ 矿产资源补偿费 借方发生额'),
      detail('op-tax-pollution', '+ 排污费 借方发生额'),
      detail('op-tax-stamp', '+ 印花税 借方发生额'),
      detail('op-tax-vat', '+ 未交增值税 借方发生额'),
      detail('op-tax-other', '+ 其他'),
    ],
  },
  {
    rowId: 'op-other-out',
    item: '支付其他与经营活动有关的现金',
    lineNo: 6,
    amount: amountOf(6),
    isSummary: true,
    children: [
      detail('op-other-out-balance', '自动倒求数据平衡现金流量表', { hideAmountInput: true, note: '' }),
      detail('op-other-out-other', '+ 其他'),
    ],
  },
  { rowId: 'op-net', item: '经营活动产生的现金流量净额', lineNo: 7, amount: amountOf(7), isSummary: true },
  { rowId: 'invest-section', item: '二、投资活动产生的现金流量：', isSection: true },
  {
    rowId: 'invest-recover',
    item: '收回短期投资、长期债券投资和长期股权投资收到的现金',
    lineNo: 8,
    amount: amountOf(8),
    isSummary: true,
    children: [
      detail('invest-recover-short', '短期投资 发生额'),
      detail('invest-recover-equity', '+ 长期股权投资 发生额'),
      detail('invest-recover-bond', '+ 长期债券投资 发生额'),
      detail('invest-recover-other', '+ 其他'),
    ],
  },
  {
    rowId: 'invest-income',
    item: '取得投资收益收到的现金',
    lineNo: 9,
    amount: amountOf(9),
    isSummary: true,
    children: [
      detail('invest-income-income', '投资收益 发生额'),
      detail('invest-income-interest-begin', '+ 应收利息 期初余额'),
      detail('invest-income-interest-end', '- 应收利息 期末余额'),
      detail('invest-income-dividend-begin', '+ 应收股利 期初余额'),
      detail('invest-income-dividend-end', '- 应收股利 期末余额'),
      detail('invest-income-other', '+ 其他'),
    ],
  },
  {
    rowId: 'invest-disposal',
    item: '处置固定资产、无形资产和其他非流动资产收回的现金净额',
    lineNo: 10,
    amount: amountOf(10),
    isSummary: true,
    children: [
      detail('invest-disposal-long-asset', '处置固定资产、无形资产和其他非流动资产收回的现金净额'),
      detail('invest-disposal-other', '+ 其他'),
    ],
  },
  {
    rowId: 'invest-pay',
    item: '短期投资、长期债券投资和长期股权投资支付的现金',
    lineNo: 11,
    amount: amountOf(11),
    isSummary: true,
    children: [
      detail('invest-pay-short', '短期投资 发生额'),
      detail('invest-pay-equity', '+ 长期股权投资 发生额'),
      detail('invest-pay-bond', '+ 长期债券投资 发生额'),
      detail('invest-pay-other', '+ 其他'),
    ],
  },
  {
    rowId: 'invest-build',
    item: '购建固定资产、无形资产和其他非流动资产支付的现金',
    lineNo: 12,
    amount: amountOf(12),
    isSummary: true,
    children: [
      detail('invest-build-fixed-asset', '固定资产 借方发生额'),
      detail('invest-build-construction-end', '+ 在建工程 期末余额'),
      detail('invest-build-construction-begin', '- 在建工程 期初余额'),
      detail('invest-build-material-end', '+ 工程物资 期末余额'),
      detail('invest-build-material-begin', '- 工程物资 期初余额'),
      detail('invest-build-intangible', '+ 无形资产 借方发生额'),
      detail('invest-build-long-prepaid', '+ 长期待摊费用 借方发生额'),
      detail('invest-build-other', '+ 其他'),
    ],
  },
  { rowId: 'invest-net', item: '投资活动产生的现金流量净额', lineNo: 13, amount: amountOf(13), isSummary: true },
  { rowId: 'fin-section', item: '三、筹资活动产生的现金流量：', isSection: true },
  {
    rowId: 'fin-borrow',
    item: '取得借款收到的现金',
    lineNo: 14,
    amount: amountOf(14),
    isSummary: true,
    children: [
      detail('fin-borrow-short', '短期借款 贷方发生额'),
      detail('fin-borrow-long', '+ 长期借款 贷方发生额'),
      detail('fin-borrow-other', '+ 其他'),
    ],
  },
  {
    rowId: 'fin-investor',
    item: '吸收投资者投资收到的现金',
    lineNo: 15,
    amount: amountOf(15),
    isSummary: true,
    children: [
      detail('fin-investor-capital', '实收资本 发生额'),
      detail('fin-investor-other', '+ 其他'),
    ],
  },
  {
    rowId: 'fin-repay',
    item: '偿还借款本金支付的现金',
    lineNo: 16,
    amount: amountOf(16),
    isSummary: true,
    children: [
      detail('fin-repay-short', '短期借款 借方发生额'),
      detail('fin-repay-long', '+ 长期借款 借方发生额'),
      detail('fin-repay-other', '+ 其他'),
    ],
  },
  {
    rowId: 'fin-interest',
    item: '偿还借款利息支付的现金',
    lineNo: 17,
    amount: amountOf(17),
    isSummary: true,
    children: [
      detail('fin-interest-payable', '应付利息 发生额'),
      detail('fin-interest-other', '+ 其他'),
    ],
  },
  {
    rowId: 'fin-profit',
    item: '分配利润支付的现金',
    lineNo: 18,
    amount: amountOf(18),
    isSummary: true,
    children: [
      detail('fin-profit-payable', '应付利润 发生额'),
      detail('fin-profit-other', '+ 其他'),
    ],
  },
  { rowId: 'fin-net', item: '筹资活动产生的现金流量净额', lineNo: 19, amount: amountOf(19), isSummary: true },
  { rowId: 'cash-net', item: '四、现金净增加额', lineNo: 20, amount: amountOf(20), isSummary: true },
  {
    rowId: 'cash-begin',
    item: '加：期初现金余额',
    lineNo: 21,
    amount: amountOf(21),
    isSummary: true,
    children: [
      detail('cash-begin-cash', '库存现金 期初余额'),
      detail('cash-begin-bank', '+ 银行存款 期初余额'),
      detail('cash-begin-other-money', '+ 其他货币资金 期初余额'),
      detail('cash-begin-other', '+ 其他'),
    ],
  },
  { rowId: 'cash-end', item: '五、期末现金余额', lineNo: 22, amount: amountOf(22), isSummary: true },
]);

async function load() {
  loading.value = true;
  try {
    const report = await fetchCashFlowReport({
      month: monthValue.value,
      periodMode: periodMode.value,
    });
    reportLines.value = report.lines || [];
    draftDetails.value = report.draftDetails || [];
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载现金流量表底稿失败');
  } finally {
    loading.value = false;
  }
}

function applyPeriod(payload: { monthValue: string; periodMode: 'month' | 'quarter' }) {
  monthValue.value = payload.monthValue;
  periodMode.value = payload.periodMode;
  load();
}

function goBackReport() {
  router.push({
    path: '/finance/reports/cash-flow',
    query: {
      month: monthValue.value,
      periodMode: periodMode.value,
    },
  });
}

onMounted(load);
</script>

<template>
  <Page auto-content-height class="h-full cash-flow-draft-page">
    <div class="cash-flow-draft-layout">
      <div class="cash-flow-draft-toolbar">
        <div>
          <div class="cash-flow-draft-title">现金流量表底稿</div>
          <div class="cash-flow-draft-subtitle">按编制公式展开现金流量表明细</div>
        </div>
        <div class="cash-flow-draft-actions">
          <ReportPeriodPopover
            v-model="monthValue"
            v-model:period-mode="periodMode"
            :allow-quarter="true"
            :width="360"
            @apply="applyPeriod"
          />
          <ElButton type="primary" :loading="loading" @click="load">刷新</ElButton>
          <ElButton @click="goBackReport">返回报表</ElButton>
        </div>
      </div>

      <div class="cash-flow-draft-table-wrap">
        <ElTable
          v-loading="loading"
          :data="draftRows"
          border
          row-key="rowId"
          height="100%"
          default-expand-all
          :tree-props="{ children: 'children' }"
          :row-class-name="({ row }) => row.isSection ? 'draft-section-row' : row.isSummary ? 'draft-summary-row' : ''"
        >
          <ElTableColumn prop="item" label="项目" min-width="520" fixed="left" />
          <ElTableColumn prop="lineNo" label="行次" width="80" align="center" />
          <ElTableColumn label="本期金额" min-width="260" align="right">
            <template #default="{ row }">
              <ElInput
                v-if="!row.isSection && !row.hideAmountInput"
                :model-value="money(row.amount)"
                readonly
                class="draft-amount-input"
              />
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="200">
            <template #default="{ row }">
              <ElButton v-if="row.note" link type="primary">{{ row.note }}</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.cash-flow-draft-page {
  height: 100%;
  overflow: hidden;
  background: var(--el-bg-color-page);
}

.cash-flow-draft-layout {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
}

.cash-flow-draft-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.cash-flow-draft-title {
  color: var(--el-text-color-primary);
  font-size: 20px;
  font-weight: 700;
}

.cash-flow-draft-subtitle {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.cash-flow-draft-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cash-flow-draft-table-wrap {
  min-height: 0;
  flex: 1;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
}

.cash-flow-draft-table-wrap :deep(.el-table__header th.el-table__cell) {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.cash-flow-draft-table-wrap :deep(.draft-section-row > td) {
  color: var(--el-color-primary);
  font-weight: 700;
  background: var(--el-color-primary-light-9);
}

.cash-flow-draft-table-wrap :deep(.draft-summary-row > td) {
  font-weight: 700;
  background: var(--el-fill-color-lighter);
}

.draft-amount-input :deep(.el-input__inner) {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

</style>
