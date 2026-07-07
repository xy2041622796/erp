<script lang="ts" setup>
import type { CrmContractApi } from '#/api/erp/contract/contract';

import { computed, ref } from 'vue';


import { getContractOrderList } from '#/api/erp/contract/contract';

import {
  ElButton,
  ElDialog,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const emit = defineEmits<{
  (e: 'confirm', rows: CrmContractApi.ContractOrderRow[]): void;
}>();

const visible = ref(false);
const loading = ref(false);
const contractId = ref<string>('');

const rows = ref<CrmContractApi.ContractOrderRow[]>([]);
const selected = ref<CrmContractApi.ContractOrderRow[]>([]);

const title = computed(() => `从合同导入订单（${contractId.value || '-'}）`);

async function open(id: string) {
  const cid = String(id || '').trim();
  if (!cid) {
    ElMessage.warning('请先填写关联合同');
    return;
  }

  contractId.value = cid;
  visible.value = true;
  loading.value = true;
  selected.value = [];
  rows.value = [];

  try {
    const list = await getContractOrderList(cid);
    rows.value = (Array.isArray(list) ? list : []) as any;
  } catch (e: any) {
    ElMessage.error(e?.message || '获取合同订单失败');
  } finally {
    loading.value = false;
  }
}

function close() {
  visible.value = false;
}

function handleConfirm() {
  if (selected.value.length === 0) {
    ElMessage.warning('请先选择要导入的订单');
    return;
  }
  emit('confirm', selected.value);
  close();
}

function onSelectionChange(list: any[]) {
  selected.value = (list ?? []) as any;
}

defineExpose({ open, close });
</script>

<template>
  <ElDialog v-model="visible" :title="title" width="75%" destroy-on-close>
    <div v-loading="loading">
      <ElTable :data="rows" border height="420" @selection-change="onSelectionChange">
        <ElTableColumn type="selection" width="55" />
        <ElTableColumn prop="sale_order_no" label="订单号" min-width="200" />
        <ElTableColumn prop="order_time" label="下单时间" width="160" />
        <ElTableColumn prop="total_count" label="数量" width="90" align="right" />
        <ElTableColumn prop="total_product_price" label="未税金额" width="130" align="right" />
        <ElTableColumn prop="total_tax_price" label="税额" width="120" align="right" />
        <ElTableColumn prop="total_price" label="含税合计" width="130" align="right" />
        <ElTableColumn prop="deposit_price" label="定金" width="120" align="right" />
        <ElTableColumn prop="discount_percent" label="折扣率(%)" width="120" align="right" />
        <ElTableColumn prop="discount_price" label="折扣额" width="120" align="right" />
        <ElTableColumn prop="remark" label="备注" min-width="160" />
      </ElTable>
    </div>

    <template #footer>
      <ElButton @click="close">取消</ElButton>
      <ElButton type="primary" @click="handleConfirm">确定</ElButton>
    </template>
  </ElDialog>
</template>
