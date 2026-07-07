<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { moneyNumber, moneyText, subMoney, sumByMoney } from '#/utils/finance/decimal-money';

import { Page } from '@vben/common-ui';


import { getSalarySlipCardList, type SalarySlipPageApi } from '#/api/erp/finance/cashier/salarySlip/index';

import {
  exportTemplateDefs,
  jobLevelDefs,
  salarySlipSqlSnippet,
  salarySlipSqlTables,
} from '#/views/finance/cashier/salarySlip/design';

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDatePicker,
  ElDrawer,
  ElEmpty,
  ElInput,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'FinanceCashierSalarySlip' });

const year = ref('2026');
const keyword = ref('');
const loading = ref(false);
const list = ref<SalarySlipPageApi.SlipCard[]>([]);
const expandMap = ref<Record<string, boolean>>({});
const designDrawerVisible = ref(false);

function formatMoney(value: unknown) {
  return moneyText(value);
}

function getMonthText(value: string) {
  const month = String(value || '').slice(5, 7);
  return month ? `${month}月` : '-';
}

function calcRealPay(row: SalarySlipPageApi.SlipCard) {
  if (typeof row.realPay === 'number') return row.realPay;
  return moneyNumber(subMoney(subMoney(row.shouldPay, row.deductTotal, 'round', 6), row.taxValue));
}

function isExpanded(cardId: string) {
  return !!expandMap.value[cardId];
}

function toggleExpand(cardId: string) {
  expandMap.value = {
    ...expandMap.value,
    [cardId]: !expandMap.value[cardId],
  };
}

function getDeductItems(card: SalarySlipPageApi.SlipCard) {
  return (card.detailItems || []).filter(
    (item) => item.itemDirection === 'deduct' || item.itemCategory === 'INSURANCE' || item.itemCategory === 'TAX',
  );
}

function getInlineDeductItems(card: SalarySlipPageApi.SlipCard) {
  return getDeductItems(card).filter((item) => item.itemCode !== 'personal_income_tax');
}

function getIncomeItems(card: SalarySlipPageApi.SlipCard) {
  return (card.detailItems || []).filter((item) => item.itemDirection === 'income');
}

function getResultItems(card: SalarySlipPageApi.SlipCard) {
  return (card.detailItems || []).filter((item) => item.itemDirection === 'result' || item.itemDirection === 'middle');
}

