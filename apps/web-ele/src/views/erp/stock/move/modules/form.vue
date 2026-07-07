<script lang="ts" setup>
import type { ErpStockMoveApi } from '#/api/erp/stock/move';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { getProductSimpleList } from '#/api/erp/product/product';
import {
  createStockMove,
  getStockMove,
  updateStockMove,
} from '#/api/erp/stock/move';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { $t } from '#/locales';
import {
  buildErpOrderPrintHtml,
  getErpPrintCompanyName,
  writePrintHtmlAndPrint,
} from '#/views/erp/shared/print-templates';

import { useFormSchema } from '../data';
import ItemForm from './item-form.vue';

import { ElButton, ElDialog, ElInput, ElMessage, ElOption, ElSelect } from 'element-plus';

const DEFAULT_STOCK_MOVE_STATUS = 10;

const emit = defineEmits(['success']);
const formData = ref<ErpStockMoveApi.StockMove>();
const formType = ref('');
const itemFormRef = ref<InstanceType<typeof ItemForm>>();
const warehouseOptions = ref<any[]>([]);
const fromWarehouseId = ref<string | undefined>();
const toWarehouseId = ref<string | undefined>();
const productList = ref<any[]>([]);
const categoryList = ref<any[]>([]);
const printPreviewVisible = ref(false);
const printPreviewHtml = ref('');

const getTitle = computed(() => {
  if (formType.value === 'create') {
    return $t('ui.actionTitle.create', ['库存调拨单']);
  } else if (formType.value === 'edit') {
    return $t('ui.actionTitle.edit', ['库存调拨单']);
  } else {
    return '库存调拨单详情';
  }
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    labelWidth: 120,
  },
  wrapperClass: 'grid-cols-3',
  layout: 'vertical',
  schema: useFormSchema(formType.value),
  showDefaultActions: false,
  handleValuesChange: (values, changedFields) => {
    if (changedFields.includes('from_warehouse_id')) {
      fromWarehouseId.value = values.from_warehouse_id;
    }
    if (changedFields.includes('to_warehouse_id')) {
      toWarehouseId.value = values.to_warehouse_id;
    }
  },
});

function buildMovePayload(data: ErpStockMoveApi.StockMove) {
  const items = Array.isArray(data.items) ? data.items : [];
  const total_count = items.reduce(
    (sum, item: any) => sum + Number(item?.count || 0),
    0,
  );
  const total_price = items.reduce(
    (sum, item: any) =>
      sum + Number(item?.total_price ?? item?.totalPrice ?? 0),
    0,
  );

  return {
    ...data,
    from_warehouse_id: fromWarehouseId.value,
    to_warehouse_id: toWarehouseId.value,
    status:
      formType.value === 'create'
        ? (data.status ?? DEFAULT_STOCK_MOVE_STATUS)
        : data.status,
    total_count,
    total_price,
    items,
  };
}

function handleRemarkChange(value: string) {
  formData.value = { ...(formData.value || {}), remark: value } as any;
}
function handleUpdateItems(items: ErpStockMoveApi.StockMoveItem[]) {
  formData.value =
    formData.value || modalApi.getData<ErpStockMoveApi.StockMove>();
  formData.value.items = items;
  formApi.setValues({ items });
}

async function handleFromWarehouseChange(value?: string) {
  fromWarehouseId.value = value;
  await formApi.setValues({ from_warehouse_id: value } as any, false);
}

async function handleToWarehouseChange(value?: string) {
  toWarehouseId.value = value;
  await formApi.setValues({ to_warehouse_id: value } as any, false);
}

async function handlePrint() {
  if (!formData.value?.id) return;
  if (productList.value.length === 0) productList.value = await getProductSimpleList();
  if (warehouseOptions.value.length === 0) warehouseOptions.value = await getWarehouseSimpleList();
  if (categoryList.value.length === 0) categoryList.value = await getProductCategorySimpleList() as any;
  const companyName = await getErpPrintCompanyName();
  const enriched = {
    ...formData.value,
    _from_warehouse_name:
      warehouseOptions.value.find((item) => String(item.rowid) === String(formData.value?.from_warehouse_id || ''))?.name ||
      formData.value?.from_warehouse_name,
    _to_warehouse_name:
      warehouseOptions.value.find((item) => String(item.rowid) === String(formData.value?.to_warehouse_id || ''))?.name ||
      formData.value?.to_warehouse_name,
  };
  const html = buildErpOrderPrintHtml({
    type: 'stock-move',
    data: enriched,
    companyName,
    categoryList: categoryList.value,
    productList: productList.value,
    warehouseList: warehouseOptions.value,
  });
  await writePrintHtmlAndPrint(html);
}

