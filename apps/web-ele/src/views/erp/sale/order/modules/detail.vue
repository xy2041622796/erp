<script lang="ts" setup>
import type { ErpSaleOrderApi } from '#/api/erp/sale/order';

import { onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { getCustomerSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getSaleOrder } from '#/api/erp/sale/order';
import { getSimpleUserList } from '#/api/system/user';
import { useDescription } from '#/components/description';

import { useDetailSchema } from '../data';

import { ElDescriptions, ElDescriptionsItem } from 'element-plus';

const formData = ref<ErpSaleOrderApi.SaleOrder>();
const customerList = ref<any[]>([]);
const accountList = ref<any[]>([]);
const userList = ref<any[]>([]);

const [Descriptions, descriptionApi] = useDescription({
  // border: true,
  column: 3,
  schema: [],
});

onMounted(async () => {
  const [accounts, users, customers] = await Promise.all([
    getAccountSimpleList(),
    getSimpleUserList(),
    getCustomerSimpleList(),
  ]);
  accountList.value = accounts;
  userList.value = users;
  customerList.value = Array.isArray(customers) ? customers : [];
});

const [Modal, modalApi] = useVbenModal({
  title: '销售订单详情',
  class: 'w-[800px]',
  draggable: true,
  footer: false,
  zIndex: 3000,
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = undefined;
      return;
    }
    const data = modalApi.getData<{ id?: string }>();
    if (!data || !data.id) {
      return;
    }
    modalApi.lock();
    try {
      formData.value = await getSaleOrder(data.id);

      // Update Schema with lists
      const schema = useDetailSchema(
        customerList.value,
        accountList.value,
        userList.value,
      );
      descriptionApi.setState({ schema, data: formData.value });
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal :z-index="3000">
    <div class="p-4">
      <Descriptions />
      <div v-if="formData?.items?.length" class="mt-4">
        <div class="mb-2 font-bold">订单明细</div>
        <div
          v-for="(item, index) in formData.items"
          :key="index"
          class="mb-4 rounded border p-2"
        >
          <ElDescriptions :column="3" size="small">
            <ElDescriptionsItem label="产品名称">
              {{ item.product_name }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="条码">
              {{ item.product_bar_code }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="数量">
              {{ item.count }} {{ item.product_unit_name }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="单价">
              {{ item.product_price }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="金额">
              {{ item.total_product_price }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="备注">
              {{ item.remark || item.description || '-' }}
            </ElDescriptionsItem>
          </ElDescriptions>
        </div>
      </div>
    </div>
  </Modal>
</template>
