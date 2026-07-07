<script lang="ts" setup>
import type { CrmContractApi } from '#/api/erp/contract/contract';

import { reactive, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import CustomerName from '#/components/customer-selector/CustomerName.vue';
import { formatDateOnly } from '#/utils/date';

import { getContractPage } from '#/api/erp/contract/contract';

import {
  ElButton,
  ElInput,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'PaymentContractSelectModal' });

const props = withDefaults(
  defineProps<{
    title?: string;
  }>(),
  {
    title: '选择合同',
  },
);

const emit = defineEmits<{
  confirm: [value: any];
}>();

const query = reactive({
  no: '',
  pageNo: 1,
  page: 10,
  contract_category: 1, // 1 for Expense Contract
  customerId: undefined as string | number | undefined,
});

const total = ref(0);
const loading = ref(false);
const list = ref<CrmContractApi.Contract[]>([]);
const selectedRow = ref<CrmContractApi.Contract>();

async function loadData() {
  loading.value = true;
  try {
    const res = await getContractPage({
      pageNo: query.pageNo,
      page: query.page,
      no: query.no,
      contract_category: query.contract_category,
      customerId: query.customerId,
    });
    list.value = ((res as any).list || []) as any;
    total.value = Number((res as any).total || 0);
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  query.pageNo = 1;
  loadData();
}

function handlePageChange(val: number) {
  query.pageNo = val;
  loadData();
}

function handleRowClick(row: any) {
  selectedRow.value = row;
}

function handleRowDblclick(row: any) {
  selectedRow.value = row;
  handleConfirm();
}

function handleConfirm() {
  if (!selectedRow.value) return;
  emit('confirm', selectedRow.value);
  modalApi.close();
}

const [Modal, modalApi] = useVbenModal({
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const data = modalApi.getData<{ customerId?: string | number }>();
      query.customerId = data?.customerId;

      query.no = '';
      query.pageNo = 1;
      selectedRow.value = undefined;
      loadData();
    }
  },
  destroyOnClose: true,
});

defineExpose({ modalApi });
</script>

<template>
  <Modal :title="title" class="!w-[1100px]" :footer="false">
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
        <ElTableColumn label="供应商" min-width="180">
          <template #default="{ row }">
            <CustomerName :id="row.contract_party_b || row.contract_party_a" />
          </template>
        </ElTableColumn>
        <ElTableColumn prop="contract_amount" label="合同金额" width="120" align="right" />
        <ElTableColumn label="签订日期" width="120">
          <template #default="{ row }">
            {{ formatDateOnly(row.contract_signing_date) || '' }}
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
        <ElButton @click="modalApi.close()">取消</ElButton>
        <ElButton type="primary" :disabled="!selectedRow" @click="handleConfirm">
          确定
        </ElButton>
      </div>
    </div>
  </Modal>
</template>
