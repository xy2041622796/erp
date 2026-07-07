<script lang="ts" setup>
import {
  ref } from 'vue';

import { Page } from '@vben/common-ui';


import OaContractPage from '../contract/index.vue';
import IncomeContractPage from './income/index.vue';
import OutcomeContractPage from './outcome/index.vue';

import { ElAlert, ElTabPane, ElTabs } from 'element-plus';

const activeTab = ref<'oa' | 'income' | 'outcome'>('oa');
</script>

<template>
  <Page auto-content-height>
    <ElAlert
      class="mb-4"
      show-icon
      title="商务与合同 / 合同起草"
      type="info"
      description="已将 OA 合同起草、收入合同起草、支出合同起草合并到统一入口。旧页面组件直接挂载，保留原接口调用与操作逻辑。"
    />

    <ElTabs v-model:model-value="activeTab">
      <ElTabPane label="合同起草" name="oa">
        <OaContractPage v-if="activeTab === 'oa'" />
      </ElTabPane>
      <ElTabPane label="收入合同起草" name="income">
        <IncomeContractPage v-if="activeTab === 'income'" />
      </ElTabPane>
      <ElTabPane label="支出合同起草" name="outcome">
        <OutcomeContractPage v-if="activeTab === 'outcome'" />
      </ElTabPane>
    </ElTabs>
  </Page>
</template>
