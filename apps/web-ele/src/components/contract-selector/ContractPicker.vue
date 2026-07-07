<script lang="ts" setup>
import { ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useVbenModal } from '@vben/common-ui';

import type { ContractSelectQueryApi, ContractSelectRow } from './ContractSelectModal.vue';
import ContractSelectModal from './ContractSelectModal.vue';

import { ElIcon, ElInput } from 'element-plus';

defineOptions({ name: 'ContractPicker' });

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    disabled?: boolean;
    customerId?: string;
    contractCategory?: number;
    api: ContractSelectQueryApi<ContractSelectRow>;
    getById?: (id: string) => Promise<ContractSelectRow | null | undefined>;
  }>(),
  {
    placeholder: '请选择关联合同',
    disabled: false,
    customerId: undefined,
    contractCategory: undefined,
    getById: undefined,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value?: string];
  'update:data': [value?: ContractSelectRow];
  change: [value?: ContractSelectRow];
}>();

const displayLabel = ref('');
const loading = ref(false);

const [ContractSelectModalComp, contractSelectModalApi] = useVbenModal({
  connectedComponent: ContractSelectModal,
  destroyOnClose: true,
});

function openModal() {
  if (props.disabled) return;
  contractSelectModalApi
    .setData({ customerId: props.customerId, contract_category: props.contractCategory })
    .open();
}

function handleConfirm(contract: ContractSelectRow) {
  const id = String((contract as any).rowid ?? '');
  displayLabel.value = (contract as any).contract_no || (contract as any).contract_name || id;
  emit('update:modelValue', id || undefined);
  emit('update:data', contract);
  emit('change', contract);
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

  if (!props.getById) {
    displayLabel.value = id;
    return;
  }

  loading.value = true;
  try {
    const c: any = await props.getById(id);
    displayLabel.value = c?.contract_no || c?.contract_name || id;
  } catch (e) {
    console.error(e);
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
  <div class="w-full flex items-center">
    <ElInput
      v-model="displayLabel"
      readonly
      :placeholder="placeholder"
      :disabled="disabled"
      :loading="loading"
      class="cursor-pointer"
      @click="openModal"
    >
      <template #suffix>
        <el-icon v-if="modelValue && !disabled" class="cursor-pointer mr-1" @click.stop="handleClear">
          <IconifyIcon icon="lucide:circle-x" />
        </el-icon>
      </template>
    </ElInput>

    <ContractSelectModalComp :api="api" @confirm="handleConfirm" />
  </div>
</template>

<style scoped>
:deep(.el-input__inner) {
  cursor: pointer;
}
</style>
