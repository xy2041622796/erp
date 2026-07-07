<script lang="ts" setup>
import { ref } from 'vue';

import { Page } from '@vben/common-ui';


import ContractTypeTab from './modules/contract-type-tab.vue';
import ObjectAdapterTab from './modules/object-adapter-tab.vue';
import SalaryRankEmployeeTab from './modules/salary-rank-employee-tab.vue';
import SalaryRankItemTab from './modules/salary-rank-item-tab.vue';
import SalaryRankTab from './modules/salary-rank-tab.vue';
import ShareholderOrgTab from './modules/shareholder-org-tab.vue';
import TaxCategoryTab from './modules/tax-category-tab.vue';
import UnitTab from './modules/unit-tab.vue';
import WarehouseTab from './modules/warehouse-tab.vue';

import { ElCard, ElTabPane, ElTabs } from 'element-plus';

defineOptions({ name: 'FinanceBasicData' });

const activeName = ref<
  | 'contractType'
  | 'objectAdapter'
  | 'salaryRank'
  | 'salaryRankEmployee'
  | 'salaryRankItem'
  | 'shareholderOrg'
  | 'taxCategory'
  | 'unit'
  | 'warehouse'
>('contractType');
</script>

<template>
  <Page auto-content-height>
    <ElCard>
      <ElTabs v-model="activeName" class="-mt-3">
        <ElTabPane name="shareholderOrg" label="股东/机构" lazy>
          <ShareholderOrgTab />
        </ElTabPane>
        <ElTabPane name="warehouse" label="仓库管理" lazy>
          <WarehouseTab />
        </ElTabPane>
        <ElTabPane name="contractType" label="合同类型" lazy>
          <ContractTypeTab />
        </ElTabPane>
        <ElTabPane name="unit" label="单位管理" lazy>
          <UnitTab />
        </ElTabPane>
        <ElTabPane name="taxCategory" label="税费类别" lazy>
          <TaxCategoryTab />
        </ElTabPane>
        <ElTabPane name="salaryRank" label="薪资职级" lazy>
          <SalaryRankTab />
        </ElTabPane>
        <ElTabPane name="salaryRankEmployee" label="职级人员" lazy>
          <SalaryRankEmployeeTab />
        </ElTabPane>
        <ElTabPane name="salaryRankItem" label="职级工资项" lazy>
          <SalaryRankItemTab />
        </ElTabPane>
        <ElTabPane name="objectAdapter" label="业务数据标准化" lazy>
          <ObjectAdapterTab />
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </Page>
</template>
