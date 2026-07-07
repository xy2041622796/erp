<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';


import CustomerName from '#/components/customer-selector/CustomerName.vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createInvoiceApplication,
  getInvoicePage,
  getOurContractOptions,
} from '#/api/erp/contract/execution/original';

import { useGridColumns, useGridFormSchema } from './data';

import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
  ElTag,
} from 'element-plus';

const contractOptions = ref<any[]>([]);
const pageRows = ref<any[]>([]);
const selectedInvoice = ref<any>(null);
const formData = ref({
  amount: 0,
  contract_id: '',
  invoice_type: 'normal',
  notes: '',
  tax_rate: 6,
});
const taxAmount = computed(() =>
  Number(((Number(formData.value.amount) || 0) * (Number(formData.value.tax_rate) || 0) / 100).toFixed(2)),
);
const totalWithTax = computed(() => Number((Number(formData.value.amount || 0) + taxAmount.value).toFixed(2)));

const [FormModal, formModalApi] = useVbenModal({
  async onOpenChange(open) {
    if (open) contractOptions.value = await getOurContractOptions(0);
  },
});
const [DetailModal, detailModalApi] = useVbenModal();

const invoiceSummary = computed(() => {
  const rows = pageRows.value;
  const amount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return {
    amount,
    approved: rows.filter((row) => row.status === 'approved').length,
    invoiced: rows.filter((row) => row.status === 'invoiced').length,
    pending: rows.filter((row) => row.status === 'pending').length,
    total: rows.length,
  };
});

function resetForm() {
  formData.value = {
    amount: 0,
    contract_id: '',
    invoice_type: 'normal',
    notes: '',
    tax_rate: 6,
  };
}

function handleCreate() {
  resetForm();
  formModalApi.open();
}

function handleView(row: any) {
  selectedInvoice.value = row;
  detailModalApi.open();
}

async function handleSubmit() {
  if (!formData.value.contract_id || !formData.value.amount) {
    ElMessage.warning('请选择合同并填写开票金额');
    return;
  }
  await createInvoiceApplication({ ...formData.value, tax_amount: taxAmount.value });
  ElMessage.success('开票申请提交成功');
  formModalApi.close();
  gridApi.query();
}

function formatAmount(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function getInvoiceTypeLabel(value: string) {
  if (value === 'special') return '增值税专用发票';
  if (value === 'electronic') return '电子发票';
  return '增值税普通发票';
}

function getInvoiceTypeTagType(value: string) {
  if (value === 'special') return 'danger';
  if (value === 'electronic') return 'success';
  return 'info';
}

function getStatusLabel(value: string) {
  if (value === 'approved') return '已通过';
  if (value === 'invoiced') return '已开票';
  if (value === 'rejected') return '已驳回';
  return '待审批';
}

function getStatusType(value: string) {
  if (value === 'invoiced') return 'success';
  if (value === 'approved') return 'primary';
  if (value === 'rejected') return 'danger';
  return 'warning';
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: '100%',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getInvoicePage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
          });
          pageRows.value = ((res as any)?.list ?? []) as any[];
          return res;
        },
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: false },
  } as VxeTableGridOptions<any>,
});
</script>

