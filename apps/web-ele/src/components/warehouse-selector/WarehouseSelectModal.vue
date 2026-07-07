<script lang="ts" setup>
import type { ErpWarehouseApi } from '#/api/erp/stock/warehouse';

import { computed, ref } from 'vue';

import {
  ElButton,
  ElDialog,
  ElInput,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { getWarehousePage } from '#/api/erp/stock/warehouse';

defineOptions({ name: 'WarehouseSelectModal' });

const emit = defineEmits<{
  cancel: [];
  confirm: [value: ErpWarehouseApi.Warehouse];
}>();

const queryName = ref('');
const pageNo = ref(1);
const page = ref(10);

const loading = ref(false);
const total = ref(0);
const list = ref<ErpWarehouseApi.Warehouse[]>([]);
const selected = ref<ErpWarehouseApi.Warehouse | null>(null);

const visible = ref(false);
const title = computed(() => '选择仓库');

async function loadData() {
  loading.value = true;
  try {
    const res: any = await getWarehousePage({
      pageNo: pageNo.value,
      page: page.value,
      name: queryName.value,
      status: 0,
    });
    list.value = (res?.list || []) as ErpWarehouseApi.Warehouse[];
    total.value = Number(res?.total || 0);
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pageNo.value = 1;
  selected.value = null;
  loadData();
}

function handleRowClick(row: ErpWarehouseApi.Warehouse) {
  selected.value = row;
}

function handleRowDblClick(row: ErpWarehouseApi.Warehouse) {
  selected.value = row;
  handleConfirm();
}

function handleConfirm() {
  if (!selected.value) return;
  close();
  emit('confirm', selected.value);
}

function open() {
  visible.value = true;
  queryName.value = '';
  pageNo.value = 1;
  page.value = 10;
  selected.value = null;
  loadData();
}

function close() {
  visible.value = false;
}

function handleCancel() {
  if (!visible.value) return;
  emit('cancel');
  close();
}

defineExpose({ open, close });
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="title"
    width="min(56.25rem, 92vw)"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    @close="handleCancel"
  >
    <div class="px-4">
      <div class="mb-3 flex gap-2">
        <ElInput
          v-model="queryName"
          placeholder="请输入仓库名称"
          clearable
          @keyup.enter="handleSearch"
        />
        <ElButton type="primary" @click="handleSearch">查询</ElButton>
      </div>

      <ElTable
        v-loading="loading"
        :data="list"
        border
        highlight-current-row
        style="width: 100%; height: 420px"
        @row-click="handleRowClick"
        @row-dblclick="handleRowDblClick"
      >
        <ElTableColumn type="index" label="#" width="60" align="center" />
        <ElTableColumn prop="name" label="仓库名称" min-width="180" />
        <ElTableColumn prop="address" label="地址" min-width="220" />
        <ElTableColumn prop="principal" label="负责人" min-width="120" />
        <ElTableColumn
          prop="remark"
          label="备注"
          min-width="220"
          show-overflow-tooltip
        />
      </ElTable>

      <div class="mt-4 flex items-center justify-between">
        <ElPagination
          v-model:current-page="pageNo"
          v-model:page-size="page"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadData"
        />

        <div class="flex gap-2">
          <ElButton @click="handleCancel">取消</ElButton>
          <ElButton type="primary" :disabled="!selected" @click="handleConfirm">
            确定
          </ElButton>
        </div>
      </div>
    </div>
  </ElDialog>
</template>
