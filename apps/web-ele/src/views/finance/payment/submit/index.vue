<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpPaymentApplyApi } from '#/api/erp/finance/payment/submit';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  confirmExpenseSettlementsByPaymentApply,
  deletePaymentApply,
  ensureVoucherForPaymentApply,
  getPaymentApplyPage,
  updatePaymentApplyStatus,
} from '#/api/erp/finance/payment/submit';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getSimpleUserList } from '#/api/system/user';
import type { Department } from '#/api/common/staff-selector';
import { getDepartmentList } from '#/api/common/staff-selector';
import { getOtherExpenseProjectSimpleList } from '#/api/erp/finance/payment/other/project';
import { $t } from '#/locales';

import { formatDateOnly } from '#/utils/date';

import { useGridColumns, useGridFormSchema } from '#/views/finance/payment/submit/data';
import Form from '#/views/finance/payment/submit/modules/form.vue';

import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElLoading,
  ElMessage,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ErpPaymentApply' });

const customerOptions = ref<any[]>([]);
const userOptions = ref<any[]>([]);
const projectOptions = ref<any[]>([]);
const deptOptions = ref<Department[]>([]);

onMounted(async () => {
  customerOptions.value = await getCustomerSimpleList();
  userOptions.value = await getSimpleUserList();
  projectOptions.value = await getOtherExpenseProjectSimpleList();
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

const paymentTypes = [
  '交押金/保证金',
  '员工借支',
  '预付款',
  '借出款',
  '退回预收款',
  '业务付款',
  '直接付款',
  '工资付款',
];

function handleRefresh() {
  gridApi.query();
}

function handleTypeCommand(paymentType: string) {
  formModalApi.setData({ type: 'create', paymentType }).open();
}

function handleEdit(row: ErpPaymentApplyApi.PaymentApply) {
  formModalApi.setData({ type: 'edit', rowid: row.rowid, paymentType: row.payment_type }).open();
}

function handleDetail(row: ErpPaymentApplyApi.PaymentApply) {
  formModalApi.setData({ type: 'detail', rowid: row.rowid, paymentType: row.payment_type }).open();
}

async function handleDelete(ids: string[]) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting'),
  });
  try {
    await deletePaymentApply(ids);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

async function handleUpdateStatus(row: any, status: number) {
  const loadingInstance = ElLoading.service({
    text: status === 2 ? '确认中...' : `确定将单据状态更新为${status === 1 ? '待确认' : status === 2 ? '已确认' : '待审批'}吗？`,
  });
  try {
    if (status === 2) {
      await confirmExpenseSettlementsByPaymentApply(row.rowid);
      await updatePaymentApplyStatus(row.rowid, status);
      try {
        await ensureVoucherForPaymentApply(row);
        ElMessage.success('操作成功，已生成财务凭证');
      } catch (error: any) {
        console.error('ensure voucher for payment apply failed', error);
        ElMessage.warning(error?.message || '付款申请已确认，但财务凭证生成失败');
      }
    } else {
      await updatePaymentApplyStatus(row.rowid, status);
      ElMessage.success('操作成功');
    }
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
          return await getPaymentApplyPage({
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
  return customerOptions.value.find((c) => c.id === id || c.rowid === id)?.name || '';
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
  return deptOptions.value.find((d) => String(d.DepID) === String(id))?.DepName || '';
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

      <ElDropdown @command="handleTypeCommand">
        <ElButton type="primary">
          <span :class="ACTION_ICON.ADD" class="mr-1"></span>
          新增支出申请
        </ElButton>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem
              v-for="item in paymentTypes"
              :key="item"
              :command="item"
            >
              {{ item }}
            </ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
    </div>

    <Grid table-title="支出申请列表">
      <template #date_no="{ row }">
        <div>
          <div>
            {{ formatDateOnly(row.apply_date || row.createtime) || '--' }}
          </div>
          <div class="text-primary">
            {{ row.apply_no || row.ReportID || '--' }}
          </div>
        </div>
      </template>

      <template #user_dept="{ row }">
        <div>
          <div>{{ getUserName(row.applicant_name) }}</div>
          <div>{{ getDeptName(row.apply_depart) || '--' }}</div>
        </div>
      </template>

      <template #customer="{ row }">
        <div class="text-primary">{{ getCustomerName(row.customer_id) }}</div>
      </template>

      <template #type_project="{ row }">
        <div>
          <div class="text-primary">{{ row.payment_type || '--' }}</div>
          <div>{{ getProjectName(row.project_id) }}</div>
        </div>
      </template>

      <template #purpose_payee="{ row }">
        <div>
          <div>{{ row.payment_purpose || '--' }}</div>
          <div class="text-muted-foreground">{{ row.payee_name || '--' }}</div>
        </div>
      </template>

      <template #status="{ row }">
        <ElTag
          :type="row.status === 0 ? 'warning' : row.status === 1 ? 'info' : 'success'"
        >
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
              label: '确认',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.AUDIT,
              ifShow: Number(row?.status ?? 0) !== 2,
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
                title: $t('ui.actionMessage.deleteConfirm', [row.apply_no || '该单据']),
                confirm: () => handleDelete([row.rowid]),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