async function loadData() {
  loading.value = true;
  try {
    const cards = await getSalarySlipCardList({
      year: year.value,
      keyword: keyword.value.trim(),
    });
    list.value = cards;
  } catch (error: any) {
    ElMessage.error(error?.message || '工资条查询失败');
    list.value = [];
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  loadData();
}

function openDesignDrawer() {
  designDrawerVisible.value = true;
}

const hasData = computed(() => Array.isArray(list.value) && list.value.length > 0);
const totalRealPay = computed(() => moneyNumber(sumByMoney(list.value, (item) => calcRealPay(item))));
const totalShouldPay = computed(() => moneyNumber(sumByMoney(list.value, (item) => item.shouldPay)));

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="page-head">
      <div>
        <div class="title">工资条</div>
        <div class="sub-title">按月份和员工展示工资条汇总及工资项明细</div>
      </div>
      <div class="filters">
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索员工 / 部门 / 项目 / 工资项"
          style="width: 240px"
          @keyup.enter="handleSearch"
        />
        <el-date-picker
          v-model="year"
          type="year"
          placeholder="选择年份"
          value-format="YYYY"
          style="width: 160px"
          @change="handleSearch"
        />
        <el-button @click="openDesignDrawer">职级模板设计</el-button>
        <el-button type="primary" @click="handleSearch">查询</el-button>
      </div>
    </div>

    <div class="summary-bar">
      <div>工资条数：{{ list.length }}</div>
      <div>应发合计：{{ formatMoney(totalShouldPay) }}</div>
      <div>实发合计：{{ formatMoney(totalRealPay) }}</div>
    </div>

    <div v-loading="loading">
      <div v-if="hasData" class="slip-list">
        <div v-for="item in list" :key="item.cardId" class="slip-card">
          <div class="content content-full">
            <div class="head-row">
              <div class="employee-block">
                <div class="employee-name">{{ item.employeeName || '-' }}</div>
                <div class="employee-meta">
                  <span>工资表：{{ item.slipNo || '-' }}</span>
                  <span>部门：{{ item.detailDepartName || item.departName || '-' }}</span>
                  <span>项目：{{ item.detailProjectName || item.projectName || '-' }}</span>
                  <span>费用类别：{{ item.expenseCategory || '-' }}</span>
                  <span>月份：{{ item.salaryMonth || '-' }}</span>
                  <span>期间简称：{{ getMonthText(item.salaryMonth || '') }}</span>
                </div>
              </div>
              <div class="head-actions">
                <el-button link type="primary" @click="toggleExpand(item.cardId)">
                  {{ isExpanded(item.cardId) ? '收起明细' : '查看明细' }}
                </el-button>
              </div>
            </div>

            <el-table :data="[item]" border style="width: 100%" class="slip-table">
              <el-table-column label="应发工资" align="center">
                <el-table-column label="应发工资合计" width="160" align="center">
                  <template #default="{ row }">
                    {{ formatMoney(row.shouldPay) }}
                  </template>
                </el-table-column>
              </el-table-column>

              <el-table-column label="代扣项目" align="center">
                <el-table-column label="扣减合计" width="140" align="center">
                  <template #default="{ row }">
                    {{ formatMoney(row.deductTotal) }}
                  </template>
                </el-table-column>

                <el-table-column
                  v-for="deduct in getInlineDeductItems(item)"
                  :key="`${item.cardId}-${deduct.itemCode}-inline`"
                  :label="deduct.itemName || deduct.itemCode"
                  width="140"
                  align="center"
                >
                  <template #default>
                    {{ formatMoney(deduct.itemValue) }}
                  </template>
                </el-table-column>

                <el-table-column label="个税" width="120" align="center">
                  <template #default="{ row }">
                    {{ formatMoney(row.taxValue) }}
                  </template>
                </el-table-column>
                <el-table-column label="公司社保" width="140" align="center">
                  <template #default="{ row }">
                    {{ formatMoney(row.companySocial) }}
                  </template>
                </el-table-column>
                <el-table-column label="公司公积金" width="140" align="center">
                  <template #default="{ row }">
                    {{ formatMoney(row.companyFund) }}
                  </template>
                </el-table-column>
              </el-table-column>

              <el-table-column label="实发工资" width="180" align="center">
                <template #default="{ row }">
                  {{ formatMoney(calcRealPay(row)) }}
                </template>
              </el-table-column>

              <el-table-column label="备注" min-width="220" align="center">
                <template #default="{ row }">
                  <span class="remark">{{ row.remark || '' }}</span>
                </template>
              </el-table-column>
            </el-table>

            <div v-if="isExpanded(item.cardId)" class="detail-wrap">
              <div class="detail-title">收入项明细</div>
              <el-table :data="getIncomeItems(item)" border style="width: 100%" size="small">
                <el-table-column prop="itemName" label="工资项" min-width="160" />
                <el-table-column prop="itemCode" label="编码" min-width="140" />
                <el-table-column prop="itemDirection" label="方向" width="100" align="center" />
                <el-table-column prop="itemCategory" label="分类" width="120" align="center" />
                <el-table-column label="金额" width="140" align="right">
                  <template #default="{ row }">
                    {{ formatMoney(row.itemValue) }}
                  </template>
                </el-table-column>
              </el-table>

              <div class="detail-title section-gap">扣减项明细</div>
              <el-table :data="getDeductItems(item)" border style="width: 100%" size="small">
                <el-table-column prop="itemName" label="扣减项" min-width="160" />
                <el-table-column prop="itemCode" label="编码" min-width="140" />
                <el-table-column prop="itemDirection" label="方向" width="100" align="center" />
                <el-table-column prop="itemCategory" label="分类" width="120" align="center" />
                <el-table-column label="金额" width="140" align="right">
                  <template #default="{ row }">
                    {{ formatMoney(row.itemValue) }}
                  </template>
                </el-table-column>
              </el-table>

              <div class="detail-title section-gap">结果项</div>
              <el-table :data="getResultItems(item)" border style="width: 100%" size="small">
                <el-table-column prop="itemName" label="项目" min-width="160" />
                <el-table-column prop="itemCode" label="编码" min-width="140" />
                <el-table-column prop="itemDirection" label="方向" width="100" align="center" />
                <el-table-column prop="itemCategory" label="分类" width="120" align="center" />
                <el-table-column label="金额" width="140" align="right">
                  <template #default="{ row }">
                    {{ formatMoney(row.itemValue) }}
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </div>
      </div>

      <el-empty v-else description="暂无工资条" />
    </div>

    <el-drawer v-model="designDrawerVisible" title="职级与导出模板设计" size="70%" destroy-on-close>
      <div class="design-panel">
        <el-alert
          title="建议先在工资条主表补充职级字段，再通过职级主数据表与导出模板表实现按职级自动切换导出模板。"
          type="info"
          :closable="false"
          show-icon
        />

        <el-card v-for="tableDef in salarySlipSqlTables" :key="tableDef.tableName" shadow="never" class="design-card">
          <template #header>
            <div class="design-card__header">
              <div>
                <div class="design-card__title">{{ tableDef.tableName }}</div>
                <div class="design-card__desc">{{ tableDef.purpose }}</div>
              </div>
            </div>
          </template>

          <el-table :data="tableDef.fields" border size="small">
            <el-table-column prop="field" label="字段名" min-width="180" />
            <el-table-column prop="type" label="类型" width="150" />
            <el-table-column prop="nullable" label="可空" width="90" align="center" />
            <el-table-column prop="defaultValue" label="默认值" width="130" align="center" />
            <el-table-column prop="comment" label="说明" min-width="280" />
          </el-table>
        </el-card>

        <el-card shadow="never" class="design-card">
          <template #header>
            <div class="design-card__title">职级编码建议</div>
          </template>
          <el-table :data="jobLevelDefs" border size="small">
            <el-table-column prop="levelCode" label="职级编码" width="110" align="center" />
            <el-table-column prop="levelName" label="职级名称" min-width="140" />
            <el-table-column prop="levelSeries" label="序列编码" width="100" align="center" />
            <el-table-column prop="levelSeriesName" label="序列名称" min-width="120" />
            <el-table-column prop="exportTemplateCode" label="导出模板" width="140" align="center" />
            <el-table-column prop="sortNo" label="排序" width="100" align="center" />
          </el-table>
        </el-card>

        <el-card v-for="templateDef in exportTemplateDefs" :key="templateDef.templateCode" shadow="never" class="design-card">
          <template #header>
            <div class="design-card__header">
              <div>
                <div class="design-card__title">{{ templateDef.templateName }}（{{ templateDef.templateCode }}）</div>
                <div class="design-card__desc">适用范围：{{ templateDef.appliesTo }}</div>
              </div>
            </div>
          </template>
          <el-table :data="templateDef.columns" border size="small">
            <el-table-column type="index" label="#" width="60" align="center" />
            <el-table-column prop="title" label="导出列标题" min-width="180" />
            <el-table-column prop="source" label="来源类型" width="120" align="center" />
            <el-table-column prop="key" label="字段 / 工资项编码" min-width="200" />
          </el-table>
        </el-card>

        <el-card shadow="never" class="design-card">
          <template #header>
            <div class="design-card__title">SQL 草案</div>
          </template>
          <pre class="sql-block">{{ salarySlipSqlSnippet }}</pre>
        </el-card>
      </div>
    </el-drawer>
  </Page>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.title {
  font-size: 18px;
  font-weight: 600;
}

.sub-title {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.7;
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-bar {
  display: flex;
  justify-content: flex-end;
  gap: 18px;
  margin-bottom: 12px;
  font-size: 12px;
  opacity: 0.8;
}

.slip-list {
  display: grid;
  gap: 14px;
}

.slip-card {
  display: block;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.content {
  padding: 12px;
}

.content-full {
  width: 100%;
}

.head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.employee-name {
  font-size: 16px;
  font-weight: 600;
}

.employee-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.78;
}

.detail-wrap {
  margin-top: 12px;
}

.detail-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}

.section-gap {
  margin-top: 14px;
}

.design-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.design-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.design-card__title {
  font-size: 15px;
  font-weight: 600;
}

.design-card__desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.sql-block {
  margin: 0;
  padding: 12px;
  overflow: auto;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.slip-table .el-table__header th) {
  background: var(--el-fill-color-light);
}

:deep(.slip-table .el-table__body td) {
  height: 56px;
}

.remark {
  display: inline-block;
  width: 100%;
  text-align: left;
  padding: 0 8px;
  opacity: 0.85;
}
</style>
