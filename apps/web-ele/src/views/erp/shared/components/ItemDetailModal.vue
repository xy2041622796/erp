<script setup lang="ts">
import { computed, ref } from 'vue';

import { ElButton, ElDescriptions, ElDescriptionsItem, ElDialog } from 'element-plus';


const currentDetail = ref<any>({});
const countLabel = ref('数量');
const open = ref(false);
const title = ref('查看明细');

function pickValue(detail: any, keys: string[]) {
  for (const key of keys) {
    const v = detail?.[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '-';
}

const remarkText = computed(() => {
  return pickValue(currentDetail.value, ['remark', 'description', 'init_remark']);
});

function handleOpen(data: any, modalTitle?: string, label?: string) {
  currentDetail.value = data;
  if (modalTitle) {
    title.value = modalTitle;
  }
  countLabel.value = data.label || label || '数量';
  open.value = true;
}

defineExpose({
  open: handleOpen,
});
</script>

<template>
  <ElDialog
    v-model="open"
    :title="title"
    width="800px"
    :z-index="3000"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    destroy-on-close
    append-to-body
  >
    <div class="p-4">
      <ElDescriptions :column="2" border>
        <ElDescriptionsItem label="产品名称">
          {{ currentDetail.product_name }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="产品条码">
          {{ currentDetail.product_bar_code }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="单位">
          {{ currentDetail.product_unit_name }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="countLabel">
          {{ currentDetail.count }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="出库数量">
          {{ currentDetail.out_count }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="退货数量">
          {{ currentDetail.return_count }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="单价">
          {{ currentDetail.product_price }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="金额">
          {{ currentDetail.total_product_price }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="税率(%)">
          {{ currentDetail.tax_percent }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="税额">
          {{ currentDetail.tax_price }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="价税合计">
          {{ currentDetail.total_price }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="备注" :span="2">
          {{ remarkText }}
        </ElDescriptionsItem>
      </ElDescriptions>
    </div>
    <template #footer>
      <ElButton @click="open = false">关闭</ElButton>
    </template>
  </ElDialog>
</template>
