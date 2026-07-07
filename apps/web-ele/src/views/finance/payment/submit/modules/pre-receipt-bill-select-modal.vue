<script lang="ts" setup>
import { moneyText } from '#/utils/finance/decimal-money';
import { computed, ref, watch } from 'vue';

import { formatDate, isEmpty } from '@vben/utils';


import { getIncomeSettlementPage } from '#/api/erp/finance/revenue/settlement';
import type { Department } from '#/api/common/staff-selector';
import { getDepartmentList } from '#/api/common/staff-selector';
import { getSimpleUserList } from '#/api/system/user';

import {
  ElButton,
  ElDialog,
  ElInput,
  ElMessage,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    customerId?: string;
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'confirm', v: any[]): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

const keyword = ref<string>('');
const loading = ref(false);

const pageNo = ref(1);
const page = ref(10);
const total = ref(0);

const rows = ref<any[]>([]);
const selected = ref<any[]>([]);

const userOptions = ref<any[]>([]);
const deptOptions = ref<Department[]>([]);
(async () => {
  try {
    userOptions.value = await getSimpleUserList();
  } catch {
    userOptions.value = [];
  }
  try {
    deptOptions.value = await getDepartmentList();
  } catch {
    deptOptions.value = [];
  }
})();

function getUserName(id: any) {
  if (!id) return '--';
  return userOptions.value.find((u) => u.ROWID === id)?.UserName || '';
}

function getDeptName(id: any) {
  if (!id) return '--';
  return deptOptions.value.find((d) => String(d.DepID) === String(id))?.DepName || '';
}

function getPreReceiptBalance(row: any): number {
  const v = Number(row?.receive_balance ?? row?.pre_receipt_balance ?? row?.balance ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function getApplyableBalance(row: any): number {
  return getPreReceiptBalance(row);
}

async function query() {
  if (!props.customerId) {
    rows.value = [];
    total.value = 0;
    return;
  }

  loading.value = true;
  try {
    const res = await getIncomeSettlementPage({
      pageNo: pageNo.value,
      page: page.value,
      customer_id: props.customerId,
      settlement_no: keyword.value || undefined,
    });
    rows.value = (res as any)?.list ?? [];
    total.value = Number((res as any)?.total ?? 0);
  } finally {
    loading.value = false;
  }
}

function handleCancel() {
  visible.value = false;
}

function handleConfirm() {
  if (isEmpty(selected.value)) {
    ElMessage.warning('请先勾选单据');
    return;
  }
  emit('confirm', selected.value);
  visible.value = false;
}

function handleSelectionChange(v: any[]) {
  selected.value = v;
}

watch(
  () => visible.value,
  async (open) => {
    if (!open) return;
    if (!props.customerId) {
      ElMessage.warning('请先选择往来单位');
      visible.value = false;
      return;
    }

    keyword.value = '';
    selected.value = [];
    pageNo.value = 1;
    await query();
  },
);
</script>

<template>
  <ElDialog
    v-model="visible"
    title="选择预收款单据"
    width="90vw"
    :append-to-body="true"
    :z-index="3000"
  >
    <div class="mb-3 flex items-center gap-3">
      <ElInput
        v-model="keyword"
        placeholder="输入单据编号查询"
        clearable
        class="!w-80"
        @keyup.enter="query"
      />
      <ElButton type="primary" :loading="loading" @click="query">查询</ElButton>
    </div>

    <ElTable
      :data="rows"
      border
      style="width: 100%"
      height="520"
      :loading="loading"
      row-key="rowid"
      @selection-change="handleSelectionChange"
    >
      <ElTableColumn type="selection" width="55" align="center" />
      <ElTableColumn type="index" label="序号" width="60" align="center" />
      <ElTableColumn label="日期/编号" min-width="200">
        <template #default="{ row }">
          <div>
            <div>{{ formatDate(row.settlement_date) || '--' }}</div>
            <div class="text-primary">{{ row.settlement_no || '--' }}</div>
          </div>
        </template>
      </ElTableColumn>
      <ElTableColumn label="项目" min-width="160">
        <template #default="{ row }">
          <div class="text-primary">{{ row.project_name || row.project_id || '--' }}</div>
        </template>
      </ElTableColumn>
      <ElTableColumn label="业务员部门" min-width="180">
        <template #default="{ row }">
          <div>
            <div>{{ getUserName(row.salesman_id) }}</div>
            <div class="text-muted-foreground">{{ getDeptName(row.depart_id) }}</div>
          </div>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="remark" label="备注" min-width="160" />
      <ElTableColumn label="预收金额余额" width="140" align="right">
        <template #default="{ row }">
          {{ moneyText(getPreReceiptBalance(row)) }}
        </template>
      </ElTableColumn>
      <ElTableColumn label="可申请余额" width="140" align="right">
        <template #default="{ row }">
          {{ moneyText(getApplyableBalance(row)) }}
        </template>
      </ElTableColumn>
      <ElTableColumn label="本次核销操作" width="160" align="center">
        <template #default>
          <span class="text-muted-foreground">选择后在表单填写</span>
        </template>
      </ElTableColumn>
    </ElTable>

    <div class="mt-3 flex items-center justify-end">
      <ElPagination
        v-model:current-page="pageNo"
        v-model:page-size="page"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        :page-sizes="[10, 20, 50, 100]"
        @size-change="query"
        @current-change="query"
      />
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <ElButton @click="handleCancel">取消</ElButton>
        <ElButton type="primary" @click="handleConfirm">确认</ElButton>
      </div>
    </template>
  </ElDialog>
</template>
