<script lang="ts" setup>
import type { CrmCustomerLeadApi } from '#/api/erp/customer/lead';

import { computed } from 'vue';


import { useLeadDetailGroups } from '../data';

import { ElDescriptions, ElDescriptionsItem, ElDivider, ElEmpty } from 'element-plus';

const props = defineProps<{
  lead?: CrmCustomerLeadApi.Lead | null;
}>();

const groups = computed(() => useLeadDetailGroups());

function getDisplayValue(item: any) {
  const raw = (props.lead as any)?.[item.field];
  if (item.formatter) return item.formatter(raw);
  if (raw === undefined || raw === null || raw === '') return '-';
  return raw;
}
</script>

<template>
  <div v-if="lead">
    <template v-for="group in groups" :key="group.title">
      <ElDescriptions :title="group.title" :column="2" border>
        <ElDescriptionsItem v-for="item in group.items" :key="item.field" :label="item.label">
          {{ getDisplayValue(item) }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <ElDivider />
    </template>
  </div>
  <ElEmpty v-else description="暂无数据" />
</template>
