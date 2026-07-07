<script setup lang="ts">
import type { CrmCustomerApi } from '#/api/erp/customer';

import { computed } from 'vue';

import { ElCard, ElTag } from 'element-plus';


const props = defineProps<{
  customer?: CrmCustomerApi.Customer | null;
}>();

const summaryItems = computed(() => {
  const customer = props.customer || {};
  return [
    { label: '负责人', value: customer.ownerUserName || '-' },
    { label: '部门', value: customer.departName || customer.ownerUserDeptName || '-' },
    { label: '来源线索', value: customer.sourceLeadName || '-' },
    { label: '最近跟进时间', value: customer.lastFollowTime || '-' },
    { label: '下次跟进时间', value: customer.nextFollowTime || '-' },
    { label: '进入公海时间', value: customer.poolTime || '-' },
    { label: '公海原因', value: customer.poolReason || '-' },
  ];
});
</script>

<template>
  <ElCard shadow="never" class="status-summary-card">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div class="text-xl font-semibold">{{ customer?.name || '新建客户' }}</div>
        <div class="mt-2 flex flex-wrap gap-2">
          <ElTag :type="customer?.dealStatus ? 'success' : 'info'">
            {{ customer?.dealStatus ? '已成交' : '未成交' }}
          </ElTag>
          <ElTag :type="customer?.isPool ? 'warning' : 'success'">
            {{ customer?.isPool ? '公海中' : '非公海' }}
          </ElTag>
        </div>
      </div>
      <div class="follow-brief">
        <div class="label">最近跟进摘要</div>
        <div class="value">{{ customer?.lastFollowContent || '-' }}</div>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="item in summaryItems" :key="item.label" class="summary-item">
        <div class="label">{{ item.label }}</div>
        <div class="value">{{ item.value }}</div>
      </div>
    </div>
  </ElCard>
</template>

<style scoped>
.status-summary-card {
  border-radius: 12px;
}
.summary-item,
.follow-brief {
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 10px;
}
.label {
  margin-bottom: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.value {
  color: var(--el-text-color-primary);
  word-break: break-word;
}
.follow-brief {
  min-width: 280px;
  max-width: 420px;
}
</style>
