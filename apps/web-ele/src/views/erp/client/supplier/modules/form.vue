<template>
  <CustomerForm
    attachment-owner-type="供应商信息"
    :customer-data="props.customerData"
    :fixed-company-type="2"
    :permission-data="props.permissionData"
    :readonly="props.readonly"
    @close="emit('close')"
    @save-success="(id?: number | string) => emit('save-success', id)"
  />
</template>

<script setup lang="ts">
import type { CrmCustomerApi } from '#/api/erp/customer';

import CustomerForm from '#/views/erp/customer/modules/form.vue';

const props = defineProps<{
  customerData?: CrmCustomerApi.Customer | null;
  permissionData?: any;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save-success', id?: number | string): void;
}>();
</script>
