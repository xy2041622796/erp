<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpInventoryCostAdjustApi } from '#/api/erp/inventory-accounting/adjust';

import { computed, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createInventoryCostAdjust,
  deleteInventoryCostAdjust,
  getInventoryCostAdjustPage,
  updateInventoryCostAdjust,
  updateInventoryCostAdjustStatus,
} from '#/api/erp/inventory-accounting/adjust';
import { $t } from '#/locales';

import { useGridColumns, useGridFormSchema } from './data';

import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ErpInventoryCostAdjustList' });

const dialogVisible = ref(false);
const editId = ref('');
const form = reactive<ErpInventoryCostAdjustApi.CostAdjustRow>({
  adjust_date: '',
  product_name: '',
  warehouse_name: '',
  before_count: 0,
  before_amount: 0,
  adjust_amount: 0,
  reason: '',
  remark: '',
});

const beforeUnitCost = computed(() => {
  const count = Number(form.before_count || 0);
  if (count === 0) return 0;
  return Number((Number(form.before_amount || 0) / count).toFixed(6));
});
const afterAmount = computed(() => Number((Number(form.before_amount || 0) + Number(form.adjust_amount || 0)).toFixed(2)));
const afterUnitCost = computed(() => {
  const count = Number(form.before_count || 0);
  if (count === 0) return 0;
  return Number((afterAmount.value / count).toFixed(6));
});

function resetForm() {
  editId.value = '';
  Object.assign(form, {
    id: '',
    adjust_date: '',
    product_name: '',
    warehouse_name: '',
    before_count: 0,
    before_amount: 0,
    adjust_amount: 0,
    reason: '',
    remark: '',
  });
}

function handleCreate() {
  resetForm();
  dialogVisible.value = true;
}

function handleEdit(row: ErpInventoryCostAdjustApi.CostAdjustRow) {
  editId.value = String(row.id || '');
  Object.assign(form, {
    id: row.id || '',
    adjust_date: row.adjust_date || '',
    product_name: row.product_name || '',
    warehouse_name: row.warehouse_name || '',
    before_count: Number(row.before_count || 0),
    before_amount: Number(row.before_amount || 0),
    adjust_amount: Number(row.adjust_amount || 0),
    reason: row.reason || '',
    remark: row.remark || '',
  });
  dialogVisible.value = true;
}

async function handleSubmit() {
  if (!form.adjust_date) return ElMessage.warning('请选择调整日期');
  if (!form.product_name) return ElMessage.warning('请输入商品名称');
  if (!form.warehouse_name) return ElMessage.warning('请输入仓库名称');
  const payload = {
    ...form,
    id: editId.value || form.id,
    before_unit_cost: beforeUnitCost.value,
    after_amount: afterAmount.value,
    after_unit_cost: afterUnitCost.value,
  };
  if (editId.value) await updateInventoryCostAdjust(payload);
  else await createInventoryCostAdjust(payload);
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  gridApi.query();
}

async function handleUpdateStatus(row: ErpInventoryCostAdjustApi.CostAdjustRow) {
  await updateInventoryCostAdjustStatus(String(row.id || ''), Number(row.status || 10) === 10 ? 20 : 10);
  ElMessage.success(Number(row.status || 10) === 10 ? '审批成功' : '反审批成功');
  gridApi.query();
}

async function handleDelete(row: ErpInventoryCostAdjustApi.CostAdjustRow) {
  await deleteInventoryCostAdjust(String(row.id || ''));
  ElMessage.success($t('ui.actionMessage.deleteSuccess'));
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
          const res = await getInventoryCostAdjustPage({ pageNo: page.currentPage, page: page.pageSize || page.page || 10, ...formValues });
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
    <Grid table-title="成本调整单列表">
      <template #toolbar-tools>
        <TableAction :actions="[{ label: $t('ui.actionTitle.create', ['成本调整单']), type: 'primary', icon: ACTION_ICON.ADD, onClick: handleCreate }]" />
      </template>
      <template #status="{ row }">
        <ElTag :type="Number(row.status || 10) === 20 ? 'success' : 'warning'">{{ Number(row.status || 10) === 20 ? '已审批' : '草稿' }}</ElTag>
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            { label: $t('common.edit'), type: 'primary', link: true, icon: ACTION_ICON.EDIT, disabled: Number(row.status || 10) === 20, onClick: () => handleEdit(row) },
            { label: Number(row.status || 10) === 10 ? '审批' : '反审批', type: 'primary', link: true, icon: ACTION_ICON.AUDIT, popConfirm: { title: `确认${Number(row.status || 10) === 10 ? '审批' : '反审批'}该成本调整单吗？`, confirm: () => handleUpdateStatus(row) } },
            { label: $t('common.delete'), type: 'danger', link: true, icon: ACTION_ICON.DELETE, disabled: Number(row.status || 10) === 20, popConfirm: { title: '确认删除该成本调整单吗？', confirm: () => handleDelete(row) } },
          ]"
        />
      </template>
    </Grid>

    <ElDialog v-model="dialogVisible" :title="editId ? '编辑成本调整单' : '新增成本调整单'" width="760px" :close-on-click-modal="false">
      <ElForm :model="form" label-width="130px" class="grid grid-cols-2 gap-x-6">
        <ElFormItem label="调整日期" required>
          <ElDatePicker v-model="form.adjust_date" type="date" value-format="YYYY-MM-DD" placeholder="请选择调整日期" class="!w-full" />
        </ElFormItem>
        <ElFormItem label="商品名称" required><ElInput v-model="form.product_name" placeholder="请输入商品名称" /></ElFormItem>
        <ElFormItem label="仓库名称" required><ElInput v-model="form.warehouse_name" placeholder="请输入仓库名称" /></ElFormItem>
        <ElFormItem label="调整前数量"><ElInputNumber v-model="form.before_count" :precision="3" class="!w-full" /></ElFormItem>
        <ElFormItem label="调整前金额"><ElInputNumber v-model="form.before_amount" :precision="2" class="!w-full" /></ElFormItem>
        <ElFormItem label="调整前单位成本"><ElInputNumber :model-value="beforeUnitCost" :precision="6" disabled class="!w-full" /></ElFormItem>
        <ElFormItem label="调整金额"><ElInputNumber v-model="form.adjust_amount" :precision="2" class="!w-full" /></ElFormItem>
        <ElFormItem label="调整后金额"><ElInputNumber :model-value="afterAmount" :precision="2" disabled class="!w-full" /></ElFormItem>
        <ElFormItem label="调整后单位成本"><ElInputNumber :model-value="afterUnitCost" :precision="6" disabled class="!w-full" /></ElFormItem>
        <ElFormItem label="调整原因"><ElInput v-model="form.reason" placeholder="请输入调整原因" /></ElFormItem>
        <ElFormItem label="备注" class="col-span-2"><ElInput v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" /></ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">保存</ElButton>
      </template>
    </ElDialog>
  </Page>
</template>
