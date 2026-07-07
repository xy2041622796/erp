<script lang="ts" setup>
import { addMoney, moneyNumber, subMoney } from '#/utils/finance/decimal-money';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpCollectionSubmitApi } from '#/api/erp/finance/revenue/submit';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteCollectionSubmit,
  ensureDimensionForCollectionSubmit,
  ensureVoucherForCollectionSubmit,
  getCollectionSubmitPage,
  updateCollectionSubmitStatus,
} from '#/api/erp/finance/revenue/submit';
import {
  getIncomeSettlementPage,
  updateIncomeSettlement,
} from '#/api/erp/finance/revenue/settlement';
import {
  getSubmitWriteOffList,
  updateSubmitWriteOffStatus,
} from '#/api/erp/finance/revenue/writeoff';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getSimpleUserList } from '#/api/system/user';
import type { Department } from '#/api/common/staff-selector';
import { getDepartmentList } from '#/api/common/staff-selector';
import { $t } from '#/locales';

import { formatDateOnly } from '#/utils/date';

import { getSettlementProjectSimpleList } from '#/api/erp/finance/revenue/settlement/project';

import { useGridColumns, useGridFormSchema } from '#/views/finance/revenue/submit/data';
import Form from '#/views/finance/revenue/submit/modules/form.vue';

import {
  ElLoading,
  ElMessage,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ErpCollectionSubmit' });

const customerOptions = ref<any[]>([]);
const userOptions = ref<any[]>([]);
const projectOptions = ref<any[]>([]);
const deptOptions = ref<Department[]>([]);

onMounted(async () => {
  customerOptions.value = await getCustomerSimpleList();
  userOptions.value = await getSimpleUserList();
  projectOptions.value = await getSettlementProjectSimpleList();
  deptOptions.value = await getDepartmentList();
});

const checkedIds = ref<string[]>([]);
function handleRowCheckboxChange({ records }: { records: any[] }) {
  checkedIds.value = records.map((item) => item.rowid);
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function handleRefresh() {
  gridApi.query();
}

function handleCreate(incomeType: string) {
  formModalApi.setData({ type: 'create', income_type: incomeType }).open();
}

function handleEdit(row: ErpCollectionSubmitApi.CollectionSubmit) {
  formModalApi.setData({ type: 'edit', rowid: row.rowid }).open();
}

function handleDetail(row: ErpCollectionSubmitApi.CollectionSubmit) {
  formModalApi.setData({ type: 'detail', rowid: row.rowid }).open();
}

async function handleDelete(ids: string[]) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting'),
  });
  try {
    await deleteCollectionSubmit(ids);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function syncSettlementAfterSubmitConfirmed(submitRow: any) {
  const writeOffs = await getSubmitWriteOffList({
    submit_id: submitRow.rowid,
    write_off_type: 0,
  });
  const pendingWriteOffs = (writeOffs || []).filter(
    (item: any) => Number(item?.write_off_status ?? 0) !== 1,
  );

  const settlementIds = Array.from(
    new Set(
      pendingWriteOffs
        .map((item: any) => String(item?.settlement_id || '').trim())
        .filter(Boolean),
    ),
  );

  if (settlementIds.length === 0) return;

  const linkedRes: any = await getIncomeSettlementPage({
    rowids: settlementIds,
    pageNo: 1,
    page: 1000,
  });
  const linkedItems: any[] = linkedRes?.list || [];

  const amountMap = new Map<string, number>();
  pendingWriteOffs.forEach((item: any) => {
    const key = String(item?.settlement_id || '').trim();
    if (!key) return;
    const prev = amountMap.get(key) || 0;
    amountMap.set(key, moneyNumber(addMoney([prev, item?.write_off_amount])));
  });

  await Promise.all(
    linkedItems.map(async (item: any) => {
      const key = String(item?.rowid || '').trim();
      const confirmedAmount = amountMap.get(key) || 0;
      if (confirmedAmount <= 0) return;
      const totalAmount = toNumber(item?.total_amount, 0);
      const oldReceived = toNumber(item?.receive_amount, 0);
      const oldBalanceRaw = item?.receive_balance;
      const oldBalance =
        oldBalanceRaw === undefined || oldBalanceRaw === null || oldBalanceRaw === ''
          ? totalAmount
          : toNumber(oldBalanceRaw, totalAmount);
      const newReceived = moneyNumber(addMoney([oldReceived, confirmedAmount]));
      const newBalance = Math.max(moneyNumber(subMoney(oldBalance, confirmedAmount)), 0);
      const nextStatus = newBalance <= 0 ? 30 : 25;

      await updateIncomeSettlement({
        rowid: item.rowid,
        receive_amount: newReceived,
        receive_balance: newBalance,
        status: nextStatus,
      } as any);
    }),
  );

  await updateSubmitWriteOffStatus(
    pendingWriteOffs.map((item: any) => ({
      id: String(item?.id || item?.rowid || ''),
      write_off_status: 1,
    })),
    0,
  );
}

async function handleUpdateStatus(row: any, status: number) {
  const loadingInstance = ElLoading.service({
    text:
      status === 2
        ? '确认中，正在写入业务维度并生成财务凭证...'
        : `确定将单据状态更新为${status === 1 ? '待确认' : status === 2 ? '已确认' : '待审批'}吗？`,
  });
  try {
    if (status === 2) {
      await syncSettlementAfterSubmitConfirmed(row);
      await ensureDimensionForCollectionSubmit(row);
      await ensureVoucherForCollectionSubmit(row, {
        customerName: getCustomerName(row.customer_id),
      });
    }
    await updateCollectionSubmitStatus(row.rowid, status);
    ElMessage.success('操作成功');
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

const activeTab = ref<'all' | 'todoApprove' | 'todoConfirm' | 'done'>('all');
async function handleTabChange(name: any) {
  activeTab.value = name;
  const status =
    name === 'todoApprove'
      ? 0
      : name === 'todoConfirm'
        ? 1
        : name === 'done'
          ? 2
          : undefined;
  await gridApi.formApi.setValues({ status });
  gridApi.query();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getCollectionSubmitPage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
          });
        },
      },
    },
    rowConfig: {
      keyField: 'rowid',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions,
  gridEvents: {
    checkboxAll: handleRowCheckboxChange,
    checkboxChange: handleRowCheckboxChange,
  },
});

