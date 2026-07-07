<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpInventoryInboundAdjustApi } from '#/api/erp/inventory-accounting/inbound-adjust';

import { reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { createInventoryInboundAdjust, getInventoryInboundAdjustPage, updateInventoryInboundAdjustStatus } from '#/api/erp/inventory-accounting/inbound-adjust';

import { useGridColumns, useGridFormSchema } from './data';

import { ElButton, ElDatePicker, ElDialog, ElForm, ElFormItem, ElInput, ElInputNumber, ElMessage, ElSelect, ElOption, ElTag } from 'element-plus';

defineOptions({ name: 'ErpInventoryInboundCostAdjust' });

const dialogVisible = ref(false);
const form = reactive<ErpInventoryInboundAdjustApi.InboundAdjustRow>({
  adjust_date: '',
  source_no: '',
  product_name: '',
  warehouse_name: '',
  original_count: 0,
  original_amount: 0,
  adjust_amount: 0,
  allocation_method: '按金额',
  remark: '',
});

function resetForm() {
  Object.assign(form, { adjust_date: '', source_no: '', product_name: '', warehouse_name: '', original_count: 0, original_amount: 0, adjust_amount: 0, allocation_method: '按金额', remark: '' });
}

function handleCreate() {
  resetForm();
  dialogVisible.value = true;
}

async function handleSubmit() {
  if (!form.adjust_date) return ElMessage.warning('请选择调整日期');
  if (!form.source_no) return ElMessage.warning('请输入来源入库单');
  await createInventoryInboundAdjust({ ...form });
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  gridApi.query();
}

async function handleUpdateStatus(row: ErpInventoryInboundAdjustApi.InboundAdjustRow) {
  await updateInventoryInboundAdjustStatus(String(row.id || ''), Number(row.status || 10) === 10 ? 20 : 10);
  ElMessage.success(Number(row.status || 10) === 10 ? '审批成功' : '反审批成功');
  gridApi.query();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getInventoryInboundAdjustPage({ pageNo: page.currentPage, page: page.pageSize || page.page || 10, ...formValues });
          return { items: res.list || [], total: res.total || 0 };
        },
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: true, custom: true },
  } as VxeTableGridOptions,
});
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="入库成本调整">
      <template #toolbar-tools>
        <TableAction :actions="[{ label: '新增入库成本调整', type: 'primary', icon: ACTION_ICON.ADD, onClick: handleCreate }]" />
      </template>
      <template #status="{ row }">
        <ElTag :type="Number(row.status || 10) === 20 ? 'success' : 'warning'">{{ Number(row.status || 10) === 20 ? '已审批' : '草稿' }}</ElTag>
      </template>
      <template #actions="{ row }">
        <TableAction :actions="[{ label: Number(row.status || 10) === 10 ? '审批' : '反审批', type: 'primary', link: true, icon: ACTION_ICON.AUDIT, popConfirm: { title: `确认${Number(row.status || 10) === 10 ? '审批' : '反审批'}该入库成本调整吗？`, confirm: () => handleUpdateStatus(row) } }]" />
      </template>
    </Grid>

    <ElDialog v-model="dialogVisible" title="新增入库成本调整" width="760px" :close-on-click-modal="false">
      <ElForm :model="form" label-width="130px" class="grid grid-cols-2 gap-x-6">
        <ElFormItem label="调整日期" required><ElDatePicker v-model="form.adjust_date" type="date" value-format="YYYY-MM-DD" class="!w-full" /></ElFormItem>
        <ElFormItem label="来源入库单" required><ElInput v-model="form.source_no" placeholder="请输入来源入库单" /></ElFormItem>
        <ElFormItem label="商品名称"><ElInput v-model="form.product_name" placeholder="请输入商品名称" /></ElFormItem>
        <ElFormItem label="仓库"><ElInput v-model="form.warehouse_name" placeholder="请输入仓库" /></ElFormItem>
        <ElFormItem label="原入库数量"><ElInputNumber v-model="form.original_count" :precision="3" class="!w-full" /></ElFormItem>
        <ElFormItem label="原入库金额"><ElInputNumber v-model="form.original_amount" :precision="2" class="!w-full" /></ElFormItem>
        <ElFormItem label="调整金额"><ElInputNumber v-model="form.adjust_amount" :precision="2" class="!w-full" /></ElFormItem>
        <ElFormItem label="分摊方式"><ElSelect v-model="form.allocation_method" class="!w-full"><ElOption label="按金额" value="按金额" /><ElOption label="按数量" value="按数量" /></ElSelect></ElFormItem>
        <ElFormItem label="备注" class="col-span-2"><ElInput v-model="form.remark" type="textarea" :rows="3" /></ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">保存</ElButton>
      </template>
    </ElDialog>
  </Page>
</template>
