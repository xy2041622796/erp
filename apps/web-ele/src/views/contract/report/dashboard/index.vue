<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { getDashboardData } from '#/api/erp/contract/report/original';
import CustomerName from '#/components/customer-selector/CustomerName.vue';

import {
  ElButton,
  ElCard,
  ElCol,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElProgress,
  ElRow,
  ElStatistic,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

const year = ref(String(new Date().getFullYear()));
const loading = ref(false);
const dashboard = ref<any>({ yearlyStats: {}, monthlyTrend: [], topContracts: [], topClients: [] });

const yearOptions = computed(() => {
  const now = new Date().getFullYear();
  return [now, now - 1, now - 2].map(String);
});

const stats = computed(() => dashboard.value.yearlyStats || {});

function formatAmount(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function getContractStatusType(value: string) {
  if (value === '已完成') return 'success';
  if (value === '已终止') return 'danger';
  return 'warning';
}

async function loadData() {
  loading.value = true;
  try {
    const res = await getDashboardData({ year: year.value });
    dashboard.value = (res as any)?.data?.dashboard ?? { yearlyStats: {}, monthlyTrend: [], topContracts: [], topClients: [] };
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
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="收入合同金额" :value="stats.totalAmount || 0" suffix="元" /></ElCard></ElCol>
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="已回款金额" :value="stats.totalReceived || 0" suffix="元" /></ElCard></ElCol>
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="待回款金额" :value="stats.totalReceivable || 0" suffix="元" /></ElCard></ElCol>
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="收入合同数" :value="stats.incomeContractCount || 0" suffix="份" /></ElCard></ElCol>
    </ElRow>

    <ElRow :gutter="16" class="mb-4">
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="支出合同金额" :value="stats.outcomeAmount || 0" suffix="元" /></ElCard></ElCol>
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="经营毛利" :value="stats.profit || 0" suffix="元" /></ElCard></ElCol>
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="毛利率" :value="stats.profitRate || 0" suffix="%" /></ElCard></ElCol>
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="客户数量" :value="stats.clientCount || 0" suffix="个" /></ElCard></ElCol>
    </ElRow>

    <ElCard class="mb-4" shadow="never">
      <template #header>经营进度</template>
      <div class="space-y-4">
        <div>回款完成率 <ElProgress :percentage="stats.totalAmount ? Number(((stats.totalReceived || 0) / stats.totalAmount * 100).toFixed(2)) : 0" /></div>
        <div>合同完成率 <ElProgress :percentage="stats.completionRate || 0" status="success" /></div>
        <div>支出占收入比例 <ElProgress :percentage="stats.totalAmount ? Math.min(100, Number(((stats.outcomeAmount || 0) / stats.totalAmount * 100).toFixed(2))) : 0" status="warning" /></div>
      </div>
    </ElCard>

    <ElRow :gutter="16">
      <ElCol :span="12">
        <ElCard v-loading="loading" shadow="never" class="h-full">
          <template #header>重大合同</template>
          <ElTable :data="dashboard.topContracts || []" border>
            <ElTableColumn prop="name" label="合同名称" min-width="180" />
            <ElTableColumn label="客户" min-width="120"><template #default="{ row }"><CustomerName :id="row.client" /></template></ElTableColumn>
            <ElTableColumn label="金额" width="130" align="right"><template #default="{ row }">{{ formatAmount(row.amount) }}</template></ElTableColumn>
            <ElTableColumn label="状态" width="100"><template #default="{ row }"><ElTag :type="getContractStatusType(row.status)" effect="plain">{{ row.status }}</ElTag></template></ElTableColumn>
          </ElTable>
        </ElCard>
      </ElCol>
      <ElCol :span="12">
        <ElCard v-loading="loading" shadow="never" class="h-full">
          <template #header>客户签约排名</template>
          <ElTable :data="dashboard.topClients || []" border>
            <ElTableColumn label="客户名称" min-width="160"><template #default="{ row }"><CustomerName :id="row.name" /></template></ElTableColumn>
            <ElTableColumn prop="contracts" label="合同数" width="90" />
            <ElTableColumn label="签约金额" width="130" align="right"><template #default="{ row }">{{ formatAmount(row.totalAmount) }}</template></ElTableColumn>
            <ElTableColumn label="已回款" width="130" align="right"><template #default="{ row }">{{ formatAmount(row.receivedAmount) }}</template></ElTableColumn>
          </ElTable>
        </ElCard>
      </ElCol>
    </ElRow>
  </Page>
</template>
