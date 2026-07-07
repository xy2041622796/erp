<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';

import { computed, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';


import { getStaffById, getStaffByIds } from '#/api/common/staff-selector';

import StaffSelectModal from './StaffSelectModal.vue';

import { ElIcon, ElInput } from 'element-plus';

defineOptions({ name: 'StaffPicker' });

type ModelValue = string | string[] | undefined;

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    modelValue?: ModelValue;
    multiple?: boolean;
    placeholder?: string;
    /** 预解析的 ID->姓名映射，优先于远程查询 */
    resolvedNames?: Record<string, string>;
    required?: boolean;
  }>(),
  {
    disabled: false,
    modelValue: undefined,
    multiple: false,
    placeholder: undefined,
    resolvedNames: () => ({}),
    required: true,
  },
);

const emit = defineEmits<{
  change: [value?: Staff | Staff[]];
  'update:data': [value?: Staff | Staff[]];
  'update:modelValue': [value?: ModelValue];
}>();

const displayLabel = ref('');
const loading = ref(false);

const normalizedIds = computed(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue)
      ? props.modelValue.map((item) => String(item ?? '').trim()).filter(Boolean)
      : [];
  }
  return props.modelValue ? [String(props.modelValue).trim()] : [];
});

const [Modal, modalApi] = useVbenModal({
  connectedComponent: StaffSelectModal,
  destroyOnClose: true,
});

function openModal() {
  if (props.disabled) return;
  modalApi.open();
}

function handleConfirm(staff?: Staff | Staff[]) {
  if (props.multiple) {
    const rows = Array.isArray(staff) ? staff : staff ? [staff] : [];
    displayLabel.value = rows.map((item) => item.UserName).filter(Boolean).join('、');
    emit(
      'update:modelValue',
      rows.map((item) => item.ROWID),
    );
    emit('change', rows);
    emit('update:data', rows);
    return;
  }

  const row = Array.isArray(staff) ? staff[0] : staff;
  if (!row) {
    handleClear();
    return;
  }
  displayLabel.value = row.UserName;
  emit('update:modelValue', row.ROWID);
  emit('change', row);
  emit('update:data', row);
}

function handleClear() {
  displayLabel.value = '';
  emit('update:modelValue', props.multiple ? [] : undefined);
  emit('change', undefined);
  emit('update:data', undefined);
}

async function resolveNames(value?: ModelValue) {
  const ids = props.multiple
    ? Array.isArray(value)
      ? value.map((item) => String(item ?? '').trim()).filter(Boolean)
      : []
    : value
      ? [String(value).trim()]
      : [];

  if (ids.length === 0) {
    displayLabel.value = '';
    return;
  }

  // 优先使用调用方传入的预解析姓名，所有 ID 都有映射时直接显示，跳过远程查询
  const names = props.resolvedNames || {};
  const allResolved = ids.every((id) => names[id]);
  if (allResolved) {
    displayLabel.value = ids.map((id) => names[id]).join('、');
    return;
  }

  loading.value = true;
  try {
    if (props.multiple) {
      const rows = await getStaffByIds(ids);
      const merged = names;
      displayLabel.value = ids
        .map((id) => {
          const row = rows.find((r) => String(r.ROWID) === id);
          return row?.UserName || merged[id] || id;
        })
        .join('、');
      return;
    }

    const staff = await getStaffById(ids[0]!);
    if (staff) {
      displayLabel.value = staff.UserName;
    } else {
      displayLabel.value = names[ids[0]!] || ids[0]!;
    }
  } catch (error) {
    console.error(error);
    displayLabel.value = ids.map((id) => names[id] || id).join('、');
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.modelValue,
  (val) => {
    resolveNames(val);
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <div class="flex w-full items-center">
    <ElInput
      v-model="displayLabel"
      readonly
      :placeholder="placeholder || (multiple ? '请选择人员（可多选）' : '请选择人员')"
      :disabled="disabled"
      :loading="loading"
      @click="openModal"
      class="cursor-pointer"
    >
      <template #suffix>
        <el-icon
          v-if="normalizedIds.length > 0 && !disabled"
          class="mr-1 cursor-pointer"
          @click.stop="handleClear"
        >
          <IconifyIcon icon="lucide:circle-x" />
        </el-icon>
      </template>
    </ElInput>
    <Modal
      :multiple="multiple"
      :required="required"
      :value="modelValue"
      @confirm="handleConfirm"
    />
  </div>
</template>
<style scoped>
:deep(.el-input__inner) {
  cursor: pointer;
}
</style>
