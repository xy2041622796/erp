<script lang="ts" setup>
import { computed } from 'vue';

import { ElPopover } from 'element-plus';


interface Props {
  currentStock?: number | string;
  totalStock?: number | string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  currentStock: 0,
  totalStock: 0,
  disabled: false,
});

const displayCurrentStock = computed(() => Number(props.currentStock || 0));
const displayTotalStock = computed(() => Number(props.totalStock || 0));
</script>

<template>
  <ElPopover placement="bottom" trigger="hover" :width="220" :disabled="disabled">
    <template #reference>
      <div class="w-full">
        <slot />
      </div>
    </template>
    <div class="text-sm leading-7 text-[#666]">
      <div>当前库存：{{ displayCurrentStock }}</div>
      <div>总库存：{{ displayTotalStock }}</div>
    </div>
  </ElPopover>
</template>
