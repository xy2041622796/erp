<script lang="ts" setup>
import { reactive, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import CustomerName from '#/components/customer-selector/CustomerName.vue';
import { formatDateOnly } from '#/utils/date';

import {
  ElButton,
  ElInput,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

type QueryApiResult<T = any> = {
  list?: T[];
  total?: number;
} & Record<string, any>;

export type ContractSelectQueryApi<T = any> = (params: any) => Promise<QueryApiResult<T>>;

export type ContractSelectRow = {
  rowid?: string;
  contract_no?: string;
  contract_name?: string;
  contract_party_a?: string;
  contract_party_b?: string;
  contract_category?: number;
  ConState?: number;
} & Record<string, any>;

defineOptions({ name: 'ContractSelectModal' });

const props = withDefaults(
  defineProps<{
    api: ContractSelectQueryApi<ContractSelectRow>;
    cancelText?: string;
    confirmText?: string;
    title?: string;
    value?: string;
  }>(),
  {
    title: '选择关联合同',
    confirmText: '确定',
    cancelText: '取消',
    value: undefined,
  },
);

const emit = defineEmits<{
  cancel: [];
  closed: [];
  confirm: [value: ContractSelectRow];
  'update:value': [value: string | undefined];
}>();

const query = reactive({
  no: '',
  pageNo: 1,
  page: 10,
});

const total = ref(0);
const loading = ref(false);
const list = ref<ContractSelectRow[]>([]);
const selectedRow = ref<ContractSelectRow>();

function getPartyId(row: ContractSelectRow): string | number | undefined {
  const data = (modalApi.getData() as any) ?? {};
  const cat = Number(data?.contract_category);
  const a = (row as any)?.contract_party_a;
  const b = (row as any)?.contract_party_b;
  // 约定：支出合同(1)优先显示乙方；收入合同(0)优先显示甲方
  if (cat === 1) return b ?? a;
  if (cat === 0) return a ?? b;
  return b ?? a;
}

async function loadData() {
  loading.value = true;
  try {
    const data = (modalApi.getData() as any) ?? {};
    const res = await props.api({
      ...data,
      pageNo: query.pageNo,
      page: query.page,
      no: query.no,
    });

    list.value = (res.list ?? []) as ContractSelectRow[];
    total.value = Number(res.total ?? 0);
  } finally {
    loading.value = false;
  }
}

function resetState() {
  query.no = '';
  query.pageNo = 1;
  query.page = 10;
  list.value = [];
  total.value = 0;
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
  if (!selectedRow.value) return;
  const id = String((selectedRow.value as any).rowid ?? '');
  emit('update:value', id || undefined);
  emit('confirm', selectedRow.value);
  modalApi.close();
}

function handleSearch() {
  query.pageNo = 1;
  loadData();
}

function handlePageChange(val: number) {
  query.pageNo = val;
  loadData();
}

function handleRowClick(row: ContractSelectRow) {
  selectedRow.value = row;
}

function handleRowDblclick(row: ContractSelectRow) {
  selectedRow.value = row;
  handleConfirm();
}

const [Modal, modalApi] = useVbenModal({
  onCancel: handleCancel,
  onClosed: handleClosed,
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const data = (modalApi.getData() as any) ?? {};
      // 兼容外部传入分页（若不传则用默认值）
      query.pageNo = Number(data?.pageNo ?? 1);
      query.page = Number(data?.page ?? 10);
      query.no = '';
      selectedRow.value = undefined;
      loadData();
    }
  },
  destroyOnClose: true,
});
</script>

<template>
  <Modal :title="props.title" class="!w-[1100px]" :footer="false">
    <div class="px-4 pb-4">
      <div class="mb-4 flex gap-2">
        <ElInput
          v-model="query.no"
          placeholder="请输入合同编号/名称"
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
        style="width: 100%; height: 400px"
        @row-click="handleRowClick"
        @row-dblclick="handleRowDblclick"
      >
        <ElTableColumn type="index" label="序号" width="60" align="center" />
        <ElTableColumn prop="contract_no" label="合同编号" min-width="140" />
        <ElTableColumn prop="contract_name" label="合同名称" min-width="180" />
        <ElTableColumn label="客户/供应商" min-width="180">
          <template #default="{ row }">
            <CustomerName :id="getPartyId(row)" />
          </template>
        </ElTableColumn>
        <ElTableColumn prop="contract_amount" label="合同金额" width="120" align="right" />
        <ElTableColumn label="签订日期" width="120">
          <template #default="{ row }">
            {{ formatDateOnly((row as any).contract_signing_date) || '' }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElTag v-if="row.flowstate === 1" type="success">审核通过</ElTag>
            <ElTag v-else-if="row.flowstate === 2" type="danger">审核驳回</ElTag>
            <ElTag v-else type="info">待审核</ElTag>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.page"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <ElButton @click="handleCancel">{{ props.cancelText }}</ElButton>
        <ElButton type="primary" :disabled="!selectedRow" @click="handleConfirm">
          {{ props.confirmText }}
        </ElButton>
      </div>
    </div>
  </Modal>
</template>
