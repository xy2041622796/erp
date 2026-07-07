<script lang="ts" setup>
import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { getCustomerSimpleList } from '#/api/erp/customer';
import {
  createSaleReturnIn,
  getSaleReturnIn,
  updateSaleReturnIn,
} from '#/api/erp/stock/sale-return-in';
import {
  createSaleReturnInByCheck,
  getSaleReturnInByCheck,
  markReturnCheckProcessed,
  updateSaleReturnInByCheck,
} from '#/api/erp/stock/return-check';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';

import { useFormSchema } from '../data';
import ItemForm from './item-form.vue';
import SaleReturnSelect from './sale-return-select.vue';

import { ElButton, ElOption, ElSelect } from 'element-plus';

const emit = defineEmits(['success', 'detect']);
const formType = ref('');
const formData = ref<any>({
  items: [],
  total_count: 0,
  sourceCheckId: undefined,
  sourceCheckBizType: undefined,
  sourceCheckGenerateKey: undefined,
});
const itemFormRef = ref<any>();
const warehouseOptions = ref<any[]>([]);
const canDetect = ref(false);

function isFromReturnCheck() {
  return Boolean(formData.value.sourceCheckId);
}

function hasLinkedCheckItems() {
  return (
    Array.isArray(formData.value.items) &&
    formData.value.items.some((item: any) =>
      Boolean(item?.source_check_item_id),
    )
  );
}

const getCurrentDate = () => new Date().toLocaleDateString('sv-SE');

function normalizeDateOnly(value: any) {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    if (/^\d+$/.test(trimmed))
      return new Date(Number(trimmed)).toLocaleDateString('sv-SE');
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString('sv-SE');
}

const [Form, formApi] = useVbenForm({
  commonConfig: { componentProps: { class: 'w-full' }, labelWidth: 120 },
  wrapperClass: 'grid-cols-3',
  layout: 'vertical',
  schema: useFormSchema('create'),
  showDefaultActions: false,
});

function getTitle() {
  return formType.value === 'create'
    ? '新建销售退货入库'
    : formType.value === 'edit'
      ? '编辑销售退货入库'
      : '销售退货入库详情';
}
function handleUpdateItems(items: any[]) {
  formData.value.items = items;
  formApi.setValues({
    items,
    total_count: items.reduce((sum, item) => sum + Number(item.count || 0), 0),
  });
}
function handleUpdateTotalCount(totalCount: number) {
  formApi.setValues({ total_count: totalCount });
}

async function handleUpdateReturn(payload: {
  returnDoc: any;
  warehouseId: string;
  warehouseName?: string;
  items: any[];
}) {
  formData.value = {
    ...formData.value,
    return_id: payload.returnDoc.id,
    return_no: payload.returnDoc.no,
    customer_id: payload.returnDoc.customer_id,
    warehouse_id: payload.warehouseId,
    warehouse_inbound: payload.warehouseName,
    in_time: formData.value.in_time || getCurrentDate(),
    remark: formData.value.remark || payload.returnDoc.remark,
    items: payload.items,
  };
  await formApi.setValues(
    {
      return_id: formData.value.return_id,
      return_no: formData.value.return_no,
      customer_id: formData.value.customer_id,
      warehouse_id: formData.value.warehouse_id,
      in_time: formData.value.in_time,
      remark: formData.value.remark,
      items: payload.items,
      total_count: payload.items.reduce(
        (sum, item) => sum + Number(item.count || 0),
        0,
      ),
    },
    false,
  );
}

async function handleDetect() {
  if (!formData.value?.id) return;
  await modalApi.close();
  emit('detect', { ...(formData.value || {}) });
}

