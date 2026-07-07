<script lang="ts" setup>
import type { ErpProductApi } from '#/api/erp/product/product';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { getProductPage } from '#/api/erp/product/product';
import {
  type ErpProductCategoryApi,
  getProductCategorySimpleList,
} from '#/api/erp/product/category';

import {
  ElButton,
  ElInput,
  ElMessage,
  ElPagination,
  ElScrollbar,
  ElTable,
  ElTableColumn,
  ElTree,
} from 'element-plus';

defineOptions({ name: 'ProductSelectModal' });

const props = withDefaults(
  defineProps<{
    cancelText?: string;
    confirmText?: string;
    title?: string;
    value?: string;
    multiple?: boolean;
  }>(),
  {
    title: '选择产品',
    confirmText: '确定',
    cancelText: '取消',
    value: undefined,
    multiple: false,
  },
);

const emit = defineEmits<{
  cancel: [];
  closed: [];
  confirm: [value: ErpProductApi.Product | ErpProductApi.Product[]];
  'update:value': [value: string | undefined];
}>();

const query = ref({
  product_name: '',
  product_code: '',
  barcode: '',
});

const categoryTree = ref<ErpProductCategoryApi.ProductCategory[]>([]);
const selectedCategoryId = ref<string | undefined>();

const loading = ref(false);
const list = ref<ErpProductApi.Product[]>([]);
const page = ref({
  current: 1,
  page: 10,
  total: 0,
});

const tableRef = ref<InstanceType<typeof ElTable>>();
const selectedRow = ref<ErpProductApi.Product>();
const selectedRows = ref<ErpProductApi.Product[]>([]);
let selectionChanging = false;

function getProductName(item: ErpProductApi.Product) {
  return item.product_name || '';
}
function getProductId(item: ErpProductApi.Product) {
  return String(item.id ?? item.rowid ?? '');
}

const selectedRowIdsText = computed(() => {
  if (props.multiple) {
    return selectedRows.value
      .map((item) => getProductName(item) || getProductId(item))
      .filter(Boolean)
      .join(', ');
  }
  return selectedRow.value?.rowid;
});

async function loadData(pageNo = 1, pageSize = page.value.page) {
  loading.value = true;
  try {
    const res = await getProductPage({
      pageNo,
      page: pageSize,
      ...query.value,
      product_category_id: selectedCategoryId.value,
    });
    list.value = (res.list ?? []) as ErpProductApi.Product[];
    page.value.current = pageNo;
    page.value.page = pageSize;
    page.value.total = Number(res.total ?? 0);
    if (page.value.total === 0 && list.value.length > 0) {
      page.value.total = list.value.length;
    }
  } finally {
    loading.value = false;
  }
}

function resetState() {
  query.value = { product_name: '', product_code: '', barcode: '' };
  list.value = [];
  page.value = { current: 1, page: 10, total: 0 };
  selectedRow.value = undefined;
  selectedRows.value = [];
  selectedCategoryId.value = undefined;
}

async function loadCategoryTree() {
  const tree =
    (await getProductCategorySimpleList()) as ErpProductCategoryApi.ProductCategory[];
  categoryTree.value = Array.isArray(tree) ? tree : [];
}

async function handleCategorySelect(node: any) {
  selectedCategoryId.value = node?.id ? String(node.id) : undefined;
  await loadData(1, page.value.page);
}

async function handleClearCategory() {
  selectedCategoryId.value = undefined;
  await loadData(1, page.value.page);
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
  if (props.multiple) {
    if (!selectedRows.value.length) {
      ElMessage.warning('请选择至少一个产品');
      return;
    }
    emit('confirm', selectedRows.value);
    modalApi.close();
    return;
  }
  if (!selectedRow.value?.rowid) {
    ElMessage.warning('请选择一个产品');
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

function handleRowClick(row: ErpProductApi.Product) {
  selectedRow.value = row;
  if (props.multiple && tableRef.value && !selectionChanging) {
    tableRef.value.toggleRowSelection(row);
  }
}

function handleRowDblclick(row: ErpProductApi.Product) {
  if (props.multiple) return;
  selectedRow.value = row;
  handleConfirm();
}

function handleSelectionChange(rows: ErpProductApi.Product[]) {
  selectionChanging = true;
  selectedRows.value = Array.isArray(rows) ? rows : [];
  setTimeout(() => {
    selectionChanging = false;
  }, 0);
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
      await loadCategoryTree();
      await loadData(1, page.value.page);
    } finally {
      modalApi.unlock();
    }
  },
  destroyOnClose: true,
});

