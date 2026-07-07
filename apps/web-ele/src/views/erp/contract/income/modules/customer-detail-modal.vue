<script setup lang="ts">
import type { CrmCustomerApi } from '#/api/erp/customer';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { getCustomer } from '#/api/erp/customer';
import CustomerForm from '#/views/erp/client/customer/modules/form.vue';
// import { loadCompanyTypeDict } from '#/views/erp/client/customer/data';

const companyTypeMap = ref<Record<string, string>>({});
const currentCustomer = ref<CrmCustomerApi.Customer | null>(null);

const [Modal, modalApi] = useVbenModal({
  footer: false,
  class: 'w-[720px]',
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      currentCustomer.value = null;
      return;
    }
    const data = modalApi.getData<{ id?: number | string }>();
    if (!data?.id) {
      currentCustomer.value = null;
      return;
    }
    modalApi.lock();
    try {
      // companyTypeMap.value = (await loadCompanyTypeDict()) || {};
      currentCustomer.value = await getCustomer(data.id as any);
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal title="客户信息">
    <div style="height: 70vh; overflow-y: auto">
      <CustomerForm :customer-data="currentCustomer" :company-type-dict="companyTypeMap" readonly
        @close="modalApi.close()" />
    </div>
  </Modal>
</template>
