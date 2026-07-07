<script lang="ts" setup>
import type { ErpWarehouseApi } from '#/api/erp/stock/warehouse';

import { ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';


import {
  getWarehouse,
} from '#/api/erp/stock/warehouse';

import WarehouseSelectModal from './WarehouseSelectModal.vue';

import { ElIcon, ElInput } from 'element-plus';

defineOptions({ name: 'WarehousePicker' });

const props = defineProps<{
  disabled?: boolean;
  modelValue?: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  change: [value?: ErpWarehouseApi.Warehouse];
  'update:data': [value?: ErpWarehouseApi.Warehouse];
  'update:modelValue': [value?: string];
}>();

const displayLabel = ref('');
const loading = ref(false);
const modalRef = ref<null | { close: () => void; open: () => void }>(null);

function openModal() {
  if (props.disabled) return;
  modalRef.value?.open();
}

function handleConfirm(warehouse: ErpWarehouseApi.Warehouse) {
  const id = String((warehouse as any).rowid ?? (warehouse as any).id ?? '');
  displayLabel.value = warehouse?.name || id;
  emit('update:modelValue', id || undefined);
  emit('update:data', warehouse);
  emit('change', warehouse);
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
    const w = (await getWarehouse(id)) as ErpWarehouseApi.Warehouse | null;
    displayLabel.value = w?.name || id;
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
      :placeholder="placeholder || '请选择默认仓库'"
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

    <WarehouseSelectModal ref="modalRef" @confirm="handleConfirm" />
  </div>
</template>

<style scoped>
:deep(.el-input__inner) {
  cursor: pointer;
}
</style>
