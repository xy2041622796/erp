<script lang="ts" setup>
import type { ErpProductApi } from '#/api/erp/product/product';
import type { ProductCategoryOption } from '../data';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { formatDate, handleTree } from '@vben/utils';

import { useVbenForm } from '#/adapter/form';
import {
  buildNextProductCodeByCategoryCode,
  checkProductCodeExists,
  createProduct,
  getProduct,
  updateProduct,
} from '#/api/erp/product/product';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { WarehousePicker } from '#/components/warehouse-selector';
import { $t } from '#/locales';

import CategoryForm from '../../category/modules/form.vue';
import {
  clearProductCategoryCache,
  useFormSchemaBase,
  useFormSchemaPriceTax,
} from '../data';

import {
  ElButton,
  ElInput,
  ElMessage,
  ElTabPane,
  ElTabs,
  ElTreeSelect,
} from 'element-plus';

const emit = defineEmits(['success']);

const activeTab = ref<'base' | 'price' | 'scope' | 'stock'>('base');
const formData = ref<ErpProductApi.Product>();
const defaultWarehouseId = ref<string | undefined>();
const productCodeInput = ref('');
const isProductCodeManuallyEdited = ref(false);
const lastAutoProductCode = ref('');
const currentCategoryCode = ref('');
const categoryId = ref<number | string | undefined>();
const categoryTreeOptions = ref<any[]>([]);

const getTitle = computed(() =>
  formData.value?.rowid
    ? $t('ui.actionTitle.edit', ['产品'])
    : $t('ui.actionTitle.create', ['产品']),
);

const commonFormConfig = {
  commonConfig: { componentProps: { class: 'w-full' } },
  wrapperClass: 'grid-cols-2',
  layout: 'horizontal',
  showDefaultActions: false,
} as const;

async function loadCategoryOptions() {
  const data = await getProductCategorySimpleList();
  categoryTreeOptions.value = handleTree(Array.isArray(data) ? data : []);
}

async function handleCategoryIdChange(value?: number | string) {
  categoryId.value = value;
  await baseApi.setFieldValue('product_category_id', value);
}

async function handleCategoryChanged(
  category: ProductCategoryOption | null,
  formApi: any,
) {
  currentCategoryCode.value = String(category?.code || '');

  if (!category?.name) {
    await formApi.setFieldValue('product_type', undefined);
  }

  if (!category?.code) {
    if (!isProductCodeManuallyEdited.value && !formData.value?.rowid) {
      lastAutoProductCode.value = '';
      productCodeInput.value = '';
      await formApi.setFieldValue('product_code', '');
    }
    return;
  }

  if (formData.value?.rowid || isProductCodeManuallyEdited.value) {
    return;
  }

  const nextCode = await buildNextProductCodeByCategoryCode(category.code);
  lastAutoProductCode.value = nextCode;
  productCodeInput.value = nextCode;
  await formApi.setFieldValue('product_code', nextCode);
}

const [BaseForm, baseApi] = useVbenForm({
  ...commonFormConfig,
  schema: useFormSchemaBase({
    onCategoryChanged: handleCategoryChanged,
  }),
});
const [PriceForm, priceApi] = useVbenForm({
  ...commonFormConfig,
  schema: useFormSchemaPriceTax(),
});

const [CategoryModal, categoryModalApi] = useVbenModal({
  connectedComponent: CategoryForm,
  destroyOnClose: true,
});

async function resetAll() {
  await baseApi.resetForm();
  await priceApi.resetForm();
  defaultWarehouseId.value = undefined;
  productCodeInput.value = '';
  isProductCodeManuallyEdited.value = false;
  lastAutoProductCode.value = '';
  currentCategoryCode.value = '';
  categoryId.value = undefined;
  activeTab.value = 'base';
}

async function setAllValues(values: any) {
  await baseApi.setValues(values);
  await priceApi.setValues(values);
  defaultWarehouseId.value = values?.default_warehouse_id
    ? String(values.default_warehouse_id)
    : undefined;
  productCodeInput.value = String(values?.product_code || '');
  lastAutoProductCode.value = String(values?.product_code || '');
  categoryId.value = values?.product_category_id;
  currentCategoryCode.value = '';
}

async function handleDefaultWarehouseIdChange(v?: string) {
  defaultWarehouseId.value = v;
  await baseApi.setFieldValue('default_warehouse_id', v);
}

async function handleProductCodeInput(value: string) {
  productCodeInput.value = value;
  isProductCodeManuallyEdited.value =
    value !== '' && value !== lastAutoProductCode.value;
  await baseApi.setFieldValue('product_code', value);
}

async function validateAll() {
  const r1 = await baseApi.validate();
  if (!r1.valid) {
    activeTab.value = 'base';
    return false;
  }

  const r2 = await priceApi.validate();
  if (!r2.valid) {
    activeTab.value = 'price';
    return false;
  }

  return true;
}

async function getMergedValues() {
  const v1 = await baseApi.getValues();
  const v2 = await priceApi.getValues();
  return { ...v1, ...v2 };
}

async function handleRegenerateProductCode() {
  if (!currentCategoryCode.value) {
    ElMessage.warning('请先选择产品分类');
    return;
  }
  const nextCode = await buildNextProductCodeByCategoryCode(
    currentCategoryCode.value,
  );
  lastAutoProductCode.value = nextCode;
  productCodeInput.value = nextCode;
  isProductCodeManuallyEdited.value = false;
  await baseApi.setFieldValue('product_code', nextCode);
}

