<script lang="ts" setup>
import type { ErpProjectApi } from '#/api/erp/contract/project';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { getProjectPage } from '#/api/erp/contract/project';

import {
  ElButton,
  ElInput,
  ElMessage,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'ProjectSelectModal' });

withDefaults(
  defineProps<{
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
  confirm: [value: ErpProjectApi.Project];
  'update:value': [value: string | undefined];
}>();

const query = ref({
  project_name: '',
  project_code: '',
});

const customerId = ref<string | undefined>();

const loading = ref(false);
const list = ref<ErpProjectApi.Project[]>([]);
const page = ref({
  current: 1,
  page: 10,
  total: 0,
});

const selectedRow = ref<ErpProjectApi.Project>();
const selectedRowId = computed(() => selectedRow.value?.rowid);

async function loadData(pageNo = 1, page = page.value.page) {
  loading.value = true;
  try {
    const res = await getProjectPage({
      pageNo,
      page,
      showExpired: false,
      customer_id: customerId.value,
      ...query.value,
    });
    list.value = (res.list ?? []) as ErpProjectApi.Project[];
    page.value.current = pageNo;
    page.value.page = page;
    page.value.total = Number(res.total ?? 0);
  } finally {
    loading.value = false;
  }
}

function resetState() {
  query.value = { project_name: '', project_code: '' };
  customerId.value = undefined;
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

function handleRowClick(row: ErpProjectApi.Project) {
  selectedRow.value = row;
}

function handleRowDblclick(row: ErpProjectApi.Project) {
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

    const data = modalApi.getData() as any;
    customerId.value = data?.customer_id ?? data?.customerId;

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
  <Modal :title="title" class="w-3/5">
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
        <div class="text-sm text-gray-500">已选：{{ selectedRowId || '未选择' }}</div>
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
        <ElButton @click="handleCancel">{{ cancelText }}</ElButton>
        <ElButton type="primary" @click="handleConfirm">{{ confirmText }}</ElButton>
      </div>
    </template>
  </Modal>
</template>
