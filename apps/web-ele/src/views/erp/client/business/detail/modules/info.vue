<script setup lang="ts">
import type { CrmCustomerBusinessApi } from '#/api/erp/client/business';

import { computed } from 'vue';


import {
  formatAmount,
  formatBusinessStage,
  formatBusinessStatus,
  formatDate,
  formatDateTime,
  formatPercent,
} from '../../data';
import { detailSections } from '../data';

import {
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

const props = defineProps<{
  business: CrmCustomerBusinessApi.Business;
}>();

function renderValue(item: { field: string; type?: string }) {
  const value = (props.business as any)?.[item.field];
  switch (item.type) {
    case 'amount':
      return formatAmount(value);
    case 'date':
      return formatDate(value);
    case 'datetime':
      return formatDateTime(value);
    case 'percent':
      return formatPercent(value);
    case 'stage':
      return formatBusinessStage(value);
    case 'status':
      return formatBusinessStatus(value);
    default:
      return value || '-';
  }
}

const participantContacts = computed(() => props.business.participantContacts || []);
const items = computed(() => props.business.items || []);
</script>

<template>
  <div class="space-y-4">
    <ElCard shadow="never">
      <template #header>基本信息</template>
      <ElDescriptions :column="2" border>
        <ElDescriptionsItem v-for="item in detailSections.base" :key="item.field" :label="item.label">
          {{ renderValue(item) }}
        </ElDescriptionsItem>
      </ElDescriptions>
    </ElCard>

    <ElCard shadow="never">
      <template #header>归属信息</template>
      <ElDescriptions :column="2" border>
        <ElDescriptionsItem v-for="item in detailSections.owner" :key="item.field" :label="item.label">
          {{ renderValue(item) }}
        </ElDescriptionsItem>
      </ElDescriptions>
    </ElCard>

    <ElCard shadow="never">
      <template #header>状态与跟进</template>
      <ElDescriptions :column="2" border>
        <ElDescriptionsItem v-for="item in detailSections.status" :key="item.field" :label="item.label">
          {{ renderValue(item) }}
        </ElDescriptionsItem>
      </ElDescriptions>
    </ElCard>

    <ElCard shadow="never">
      <template #header>产品清单</template>
      <ElTable :data="items" border style="width: 100%">
        <ElTableColumn type="index" label="序号" width="70" />
        <ElTableColumn prop="productCode" label="产品编号" min-width="140" />
        <ElTableColumn prop="productName" label="产品名称" min-width="180" />
        <ElTableColumn prop="productBarCode" label="条码" min-width="140" />
        <ElTableColumn prop="productUnitName" label="单位" min-width="100" />
        <ElTableColumn prop="productPrice" label="价格（元）" min-width="120" />
        <ElTableColumn prop="salePrice" label="售价（元）" min-width="120" />
        <ElTableColumn prop="productCount" label="数量" min-width="100" />
        <ElTableColumn prop="totalPrice" label="合计" min-width="120" />
      </ElTable>
    </ElCard>

    <ElCard shadow="never">
      <template #header>参与联系人</template>
      <div v-if="participantContacts.length === 0" class="text-gray-500">暂无参与联系人</div>
      <div v-else class="flex flex-wrap gap-2">
        <ElTag v-for="item in participantContacts" :key="String(item.contactId || item.rowid || '')">
          {{ item.contactName || '-' }}
        </ElTag>
      </div>
    </ElCard>
  </div>
</template>
