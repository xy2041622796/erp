<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { getForecastData } from '#/api/erp/contract/report/original';
import CustomerName from '#/components/customer-selector/CustomerName.vue';

import {
  ElButton,
  ElCard,
  ElCol,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElPagination,
  ElRow,
  ElStatistic,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

const year = ref(String(new Date().getFullYear()));
const loading = ref(false);
const rows = ref<any[]>([]);
const stats = ref<any>({});
const currentPage = ref(1);
const pageSize = ref(10);

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return rows.value.slice(start, start + pageSize.value);
});

const yearOptions = computed(() => {
  const now = new Date().getFullYear();
  return [now, now - 1, now - 2].map(String);
});

function formatAmount(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function getRiskLabel(value: string) {
  if (value === 'done') return '已完成';
  if (value === 'high') return '高风险';
  return '正常';
}

function getRiskType(value: string) {
  if (value === 'done') return 'success';
  if (value === 'high') return 'danger';
  return 'warning';
}

async function loadData() {
  loading.value = true;
  try {
    const res = await getForecastData({ year: year.value });
    rows.value = ((res as any)?.data?.list ?? []) as any[];
    stats.value = (res as any)?.data?.stats ?? {};
    currentPage.value = 1;
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="mb-4 flex items-center gap-2">
      <ElDropdown @command="(val) => { year = val; loadData(); }">
        <ElButton type="default">
          {{ year }}年<span class="ml-1 text-xs">▼</span>
        </ElButton>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem v-for="item in yearOptions" :key="item" :command="item">{{ item }}年</ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
      <ElButton :loading="loading" @click="loadData">刷新</ElButton>
    </div>

    <ElRow :gutter="16" class="mb-4">
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="合同金额" :value="stats.totalAmount || 0" suffix="元" /></ElCard></ElCol>
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="已回款" :value="stats.paidAmount || 0" suffix="元" /></ElCard></ElCol>
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="预计待回款" :value="stats.remainingAmount || 0" suffix="元" /></ElCard></ElCol>
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="高风险合同" :value="stats.riskCount || 0" suffix="份" /></ElCard></ElCol>
    </ElRow>

    <ElCard v-loading="loading" shadow="never">
      <template #header>回款预测列表</template>
      <ElTable :data="pagedRows" border>
        <ElTableColumn prop="contract_no" label="合同编号" min-width="150" fixed="left" />
        <ElTableColumn prop="contract_name" label="合同名称" min-width="220" />
        <ElTableColumn prop="client_name" label="客户名称" min-width="160">
          <template #default="{ row }"><CustomerName :id="row.client_name || row.contract_party_b" /></template>
        </ElTableColumn>
        <ElTableColumn label="合同金额" min-width="130" align="right">
          <template #default="{ row }">{{ formatAmount(row.contract_amount) }}</template>
        </ElTableColumn>
        <ElTableColumn label="已回款" min-width="130" align="right">
          <template #default="{ row }">{{ formatAmount(row.paid_amount) }}</template>
        </ElTableColumn>
        <ElTableColumn label="待回款" min-width="130" align="right">
          <template #default="{ row }">{{ formatAmount(row.remaining_amount) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="forecast_date" label="预计回款日期" min-width="130" />
        <ElTableColumn label="风险状态" width="120" align="center">
          <template #default="{ row }"><ElTag :type="getRiskType(row.risk_level)" effect="plain">{{ getRiskLabel(row.risk_level) }}</ElTag></template>
        </ElTableColumn>
      </ElTable>
      <div class="mt-4 flex justify-end">
        <ElPagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="rows.length"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @update:current-page="currentPage = $event"
          @update:page-size="pageSize = $event"
        />
      </div>
    </ElCard>
  </Page>
</template>
