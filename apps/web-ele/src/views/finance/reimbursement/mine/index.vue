<script lang="ts" setup>
import { moneyText } from '#/utils/finance/decimal-money';
import { computed, ref, watch } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteExpenseRegist,
  getExpenseRegistPage,
} from '#/api/erp/finance/expense-regist';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import VoucherForm from '#/views/finance/reimbursement/expensereport/modules/form.vue';
import {
  fillProjectNames,
  useExpenseRegistGridColumns,
  useExpenseRegistGridFormSchema,
} from '#/views/finance/reimbursement/mine/data';
import ExpenseRegistForm from '#/views/finance/reimbursement/mine/modules/expense-regist-form.vue';

import { ElLoading, ElMessage, ElTabPane, ElTabs } from 'element-plus';

defineOptions({ name: 'FinanceReimbursementMine' });

/** 左上 tab：待报销费用 / 历史费用 */
type TabKey = 'history' | 'pending';
const activeTab = ref<TabKey>('pending');

/** 右下角：金额合计（当前页合计） */
const totalAmount = ref(0);
const totalAmountText = computed(() => moneyText(totalAmount.value));

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: ExpenseRegistForm,
  destroyOnClose: true,
});

const [VoucherModal, voucherModalApi] = useVbenModal({
  connectedComponent: VoucherForm,
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
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: any) {
  formModalApi.setData({ type: 'edit', id: row.rowid }).open();
}

function handleDetail(row: any) {
  formModalApi.setData({ type: 'detail', id: row.rowid }).open();
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

/** 导入费用（占位） */
function handleImport() {
  ElMessage.info('导入费用：这里接入上传/导入逻辑');
}

/** 报销制单：跳转到报销单列表（可在那边新增） */
function handleMakeVoucher() {
  const records: any[] =
    (gridApi as any)?.grid?.getCheckboxRecords?.() ??
    (gridApi as any)?.getCheckboxRecords?.() ??
    [];

  if (records.length === 0) {
    ElMessage.warning('请先勾选要报销的费用');
    return;
  }

  // 兼容字段：报销单会把 remark 存到 description.items 里
  const items = records.map((r) => ({
    ...r,
    remark: r?.remark ?? r?.description,
  }));

  voucherModalApi.setData({ type: 'create', items }).open();
}

const { dataTable, hasPermission } = useDataTablePermission();

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useExpenseRegistGridFormSchema() },
  gridOptions: {
    columns: useExpenseRegistGridColumns(),
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
          });
          dataTable.value = res.dataTable;

          const list = extractList(res);
          calcTotal(list);
          await fillProjectNames(list);

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
    <VoucherModal @success="handleRefresh" />

    <div class="header-bar">
      <el-tabs v-model="activeTab" class="tabs">
        <el-tab-pane label="待报销费用" name="pending" />
        <el-tab-pane label="历史费用" name="history" />
      </el-tabs>
    </div>

    <Grid table-title="费用登记">
      <template #toolbar-tools>
        <div class="toolbar-tools">
          <TableAction
            :actions="[
              {
                label: '导入费用',
                type: 'default',
                icon: ACTION_ICON.UPLOAD,
                onClick: handleImport,
                ifShow: true,
              },
              {
                label: '新增费用',
                type: 'primary',
                icon: ACTION_ICON.ADD,
                onClick: handleCreate,
                ifShow: hasPermission('data:add'),
              },
              {
                label: '报销制单',
                type: 'primary',
                icon: ACTION_ICON.ADD,
                onClick: handleMakeVoucher,
                ifShow: true,
              },
            ]"
          />
        </div>
      </template>

      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '编辑',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              ifShow: hasPermission('row:edit', row.rowid),
              onClick: handleEdit.bind(null, row),
            },
            {
              label: '删除',
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              ifShow: hasPermission('row:delete', row.rowid),
              popConfirm: {
                title: '确认删除?',
                confirm: handleDelete.bind(null, row),
              },
            },
            {
              label: '详情',
              type: 'primary',
              icon: ACTION_ICON.VIEW,
              ifShow: hasPermission('row:view', row.rowid),
              onClick: handleDetail.bind(null, row),
            },
          ]"
        />
      </template>

      <template #bottom-extra>
        <div class="sum-bar">金额合计：{{ totalAmountText }}</div>
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

.toolbar-tools {
  display: inline-flex;
  width: auto;
  flex: 0 0 auto;
}

.sum-bar {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  padding: 10px 12px;
}
</style>
