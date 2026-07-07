<script lang="ts" setup>
import type { OpeningEntryCustomerApi } from '#/api/erp/basic_data/opening_entry/customer';
import type { CrmCustomerApi } from '#/api/erp/customer';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ACTION_ICON, TableAction } from '#/adapter/vxe-table';
import {
  createOpeningEntryCustomer,
  deleteOpeningEntryCustomer,
  getOpeningEntryCustomerPage,
  updateOpeningEntryCustomer,
  updateOpeningEntryCustomerStatus,
} from '#/api/erp/basic_data/opening_entry/customer';
import { CustomerPicker } from '#/components/customer-selector';
import { $t } from '#/locales';

import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElLoading,
  ElMessage,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'ErpBasicDataOpeningEntryCustomer' });

const dataTable = ref<any>(null);
const currentPage = ref(1);
const page = ref(10);
const total = ref(0);
const tableData = ref<OpeningEntryCustomerApi.Row[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const createMode = ref(true);
const currentRowId = ref<string>('');

const formData = reactive<OpeningEntryCustomerApi.Row>({
  customer_id: '',
  customer_code: '',
  customer_name: '',
  salesman_id: '',
  salesman_name: '',
  opening_receivable: 0,
  opening_prepayment: 0,
  opening_balance: 0,
  opening_date: '',
  remark: '',
});

function resetForm() {
  currentRowId.value = '';
  Object.assign(formData, {
    id: '',
    customer_id: '',
    customer_code: '',
    customer_name: '',
    salesman_id: '',
    salesman_name: '',
    opening_receivable: 0,
    opening_prepayment: 0,
    opening_balance: 0,
    opening_date: '',
    remark: '',
  });
}

function recalcBalance() {
  formData.opening_balance = Number(
    (
      Number(formData.opening_receivable || 0) -
      Number(formData.opening_prepayment || 0)
    ).toFixed(2),
  );
}

function handleCustomerPicked(customer?: CrmCustomerApi.Customer) {
  formData.customer_id = String(
    (customer as any)?.id ?? (customer as any)?.rowid ?? '',
  );
  formData.customer_code = String(
    (customer as any)?.customerCode || (customer as any)?.customer_code || '',
  );
  formData.customer_name = String(
    (customer as any)?.customerName ||
      (customer as any)?.customer_name ||
      (customer as any)?.name ||
      '',
  );
  formData.salesman_id = String(
    (customer as any)?.ownerUserId || (customer as any)?.owner_user_id || '',
  );
  formData.salesman_name = String(
    (customer as any)?.ownerUserName ||
      (customer as any)?.owner_user_name ||
      '',
  );
}

async function loadTableData() {
  loading.value = true;
  try {
    const response = await getOpeningEntryCustomerPage({
      pageNo: currentPage.value,
      page: page.value,
    });
    tableData.value = response?.list || [];
    total.value = response?.total || 0;
    dataTable.value = response?.dataTable;
  } catch (error: any) {
    ElMessage.error(error?.message || '加载客户期初数据失败');
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleCreate() {
  createMode.value = true;
  resetForm();
  dialogVisible.value = true;
}

function handleEdit(row: OpeningEntryCustomerApi.Row) {
  createMode.value = false;
  currentRowId.value = String(row.id || '');
  Object.assign(formData, {
    id: row.id || '',
    customer_id: row.customer_id || '',
    customer_code: row.customer_code || '',
    customer_name: row.customer_name || '',
    salesman_id: row.salesman_id || '',
    salesman_name: row.salesman_name || '',
    opening_receivable: Number(row.opening_receivable || 0),
    opening_prepayment: Number(row.opening_prepayment || 0),
    opening_balance: Number(row.opening_balance || 0),
    opening_date: row.opening_date || '',
    remark: row.remark || '',
  });
  dialogVisible.value = true;
}

async function handleDelete(row: OpeningEntryCustomerApi.Row) {
  const rowId = String(row.id || '');
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting'),
  });
  try {
    await deleteOpeningEntryCustomer(rowId);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    await loadTableData();
  } catch (error: any) {
    ElMessage.error(error?.message || '删除失败');
  } finally {
    loadingInstance.close();
  }
}

async function handleUpdateStatus(
  row: OpeningEntryCustomerApi.Row,
  status: number,
) {
  const loadingInstance = ElLoading.service({
    text: `确定${status === 20 ? '审批' : '反审批'}该客户期初吗？`,
  });
  try {
    await updateOpeningEntryCustomerStatus(String(row.id || ''), status);
    ElMessage.success(`${status === 20 ? '审批' : '反审批'}成功`);
    await loadTableData();
  } catch (error: any) {
    ElMessage.error(
      error?.message || `${status === 20 ? '审批' : '反审批'}失败`,
    );
  } finally {
    loadingInstance.close();
  }
}

async function handleSubmit() {
  if (!formData.customer_id) return ElMessage.warning('请选择客户');
  if (!formData.customer_code) return ElMessage.warning('客户编码不能为空');
  if (!formData.customer_name) return ElMessage.warning('客户名称不能为空');
  recalcBalance();
  const loadingInstance = ElLoading.service({ text: '保存中...' });
  try {
    const payload: OpeningEntryCustomerApi.Row = {
      id: currentRowId.value || undefined,
      customer_id: formData.customer_id,
      customer_code: formData.customer_code,
      customer_name: formData.customer_name,
      salesman_id: formData.salesman_id,
      salesman_name: formData.salesman_name,
      opening_receivable: Number(formData.opening_receivable || 0),
      opening_prepayment: Number(formData.opening_prepayment || 0),
      opening_balance: Number(formData.opening_balance || 0),
      opening_date: formData.opening_date,
      remark: formData.remark || '',
    };
    if (createMode.value) await createOpeningEntryCustomer(payload);
    else await updateOpeningEntryCustomer(payload);
    ElMessage.success('保存成功');
    dialogVisible.value = false;
    await loadTableData();
  } catch (error: any) {
    ElMessage.error(error?.message || '保存失败');
  } finally {
    loadingInstance.close();
  }
}

function handleSizeChange(size: number) {
  page.value = size;
  currentPage.value = 1;
  loadTableData();
}

function handleCurrentChange(page: number) {
  currentPage.value = page;
  loadTableData();
}

onMounted(async () => {
  await loadTableData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-4">
        <TableAction
          :actions="[
            {
              label: '客户期初',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '创建新的客户期初数据', placement: 'top' },
              disabled: !(dataTable && dataTable.allowAddData
                ? dataTable.allowAddData()
                : true),
              onClick: handleCreate,
            },
          ]"
        />
      </div>

      <ElTable v-loading="loading" :data="tableData" stripe style="width: 100%">
        <ElTableColumn type="index" label="序号" width="60" fixed="left" />
        <ElTableColumn
          prop="customer_code"
          label="客户编码"
          min-width="160"
          fixed="left"
        />
        <ElTableColumn label="客户名称" min-width="200" fixed="left">
          <template #default="{ row }">
            <ElButton type="primary" link @click="handleEdit(row)">
              {{ row.customer_name || '--' }}
            </ElButton>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="salesman_name" label="销售人员" min-width="140" />
        <ElTableColumn
          prop="opening_receivable"
          label="期初应收款"
          min-width="120"
        />
        <ElTableColumn
          prop="opening_prepayment"
          label="期初预收款"
          min-width="120"
        />
        <ElTableColumn
          prop="opening_balance"
          label="期初余额"
          min-width="120"
        />
        <ElTableColumn prop="status" label="状态" min-width="100">
          <template #default="{ row }">{{
            Number(row.status || 10) === 20 ? '已审批' : '草稿'
          }}</template>
        </ElTableColumn>
        <ElTableColumn
          prop="remark"
          label="备注"
          min-width="220"
          show-overflow-tooltip
        />
        <ElTableColumn label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <TableAction
              :actions="[
                {
                  label: $t('common.edit'),
                  type: 'primary',
                  link: true,
                  icon: ACTION_ICON.EDIT,
                  onClick: () => handleEdit(row),
                },
                {
                  label: Number(row.status || 10) === 10 ? '审批' : '反审批',
                  type: 'primary',
                  link: true,
                  icon: ACTION_ICON.AUDIT,
                  popConfirm: {
                    title: `确认${Number(row.status || 10) === 10 ? '审批' : '反审批'}该客户期初记录吗？`,
                    confirm: () =>
                      handleUpdateStatus(
                        row,
                        Number(row.status || 10) === 10 ? 20 : 10,
                      ),
                  },
                },
                {
                  label: $t('common.delete'),
                  type: 'danger',
                  link: true,
                  icon: ACTION_ICON.DELETE,
                  popConfirm: {
                    title: '确认删除该客户期初记录吗？',
                    confirm: () => handleDelete(row),
                  },
                },
              ]"
            />
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="pagination-container mt-4">
        <ElPagination
          v-model:current-page="currentPage"
          v-model:page-size="page"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <ElDialog
        v-model="dialogVisible"
        :title="createMode ? '新增客户期初' : '编辑客户期初'"
        width="680px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <div class="dialog-top-actions">
          <ElButton @click="dialogVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleSubmit">保存</ElButton>
        </div>
        <ElForm label-width="110px">
          <ElFormItem label="客户" required>
            <CustomerPicker
              :model-value="formData.customer_id as any"
              placeholder="请选择客户"
              @update:model-value="(v) => (formData.customer_id = v || '')"
              @update:data="handleCustomerPicked"
            />
          </ElFormItem>
          <ElFormItem label="客户编码" required
            ><ElInput v-model="formData.customer_code" disabled
          /></ElFormItem>
          <ElFormItem label="客户名称" required
            ><ElInput v-model="formData.customer_name" disabled
          /></ElFormItem>
          <ElFormItem label="销售人员"
            ><ElInput v-model="formData.salesman_name" disabled
          /></ElFormItem>
          <ElFormItem label="期初应收款" required
            ><ElInputNumber
              v-model="formData.opening_receivable"
              :precision="2"
              class="!w-full"
              @change="recalcBalance"
          /></ElFormItem>
          <ElFormItem label="期初预收款" required
            ><ElInputNumber
              v-model="formData.opening_prepayment"
              :precision="2"
              class="!w-full"
              @change="recalcBalance"
          /></ElFormItem>
          <ElFormItem label="期初余额" required
            ><ElInputNumber
              v-model="formData.opening_balance"
              :precision="2"
              class="!w-full"
              disabled
          /></ElFormItem>
          <ElFormItem label="期初日期"
            ><ElDatePicker
              v-model="formData.opening_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请选择日期"
              class="w-full"
          /></ElFormItem>
          <ElFormItem label="备注"
            ><ElInput
              v-model="formData.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入备注"
          /></ElFormItem>
        </ElForm>
      </ElDialog>
    </div>
  </Page>
</template>

<style scoped>
.pagination-container {
  display: flex;
  justify-content: flex-end;
}
.dialog-top-actions {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 0;
  background: #fff;
}
</style>
