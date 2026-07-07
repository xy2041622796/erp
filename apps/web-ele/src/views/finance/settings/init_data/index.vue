<script lang="ts" setup>
import { ref } from 'vue';

import { Page } from '@vben/common-ui';


import InitExpenseSettlementTab from '#/views/finance/settings/init_data/modules/init-expense-settlement-tab.vue';
import InitIncomeSettlementTab from '#/views/finance/settings/init_data/modules/init-income-settlement-tab.vue';
import InitOtherExpenseTab from '#/views/finance/settings/init_data/modules/init-other-expense-tab.vue';
import InitOtherIncomeTab from '#/views/finance/settings/init_data/modules/init-other-income-tab.vue';
import InitPrePaymentTab from '#/views/finance/settings/init_data/modules/init-pre-payment-tab.vue';
import InitPreReceiptTab from '#/views/finance/settings/init_data/modules/init-pre-receipt-tab.vue';

import { ElCard, ElTabPane, ElTabs } from 'element-plus';

defineOptions({ name: 'FinanceInitData' });

type TabName =
  | 'initBorrow'
  | 'initExpenseSettlement'
  | 'initIncomeSettlement'
  | 'initInvoice'
  | 'initOtherExpense'
  | 'initOtherIncome'
  | 'initReceiptInvoice'
  | 'initReimbursement';

const activeName = ref<TabName>('initIncomeSettlement');
</script>

<template>
  <Page auto-content-height class="h-full">
    <ElCard class="flex h-full flex-col">
      <ElTabs v-model="activeName" class="-mt-3 flex h-full flex-col">
        <ElTabPane name="initIncomeSettlement" label="期初收入结算" lazy>
          <div class="h-full">
            <InitIncomeSettlementTab />
          </div>
        </ElTabPane>
        <ElTabPane name="initExpenseSettlement" label="期初支出结算" lazy>
          <div class="h-full">
            <InitExpenseSettlementTab />
          </div>
        </ElTabPane>

        <ElTabPane name="initInvoice" label="期初预收款" lazy>
          <div class="h-full">
            <InitPreReceiptTab />
          </div>
        </ElTabPane>
        <ElTabPane name="initReceiptInvoice" label="期初预付款" lazy>
          <div class="h-full">
            <InitPrePaymentTab />
          </div>
        </ElTabPane>
        <ElTabPane name="initOtherIncome" label="期初其他收入" lazy>
          <div class="h-full">
            <InitOtherIncomeTab />
          </div>
        </ElTabPane>
        <ElTabPane name="initOtherExpense" label="期初其他支出" lazy>
          <div class="h-full">
            <InitOtherExpenseTab />
          </div>
        </ElTabPane>
        <ElTabPane name="initBorrow" label="期初借款" lazy>
          <div class="h-full p-6 text-gray-500">开发中</div>
        </ElTabPane>
        <ElTabPane name="initReimbursement" label="期初报销" lazy>
          <div class="h-full p-6 text-gray-500">开发中</div>
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </Page>
</template>
