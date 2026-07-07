<script lang="ts" setup>
import { moneyText } from '#/utils/finance/decimal-money';
import { computed, ref, watch } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteExpenseRegist,
  getExpenseRegistPage,
} from '#/api/erp/finance/expense-regist';

import ExpenseRegistForm from '#/views/finance/reimbursement/mine/modules/expense-regist-form.vue';
import {
  EMPLOYEE_LOAN_EXPENSE_TYPE,
  useEmployeeLoansGridColumns,
  useEmployeeLoansGridFormSchema,
} from '#/views/finance/reimbursement/employeeloans/data';

import { ElLoading, ElMessage, ElTabPane, ElTabs } from 'element-plus';

defineOptions({ name: 'FinanceReimbursementEmployeeLoans' });

/** 左上 tab：待核销 / 已核销 */
type TabKey = 'history' | 'pending';
const activeTab = ref<TabKey>('pending');

/** 右下角：金额合计（当前页合计） */
const totalAmount = ref(0);
const totalAmountText = computed(() => moneyText(totalAmount.value));

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: ExpenseRegistForm,
  destroyOnClose: true,
});

/** 兼容不同分页返回结构（list/records/data.list...） */
function extractList(res: any): any[] {
  return (
    res?.list ??
    res?.records ??
    res?.data?.list ??
    res?.data?.records ??
    res?.result?.list ??
    res?.result?.records ??
    []
  );
}

function calcTotal(list: any[]) {
  let sum = 0;
  for (const row of list) sum += Number(row?.expense_amount ?? 0);
  totalAmount.value = Number.isFinite(sum) ? sum : 0;
}

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  formModalApi
    .setData({ type: 'create', fixedExpenseType: EMPLOYEE_LOAN_EXPENSE_TYPE })
    .open();
}

function handleEdit(row: any) {
  formModalApi
    .setData({
      type: 'edit',
      id: row.rowid,
      fixedExpenseType: EMPLOYEE_LOAN_EXPENSE_TYPE,
    })
    .open();
}

function handleDetail(row: any) {
  formModalApi
    .setData({
      type: 'detail',
      id: row.rowid,
      fixedExpenseType: EMPLOYEE_LOAN_EXPENSE_TYPE,
    })
    .open();
}

async function handleDelete(row: any) {
  const loading = ElLoading.service({ text: '删除中...' });
  try {
    await deleteExpenseRegist(row.rowid);
    ElMessage.success('删除成功');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message ?? '删除失败');
  } finally {
    loading.close();
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useEmployeeLoansGridFormSchema() },
  gridOptions: {
    columns: useEmployeeLoansGridColumns(),
    height: 'auto',
    keepSource: true,

    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          const res = await getExpenseRegistPage({
            pageNo: page.currentPage,
            page: page.page,
            tab: activeTab.value,
            ...formValues,
            // 固定：员工借款
            expense_type: EMPLOYEE_LOAN_EXPENSE_TYPE,
          });

          calcTotal(extractList(res));
          return res;
        },
      },
    },

    rowConfig: { keyField: 'rowid', isHover: true },
    toolbarConfig: {
      refresh: true,
      search: true,
      zoom: true,
      export: true,
      custom: true,
    },
  },
});

watch(activeTab, () => {
  gridApi.query();
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />

    <div class="header-bar">
      <el-tabs v-model="activeTab" class="tabs">
        <el-tab-pane label="待核销" name="pending" />
        <el-tab-pane label="已核销" name="history" />
      </el-tabs>
    </div>

    <Grid table-title="员工借款">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '新增借款',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              onClick: handleCreate,
            },
          ]"
        />
      </template>

      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '详情',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              onClick: handleDetail.bind(null, row),
            },
            {
              label: '编辑',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              onClick: handleEdit.bind(null, row),
            },
            {
              label: '删除',
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              popConfirm: {
                title: '确认删除?',
                confirm: handleDelete.bind(null, row),
              },
            },
          ]"
        />
      </template>

      <template #bottom-extra>
        <div class="sum-bar">借款金额合计：{{ totalAmountText }}</div>
      </template>
    </Grid>
  </Page>
</template>

<style scoped>
.header-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.tabs {
  min-width: 260px;
}

.sum-bar {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  padding: 10px 12px;
}
</style>
