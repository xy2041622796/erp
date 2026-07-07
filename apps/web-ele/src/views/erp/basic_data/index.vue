<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { ElAlert, ElCard } from 'element-plus';

defineOptions({ name: 'ErpBasicDataHome' });
</script>

<template>
  <Page auto-content-height>
    <ElCard>
      <ElAlert title="ERP 基础数据目录页" type="info" :closable="false">
        <template #default>
          <div class="text-sm leading-6">
            产品/服务、客户、供应商、仓库等主数据已按独立导航目录方式拆分；期初录入请从“基础数据/期初录入”进入对应子页面：客户期初录入、供应商期初录入、商品期初库存录入。
          </div>
        </template>
      </ElAlert>
    </ElCard>
  </Page>
</template>
