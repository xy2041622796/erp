<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';

import { getProjectManage, getProjectManageOptionsPage } from '#/api/erp/project/manage';

import { ElOption, ElPagination, ElSelect } from 'element-plus';

const props = withDefaults(defineProps<{
  modelValue?: string;
  disabled?: boolean;
  placeholder?: string;
  clearable?: boolean;
  pageSize?: number;
}>(), {
  modelValue: '',
  disabled: false,
  placeholder: '请选择项目',
  clearable: true,
  pageSize: 20,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [value: string, row?: Record<string, any>];
}>();

const loading = ref(false);
const keyword = ref('');
const pageNo = ref(1);
const total = ref(0);
const rows = ref<Record<string, any>[]>([]);

const selectedValue = computed({
  get: () => String(props.modelValue || ''),
  set: (value: string) => {
    const next = String(value || '').trim();
    emit('update:modelValue', next);
    emit('change', next, rows.value.find((row) => String(row?.rowid || '') === next));
  },
});

function getProjectLabel(project: Record<string, any>) {
  const code = String(project?.project_code || '').trim();
  const name = String(project?.project_name || '').trim();
  if (code && name) return `${code} - ${name}`;
  return name || code || String(project?.rowid || '').trim();
}

function mergeSelectedRow(row?: Record<string, any> | null) {
  if (!row?.rowid) return;
  const id = String(row.rowid);
  if (rows.value.some((item) => String(item?.rowid || '') === id)) return;
  rows.value = [row, ...rows.value];
}

async function loadOptions(reset = false) {
  if (reset) pageNo.value = 1;
  loading.value = true;
  try {
    const res = await getProjectManageOptionsPage({
      pageNo: pageNo.value,
      page: props.pageSize,
      q: keyword.value,
    } as any);
    rows.value = Array.isArray(res?.list) ? res.list : [];
    total.value = Number(res?.total || rows.value.length || 0);
    if (selectedValue.value && !rows.value.some((row) => String(row?.rowid || '') === selectedValue.value)) {
      mergeSelectedRow(await getProjectManage(selectedValue.value));
    }
  } finally {
    loading.value = false;
  }
}

async function handleRemoteSearch(query: string) {
  keyword.value = String(query || '').trim();
  await loadOptions(true);
}

async function handlePageChange(current: number) {
  pageNo.value = current;
  await loadOptions(false);
}

watch(() => props.modelValue, async (value) => {
  const id = String(value || '').trim();
  if (!id) return;
  if (rows.value.some((row) => String(row?.rowid || '') === id)) return;
  mergeSelectedRow(await getProjectManage(id));
});

onMounted(() => loadOptions(true));
</script>

<template>
  <ElSelect
    v-model="selectedValue"
    :disabled="disabled"
    :loading="loading"
    :placeholder="placeholder"
    :clearable="clearable"
    class="!w-full"
    filterable
    remote
    reserve-keyword
    :remote-method="handleRemoteSearch"
  >
    <ElOption
      v-for="project in rows"
      :key="String(project.rowid)"
      :label="getProjectLabel(project)"
      :value="String(project.rowid)"
    />
    <template #footer>
      <div class="project-picker-footer">
        <ElPagination
          small
          background
          layout="prev, pager, next"
          :current-page="pageNo"
          :page-size="pageSize"
          :total="total"
          @current-change="handlePageChange"
        />
      </div>
    </template>
  </ElSelect>
</template>

<style scoped>
.project-picker-footer {
  display: flex;
  justify-content: center;
  padding: 8px 4px 4px;
}
</style>
