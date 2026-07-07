<script lang="ts" setup>
import { moneyText } from '#/utils/finance/decimal-money';
import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCustomerSimpleList } from '#/api/erp/customer';
//
import {
  getInvoiceApplyPage,
  updateInvoiceApplyBase,
} from '#/api/erp/finance/bill/invoice';
import {
  deleteInvoiceInfo,
  getInvoiceInfoPage,
} from '#/api/erp/finance/bill/sales';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import {
  useApplyGridColumns,
  useApplyGridFormSchema,
  useGridColumns,
  useGridFormSchema,
} from '#/views/finance/bill/sales/data';
import Form from '#/views/finance/bill/sales/modules/form.vue';

import {
  ElLoading,
  ElMessage,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinanceInvoiceInfo' });

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const activeTab = ref<'done' | 'todoInvoice'>('todoInvoice');
const currentApplyRow = ref<any>(null);

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  currentApplyRow.value = null;
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: any) {
  currentApplyRow.value = null;
  formModalApi.setData({ type: 'edit', id: row.rowid }).open();
}

function handleDetail(row: any) {
  formModalApi.setData({ type: 'detail', id: row.rowid }).open();
}

// 从申请单生成发票
function handleToInvoice(row: any) {
  currentApplyRow.value = row;
  formModalApi
    .setData({
      type: 'create',
      defaultValues: {
        id: row.rowid,
        customer_id: row.customer_id,
        invoice_title: row.invoice_title,
        tax_number: row.tax_number,
        bank_name: row.bank_name,
        bank_account: row.bank_account,
        address: row.address,
        contact_phone: row.contact_phone,
        invoice_amount: row.total_amount,
        remark: row.remark,
        invoice_type: row.invoice_type,
        is_red_invoice: row.is_red_invoice,
        recipient: row.recipient,
        recipient_phone: row.recipient_phone,
        recipient_address: row.recipient_address,
      },
    })
    .open();
}

async function handleSuccess() {
  if (currentApplyRow.value) {
    try {
      await updateInvoiceApplyBase({
        rowid: currentApplyRow.value.rowid,
        status: 30,
      });
      ElMessage.success('开票申请状态已更新');
    } catch (error) {
      console.error(error);
      ElMessage.warning('开票成功，但更新申请状态失败');
    }
    currentApplyRow.value = null;
  }
  handleRefresh();
}

async function handleDelete(row: any) {
  const loading = ElLoading.service({ text: '删除中...' });
  try {
    await deleteInvoiceInfo(row.rowid);
    ElMessage.success('删除成功');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message ?? '删除失败');
  } finally {
    loading.close();
  }
}

const customerOptions = ref<any[]>([]);

onMounted(() => {
  getCustomerSimpleList().then((res) => {
    customerOptions.value = Array.isArray(res) ? res : [];
  });
});

function getCustomerName(id: any) {
  return customerOptions.value.find((c) => c.id === id)?.name || '';
}

const { dataTable, hasPermission } = useDataTablePermission();