async function handleSubmit() {
  const { valid } = await formApi.validate();
  if (!valid) {
    return;
  }
  if (!fromWarehouseId.value) {
    ElMessage.error('请选择调出仓库');
    return;
  }
  if (!toWarehouseId.value) {
    ElMessage.error('请选择调入仓库');
    return;
  }
  if (String(fromWarehouseId.value) === String(toWarehouseId.value)) {
    ElMessage.error('调出仓库和调入仓库不能相同');
    return;
  }
  const itemFormInstance = Array.isArray(itemFormRef.value)
    ? itemFormRef.value[0]
    : itemFormRef.value;
  try {
    itemFormInstance.validate();
  } catch (error: any) {
    ElMessage.error(error.message || '子表单验证失败');
    return;
  }

  modalApi.lock();
  const rawData = (await formApi.getValues()) as ErpStockMoveApi.StockMove;
  rawData.remark = formData.value?.remark;
  const data = buildMovePayload(rawData);
  try {
    await (formType.value === 'create'
      ? createStockMove(data)
      : updateStockMove(data));
    await modalApi.close();
    emit('success');
    ElMessage.success($t('ui.actionMessage.operationSuccess'));
  } finally {
    modalApi.unlock();
  }
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    await handleSubmit();
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = undefined;
      fromWarehouseId.value = undefined;
      toWarehouseId.value = undefined;
      return;
    }
    const data = modalApi.getData<{ id?: string; type: string }>();
    formType.value = data.type;
    formApi.setDisabled(formType.value === 'detail');
    formApi.updateSchema(useFormSchema(formType.value));
    if (warehouseOptions.value.length === 0) {
      warehouseOptions.value = await getWarehouseSimpleList();
    }
    if (!data || !data.id) {
      formData.value = {
        status: DEFAULT_STOCK_MOVE_STATUS,
      };
      fromWarehouseId.value = undefined;
      toWarehouseId.value = undefined;
      await formApi.setValues(
        {
          status: DEFAULT_STOCK_MOVE_STATUS,
          from_warehouse_id: undefined,
          to_warehouse_id: undefined,
        } as any,
        false,
      );
      return;
    }
    modalApi.lock();
    try {
      formData.value = (await getStockMove(data.id)) || undefined;
      if (formData.value) {
        fromWarehouseId.value =
          formData.value.from_warehouse_id ?? formData.value.fromWarehouseId;
        toWarehouseId.value =
          formData.value.to_warehouse_id ?? formData.value.toWarehouseId;
        await formApi.setValues({
          ...formData.value,
          from_warehouse_id: fromWarehouseId.value,
          to_warehouse_id: toWarehouseId.value,
        } as any);
      }
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal
    :title="getTitle"
    class="w-3/4"
    content-class="pt-0"
    :footer="formType === 'detail'"
    :show-confirm-button="false"
    :show-cancel-button="false"
  >
    <div v-if="formType !== 'detail'" class="modal-top-actions">
      <ElButton @click="modalApi.close()">取消</ElButton>
      <ElButton type="primary" @click="handleSubmit">确认</ElButton>
    </div>
    <Form class="mx-3">
      <template #from_warehouse_id>
        <ElSelect
          :model-value="fromWarehouseId"
          placeholder="请选择调出仓库"
          filterable
          class="w-full"
          :disabled="formType === 'detail'"
          @update:model-value="handleFromWarehouseChange"
        >
          <ElOption
            v-for="item in warehouseOptions"
            :key="item.rowid || item.id"
            :label="item.name"
            :value="item.rowid || item.id"
          />
        </ElSelect>
      </template>
      <template #to_warehouse_id>
        <ElSelect
          :model-value="toWarehouseId"
          placeholder="请选择调入仓库"
          filterable
          class="w-full"
          :disabled="formType === 'detail'"
          @update:model-value="handleToWarehouseChange"
        >
          <ElOption
            v-for="item in warehouseOptions"
            :key="item.rowid || item.id"
            :label="item.name"
            :value="item.rowid || item.id"
          />
        </ElSelect>
      </template>
      <template #items>
        <ItemForm
          ref="itemFormRef"
          :items="formData?.items ?? []"
          :disabled="formType === 'detail'"
          :from-warehouse-id="fromWarehouseId"
          :to-warehouse-id="toWarehouseId"
          @update:items="handleUpdateItems"
        />
      </template>
    </Form>

    <div class="mx-3 mt-4">
      <div class="mb-1 text-sm font-medium">备注</div>
      <ElInput
        :model-value="formData?.remark"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 4 }"
        placeholder="请输入备注"
        :disabled="formType === 'detail'"
        @update:model-value="handleRemarkChange"
      />
    </div>
    <template v-if="formType === 'detail'" #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <ElButton type="primary" @click="handlePrint">打印</ElButton>
        </div>
        <div class="flex items-center gap-2">
          <ElButton @click="modalApi.close()">取消</ElButton>
        </div>
      </div>
    </template>
  </Modal>

  <ElDialog
    v-model="printPreviewVisible"
    title="打印预览"
    width="980px"
    :close-on-click-modal="false"
  >
    <div class="mb-2 text-sm text-[#666]">打印预览</div>
    <iframe class="h-[520px] w-full border" :srcdoc="printPreviewHtml"></iframe>
    <template #footer>
      <ElButton type="primary" @click="printPreviewVisible = false">关闭</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.modal-top-actions {
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
