<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { ElAlert, ElCard, ElDescriptions, ElDescriptionsItem } from 'element-plus';


defineOptions({ name: 'ErpBasicDataOpeningEntry' });
</script>

<template>
  <Page auto-content-height>
    <div class="flex flex-col gap-3">
      <ElAlert
        title="期初录入目录页"
        type="info"
        :closable="false"
      >
        <template #default>
          <div class="text-sm leading-6">
            当前目录下包含三个独立页面：客户期初录入、供应商期初录入、商品期初库存录入。商品期初库存后续仍按库存结果表与库存流水表联动。
          </div>
        </template>
      </ElAlert>

      <ElCard>
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="目录路径">views/erp/basic_data/opening_entry</ElDescriptionsItem>
          <ElDescriptionsItem label="子页面一">客户期初录入</ElDescriptionsItem>
          <ElDescriptionsItem label="子页面二">供应商期初录入</ElDescriptionsItem>
          <ElDescriptionsItem label="子页面三">商品期初库存录入</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>
    </div>
  </Page>
</template>
