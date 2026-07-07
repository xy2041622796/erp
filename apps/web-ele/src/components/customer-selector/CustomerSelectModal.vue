<script lang="ts" setup>
import { computed, ref } from 'vue';


import type { CrmCustomerApi } from '#/api/erp/customer';
import { getCustomerPage } from '#/api/erp/customer';

import {
  ElButton,
  ElDialog,
  ElInput,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'CustomerSelectModal' });

const props = withDefaults(
  defineProps<{
    companyType?: 'customer' | 'supplier';
  }>(),
  {
    companyType: 'customer',
  },
);

const emit = defineEmits<{
  cancel: [];
  confirm: [value: CrmCustomerApi.Customer];
}>();

const queryName = ref('');
const pageNo = ref(1);
const page = ref(10);

const loading = ref(false);
const total = ref(0);
const list = ref<CrmCustomerApi.Customer[]>([]);
const selected = ref<CrmCustomerApi.Customer | null>(null);

const isSupplier = computed(() => props.companyType === 'supplier');
const title = computed(() => (isSupplier.value ? '选择供应商' : '选择客户'));
const nameLabel = computed(() => (isSupplier.value ? '供应商名称' : '客户名称'));
const codeLabel = computed(() => (isSupplier.value ? '供应商编码' : '客户编码'));
const queryPlaceholder = computed(() => `请输入${isSupplier.value ? '供应商' : '客户'}名称`);

const visible = ref(false);

async function loadData() {
  loading.value = true;
  try {
    const res: any = await getCustomerPage({
      pageNo: pageNo.value,
      page: page.value,
      name: queryName.value,
      companyType: isSupplier.value ? 2 : 1,
      includeAllStates: true,
    } as any);

    list.value = (res?.list || []) as CrmCustomerApi.Customer[];
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

function handleRowDblClick(row: CrmCustomerApi.Customer) {
  selected.value = row;
  handleConfirm();
}

function handleConfirmRow(row: CrmCustomerApi.Customer) {
  selected.value = row;
  close();
  emit('confirm', row);
}

function handleConfirm() {
  if (!selected.value) return;
  handleConfirmRow(selected.value);
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
    width="min(62.5rem, 96vw)"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    @close="handleCancel"
  >
    <div class="customer-select-body px-4">
      <div class="mb-3 flex gap-2">
        <ElInput
          v-model="queryName"
          :placeholder="queryPlaceholder"
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
        class="customer-select-table"
        style="width: 100%"
        table-layout="fixed"
        @row-dblclick="handleRowDblClick"
      >
        <ElTableColumn type="index" label="#" width="60" align="center" />
        <ElTableColumn prop="customerName" :label="nameLabel" min-width="180" show-overflow-tooltip />
        <ElTableColumn prop="customerCode" :label="codeLabel" width="120" show-overflow-tooltip />
        <ElTableColumn prop="contactName" label="联系人" width="100" show-overflow-tooltip />
        <ElTableColumn prop="contactMobile" label="手机" width="125" show-overflow-tooltip />
        <ElTableColumn prop="address" label="地址" min-width="140" show-overflow-tooltip />
        <ElTableColumn label="操作" width="80" align="center">
          <template #default="{ row }">
            <ElButton type="primary" link @click="handleConfirmRow(row)">确定</ElButton>
          </template>
        </ElTableColumn>
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
        </div>
      </div>
    </div>
  </ElDialog>
</template>

<style scoped>
.customer-select-body {
  overflow-x: hidden;
}

.customer-select-table :deep(.el-table__body-wrapper),
.customer-select-table :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}

.customer-select-table :deep(.cell) {
  white-space: nowrap;
}
</style>
