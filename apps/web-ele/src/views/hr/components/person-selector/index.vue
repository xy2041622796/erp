<script lang="ts" setup>
import { computed } from 'vue';

import { StaffPicker } from '#/components/staff-selector';

interface PersonSelectorValueItem {
  UserId: string;
  UserName: string;
}

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    max?: number;
    placeholder?: string;
    value?: PersonSelectorValueItem[];
  }>(),
  {
    disabled: false,
    max: 0,
    placeholder: '请选择人员',
    value: () => [],
  },
);

const emit = defineEmits<{
  confirm: [value: PersonSelectorValueItem[]];
}>();

const modelValue = computed(() => {
  return (props.value || []).map((item) => String(item.UserId || '').trim()).filter(Boolean);
});

/** 将已有的 UserId→UserName 映射传给 StaffPicker，避免重复查询失败时显示工号 */
const resolvedNames = computed(() => {
  const map: Record<string, string> = {};
  for (const item of props.value || []) {
    const id = String(item.UserId || '').trim();
    const name = String(item.UserName || '').trim();
    // 过滤掉 fallback 情况（UserName 等于 UserId，说明不是真实姓名）
    if (id && name && id !== name) {
      map[id] = name;
    }
  }
  return map;
});

function handleChange(rows?: any[] | any) {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  const next = list
    .map((item) => ({
      UserId: String(item.ROWID || item.rowid || item.ID || item.UserID || '').trim(),
      UserName: String(item.UserName || item.LoginName || item.ROWID || '').trim(),
    }))
    .filter((item) => item.UserId);

  emit('confirm', props.max > 0 ? next.slice(0, props.max) : next);
}
</script>

<template>
  <StaffPicker
    :model-value="modelValue"
    :resolved-names="resolvedNames"
    multiple
    :disabled="disabled"
    :placeholder="placeholder"
    @change="handleChange"
  />
</template>
