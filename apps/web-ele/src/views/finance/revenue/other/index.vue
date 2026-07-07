<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpOtherIncomeApi } from '#/api/erp/finance/revenue/other';
import type { OtherIncomePrintData } from '#/views/finance/print-templates/other-income';

import { nextTick, onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteOtherIncome,
  getOtherIncome,
  getOtherIncomePage,
  updateOtherIncomeStatus,
} from '#/api/erp/finance/revenue/other';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getSimpleUserList } from '#/api/system/user';
import type { Department } from '#/api/common/staff-selector';
import { getDepartmentList } from '#/api/common/staff-selector';
import { $t } from '#/locales';

import { formatDateOnly } from '#/utils/date';

import { getOtherIncomeProjectSimpleList } from '#/api/erp/finance/revenue/other/project';
import { buildOtherIncomePrintHtml } from '#/views/finance/print-templates/other-income';

import { useGridColumns, useGridFormSchema } from '#/views/finance/revenue/other/data';
import Form from '#/views/finance/revenue/other/modules/form.vue';

import {
  ElLoading,
  ElMessage,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ErpRevenueOtherIncome' });

const customerOptions = ref<any[]>([]);
const userOptions = ref<any[]>([]);
const projectOptions = ref<any[]>([]);
const deptOptions = ref<Department[]>([]);
const printLoading = ref(false);
const printFrameRef = ref<HTMLIFrameElement>();

onMounted(async () => {
  customerOptions.value = await getCustomerSimpleList();
  userOptions.value = await getSimpleUserList();
  projectOptions.value = await getOtherIncomeProjectSimpleList();
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

function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: ErpOtherIncomeApi.OtherIncome) {
  formModalApi.setData({ type: 'edit', rowid: row.rowid }).open();
}

function handleDetail(row: ErpOtherIncomeApi.OtherIncome) {
  formModalApi.setData({ type: 'detail', rowid: row.rowid }).open();
}

async function handleDelete(ids: string[]) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting'),
  });
  try {
    await deleteOtherIncome(ids);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

async function handleUpdateStatus(row: any, status: number) {
  const loadingInstance = ElLoading.service({
    text: `确定${status === 20 ? '审批' : status === 30 ? '完成' : '反审批'}该单据吗？`,
  });
  try {
    await updateOtherIncomeStatus(row.rowid, status);
    ElMessage.success('操作成功');
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

const activeTab = ref<'all' | 'todoApprove' | 'todoReceive' | 'done'>('all');
async function handleTabChange(name: any) {
  activeTab.value = name;
  const status =
    name === 'todoApprove'
      ? 10
      : name === 'todoReceive'
        ? 20
        : name === 'done'
          ? 30
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
          return await getOtherIncomePage({
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
  return customerOptions.value.find((c) => String(c.id) === String(id))?.name || '';
}
function getProjectName(id: any) {
  return projectOptions.value.find((p) => p.rowid === id)?.project_name || '';
}
function getUserName(id: any) {
  return userOptions.value.find((u) => u.ROWID === id)?.UserName || '';
}
function getDeptName(id: any) {
  if (!id) return '';
  return deptOptions.value.find((d) => String(d.DepID) === String(id))?.DepName || '';
}

async function printHtml(html: string) {
  await nextTick();
  const iframe = printFrameRef.value;
  const win = iframe?.contentWindow;
  const doc = iframe?.contentDocument || win?.document;
  if (!iframe || !win || !doc) {
    ElMessage.error('打印容器初始化失败');
    return;
  }

  printLoading.value = true;
  doc.open();
  doc.write(html);
  doc.close();

  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      printLoading.value = false;
    }
  }, 120);
}

function mapPrintData(main: any): OtherIncomePrintData {
  return {
    id: String(main.rowid ?? ''),
    settlementNo: String(main.settlement_no ?? ''),
    settlementDate: formatDateOnly(main.settlement_date) || '',
    customerName: getCustomerName(main.customer_id),
    projectName: getProjectName(main.project_id),
    salesmanName: getUserName(main.salesman_id),
    departmentName: getDeptName(main.depart_id),
    receiveAccount: String(main.receive_account ?? ''),
    totalAmount: Number(main.total_amount ?? 0),
    receiveAmount: Number(main.receive_amount ?? 0),
    receiveBalance: Number(main.receive_balance ?? 0),
    remark: String(main.remark ?? ''),
    reviewer: String(main.reviewer ?? ''),
    cashier: String(main.cashier ?? ''),
    maker: String(main.operator ?? main.createuser ?? main.updateuser ?? ''),
    details: (main.details || []).map((d: any) => ({
      summary: String(d.description ?? d.abstract_content ?? ''),
      itemName: String(d.payment_type ?? ''),
      amount: Number(d.verification_amount ?? d.business_doc_amount ?? 0),
      remark: String(d.remark ?? ''),
    })),
  };
}

async function handlePrint(ids: string[]) {
  const validIds = Array.from(new Set(ids.map((id) => String(id ?? '').trim()).filter(Boolean)));
  if (validIds.length === 0) {
    ElMessage.warning('请先选择需要打印的单据');
    return;
  }
  const list = await Promise.all(validIds.map((id) => getOtherIncome(id)));
  const printList = list.filter(Boolean).map((item) => mapPrintData(item));
  if (printList.length === 0) {
    ElMessage.warning('未找到可打印数据');
    return;
  }
  await printHtml(buildOtherIncomePrintHtml(printList));
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />

    <div class="mb-2 flex items-center justify-between">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="待审批" name="todoApprove" />
        <el-tab-pane label="待收款" name="todoReceive" />
        <el-tab-pane label="已完成" name="done" />
      </el-tabs>

      <TableAction
        :actions="[
          {
            label: '新增其他收入',
            type: 'primary',
            icon: ACTION_ICON.ADD,
            onClick: handleCreate,
          },
          {
            label: '打印选中',
            type: 'primary',
            icon: ACTION_ICON.PRINT,
            disabled: isEmpty(checkedIds),
            loading: printLoading,
            onClick: () => handlePrint(checkedIds),
          },
        ]"
      />
    </div>

    <Grid table-title="其他收入列表">
      <template #date_no="{ row }">
        <div>
          <div>{{ formatDateOnly(row.settlement_date) || '--' }}</div>
          <div class="text-primary">{{ row.settlement_no || '--' }}</div>
        </div>
      </template>

      <template #customer_project="{ row }">
        <div>
          <div class="text-primary">{{ getCustomerName(row.customer_id) }}</div>
          <div>{{ getProjectName(row.project_id) }}</div>
        </div>
      </template>

      <template #sales_dept="{ row }">
        <div>
          <div>{{ getUserName(row.salesman_id) }}</div>
          <div>{{ getDeptName(row.depart_id) }}</div>
        </div>
      </template>

      <template #receive="{ row }">
        <div>
          <div>{{ row.receive_amount ?? '--' }}</div>
          <div>{{ row.receive_balance ?? '--' }}</div>
        </div>
      </template>

      <template #status="{ row }">
        <ElTag :type="row.status === 10 ? 'warning' : row.status === 20 ? 'info' : 'success'">
          {{ row.status === 10 ? '待审批' : row.status === 20 ? '待收款' : '已完成' }}
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
              label: '打印',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.PRINT,
              onClick: () => handlePrint([row.rowid]),
            },
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
              label: '审批',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.AUDIT,
              popConfirm: {
                title: `确认审批${row.settlement_no || ''}吗？`,
                confirm: () => handleUpdateStatus(row, 20),
              },
            },
            {
              label: '完成',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.BOOK,
              popConfirm: {
                title: `确认完成${row.settlement_no || ''}吗？`,
                confirm: () => handleUpdateStatus(row, 30),
              },
            },
            {
              label: $t('common.delete'),
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              popConfirm: {
                title: `是否删除${row.settlement_no || ''}？`,
                confirm: () => handleDelete([row.rowid]),
              },
            },
          ]"
        />
      </template>
    </Grid>

    <iframe ref="printFrameRef" class="print-frame"></iframe>
  </Page>
</template>

<style scoped>
.print-frame {
  position: fixed;
  right: 100%;
  bottom: 100%;
  width: 0;
  height: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}
</style>