<template>
  <Page auto-content-height class="contract-business-page">
    <FormModal title="新建开票申请" class="w-[760px]">
      <ElForm label-width="100px">
        <ElCard class="mb-4" shadow="never">
          <template #header>关联合同</template>
          <ElFormItem label="关联合同" required>
            <ElSelect v-model="formData.contract_id" class="w-full" filterable placeholder="请选择合同">
              <ElOption
                v-for="item in contractOptions"
                :key="item.id"
                :label="`${item.contract_no || '-'} - ${item.contract_name || '-'}`"
                :value="item.id"
              />
            </ElSelect>
          </ElFormItem>
          <div class="rounded bg-blue-50 p-3 text-sm text-blue-700">
            源项目在此展示“合同金额、已开票金额、待开票金额”。当前缺少已开票汇总接口，本次不改数据逻辑。
          </div>
        </ElCard>

        <ElCard class="mb-4" shadow="never">
          <template #header>开票信息</template>
          <div class="grid grid-cols-2 gap-4">
            <ElFormItem label="发票类型" required>
              <ElSelect v-model="formData.invoice_type" class="w-full">
                <ElOption label="增值税普通发票" value="normal" />
                <ElOption label="增值税专用发票" value="special" />
                <ElOption label="电子发票" value="electronic" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="开票金额" required>
              <ElInputNumber v-model="formData.amount" :min="0" :precision="2" class="!w-full" />
            </ElFormItem>
            <ElFormItem label="税率">
              <ElInputNumber v-model="formData.tax_rate" :min="0" :precision="2" class="!w-full" />
            </ElFormItem>
            <ElFormItem label="税额">
              <ElInput :model-value="formatAmount(taxAmount)" disabled />
            </ElFormItem>
          </div>
          <ElFormItem label="开票说明">
            <ElInput v-model="formData.notes" :rows="3" type="textarea" />
          </ElFormItem>
        </ElCard>

        <ElCard shadow="never">
          <template #header>开票明细</template>
          <div class="grid grid-cols-3 gap-4 text-center text-sm">
            <div class="rounded bg-gray-50 p-3">
              <div class="text-gray-500">开票金额合计</div>
              <div class="mt-1 text-lg font-semibold">{{ formatAmount(formData.amount) }} 元</div>
            </div>
            <div class="rounded bg-gray-50 p-3">
              <div class="text-gray-500">税额合计</div>
              <div class="mt-1 text-lg font-semibold">{{ formatAmount(taxAmount) }} 元</div>
            </div>
            <div class="rounded bg-gray-50 p-3">
              <div class="text-gray-500">价税合计</div>
              <div class="mt-1 text-lg font-semibold">{{ formatAmount(totalWithTax) }} 元</div>
            </div>
          </div>
          <div class="mt-3 rounded border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
            源项目支持多条开票明细增删。当前保存接口页面逻辑只提交总金额、税率、税额，明细增删需要单独接入后再启用。
          </div>
        </ElCard>
      </ElForm>
      <template #footer>
        <ElButton @click="formModalApi.close()">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">提交申请</ElButton>
      </template>
    </FormModal>

    <DetailModal title="开票详情" class="w-[760px]">
      <ElDescriptions v-if="selectedInvoice" :column="3" border>
        <ElDescriptionsItem label="发票号码">{{ selectedInvoice.invoice_no || '待开票' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="合同编号">{{ selectedInvoice.contract_no || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="合同名称">{{ selectedInvoice.contract_name || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="客户名称">
          <CustomerName :id="selectedInvoice.client_name || selectedInvoice.contract_party_b" />
        </ElDescriptionsItem>
        <ElDescriptionsItem label="发票类型">
          <ElTag :type="getInvoiceTypeTagType(selectedInvoice.invoice_type)" effect="plain">
            {{ getInvoiceTypeLabel(selectedInvoice.invoice_type) }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="申请日期">{{ selectedInvoice.apply_date || selectedInvoice.created_at || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="开票金额">{{ formatAmount(selectedInvoice.amount) }} 元</ElDescriptionsItem>
        <ElDescriptionsItem label="税率">{{ Number(selectedInvoice.tax_rate || 0).toFixed(2) }}%</ElDescriptionsItem>
        <ElDescriptionsItem label="税额">{{ formatAmount(selectedInvoice.tax_amount) }} 元</ElDescriptionsItem>
        <ElDescriptionsItem label="状态" :span="3">
          <ElTag :type="getStatusType(selectedInvoice.status)" effect="plain">
            {{ getStatusLabel(selectedInvoice.status) }}
          </ElTag>
        </ElDescriptionsItem>
      </ElDescriptions>
      <template #footer>
        <ElButton @click="detailModalApi.close()">关闭</ElButton>
      </template>
    </DetailModal>

    <ElCard class="mb-4" shadow="never">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-lg font-semibold">开票申请</div>
          <div class="mt-1 text-sm text-gray-500">围绕合同开票申请、审批状态、开票金额与发票状态进行跟踪。</div>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-4 gap-4 text-sm">
        <div class="rounded bg-gray-50 p-3">申请总数：{{ invoiceSummary.total }}</div>
        <div class="rounded bg-yellow-50 p-3 text-yellow-700">待审批：{{ invoiceSummary.pending }}</div>
        <div class="rounded bg-blue-50 p-3 text-blue-700">已通过：{{ invoiceSummary.approved }}</div>
        <div class="rounded bg-green-50 p-3 text-green-700">已开票：{{ invoiceSummary.invoiced }}</div>
      </div>
    </ElCard>
    <div class="mb-4">
      <component :is="(gridApi as any).searchForm"></component>
    </div>
    <ElCard class="contract-list-card" shadow="never">
<Grid>
        <template #toolbar-tools>
          <TableAction
            :actions="[
              { label: '新建开票申请', type: 'primary', icon: ACTION_ICON.ADD, onClick: handleCreate },
            ]"
          />
        </template>
        <template #invoice_no="{ row }">
          <span :class="(row as any).invoice_no ? 'font-mono' : 'text-gray-400'">
            {{ (row as any).invoice_no || '待开票' }}
          </span>
        </template>
        <template #client_name="{ row }">
          <CustomerName :id="(row as any).client_name || (row as any).contract_party_b" />
        </template>
        <template #invoice_type="{ row }">
          <ElTag :type="getInvoiceTypeTagType((row as any).invoice_type)" effect="plain">
            {{ getInvoiceTypeLabel((row as any).invoice_type) }}
          </ElTag>
        </template>
        <template #amount="{ row }">{{ formatAmount((row as any).amount) }}</template>
        <template #tax_rate="{ row }">{{ Number((row as any).tax_rate || 0).toFixed(2) }}%</template>
        <template #tax_amount="{ row }">{{ formatAmount((row as any).tax_amount) }}</template>
        <template #status="{ row }">
          <ElTag :type="getStatusType((row as any).status)" effect="plain">
            {{ getStatusLabel((row as any).status) }}
          </ElTag>
        </template>
        <template #actions="{ row }">
          <TableAction
            :actions="[
              { label: '详情', type: 'primary', link: true, icon: ACTION_ICON.VIEW, onClick: () => handleView(row) },
            ]"
          />
        </template>
      </Grid>
    </ElCard>
  </Page>
</template>

<style scoped>
.contract-list-card {
  height: calc(100vh - 390px);
  min-height: 360px;
  overflow: hidden;
}

.contract-list-card :deep(.el-card__body) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding-bottom: 0;
}

.contract-list-card :deep(.vben-vxe-grid),
.contract-list-card :deep(.vxe-grid) {
  height: 100%;
  min-height: 0;
}
</style>