function open() {
  modalApi.open();
}

defineExpose({ open, modalApi });
</script>

<template>
  <Modal :title="title" class="w-3/5">
    <div class="flex gap-4 px-6">
      <div class="w-56 shrink-0 rounded border border-border bg-background">
        <div class="flex items-center justify-between border-b border-border px-3 py-2">
          <span class="text-sm font-medium">产品分类</span>
          <ElButton link type="primary" @click="handleClearCategory">全部</ElButton>
        </div>
        <ElScrollbar height="420px" class="px-2 py-2">
          <ElTree
            :data="categoryTree"
            node-key="id"
            :props="{ label: 'name', children: 'children' }"
            highlight-current
            :current-node-key="selectedCategoryId"
            @node-click="handleCategorySelect"
          />
        </ElScrollbar>
      </div>

      <div class="min-w-0 flex-1">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <ElInput
            v-model="query.product_name"
            placeholder="产品名称"
            clearable
            class="!w-60"
            @keyup.enter="handleSearch"
          />
          <ElInput
            v-model="query.product_code"
            placeholder="产品编码"
            clearable
            class="!w-60"
            @keyup.enter="handleSearch"
          />
          <ElInput
            v-model="query.barcode"
            placeholder="条码"
            clearable
            class="!w-60"
            @keyup.enter="handleSearch"
          />
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
        </div>

        <ElTable
          ref="tableRef"
          v-loading="loading"
          :data="list"
          border
          style="width: 100%"
          :highlight-current-row="!multiple"
          @selection-change="handleSelectionChange"
          @row-click="handleRowClick"
          @row-dblclick="handleRowDblclick"
        >
          <ElTableColumn
            v-if="multiple"
            type="selection"
            width="55"
            align="center"
          />
          <ElTableColumn type="index" label="序号" width="80" align="center" />
          <ElTableColumn prop="product_name" label="产品" min-width="200" />
          <ElTableColumn prop="model" label="规格" width="160" />
          <ElTableColumn prop="unit" label="单位" width="100" align="center" />
          <ElTableColumn label="数量" width="100" align="right">
            <template #default>1</template>
          </ElTableColumn>
          <ElTableColumn prop="retail_price" label="销售单价" width="130" align="right">
            <template #default="{ row }">{{ Number(row.retail_price || 0).toFixed(2) }}</template>
          </ElTableColumn>
          <ElTableColumn label="折扣" width="100" align="center">
            <template #default>无</template>
          </ElTableColumn>
          <ElTableColumn label="税率(%)" width="120" align="right">
            <template #default="{ row }">{{ row.retail_tax?.replace('%', '') || 0 }}</template>
          </ElTableColumn>
          <ElTableColumn label="金额" width="130" align="right">
            <template #default="{ row }">{{ Number(row.retail_price || 0).toFixed(2) }}</template>
          </ElTableColumn>
          <ElTableColumn prop="barcode" label="条码" width="180" />
        </ElTable>

        <div class="mt-3 flex items-center justify-between">
          <div class="text-sm text-gray-500">已选：{{ selectedRowIdsText || '未选择' }}</div>
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
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-3 px-6">
        <ElButton @click.stop="handleCancel">{{ cancelText }}</ElButton>
        <ElButton type="primary" @click.stop="handleConfirm">{{ confirmText }}</ElButton>
      </div>
    </template>
  </Modal>
</template>