function handleTabChange() {
  if (activeTab.value === 'todoInvoice') {
    gridApi.grid.reloadColumn(useApplyGridColumns() ?? []);
    gridApi.formApi.setState({ schema: useApplyGridFormSchema() });
  } else {
    gridApi.grid.reloadColumn(useGridColumns() ?? []);
    gridApi.formApi.setState({ schema: useGridFormSchema() });
  }
  gridApi.query();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useApplyGridFormSchema(),
  },
  gridOptions: {
    columns: useApplyGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }: any, formValues: any) => {
          if (activeTab.value === 'todoInvoice') {
            const res = await getInvoiceApplyPage({
              pageNo: page.currentPage,
              page: page.page,
              status: 20,
              ...formValues,
            });
            dataTable.value = res.dataTable;
            return res;
          } else {
            const res = await getInvoiceInfoPage({
              pageNo: page.currentPage,
              page: page.page,
              ...formValues,
              is_seller_invoice: 1,
            });
            dataTable.value = res.dataTable;
            return res;
          }
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
  },
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleSuccess" />

    <div class="mb-2 flex items-center justify-between">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="待开票" name="todoInvoice" />
        <el-tab-pane label="待移交" name="pendingHandover" />
        <el-tab-pane label="已开票" name="done" />
      </el-tabs>

      <!-- <TableAction
        :actions="[
          {
            label: '新增开票信息',
            type: 'primary',
            icon: ACTION_ICON.ADD,
            ifShow: hasPermission('data:add') && activeTab === 'done',
            onClick: handleCreate,
          },
        ]"
      /> -->
    </div>

    <Grid table-title="开票信息列表">
      <template #apply_date_no="{ row = {} } = {}">
        <div class="flex flex-col">
          <span>{{ row.apply_date }}</span>
          <span class="cursor-pointer text-xs text-primary">{{
            row.invoice_apply_no
          }}</span>
        </div>
      </template>

      <template #applicant_department="{ row = {} } = {}">
        <div class="flex flex-col">
          <span>{{ row.applicant }}</span>
          <span class="text-xs text-gray-500">{{ row.department }}</span>
        </div>
      </template>

      <template #customer_title="{ row = {} } = {}">
        <div class="flex flex-col">
          <div class="flex items-center gap-1">
            <span>{{ getCustomerName(row.customer_id) }}</span>
            <ElTag v-if="row.invoice_type" size="small" effect="plain">
              {{ row.invoice_type }}
            </ElTag>
          </div>
          <span class="text-xs text-gray-500">{{ row.invoice_title }}</span>
        </div>
      </template>

      <template #amount_tax="{ row = {} } = {}">
        <div class="flex flex-col text-right">
          <span>{{ moneyText(row.total_amount || 0) }}</span>
          <span class="text-xs text-gray-400"
            >{{ row.tax_rate === 0 ? '免税' : `${row.tax_rate}%` }}
          </span>
        </div>
      </template>

      <!-- 已开票 tab 的插槽 -->
      <template #invoice_number="{ row = {} } = {}">
        <div class="flex flex-col">
          <div class="flex items-center gap-1">
            <span class="cursor-pointer text-primary">{{
              row.invoice_number
            }}</span>
            <ElTag v-if="row.invoice_type" size="small" effect="plain">
              {{ row.invoice_type }}
            </ElTag>
          </div>
          <span class="text-xs text-gray-500">{{ row.seller_company_id }}</span>
        </div>
      </template>

      <template #customer_title_invoice="{ row = {} } = {}">
        <div class="flex flex-col">
          <span>{{ getCustomerName(row.customer_id) }}</span>
          <span class="text-xs text-gray-500">{{ row.invoice_title }}</span>
        </div>
      </template>

      <template #invoice_info="{ row = {} } = {}">
        <div class="flex flex-col text-right">
          <span>{{ moneyText(row.invoice_amount || 0) }}</span>
          <span class="text-xs text-gray-400">{{
            moneyText(row.tax_amount || 0)
          }}</span>
        </div>
      </template>

      <template #status="{ row = {} } = {}">
        <ElTag
          :type="
            row.status === 10
              ? 'warning'
              : row.status === 20
                ? 'info'
                : row.status === 30
                  ? 'success'
                  : undefined
          "
        >
          {{
            row.status === 10
              ? '待审批'
              : row.status === 20
                ? '待开票'
                : row.status === 30
                  ? '已开票'
                  : (row.status ?? '--')
          }}
        </ElTag>
      </template>

      <template #customer_id="{ row = {} } = {}">
        {{ getCustomerName(row.customer_id) }}
      </template>

      <template #actions="{ row = {} } = {}">
        <TableAction
          v-if="activeTab === 'todoInvoice'"
          :actions="[
            {
              label: '开票',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              ifShow: hasPermission('data:add'),
              onClick: () => handleToInvoice(row),
            },
          ]"
        />
        <TableAction
          v-else
          :actions="[
            {
              label: '详情',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              ifShow: hasPermission('row:view', row.rowid),
              onClick: () => handleDetail(row),
            },
            {
              label: '编辑',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              ifShow: hasPermission('row:edit', row.rowid),
              onClick: () => handleEdit(row),
            },
            {
              label: '删除',
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              ifShow: hasPermission('row:delete', row.rowid),
              popConfirm: {
                title: '确认删除？',
                confirm: () => handleDelete(row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
