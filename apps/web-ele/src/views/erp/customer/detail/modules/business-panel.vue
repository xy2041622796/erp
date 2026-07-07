<template>
  <BusinessPanelImpl :customer-id="props.customerId" ref="panelRef" @updated="emit('updated')" />
</template>

<script setup lang="ts">
import { ref } from 'vue';

import BusinessPanelImpl from '#/views/erp/client/customer/detail/modules/business-panel.vue';

const props = defineProps<{
  customerId?: number | string;
}>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const panelRef = ref();

defineExpose({
  openCreate: () => panelRef.value?.openCreate?.(),
});
</script>
