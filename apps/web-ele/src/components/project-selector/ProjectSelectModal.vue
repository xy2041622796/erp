<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  ElButton,
  ElInput,
  ElMessage,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';


type QueryApiResult<T = any> = Record<string, any> & {
  list?: T[];
  total?: number;
};

export type ProjectSelectQueryApi<T = any> = (
  params: any,
) => Promise<QueryApiResult<T>>;

export type ProjectSelectRow = Record<string, any> & {
  project_code?: string;
  project_group?: string;
  project_name?: string;
  project_status?: number;
  rowid?: string;
};

defineOptions({ name: 'ProjectSelectModal' });

const props = withDefaults(
  defineProps<{
    api: ProjectSelectQueryApi<ProjectSelectRow>;
    cancelText?: string;
    confirmText?: string;
    title?: string;
    value?: string;
  }>(),
  {
    title: '选择项目',
    confirmText: '确定',
    cancelText: '取消',
    value: undefined,
  },
);

const emit = defineEmits<{
  cancel: [];
  closed: [];
  confirm: [value: ProjectSelectRow];
  'update:value': [value: string | undefined];
}>();

const query = ref({
  project_name: '',
  project_code: '',
});

const loading = ref(false);
const list = ref<ProjectSelectRow[]>([]);
const page = ref({
  current: 1,
  page: 10,
  total: 0,
});

const selectedRow = ref<ProjectSelectRow>();
const selectedRowId = computed(() => selectedRow.value?.rowid);
const selectedRowDisplay = computed(() => selectedRow.value?.project_name || selectedRow.value?.rowid || '未选择');

async function loadData(pageNo = 1, page = page.value.page) {
  loading.value = true;
  try {
    const data = (modalApi.getData() as any) ?? {};
    const res = await props.api({
      pageNo,
      page,
      showExpired: false,
      ...data,
      ...query.value,
    });

    list.value = (res.list ?? []) as ProjectSelectRow[];
    page.value.current = pageNo;
    page.value.page = page;
    page.value.total = Number(res.total ?? 0);
  } finally {
    loading.value = false;
  }
}

function resetState() {
  query.value = { project_name: '', project_code: '' };
  list.value = [];
  page.value = { current: 1, page: 10, total: 0 };
  selectedRow.value = undefined;
}

function handleCancel() {
  emit('cancel');
  modalApi.close();
}

function handleClosed() {
  resetState();
  emit('closed');
}

function handleConfirm() {
  if (!selectedRow.value?.rowid) {
    ElMessage.warning('请选择一个项目');
    return;
  }
  emit('update:value', selectedRow.value.rowid);
  emit('confirm', selectedRow.value);
  modalApi.close();
}

async function handleSearch() {
  await loadData(1, page.value.page);
}

async function handlePageChange(currentPage: number) {
  await loadData(currentPage, page.value.page);
}

async function handlePageSizeChange(page: number) {
  await loadData(1, page);
}

function handleRowClick(row: ProjectSelectRow) {
  selectedRow.value = row;
}

function handleRowDblclick(row: ProjectSelectRow) {
  selectedRow.value = row;
  handleConfirm();
}

const [Modal, modalApi] = useVbenModal({
  onCancel: handleCancel,
  onClosed: handleClosed,
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      resetState();
      return;
    }

    modalApi.lock();
    try {
      await loadData(1, page.value.page);
      modalApi.open();
    } finally {
      modalApi.unlock();
    }
  },
  destroyOnClose: true,
});
</script>

<template>
  <Modal :title="props.title" centered class="w-3/5">
    <div class="px-6">
      <div class="mb-3 flex items-center gap-2">
        <ElInput
          v-model="query.project_name"
          placeholder="项目名称"
          clearable
          class="!w-60"
          @keyup.enter="handleSearch"
        />
        <ElInput
          v-model="query.project_code"
          placeholder="项目编码"
          clearable
          class="!w-60"
          @keyup.enter="handleSearch"
        />
        <ElButton type="primary" @click="handleSearch">查询</ElButton>
      </div>

      <ElTable
        v-loading="loading"
        :data="list"
        border
        style="width: 100%"
        highlight-current-row
        :row-key="(row) => row.rowid"
        @row-click="handleRowClick"
        @row-dblclick="handleRowDblclick"
      >
        <ElTableColumn prop="project_code" label="编码" width="160" />
        <ElTableColumn prop="project_name" label="名称" min-width="240" />
        <ElTableColumn prop="project_group" label="项目组" width="140" />
        <ElTableColumn prop="project_status" label="状态" width="110" />
      </ElTable>

      <div class="mt-3 flex items-center justify-between">
        <div class="text-sm text-gray-500">
          已选：{{ selectedRowDisplay }}
        </div>
        <ElPagination
          background
          layout="total, sizes, prev, pager, next"
          :total="page.total"
          :page-size="page.page"
          :current-page="page.current"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-3 px-6">
        <ElButton @click="handleCancel">{{ props.cancelText }}</ElButton>
        <ElButton type="primary" @click="handleConfirm">
          {{ props.confirmText }}
        </ElButton>
      </div>
    </template>
  </Modal>
</template>
