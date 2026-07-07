<script lang="ts" setup>
import type { ErpStockCheckApi } from '#/api/erp/stock/check';

import { computed, onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createStockCheck,
  getStockCheck,
  updateStockCheck,
} from '#/api/erp/stock/check';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { $t } from '#/locales';

import { getStockCheckStatusMeta, useFormSchema } from '../data';
import ItemForm from './item-form.vue';

import {
  ElButton,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
} from 'element-plus';

const emit = defineEmits(['success']);
const formData = ref<ErpStockCheckApi.StockCheck>();
const formType = ref('');
const itemFormRef = ref<InstanceType<typeof ItemForm>>();
const warehouseOptions = ref<any[]>([]);
const warehouseId = ref<string>();

const getCurrentDate = () => new Date().toLocaleDateString('sv-SE');

const getTitle = computed(() => {
  if (formType.value === 'create') {
    return $t('ui.actionTitle.create', ['库存盘点单']);
  }
  if (formType.value === 'edit') {
    return $t('ui.actionTitle.edit', ['库存盘点单']);
  }
  return '库存盘点单详情';
});

const isConfirmed = computed(() => Number(formData.value?.status || 0) === 20);

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
});

function getItemFormInstance() {
  return Array.isArray(itemFormRef.value)
    ? itemFormRef.value[0]
    : itemFormRef.value;
}

function handleUpdateItems(items: ErpStockCheckApi.StockCheckItem[]) {
  formData.value = (formData.value || {}) as ErpStockCheckApi.StockCheck;
  formData.value.items = items;
  formApi.setValues({ items });
}

async function loadWarehouseOptions() {
  warehouseOptions.value = await getWarehouseSimpleList();
}

async function handleWarehouseIdChange(value?: string) {
  if (formType.value === 'detail' || isConfirmed.value) return;
  const nextWarehouseId = value ? String(value) : undefined;
  const currentWarehouseId = warehouseId.value
    ? String(warehouseId.value)
    : undefined;
  const itemFormInstance = getItemFormInstance();

  const hasDirtyChanges = Boolean(itemFormInstance?.hasDirtyChanges?.());
  const hasItems =
    Array.isArray(formData.value?.items) && formData.value!.items!.length > 0;
  const changed = currentWarehouseId && currentWarehouseId !== nextWarehouseId;

  if (changed && hasItems && hasDirtyChanges) {
    try {
      await ElMessageBox.confirm(
        '切换仓库将丢弃当前盘点项和已录入的实际库存，是否继续？',
        '提示',
        { type: 'warning' },
      );
    } catch {
      await formApi.setValues({ warehouse_id: currentWarehouseId }, false);
      return;
    }
  }

  warehouseId.value = nextWarehouseId;
  formData.value = (formData.value || {}) as ErpStockCheckApi.StockCheck;
  formData.value.warehouse_id = nextWarehouseId;
  await formApi.setValues({ warehouse_id: nextWarehouseId }, false);

  if (!nextWarehouseId) {
    handleUpdateItems([]);
    return;
  }

  if (!currentWarehouseId || currentWarehouseId !== nextWarehouseId) {
    const items =
      (await itemFormInstance?.generateByWarehouse?.(nextWarehouseId)) || [];
    handleUpdateItems(items);
  }
}

async function handleGenerateItems() {
  if (!warehouseId.value) {
    ElMessage.warning('请先选择盘点仓库');
    return;
  }
  const itemFormInstance = getItemFormInstance();
  if (!itemFormInstance?.generateByWarehouse) return;

  const hasDirtyChanges = Boolean(itemFormInstance.hasDirtyChanges?.());
  const hasItems =
    Array.isArray(formData.value?.items) && formData.value!.items!.length > 0;
  if (hasItems && hasDirtyChanges) {
    try {
      await ElMessageBox.confirm(
        '重新生成将覆盖当前盘点项和已录入的实际库存，是否继续？',
        '提示',
        { type: 'warning' },
      );
    } catch {
      return;
    }
  }

  const items =
    (await itemFormInstance.generateByWarehouse(warehouseId.value)) || [];
  handleUpdateItems(items);
}

