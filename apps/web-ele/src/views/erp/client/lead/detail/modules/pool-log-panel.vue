<script setup lang="ts">
import { ref, watch } from 'vue';


import { getCustomerPoolLogPage } from '#/api/erp/customer/pool';

import { ElCard, ElEmpty, ElTable, ElTableColumn } from 'element-plus';

const props = defineProps<{
  leadId?: number | string;
}>();

const loading = ref(false);
const list = ref<any[]>([]);

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

async function loadList() {
  if (!String(props.leadId || '').trim()) {
    list.value = [];
    return;
  }
  loading.value = true;
  try {
    const res = await getCustomerPoolLogPage({ leadId: props.leadId, index: 1, size: 100 });
    list.value = res?.list || [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.leadId,
  () => {
    loadList();
  },
  { immediate: true },
);
</script>

<template>
  <ElCard shadow="never" class="log-card">
    <template #header>
      <div class="header-row">
        <span>转化 / 公海记录</span>
        <span class="count-text">共 {{ list.length }} 条</span>
      </div>
    </template>

    <ElEmpty v-if="!leadId" description="缺少线索ID" />
    <ElEmpty v-else-if="list.length === 0 && !loading" description="暂无记录" />
    <ElTable v-else v-loading="loading" :data="list" stripe style="width: 100%">
      <ElTableColumn type="index" width="60" label="序号" />
      <ElTableColumn prop="operateType" label="类型" min-width="160" />
      <ElTableColumn prop="reason" label="原因" min-width="220" show-overflow-tooltip />
      <ElTableColumn prop="beforeOwnerUserName" label="变更前负责人" min-width="130" />
      <ElTableColumn prop="afterOwnerUserName" label="变更后负责人" min-width="130" />
      <ElTableColumn prop="customerCode" label="客户编号" min-width="140" />
      <ElTableColumn label="操作时间" min-width="180">
        <template #default="{ row }">{{ formatDateTime(row.operateTime) }}</template>
      </ElTableColumn>
      <ElTableColumn prop="operatorUserName" label="操作人" min-width="120" />
    </ElTable>
  </ElCard>
</template>

<style scoped>
.log-card {
  border-radius: 14px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.count-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