function handleCreateCategory() {
  categoryModalApi.setData({ parent_id: '000000' }).open();
}

function findCategory(
  items: any[],
  matcher: (item: any) => boolean,
): any | null {
  for (const item of items || []) {
    if (matcher(item)) {
      return item;
    }
    if (Array.isArray(item?.children) && item.children.length > 0) {
      const child = findCategory(item.children, matcher);
      if (child) {
        return child;
      }
    }
  }
  return null;
}

async function handleCategoryCreateSuccess(savedCategory?: any) {
  clearProductCategoryCache();
  const latestTree = await getProductCategorySimpleList();
  categoryTreeOptions.value = handleTree(
    Array.isArray(latestTree) ? latestTree : [],
  );
  const target = findCategory(latestTree, (item) => {
    if (savedCategory?.id && String(item?.id) === String(savedCategory.id)) {
      return true;
    }
    if (
      savedCategory?.code &&
      String(item?.code) === String(savedCategory.code)
    ) {
      return true;
    }
    return (
      !!savedCategory?.name && String(item?.name) === String(savedCategory.name)
    );
  });

  if (!target?.id) {
    ElMessage.success('分类已新增，请重新展开分类下拉后选择');
    return;
  }

  categoryId.value = target.id;
  await baseApi.setFieldValue('product_category_id', target.id);
  await baseApi.setFieldValue('product_type', target.name || '');
  currentCategoryCode.value = String(target.code || '');

  if (
    !formData.value?.rowid &&
    !isProductCodeManuallyEdited.value &&
    currentCategoryCode.value
  ) {
    const nextCode = await buildNextProductCodeByCategoryCode(
      currentCategoryCode.value,
    );
    lastAutoProductCode.value = nextCode;
    productCodeInput.value = nextCode;
    await baseApi.setFieldValue('product_code', nextCode);
  }
}

async function handleSubmit() {
  const ok = await validateAll();
  if (!ok) return;

  modalApi.lock();
  try {
    const data = (await getMergedValues()) as any;
    data.product_code = String(
      productCodeInput.value || data.product_code || '',
    ).trim();

    if (!data.product_category_id) {
      activeTab.value = 'base';
      ElMessage.warning('请选择产品分类');
      return;
    }
    if (!data.product_code) {
      activeTab.value = 'base';
      ElMessage.warning('产品编码不能为空');
      return;
    }

    const exists = await checkProductCodeExists(
      data.product_code,
      formData.value?.rowid,
    );
    if (exists) {
      activeTab.value = 'base';
      ElMessage.warning('产品编码已存在，请手动修改或重新生成');
      return;
    }

    if (data.launch_date) {
      data.launch_date = formatDate(data.launch_date, 'YYYY-MM-DD');
    }
    await (formData.value?.rowid ? updateProduct(data) : createProduct(data));

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
      await resetAll();
      return;
    }

    const payload = modalApi.getData<{ rowid?: string }>();
    if (!payload?.rowid) {
      formData.value = undefined;
      await resetAll();
      await loadCategoryOptions();
      return;
    }

    modalApi.lock();
    try {
      const detail = await getProduct(payload.rowid);
      formData.value = detail as any;
      await resetAll();
      await loadCategoryOptions();
      await setAllValues(formData.value);
      isProductCodeManuallyEdited.value = true;
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal
    :title="getTitle"
    class="w-2/3"
    content-class="pt-0"
    :footer="false"
    :show-confirm-button="false"
    :show-cancel-button="false"
  >
    <CategoryModal @success="handleCategoryCreateSuccess" />
    <div class="modal-top-actions">
      <ElButton @click="modalApi.close()">取消</ElButton>
      <ElButton type="primary" @click="handleSubmit">确认</ElButton>
    </div>

    <div class="mx-4">
      <ElTabs v-model="activeTab" class="mb-2">
        <ElTabPane label="基础信息" name="base" />
        <ElTabPane label="价格策略" name="price" />
      </ElTabs>

      <div v-show="activeTab === 'base'">
        <BaseForm>
          <template #product_code>
            <div class="flex w-full items-center gap-2">
              <ElInput
                :model-value="productCodeInput"
                placeholder="系统自动生成，也可手动修改"
                @update:model-value="handleProductCodeInput"
              />
              <ElButton
                link
                type="primary"
                @click="handleRegenerateProductCode"
              >
                重新生成
              </ElButton>
            </div>
          </template>
          <template #product_category_id>
            <div class="flex w-full items-center gap-2">
              <ElTreeSelect
                v-model="categoryId"
                :data="categoryTreeOptions"
                :props="{ label: 'name', children: 'children' }"
                check-strictly
                clearable
                class="flex-1"
                node-key="id"
                placeholder="请选择产品分类"
                :render-after-expand="false"
                default-expand-all
                @change="handleCategoryIdChange"
              />
              <ElButton link type="primary" @click="handleCreateCategory">
                新增分类
              </ElButton>
            </div>
          </template>

          <template #default_warehouse_id>
            <WarehousePicker
              :model-value="defaultWarehouseId"
              placeholder="请选择默认仓库"
              @update:model-value="handleDefaultWarehouseIdChange"
            />
          </template>
        </BaseForm>
      </div>
      <div v-show="activeTab === 'price'">
        <PriceForm />
      </div>
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
