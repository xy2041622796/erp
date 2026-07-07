<script lang="ts" setup>
import type { CrmCustomerApi } from '#/api/erp/customer';

import { computed, ref, watch } from 'vue';


import {
  getCustomerCapitalAccounts,
  getCustomerInvoices,
} from '#/api/erp/customer';
import { useDescription } from '#/components/description';
import { useFollowUpDetailSchema } from '#/views/crm/followup/data';

import { useDetailBaseSchema } from '../data';

import { ElDivider, ElTable, ElTableColumn } from 'element-plus';

const props = defineProps<{
  customer: CrmCustomerApi.Customer; // 客户信息
}>();

const customerId = computed(
  () => (props.customer?.rowid ?? props.customer?.id) as any,
);

const invoices = ref<CrmCustomerApi.Invoice[]>([]);
const capitalAccounts = ref<CrmCustomerApi.CapitalAccount[]>([]);

async function loadExtra() {
  const cid = customerId.value;
  if (!cid) {
    invoices.value = [];
    capitalAccounts.value = [];
    return;
  }

  try {
    const [inv, acc] = await Promise.all([
      getCustomerInvoices(cid),
      getCustomerCapitalAccounts(cid),
    ]);
    invoices.value = inv || [];
    capitalAccounts.value = acc || [];
  } catch (error) {
    console.error('加载账号/发票信息失败', error);
    invoices.value = [];
    capitalAccounts.value = [];
  }
}

watch(
  () => customerId.value,
  () => {
    loadExtra();
  },
  { immediate: true },
);

const [BaseDescriptions] = useDescription({
  title: '基本信息',
  border: false,
  column: 4,
  schema: useDetailBaseSchema(),
});

const [SystemDescriptions] = useDescription({
  title: '系统信息',
  border: false,
  column: 3,
  schema: useFollowUpDetailSchema(),
});
</script>

<template>
  <div>
    <BaseDescriptions :data="customer" />
    <ElDivider />
    <div>
      <h4 class="mb-2">账号信息</h4>
      <ElTable
        v-if="capitalAccounts.length > 0"
        :data="capitalAccounts"
        style="width: 100%"
        size="small"
      >
        <ElTableColumn prop="account_type" label="账号类型" min-width="160" />
        <ElTableColumn prop="OpeningBank" label="开户行" min-width="160" />
        <ElTableColumn prop="account_name" label="对方户名" min-width="160" />
        <ElTableColumn prop="account_id" label="账号" min-width="180" />
      </ElTable>
      <div v-else class="py-6" style="color: #999; text-align: center">
        暂无数据
      </div>
    </div>

    <ElDivider />

    <div>
      <h4 class="mb-2">发票信息</h4>
      <ElTable
        v-if="invoices.length > 0"
        :data="invoices"
        style="width: 100%"
        size="small"
      >
        <ElTableColumn prop="invoiceTitle" label="抬头" min-width="160" />
        <ElTableColumn prop="taxNumber" label="税号" min-width="140" />
        <ElTableColumn prop="bankName" label="开户行" min-width="160" />
        <ElTableColumn
          prop="address"
          label="地址"
          min-width="180"
          show-overflow-tooltip
        />
        <ElTableColumn prop="phone" label="电话" min-width="140" />
        <ElTableColumn prop="bankAccount" label="账号" min-width="180" />
      </ElTable>
      <div v-else class="py-6" style="color: #999; text-align: center">
        暂无数据
      </div>
    </div>

    <ElDivider />
    <SystemDescriptions :data="customer" />
  </div>
</template>
