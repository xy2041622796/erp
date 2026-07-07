<script lang="ts" setup>
import { ref } from 'vue';


import OpeningCustomerTab from '#/views/finance/settings/basic_data/modules/opening-customer-tab.vue';
import OpeningProductStockTab from '#/views/finance/settings/basic_data/modules/opening-product-stock-tab.vue';
import OpeningSupplierTab from '#/views/finance/settings/basic_data/modules/opening-supplier-tab.vue';

import { ElAlert, ElCard, ElTabPane, ElTabs } from 'element-plus';

defineOptions({ name: 'FinanceBasicDataOpeningEntryTab' });

const activeName = ref<
  'customerOpening' | 'productOpeningStock' | 'supplierOpening'
>('customerOpening');
</script>

<template>
  <div class="opening-entry-tab">
    <ElAlert
      title="期初录入统一放在基础数据目录下，但业务生效仍按各自链路执行。"
      type="info"
      :closable="false"
      class="mb-3"
    >
      <template #default>
        <div class="text-sm leading-6">
          客户期初与供应商期初负责维护往来起点；商品期初库存负责维护库存起点。商品期初库存后续仍应联动库存结果表
          erp_stock 与库存流水表 erp_stock_record。
        </div>
      </template>
    </ElAlert>

    <ElCard>
      <ElTabs v-model="activeName" class="-mt-2">
        <ElTabPane name="customerOpening" label="客户期初录入" lazy>
          <OpeningCustomerTab />
        </ElTabPane>
        <ElTabPane name="supplierOpening" label="供应商期初录入" lazy>
          <OpeningSupplierTab />
        </ElTabPane>
        <ElTabPane name="productOpeningStock" label="商品期初库存录入" lazy>
          <OpeningProductStockTab />
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<style scoped>
.opening-entry-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
