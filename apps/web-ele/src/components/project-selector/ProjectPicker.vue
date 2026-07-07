<script lang="ts" setup>
import { ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useVbenModal } from '@vben/common-ui';

import type {
  ProjectSelectQueryApi,
  ProjectSelectRow,
} from './ProjectSelectModal.vue';
import ProjectSelectModal from './ProjectSelectModal.vue';

import { ElIcon, ElInput } from 'element-plus';

defineOptions({ name: 'ProjectPicker' });

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    disabled?: boolean;
    customerId?: string;
    api: ProjectSelectQueryApi<ProjectSelectRow>;
    getById?: (id: string) => Promise<ProjectSelectRow | null | undefined>;
  }>(),
  {
    placeholder: '请选择项目',
    disabled: false,
    customerId: undefined,
    getById: undefined,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value?: string];
  'update:data': [value?: ProjectSelectRow];
  change: [value?: ProjectSelectRow];
}>();

const displayLabel = ref('');
const loading = ref(false);

const [ProjectSelectModalComp, projectSelectModalApi] = useVbenModal({
  connectedComponent: ProjectSelectModal,
  destroyOnClose: true,
});

function openModal() {
  if (props.disabled) return;
  projectSelectModalApi.setData({ customer_id: props.customerId }).open();
}

function handleConfirm(project: ProjectSelectRow) {
  const id = String((project as any).rowid ?? '');
  displayLabel.value =
    (project as any).project_name || (project as any).project_code || id;
  emit('update:modelValue', id || undefined);
  emit('update:data', project);
  emit('change', project);
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
    const p: any = await props.getById(id);
    displayLabel.value = p?.project_name || p?.project_code || id;
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
  <div class="flex w-full items-center" @click="openModal">
    <ElInput
      v-model="displayLabel"
      readonly
      :placeholder="placeholder"
      :disabled="disabled"
      :loading="loading"
      class="cursor-pointer"
      @click.stop="openModal"
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

    <ProjectSelectModalComp :api="api" @confirm="handleConfirm" />
  </div>
</template>

<style scoped>
:deep(.el-input__inner) {
  cursor: pointer;
}
</style>
