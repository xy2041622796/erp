<script lang="ts" setup>
import { moneyText } from '#/utils/finance/decimal-money';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref, watch } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteReimbursementApply,
  getReimbursementApplyPage,
  updateReimbursementApplyStatus,
} from '#/api/erp/finance/reimbursement-apply';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import { useGridColumns, useGridFormSchema } from '#/views/finance/reimbursement/expensereport/data';
import Form from '#/views/finance/reimbursement/expensereport/modules/form.vue';

import { ElLoading, ElMessage, ElTabPane, ElTabs } from 'element-plus';

defineOptions({ name: 'FinanceReimbursementExpenseReport' });

type TabKey = 'all' | 'completed' | 'pendingApprove' | 'pendingPay';
const activeTab = ref<TabKey>('all');

const tabToStatus: Record<Exclude<TabKey, 'all'>, number> = {
  pendingApprove: 10,
  pendingPay: 20,
  completed: 30,
};

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function handleRefresh() {
  gridApi.query();
  refreshStats();
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
    await deleteReimbursementApply(row.rowid);
    ElMessage.success('删除成功');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message ?? '删除失败');
  } finally {
    loading.close();
  }
}

async function handleUpdateStatus(row: any, status: number) {
  const loading = ElLoading.service({ text: '处理中...' });
  try {
    await updateReimbursementApplyStatus(row.rowid, status);
    ElMessage.success('操作成功');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message ?? '操作失败');
  } finally {
    loading.close();
  }
}

const { dataTable, hasPermission } = useDataTablePermission();

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,

    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          const status =
            activeTab.value === 'all'
              ? undefined
              : tabToStatus[activeTab.value];
          const res = await getReimbursementApplyPage({
            pageNo: page.currentPage,
            page: page.page,
            status,
            ...formValues,
          });
          dataTable.value = res.dataTable;
          return res;
        },
      },
    },

    rowConfig: { keyField: 'rowid', isHover: true },
    toolbarConfig: {
      refresh: true,
      search: true,
      zoom: true,
      custom: true,
    },
  } as VxeTableGridOptions,
});

const stats = ref({
  pendingApprove: 0,
  pendingPay: 0,
  completed: 0,
  myLoan: 0,
});

function sumAmount(list: any[]) {
  let sum = 0;
  for (const row of list) sum += Number(row?.total_amount ?? 0);
  return Number.isFinite(sum) ? sum : 0;
}

async function refreshStats() {
  // 轻量版：用分页接口拉取并前端汇总（后续可替换为后端聚合接口）
  try {
    const [a, b, c] = await Promise.all([
      getReimbursementApplyPage({ pageNo: 1, page: 0, status: 10 }),
      getReimbursementApplyPage({ pageNo: 1, page: 0, status: 20 }),
      getReimbursementApplyPage({ pageNo: 1, page: 0, status: 30 }),
    ]);
    stats.value.pendingApprove = sumAmount(a.list ?? []);
    stats.value.pendingPay = sumAmount(b.list ?? []);
    stats.value.completed = sumAmount(c.list ?? []);
    stats.value.myLoan = 0;
  } catch {
    // ignore
  }
}

const statsText = computed(() => ({
  pendingApprove: moneyText(stats.value.pendingApprove),
  pendingPay: moneyText(stats.value.pendingPay),
  completed: moneyText(stats.value.completed),
  myLoan: moneyText(stats.value.myLoan),
}));

watch(activeTab, () => {
  gridApi.query();
});

refreshStats();
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />

    <div class="header">
      <el-tabs v-model="activeTab" class="tabs">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="待审批" name="pendingApprove" />
        <el-tab-pane label="待付款" name="pendingPay" />
        <el-tab-pane label="已完成" name="completed" />
      </el-tabs>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">待审批</div>
        <div class="stat-value">{{ statsText.pendingApprove }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">待付款</div>
        <div class="stat-value">{{ statsText.pendingPay }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已报销</div>
        <div class="stat-value">{{ statsText.completed }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">我的借款</div>
        <div class="stat-value">{{ statsText.myLoan }}</div>
      </div>
    </div>

    <Grid table-title="报销单列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '新增报销',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              ifShow: hasPermission('data:add'),
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
              ifShow: hasPermission('row:view', row.rowid),
              onClick: handleDetail.bind(null, row),
            },
            {
              label: '编辑',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              ifShow: hasPermission('row:edit', row.rowid),
              onClick: handleEdit.bind(null, row),
            },
            {
              label: row.status === 10 ? '审批' : '反审批',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.AUDIT,
              ifShow: hasPermission('row:edit', row.rowid),
              popConfirm: {
                title: row.status === 10 ? '确认审批通过？' : '确认提交审批？',
                confirm: handleUpdateStatus.bind(
                  null,
                  row,
                  row.status === 10 ? 20 : 10,
                ),
              },
            },
            {
              label: '删除',
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              ifShow: hasPermission('row:delete', row.rowid),
              popConfirm: {
                title: '确认删除？',
                confirm: handleDelete.bind(null, row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.tabs {
  min-width: 360px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 10px;
}

.stat-card {
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 6px;
  padding: 12px 14px;
}

.stat-label {
  color: #64748b;
  font-size: 12px;
}

.stat-value {
  margin-top: 6px;
  font-size: 18px;
  font-weight: 600;
}
</style>
