<script lang="ts" setup>
import type { OpeningEntryProductStockApi } from '#/api/erp/basic_data/opening_entry/product_stock';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ACTION_ICON, TableAction } from '#/adapter/vxe-table';
import {
  createOpeningEntryProductStock,
  deleteOpeningEntryProductStock,
  getOpeningEntryProductStockPage,
  updateOpeningEntryProductStock,
  updateOpeningEntryProductStockStatus,
} from '#/api/erp/basic_data/opening_entry/product_stock';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
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
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'ErpBasicDataOpeningEntryProductStock' });

const dataTable = ref<any>(null);
const currentPage = ref(1);
const page = ref(10);
const total = ref(0);
const tableData = ref<OpeningEntryProductStockApi.Row[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const createMode = ref(true);
const currentRowId = ref<string>('');
const productOptions = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);

function getWarehouseOptionValue(item: any) {
  return String(item?.id || item?.rowid || '');
}

function isWarehouseAuditReady(item: any) {
  return !!getWarehouseOptionValue(item);
}

function findWarehouseOption(value: string) {
  return warehouseOptions.value.find(
    (item) =>
      getWarehouseOptionValue(item) === String(value) ||
      String(item?.rowid || '') === String(value),
  );
}

function getWarehouseOptionLabel(item: any) {
  return item?.name || item?.warehouse_name || '未命名仓库';
}

const formData = reactive<OpeningEntryProductStockApi.Row>({
  opening_date: '',
  product_id: '',
  product_code: '',
  product_name: '',
  product_model: '',
  unit_id: '',
  unit_name: '',
  warehouse_id: '',
  warehouse_name: '',
  opening_stock_qty: 0,
  opening_cost_amount: 0,
  opening_price: 0,
  remark: '',
});

function resetForm() {
  currentRowId.value = '';
  Object.assign(formData, {
    id: '',
    opening_date: '',
    product_id: '',
    product_code: '',
    product_name: '',
    product_model: '',
    unit_id: '',
    unit_name: '',
    warehouse_id: '',
    warehouse_name: '',
    opening_stock_qty: 0,
    opening_cost_amount: 0,
    opening_price: 0,
    remark: '',
  });
}

function recalcAmount() {
  formData.opening_cost_amount = Number(
    (
      Number(formData.opening_stock_qty || 0) *
      Number(formData.opening_price || 0)
    ).toFixed(2),
  );
}

function handleProductChange(value: string) {
  const hit = productOptions.value.find(
    (item) => String(item.rowid || item.id) === String(value),
  );
  formData.product_id = value;
  formData.product_code = String(hit?.product_code || '');
  formData.product_name = String(hit?.product_name || hit?.name || '');
  formData.product_model = String(hit?.model || hit?.product_model || '');
  formData.unit_id = String(hit?.unit_id || hit?.unitId || '');
  formData.unit_name = String(hit?.unit || hit?.unit_name || '');
  if (Number(formData.opening_price || 0) <= 0) {
    formData.opening_price = Number(
      hit?.purchase_price || hit?.purchasePrice || 0,
    );
  }
  recalcAmount();
}

function handleWarehouseChange(value: string) {
  const hit = findWarehouseOption(value);
  formData.warehouse_id = hit ? getWarehouseOptionValue(hit) : value;
  formData.warehouse_name = String(hit?.name || hit?.warehouse_name || '');
}

async function loadTableData() {
  loading.value = true;
  try {
    const response = await getOpeningEntryProductStockPage({
      pageNo: currentPage.value,
      page: page.value,
    });
    tableData.value = response?.list || [];
    total.value = response?.total || 0;
    dataTable.value = response?.dataTable;
  } catch (error: any) {
    ElMessage.error(error?.message || '加载商品期初库存失败');
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function loadOptions() {
  try {
    const [products, warehouses] = await Promise.all([
      getProductSimpleList(),
      getWarehouseSimpleList(),
    ]);
    productOptions.value = Array.isArray(products) ? products : [];
    warehouseOptions.value = Array.isArray(warehouses) ? warehouses : [];
  } catch (error: any) {
    ElMessage.error(error?.message || '加载商品或仓库失败');
  }
}

function handleCreate() {
  createMode.value = true;
  resetForm();
  dialogVisible.value = true;
}

function handleEdit(row: OpeningEntryProductStockApi.Row) {
  createMode.value = false;
  currentRowId.value = String(row.id || '');
  Object.assign(formData, {
    id: row.id || '',
    opening_date: row.opening_date || '',
    product_id: row.product_id || '',
    product_code: row.product_code || '',
    product_name: row.product_name || '',
    product_model: row.product_model || '',
    unit_id: row.unit_id || '',
    unit_name: row.unit_name || '',
    warehouse_id: findWarehouseOption(String(row.warehouse_id || ''))
      ? getWarehouseOptionValue(
          findWarehouseOption(String(row.warehouse_id || '')),
        )
      : row.warehouse_id || '',
    warehouse_name: row.warehouse_name || '',
    opening_stock_qty: Number(row.opening_stock_qty || 0),
    opening_cost_amount: Number(row.opening_cost_amount || 0),
    opening_price: Number(row.opening_price || 0),
    remark: row.remark || '',
  });
  dialogVisible.value = true;
}

async function handleDelete(row: OpeningEntryProductStockApi.Row) {
  const rowId = String(row.id || '');
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting'),
  });
  try {
    await deleteOpeningEntryProductStock(rowId);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    await loadTableData();
  } catch (error: any) {
    ElMessage.error(error?.message || '删除失败');
  } finally {
    loadingInstance.close();
  }
}

