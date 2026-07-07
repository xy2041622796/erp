<script lang="ts" setup>
import type { CrmCustomerApi } from '#/api/erp/customer';

import { ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';


import { getCustomer } from '#/api/erp/customer';

import CustomerSelectModal from './CustomerSelectModal.vue';

import { ElIcon, ElInput } from 'element-plus';

defineOptions({ name: 'CustomerPicker' });

const props = withDefaults(
  defineProps<{
    companyType?: 'customer' | 'supplier';
    disabled?: boolean;
    modelValue?: string;
    placeholder?: string;
  }>(),
  {
    companyType: 'customer',
  },
);

const emit = defineEmits<{
  change: [value?: CrmCustomerApi.Customer];
  'update:data': [value?: CrmCustomerApi.Customer];
  'update:modelValue': [value?: string];
}>();

const displayLabel = ref('');
const loading = ref(false);

const modalRef = ref<null | { close: () => void; open: () => void }>(null);

function openModal() {
  if (props.disabled) return;
  modalRef.value?.open();
}

function handleConfirm(customer: CrmCustomerApi.Customer) {
  const id = String((customer as any).id ?? (customer as any).rowid ?? '');
  displayLabel.value = (customer as any).customerName || (customer as any).name || id;
  emit('update:modelValue', id || undefined);
  emit('update:data', customer);
  emit('change', customer);
}

function handleClear() {
  displayLabel.value = '';
  emit('update:modelValue', undefined);
  emit('update:data', undefined);
  emit('change', undefined);
}

async function resolveName(id?: string) {
  if (!id) {
    displayLabel.value = '';
    return;
  }
  loading.value = true;
  try {
    const c: any = await getCustomer(id);
    displayLabel.value = c?.customerName || c?.name || id;
  } catch (error) {
    console.error(error);
    displayLabel.value = id;
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.modelValue,
  (val) => {
    resolveName(val);
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex w-full items-center">
    <ElInput
      v-model="displayLabel"
      readonly
      :placeholder="placeholder || (companyType === 'supplier' ? '请选择供应商' : '请选择客户')"
      :disabled="disabled"
      :loading="loading"
      class="cursor-pointer"
      @click="openModal"
    >
      <template #suffix>
        <el-icon
          v-if="modelValue && !disabled"
          class="mr-1 cursor-pointer"
          @click.stop="handleClear"
        >
          <IconifyIcon icon="lucide:circle-x" />
        </el-icon>
      </template>
    </ElInput>

    <CustomerSelectModal ref="modalRef" :company-type="companyType" @confirm="handleConfirm" />
  </div>
</template>

<style scoped>
:deep(.el-input__inner) {
  cursor: pointer;
}
</style>