function handleFillActualCountWithStock() {
  const itemFormInstance = getItemFormInstance();
  if (!itemFormInstance?.fillActualCountWithStock) return;
  const items = itemFormInstance.fillActualCountWithStock() || [];
  handleUpdateItems(items);
}

async function handleSubmit() {
  const { valid } = await formApi.validate();
  if (!valid) return;

  const itemFormInstance = getItemFormInstance();
  try {
    itemFormInstance?.validate?.();
  } catch (error: any) {
    ElMessage.error(error.message || '子表单验证失败');
    return;
  }

  modalApi.lock();
  const values = (await formApi.getValues()) as ErpStockCheckApi.StockCheck;
  const data: ErpStockCheckApi.StockCheck = {
    ...formData.value,
    ...values,
    warehouse_id: warehouseId.value,
    items: formData.value?.items || values.items || [],
  };

  try {
    await (formType.value === 'create'
      ? createStockCheck(data)
      : updateStockCheck(data));
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
      warehouseId.value = undefined;
      return;
    }

    const data = modalApi.getData<{ id?: string; type: string }>();
    formType.value = data.type;
    formApi.updateSchema(useFormSchema(formType.value));

    if (!data?.id) {
      formData.value = {
        warehouse_id: undefined,
        check_time: getCurrentDate(),
        status: 10,
        items: [],
      } as ErpStockCheckApi.StockCheck;
      warehouseId.value = undefined;
      formApi.setDisabled(false);
      await formApi.setValues(formData.value, false);
      return;
    }

    modalApi.lock();
    try {
      formData.value = (await getStockCheck(
        data.id,
      )) as ErpStockCheckApi.StockCheck;
      warehouseId.value = formData.value?.warehouse_id
        ? String(formData.value.warehouse_id)
        : undefined;
      const shouldDisable =
        formType.value === 'detail' ||
        Number(formData.value?.status || 0) === 20;
      formApi.setDisabled(shouldDisable);
      await formApi.setValues(formData.value || {}, false);
    } finally {
      modalApi.unlock();
    }
  },
});

onMounted(loadWarehouseOptions);
</script>

<template>
  <Modal
    :title="getTitle"
    class="w-3/4"
    content-class="pt-0"
    :show-confirm-button="false"
    :show-cancel-button="false"
  >
    <div v-if="formType !== 'detail' && !isConfirmed" class="modal-top-actions">
      <ElButton @click="modalApi.close()">取消</ElButton>
      <ElButton type="primary" @click="handleSubmit">确认</ElButton>
    </div>
    <Form class="mx-3">
      <template #warehouse_id>
        <ElSelect
          :model-value="warehouseId"
          placeholder="请选择盘点仓库"
          class="w-full"
          filterable
          clearable
          :disabled="formType === 'detail' || isConfirmed"
          @update:model-value="handleWarehouseIdChange"
        >
          <ElOption
            v-for="item in warehouseOptions"
            :key="item.rowid"
            :label="item.name"
            :value="item.rowid"
          />
        </ElSelect>
      </template>
      <template #items>
        <div class="mb-3 flex items-center justify-between gap-2">
          <div class="text-sm text-[#666]">
            <span v-if="warehouseId"
              >当前盘点仓库：{{
                warehouseOptions.find((item) => item.rowid === warehouseId)
                  ?.name || warehouseId
              }}</span
            >
            <span v-else>请先选择盘点仓库后生成盘点项</span>
          </div>
          <div
            v-if="formType !== 'detail' && !isConfirmed"
            class="flex items-center gap-2"
          >
            <ElButton type="primary" @click="handleGenerateItems"
              >生成盘点项</ElButton
            >
            <ElButton @click="handleFillActualCountWithStock"
              >一键带入账面库存</ElButton
            >
          </div>
        </div>
        <ItemForm
          ref="itemFormRef"
          :items="formData?.items ?? []"
          :disabled="formType === 'detail' || isConfirmed"
          @update:items="handleUpdateItems"
        />
      </template>
    </Form>

    <div v-if="isConfirmed" class="mx-3 mt-3 text-sm text-[#67c23a]">
      当前单据状态：{{
        getStockCheckStatusMeta(formData?.status)?.label
      }}，已确认单据不可编辑。
    </div>
  </Modal>
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
