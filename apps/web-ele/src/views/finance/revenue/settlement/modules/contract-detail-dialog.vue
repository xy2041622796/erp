<script lang="ts" setup>
import { computed, ref } from 'vue';


import { getContract } from '#/api/erp/contract/contract';

import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const visible = ref(false);
const loading = ref(false);
const contractDetail = ref<any>(null);

const orderItems = computed<any[]>(() => {
  const d = contractDetail.value;
  return (d?.product_items ?? d?.order_items ?? d?.orders ?? []) as any[];
});

function pickValue(detail: any, keys: string[]) {
  for (const key of keys) {
    const v = detail?.[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '-';
}

const summaryItems = computed(() => {
  const d = contractDetail.value || {};
  return [
    { label: '合同编号', value: pickValue(d, ['contract_no', 'no', 'contractId', 'rowid']) },
    { label: '合同名称', value: pickValue(d, ['contract_name', 'name', 'title']) },
    { label: '客户', value: pickValue(d, ['customerName', 'contract_party_b', 'customer_id', 'customerId']) },
    { label: '项目', value: pickValue(d, ['project_name', 'project_id', 'businessName', 'businessId']) },
    { label: '业务员', value: pickValue(d, ['salesperson_name', 'salesperson', 'ownerUserName', 'ownerUserId']) },
    { label: '备注', value: pickValue(d, ['remark', 'description']) },
  ];
});

async function open(contractId: string) {
  const id = String(contractId || '').trim();
  if (!id) {
    ElMessage.warning('请先填写关联合同');
    return;
  }

  visible.value = true;
  loading.value = true;
  contractDetail.value = null;

  try {
    const res = await getContract(id);
    if (!res) {
      ElMessage.warning('未找到合同详情');
      return;
    }
    contractDetail.value = res;
  } catch (e: any) {
    ElMessage.error(e?.message || '获取合同详情失败');
  } finally {
    loading.value = false;
  }
}

function close() {
  visible.value = false;
}

defineExpose({ open, close });
</script>

<template>
  <ElDialog v-model="visible" title="合同详情" width="70%" destroy-on-close>
    <div v-loading="loading">
      <ElDescriptions :column="2" border>
        <ElDescriptionsItem
          v-for="item in summaryItems"
          :key="item.label"
          :label="item.label"
        >
          {{ item.value }}
        </ElDescriptionsItem>
      </ElDescriptions>

      <div class="mt-4">
        <div class="mb-2 text-sm font-medium">合同产品</div>
        <ElTable :data="orderItems" border height="360">
          <ElTableColumn prop="product_name" label="产品名称" min-width="160" />
          <ElTableColumn prop="specification" label="规格" min-width="120" />
          <ElTableColumn prop="unit" label="单位" width="80" align="center" />
          <ElTableColumn prop="num" label="数量" width="90" align="right" />
          <ElTableColumn prop="unit_price" label="单价" width="120" align="right" />
          <ElTableColumn prop="amount" label="金额" width="120" align="right" />
          <ElTableColumn prop="tax_rate" label="税率(%)" width="90" align="right" />
          <ElTableColumn prop="remark" label="备注" min-width="160" />
        </ElTable>
      </div>
    </div>

    <template #footer>
      <ElButton @click="close">关闭</ElButton>
    </template>
  </ElDialog>
</template>