async function handleSave() {
  const { valid } = await formApi.validate();
  if (!valid) return;
  try {
    itemFormRef.value?.validate?.();
  } catch {
    return;
  }
  modalApi.lock();
  try {
    const data: any = await formApi.getValues();
    const processRows = (Array.isArray(data.items) ? data.items : [])
      .map((item: any) => ({
        check_item_id: String(item?.source_check_item_id || ''),
        processed_count: Number(item?.count || 0),
      }))
      .filter((item: any) => item.check_item_id && item.processed_count > 0);
    data.items = (Array.isArray(data.items) ? data.items : []).map(
      (item: any) => ({ ...item }),
    );
    if (data.in_time) data.in_time = normalizeDateOnly(data.in_time);
    const warehouse = warehouseOptions.value.find(
      (item) => String(item.rowid) === String(data.warehouse_id || ''),
    );
    data.warehouse_inbound =
      warehouse?.name || formData.value.warehouse_inbound;
    const res: any = isFromReturnCheck()
      ? formType.value === 'create'
        ? await createSaleReturnInByCheck(data)
        : await updateSaleReturnInByCheck(data)
      : formType.value === 'create'
        ? await createSaleReturnIn(data)
        : await updateSaleReturnIn(data);
    const savedDoc = {
      id: res?.id || formData.value.id,
      no: res?.no || data.no || formData.value.no,
      sourceCheckId: formData.value.sourceCheckId,
      sourceCheckBizType: formData.value.sourceCheckBizType,
      sourceCheckGenerateKey: formData.value.sourceCheckGenerateKey,
    };
    if (
      formType.value === 'create' &&
      savedDoc.sourceCheckId &&
      processRows.length > 0
    ) {
      await markReturnCheckProcessed(
        String(savedDoc.sourceCheckGenerateKey || ''),
        processRows,
      );
    }
    if (formType.value === 'create' && res?.id) formData.value.id = res.id;
    await modalApi.close();
    emit('success', savedDoc);
  } finally {
    modalApi.unlock();
  }
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    await handleSave();
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      formData.value = {
        items: [],
        total_count: 0,
        sourceCheckId: undefined,
        sourceCheckBizType: undefined,
        sourceCheckGenerateKey: undefined,
      };
      canDetect.value = false;
      return;
    }
    await getCustomerSimpleList();
    warehouseOptions.value = await getWarehouseSimpleList();
    const data = modalApi.getData<any>();
    formType.value = data?.type || 'create';
    canDetect.value = Boolean(data?.canDetect);
    formData.value.sourceCheckId = data?.sourceCheckId;
    formData.value.sourceCheckBizType = data?.sourceCheckBizType;
    formData.value.sourceCheckGenerateKey = data?.sourceCheckGenerateKey;
    formApi.setDisabled(formType.value === 'detail');
    formApi.updateSchema(useFormSchema(formType.value));
    if (formType.value === 'create') {
      const defaultTime = getCurrentDate();
      formData.value = {
        ...formData.value,
        items: [],
        total_count: 0,
        in_time: defaultTime,
      };
      await formApi.setValues(
        { in_time: defaultTime, items: [], total_count: 0 },
        false,
      );
      if (data?.preloadReturn) await handleUpdateReturn(data.preloadReturn);
      return;
    }
    if (!data?.id) return;
    modalApi.lock();
    try {
      const res = isFromReturnCheck()
        ? await getSaleReturnInByCheck(String(data.id))
        : await getSaleReturnIn(String(data.id));
      formData.value = { ...formData.value, ...(res || { items: [] }) };
      if (formData.value.in_time)
        formData.value.in_time = normalizeDateOnly(formData.value.in_time);
      await formApi.setValues(formData.value, false);
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal
    :title="getTitle()"
    class="w-3/4"
    content-class="pt-0"
    :show-confirm-button="false"
    :show-cancel-button="false"
    :close-on-click-modal="false"
  >
    <div class="modal-top-actions">
      <ElButton @click="modalApi.close()">取消</ElButton>
      <ElButton
        v-if="formType === 'detail' && canDetect"
        type="primary"
        @click="handleDetect"
        >检测</ElButton
      >
      <ElButton v-if="formType !== 'detail'" type="primary" @click="handleSave"
        >确认</ElButton
      >
    </div>
    <Form class="mx-3">
      <template #warehouse_id>
        <ElSelect
          :model-value="formData?.warehouse_id"
          disabled
          filterable
          class="w-full"
        >
          <ElOption
            v-for="item in warehouseOptions"
            :key="item.rowid"
            :label="item.name"
            :value="item.rowid"
          />
        </ElSelect>
      </template>
      <template #return_no>
        <SaleReturnSelect
          :return-no="formData?.return_no"
          :disabled="formType === 'detail'"
          @update:return="handleUpdateReturn"
        />
      </template>
      <template #items>
        <ItemForm
          ref="itemFormRef"
          :items="formData?.items ?? []"
          :disabled="formType === 'detail'"
          :disable-delete="isFromReturnCheck() || hasLinkedCheckItems()"
          :warehouse-id="formData?.warehouse_id"
          :warehouse-name="formData?.warehouse_inbound"
          @update:items="handleUpdateItems"
          @update:total-count="handleUpdateTotalCount"
        />
      </template>
    </Form>
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
