<script lang="ts" setup>
import type { ErpStockInApi } from '#/api/erp/stock/in';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElButton, ElInput, ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import { createStockIn, getStockIn, updateStockIn } from '#/api/erp/stock/in';
import { getSupplierSimpleList } from '#/api/erp/purchase/supplier';
import { $t } from '#/locales';

import { useFormSchema } from '../data';
import ItemForm from './item-form.vue';

const emit = defineEmits(['success']);
const formData = ref<ErpStockInApi.StockIn>();
const formType = ref(''); // 表单类型：'create' | 'edit' | 'detail'
const itemFormRef = ref<InstanceType<typeof ItemForm>>();

const getTitle = computed(() => {
  if (formType.value === 'create') {
    return $t('ui.actionTitle.create', ['其它入库单']);
  } else if (formType.value === 'edit') {
    return $t('ui.actionTitle.edit', ['其它入库单']);
  } else {
    return '其它入库单详情';
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
});

function handleRemarkChange(value: string) {
  formData.value = { ...(formData.value || {}), remark: value } as any;
}
/** 更新入库单项 */
function handleUpdateItems(items: ErpStockInApi.StockInItem[]) {
  formData.value = modalApi.getData<ErpStockInApi.StockIn>();
  formData.value.items = items;
  formApi.setValues({
    items,
  });
}

/** 创建或更新其它入库单 */
async function handleSubmit() {
  const { valid } = await formApi.validate();
  if (!valid) {
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
  // 提交表单
  const data = (await formApi.getValues()) as ErpStockInApi.StockIn;
  data.remark = formData.value?.remark;
  // 解析供应商名称
  if (data.supplier_id && !data.supplier_name) {
    const suppliers = await getSupplierSimpleList().catch(() => []);
    const supplier = (Array.isArray(suppliers) ? suppliers : []).find(
      (s: any) => String(s.id ?? s.rowid) === String(data.supplier_id),
    );
    data.supplier_name = supplier?.name ?? supplier?.supplier_name ?? '';
  }
  try {
    await (formType.value === 'create'
      ? createStockIn(data)
      : updateStockIn(data));
    // 关闭并提示
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
      return;
    }
    // 加载数据
    const data = modalApi.getData<{
      id?: number | string;
      rowid?: number | string;
      type: string;
    }>();
    formType.value = data.type;
    formApi.setDisabled(formType.value === 'detail');
    formApi.updateSchema(useFormSchema(formType.value));
    const docId = data?.id ?? data?.rowid;
    if (!data || !docId) {
      return;
    }
    modalApi.lock();
    try {
      const res = await getStockIn(docId);
      formData.value = ((res as any)?.list || res) as ErpStockInApi.StockIn;
      // 设置到 values
      if (formData.value) {
        await formApi.setValues(formData.value);
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
      <template #items>
        <ItemForm
          ref="itemFormRef"
          :items="formData?.items ?? []"
          :disabled="formType === 'detail'"
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