async function handleUpdateStatus(
  row: OpeningEntryProductStockApi.Row,
  status: number,
) {
  const loadingInstance = ElLoading.service({
    text: `确定${status === 20 ? '审批' : '反审批'}该库存期初吗？`,
  });
  try {
    await updateOpeningEntryProductStockStatus(String(row.id || ''), status);
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
  if (!formData.opening_date) return ElMessage.warning('请选择期初日期');
  if (!formData.product_id) return ElMessage.warning('请选择商品');
  if (!formData.product_code) return ElMessage.warning('商品编码不能为空');
  if (!formData.product_name) return ElMessage.warning('商品名称不能为空');
  if (!formData.warehouse_id) return ElMessage.warning('请选择仓库');
  if (!formData.warehouse_name) return ElMessage.warning('仓库名称不能为空');
  recalcAmount();
  const loadingInstance = ElLoading.service({ text: '保存中...' });
  try {
    const payload: OpeningEntryProductStockApi.Row = {
      id: currentRowId.value || undefined,
      opening_date: formData.opening_date,
      product_id: formData.product_id,
      product_code: formData.product_code,
      product_name: formData.product_name,
      product_model: formData.product_model,
      unit_id: formData.unit_id,
      unit_name: formData.unit_name,
      warehouse_id: formData.warehouse_id,
      warehouse_name: formData.warehouse_name,
      opening_stock_qty: Number(formData.opening_stock_qty || 0),
      opening_cost_amount: Number(formData.opening_cost_amount || 0),
      opening_price: Number(formData.opening_price || 0),
      remark: formData.remark || '',
    };
    if (createMode.value) await createOpeningEntryProductStock(payload);
    else await updateOpeningEntryProductStock(payload);
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

const totalQty = computed(() =>
  tableData.value.reduce(
    (sum, item) => sum + Number(item.opening_stock_qty || 0),
    0,
  ),
);
const totalAmount = computed(() =>
  tableData.value.reduce(
    (sum, item) => sum + Number(item.opening_cost_amount || 0),
    0,
  ),
);

onMounted(async () => {
  await loadOptions();
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
              label: '期初库存',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '创建新的期初库存数据', placement: 'top' },
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
          prop="product_code"
          label="商品编码"
          min-width="150"
          fixed="left"
        />
        <ElTableColumn label="商品名称" min-width="200" fixed="left">
          <template #default="{ row }">
            <ElButton type="primary" link @click="handleEdit(row)">
              {{ row.product_name || '--' }}
            </ElButton>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="product_model" label="规格型号" min-width="160" />
        <ElTableColumn prop="unit_name" label="单位" min-width="90" />
        <ElTableColumn prop="warehouse_name" label="仓库" min-width="150" />
        <ElTableColumn
          prop="opening_stock_qty"
          label="期初库存"
          min-width="120"
        />
        <ElTableColumn
          prop="opening_cost_amount"
          label="期初商品成本"
          min-width="130"
        />
        <ElTableColumn prop="opening_price" label="期初单价" min-width="120" />
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
                    title: `确认${Number(row.status || 10) === 10 ? '审批' : '反审批'}该库存期初记录吗？`,
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
                    title: '确认删除该商品期初库存记录吗？',
                    confirm: () => handleDelete(row),
                  },
                },
              ]"
            />
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-3 flex justify-end gap-5 text-sm text-gray-600">
        <span>数量合计：{{ totalQty.toFixed(3) }}</span>
        <span>金额合计：{{ totalAmount.toFixed(2) }}</span>
      </div>

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
        :title="createMode ? '新增商品期初库存' : '编辑商品期初库存'"
        width="760px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <div class="dialog-top-actions">
          <ElButton @click="dialogVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleSubmit">保存</ElButton>
        </div>
        <ElForm label-width="120px">
          <ElFormItem label="商品" required>
            <ElSelect
              v-model="formData.product_id"
              filterable
              clearable
              placeholder="请选择商品"
              class="w-full"
              @change="handleProductChange"
            >
              <ElOption
                v-for="item in productOptions"
                :key="String(item.rowid || item.id)"
                :label="
                  (item.product_code || '') +
                  ' / ' +
                  (item.product_name || item.name || '')
                "
                :value="String(item.rowid || item.id)"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="商品编码" required
            ><ElInput v-model="formData.product_code" disabled
          /></ElFormItem>
          <ElFormItem label="商品名称" required
            ><ElInput v-model="formData.product_name" disabled
          /></ElFormItem>
          <ElFormItem label="规格型号"
            ><ElInput v-model="formData.product_model" disabled
          /></ElFormItem>
          <ElFormItem label="单位"
            ><ElInput v-model="formData.unit_name" disabled
          /></ElFormItem>
          <ElFormItem label="仓库" required>
            <ElSelect
              v-model="formData.warehouse_id"
              filterable
              clearable
              placeholder="请选择仓库"
              class="w-full"
              @change="handleWarehouseChange"
            >
              <ElOption
                v-for="item in warehouseOptions"
                :key="String(item.rowid || item.id)"
                :label="getWarehouseOptionLabel(item)"
                :value="getWarehouseOptionValue(item)"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="仓库名称" required
            ><ElInput v-model="formData.warehouse_name" disabled
          /></ElFormItem>
          <ElFormItem label="期初库存" required
            ><ElInputNumber
              v-model="formData.opening_stock_qty"
              :precision="3"
              class="!w-full"
              @change="recalcAmount"
          /></ElFormItem>
          <ElFormItem label="期初单价" required
            ><ElInputNumber
              v-model="formData.opening_price"
              :precision="6"
              class="!w-full"
              @change="recalcAmount"
          /></ElFormItem>
          <ElFormItem label="期初商品成本" required
            ><ElInputNumber
              v-model="formData.opening_cost_amount"
              :precision="2"
              class="!w-full"
              disabled
          /></ElFormItem>
          <ElFormItem label="期初日期" required
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