function getCustomerName(id: any) {
  return (
    customerOptions.value.find((c) => c.id === id || c.rowid === id)?.name || ''
  );
}
function getProjectName(id: any) {
  return projectOptions.value.find((p) => p.rowid === id)?.project_name || '';
}
function getUserName(nameOrId: any) {
  if (!nameOrId) return '';
  const byId = userOptions.value.find((u) => u.ROWID === nameOrId)?.UserName;
  return byId || nameOrId;
}
function getDeptName(id: any) {
  if (!id) return '';
  return (
    deptOptions.value.find((d) => String(d.DepID) === String(id))?.DepName || ''
  );
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />

    <div class="mb-2 flex items-center justify-between">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="待审批" name="todoApprove" />
        <el-tab-pane label="待确认" name="todoConfirm" />
        <el-tab-pane label="已确认" name="done" />
      </el-tabs>

      <TableAction
        :actions="[
          {
            label: '新增收款提报-业务收款',
            type: 'primary',
            icon: ACTION_ICON.ADD,
            onClick: () => handleCreate('业务收款'),
          },
          {
            label: '新增收款提报-预收款收款',
            type: 'primary',
            icon: ACTION_ICON.ADD,
            onClick: () => handleCreate('预收款收款'),
          },
        ]"
      />
    </div>

    <Grid table-title="收款提报列表">
      <template #date_no="{ row }">
        <div>
          <div>{{ formatDateOnly(row.createtime) || '--' }}</div>
          <div class="text-primary">{{ row.ReportID || '--' }}</div>
        </div>
      </template>

      <template #type_dept="{ row }">
        <div>
          <div class="text-primary">{{ row.income_type || '--' }}</div>
          <div>{{ getDeptName(row.depart_name) || '--' }}</div>
        </div>
      </template>

      <template #user_project="{ row }">
        <div>
          <div>{{ getUserName(row.user_name) }}</div>
          <div>{{ getProjectName(row.project_id) }}</div>
        </div>
      </template>

      <template #customer_account="{ row }">
        <div>
          <div class="text-primary">{{ getCustomerName(row.customer_id) }}</div>
          <div>{{ row.collection_account || '--' }}</div>
        </div>
      </template>

      <template #payer_date="{ row }">
        <div>
          <div>{{ row.payer_account || '--' }}</div>
          <div>{{ formatDateOnly(row.collection_date) || '--' }}</div>
        </div>
      </template>

      <template #remark_desc="{ row }">
        <div>
          <div>{{ row.remark || '--' }}</div>
          <div class="text-muted-foreground">{{ row.description || '' }}</div>
        </div>
      </template>

      <template #status="{ row }">
        <ElTag :type="row.status === 0 ? 'warning' : row.status === 1 ? 'info' : 'success'">
          {{ row.status === 0 ? '待审批' : row.status === 1 ? '待确认' : '已确认' }}
        </ElTag>
      </template>

      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '批量删除',
              type: 'danger',
              disabled: isEmpty(checkedIds),
              icon: ACTION_ICON.DELETE,
              popConfirm: {
                title: `是否删除所选中数据？`,
                confirm: () => handleDelete(checkedIds),
              },
            },
          ]"
        />
      </template>

      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: $t('common.detail'),
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              onClick: () => handleDetail(row),
            },
            {
              label: $t('common.edit'),
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              onClick: () => handleEdit(row),
            },
            {
              label: Number(row?.status ?? 0) === 0 ? '审批' : '反审批',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.AUDIT,
              ifShow: Number(row?.status ?? 0) !== 2,
              popConfirm: {
                title: `确认${Number(row?.status ?? 0) === 0 ? '审批' : '反审批'}${row.ReportID || '该单据'}吗？`,
                confirm: () => handleUpdateStatus(row, Number(row?.status ?? 0) === 0 ? 1 : 0),
              },
            },
            {
              label: '确认',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.AUDIT,
              ifShow: Number(row?.status ?? 0) === 1,
              popConfirm: {
                title: `确认将单据更新为已确认吗？`,
                confirm: () => handleUpdateStatus(row, 2),
              },
            },
            {
              label: $t('common.delete'),
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [row.ReportID || '该单据']),
                confirm: () => handleDelete([row.rowid]),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
