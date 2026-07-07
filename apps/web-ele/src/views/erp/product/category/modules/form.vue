<script lang="ts" setup>
import type { ErpProductCategoryApi } from '#/api/erp/product/category';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { ElButton, ElMessage } from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import {
  createProductCategory,
  getProductCategory,
  getProductCategoryList,
  updateProductCategory,
} from '#/api/erp/product/category';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits(['success']);
const formData = ref<ErpProductCategoryApi.ProductCategory>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', ['分类'])
    : $t('ui.actionTitle.create', ['分类']);
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'col-span-2',
    labelWidth: 80,
  },
  layout: 'horizontal',
  schema: useFormSchema(),
  showDefaultActions: false,
});

function normalizeParentId(value: any) {
  const parentId = String(value ?? '').trim();
  return parentId && parentId !== '0' ? parentId : '000000';
}

function getDefaultValues(
  data?: null | Partial<ErpProductCategoryApi.ProductCategory>,
) {
  const source = data ?? {};
  const status = (source as any).status;
  const sort = (source as any).sort;
  return {
    ...source,
    parent_id: normalizeParentId(source.parent_id ?? source.parentId),
    status:
      status === undefined || status === null || status === ''
        ? 0
        : Number(status),
    sort: sort === undefined || sort === null || sort === '' ? 0 : Number(sort),
  };
}

function extractSavedItem(result: any, fallback: any) {
  return (
    result?.data?.Result?.data?.Items?.[0] ||
    result?.Result?.data?.Items?.[0] ||
    result?.data?.Result?.Items?.[0] ||
    result?.Result?.Items?.[0] ||
    result?.data?.Items?.[0] ||
    result?.Items?.[0] ||
    result?.__savedData ||
    fallback
  );
}

function isDescendant(
  rows: ErpProductCategoryApi.ProductCategory[],
  currentId: string,
  nextParentId: string,
) {
  const parentMap = new Map<string, string>();
  rows.forEach((item) => {
    if (!item?.id) return;
    parentMap.set(
      String(item.id),
      normalizeParentId(item.parent_id ?? item.parentId),
    );
  });

  let cursor = nextParentId;
  const visited = new Set<string>();
  while (cursor && cursor !== '000000' && !visited.has(cursor)) {
    if (cursor === currentId) {
      return true;
    }
    visited.add(cursor);
    cursor = parentMap.get(cursor) || '000000';
  }
  return false;
}

async function validateCategoryData(
  data: ErpProductCategoryApi.ProductCategory,
) {
  const currentId = String(data.id ?? '').trim();
  const parentId = normalizeParentId(data.parent_id ?? data.parentId);

  if (currentId && parentId === currentId) {
    ElMessage.warning('上级分类不能选择自身');
    return false;
  }

  const list = await getProductCategoryList();
  if (currentId && isDescendant(list, currentId, parentId)) {
    ElMessage.warning('上级分类不能选择当前分类的下级');
    return false;
  }

  const name = String(data.name ?? '').trim();
  const code = String(data.code ?? '').trim();
  const duplicated = list.find((item) => {
    if (currentId && String(item.id) === currentId) {
      return false;
    }
    const sameParent =
      normalizeParentId(item.parent_id ?? item.parentId) === parentId;
    return (
      sameParent &&
      (String(item.name ?? '').trim() === name ||
        String(item.code ?? '').trim() === code)
    );
  });

  if (duplicated) {
    ElMessage.warning('同一上级下分类名称或编码已存在');
    return false;
  }

  return true;
}

async function handleSubmit() {
  const { valid } = await formApi.validate();
  if (!valid) {
    return;
  }
  modalApi.lock();
  const data =
    (await formApi.getValues()) as ErpProductCategoryApi.ProductCategory;
  const submitData = getDefaultValues(
    Object.assign({}, formData.value, data, {
      name: String(data.name ?? '').trim(),
      code: String(data.code ?? '').trim(),
    }),
  ) as ErpProductCategoryApi.ProductCategory;
  try {
    if (!(await validateCategoryData(submitData))) {
      return;
    }
    const result = await (formData.value?.id
      ? updateProductCategory(submitData)
      : createProductCategory(submitData));
    const savedItem = extractSavedItem(result, submitData);
    emit('success', savedItem);
    await modalApi.close();
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
      await formApi.resetForm();
      return;
    }
    const data = modalApi.getData<ErpProductCategoryApi.ProductCategory>();
    await formApi.resetForm();
    if (!data || !data.id) {
      formData.value = undefined;
      await formApi.setValues(getDefaultValues(data));
      return;
    }
    modalApi.lock();
    try {
      formData.value = (await getProductCategory(data.id)) || data;
      await formApi.setValues(getDefaultValues(formData.value));
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal
    :title="getTitle"
    class="w-1/2"
    content-class="pt-0"
    :show-confirm-button="false"
    :show-cancel-button="false"
    :close-on-click-modal="false"
  >
    <div class="lead-form-actions">
      <ElButton @click="modalApi.close()">取消</ElButton>
      <ElButton type="primary" @click="handleSubmit">确认</ElButton>
    </div>
    <Form class="mx-4" />
  </Modal>
</template>

<style scoped>
.lead-form-actions {
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
