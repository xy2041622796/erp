<template>
  <SubjectFormImpl
    :customer-data="props.customerData"
    :permission-data="props.permissionData"
    :readonly="props.readonly"
    @close="emit('close')"
    @cancel-edit="emit('cancel-edit')"
    @save-success="(id?: number | string) => emit('save-success', id)"
  />
</template>

<script setup lang="ts">
import type { CrmCustomerApi } from '#/api/erp/customer';

import SubjectFormImpl from '#/views/erp/client/customer/detail/modules/subject-form.vue';

const props = defineProps<{
  customerData?: CrmCustomerApi.Customer | null;
  permissionData?: any;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'cancel-edit'): void;
  (e: 'save-success', id?: number | string): void;
}>();
</script>
