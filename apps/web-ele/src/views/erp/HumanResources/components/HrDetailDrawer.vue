<script lang="ts" setup>
import { computed } from 'vue';

import { ElDescriptions, ElDescriptionsItem, ElDrawer } from 'element-plus';

defineOptions({ name: 'HrDetailDrawer' });

interface SummaryItem {
  label: string;
  value: string | number | null | undefined;
}

const props = defineProps<{
  modelValue: boolean;
  title: string;
  width?: string;
  summary?: SummaryItem[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});
</script>

<template>
  <ElDrawer v-model="visible" :size="width || '560px'" :title="title">
    <div class="drawer-layout">
      <ElDescriptions v-if="summary?.length" :column="1" border class="drawer-summary">
        <ElDescriptionsItem v-for="item in summary" :key="item.label" :label="item.label">
          {{ item.value || '-' }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <div class="drawer-body">
        <slot></slot>
      </div>
    </div>
    <template v-if="$slots.footer" #footer>
      <slot name="footer"></slot>
    </template>
  </ElDrawer>
</template>

<style scoped>
.drawer-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.drawer-body {
  min-height: 120px;
}
</style>
