<script lang="ts" setup>
import { moneyText } from '#/utils/finance/decimal-money';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { BilReimbursementApplyApi } from '#/api/erp/finance/reimbursement-apply';

import { computed, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { formatDateTime } from '@vben/utils';


import { useVbenForm } from '#/adapter/form';
import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createReimbursementApply,
  getReimbursementApply,
  updateReimbursementApply,
} from '#/api/erp/finance/reimbursement-apply';

import { useFormSchema, useSelectedExpenseColumns } from '#/views/finance/reimbursement/expensereport/data';
import ExpenseSelect from '#/views/finance/reimbursement/expensereport/modules/expense-select.vue';

import { ElButton, ElMessage } from 'element-plus';

type Mode = 'create' | 'detail' | 'edit';

const emit = defineEmits<{ (e: 'success'): void }>();

const userStore = useUserStore();

const formType = ref<Mode>('create');
const formData = ref<BilReimbursementApplyApi.ReimbursementApply>({
  rowid: undefined,
  reimbursement_no: undefined,
  ReportID: undefined,
  reimbursement_reason: undefined,
  reimbursement_date: Date.now().toString(),
  reimburser_name: userStore.userInfo?.nickname ?? '',
  reimbursement_department: (userStore.userInfo as any)?.deptId ?? undefined,
  project_id: undefined,
  receive_account: undefined,
  postscript: undefined,
  remark: undefined,
  total_amount: 0,
  status: 0,
});

const selectedExpenses = ref<any[]>([]);

function safeJsonParse(text: any) {
  if (!text || typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const totalAmount = computed(() => {
  let sum = 0;
  for (const row of selectedExpenses.value)
    sum += Number(row?.expense_amount ?? 0);
  return Number.isFinite(sum) ? sum : 0;
});

const title = computed(() => {
  if (formType.value === 'detail') return '报销单详情';
  if (formType.value === 'edit') return '编辑报销单';
  return '新增报销单';
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
    labelWidth: 120,
  },
  wrapperClass: 'grid-cols-3',
  layout: 'vertical',
  schema: useFormSchema(formType.value, formData.value),
  showDefaultActions: false,
});

function syncTotalsToForm() {
  formApi.setValues({ total_amount: totalAmount.value }, false);
}

function syncExpenseFieldsToForm() {
  // 从费用明细回填主表单字段：目前仅回填“项目”。
  // 规则：如果已选费用都属于同一个项目，则自动填充；否则不覆盖用户已填的项目。
  const projectIds = [
    ...new Set(
      selectedExpenses.value
        .map((x) => x?.project_id)
        .filter((v) => v === 0 || v),
    ),
  ];

  if (projectIds.length === 1) {
    formApi.setValues({ project_id: projectIds[0] }, false);
  }
  if (selectedExpenses.value.length === 0) {
    formApi.setValues({ project_id: undefined }, false);
  }
}

/** 已选费用表格 */
const [SelectedGrid, selectedGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useSelectedExpenseColumns(formType.value === 'detail'),
    height: 260,
    keepSource: true,
    data: selectedExpenses.value,
    rowConfig: { keyField: 'rowid', isHover: true },
  } as VxeTableGridOptions,
});

function syncSelectedGridData() {
  selectedGridApi.setState({
    gridOptions: {
      data: selectedExpenses.value,
    },
  });
}

watch(
  () => selectedExpenses.value,
  () => {
    syncSelectedGridData();
  },
  { immediate: true },
);

function removeSelected(row: any) {
  selectedExpenses.value = selectedExpenses.value.filter(
    (x) => x.rowid !== row.rowid,
  );
  syncSelectedGridData();
  syncTotalsToForm();
}

function clearSelected() {
  selectedExpenses.value = [];
  syncSelectedGridData();
  syncTotalsToForm();
  syncExpenseFieldsToForm();
}

const expenseSelectOpen = ref(false);
function openExpenseSelect() {
  if (formType.value === 'detail') return;
  expenseSelectOpen.value = true;
}

function handleExpenseSelectConfirm(rows: any[]) {
  const map = new Map<string, any>();
  for (const x of selectedExpenses.value) map.set(String(x.rowid), x);
  for (const r of rows) map.set(String(r.rowid), r);
  selectedExpenses.value = [...map.values()];
  syncSelectedGridData();
  syncTotalsToForm();
  syncExpenseFieldsToForm();
}

async function saveWithStatus(status: number) {
  const { valid } = await formApi.validate();
  if (!valid) return;

  const values =
    (await formApi.getValues()) as BilReimbursementApplyApi.ReimbursementApply;

  // date：RangePicker/DatePicker 用 x（ms）；保存时统一转成字符串，兼容后端 datetime
  if (values.reimbursement_date) {
    const ts = Number(values.reimbursement_date);
    const date = Number.isNaN(ts)
      ? new Date(values.reimbursement_date as any)
      : new Date(ts);
    values.reimbursement_date = formatDateTime(date);
  }

  values.total_amount = totalAmount.value;
  values.status = status;
  values.reimburser_name = formData.value.reimburser_name;

  // description：存储已选费用 rowid 列表（以及必要展示字段）
  values.description = JSON.stringify({
    expense_rowids: selectedExpenses.value.map((x) => x.rowid),
    items: selectedExpenses.value.map((x) => ({
      rowid: x.rowid,
      registration_date: x.registration_date,
      expense_type: x.expense_type,
      expense_amount: x.expense_amount,
      tax_rate: x.tax_rate,
      expense_depart: x.expense_depart,
      project_id: x.project_id,
      remark: x.remark,
    })),
  });

  modalApi.lock();
  try {
    await (formType.value === 'create'
      ? createReimbursementApply(values)
      : updateReimbursementApply(values));
    await modalApi.close();
    emit('success');
    ElMessage.success('保存成功');
  } finally {
    modalApi.unlock();
  }
}

function handleCancel() {
  modalApi.close();
}

const [Modal, modalApi] = useVbenModal({
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      selectedExpenses.value = [];
      return;
    }

    const data = modalApi.getData<{ id?: string; items?: any[]; type: Mode }>();
    formType.value = (data?.type ?? 'create') as Mode;
    formApi.setDisabled(formType.value === 'detail');

    if (!data?.id) {
      formData.value = {
        rowid: undefined,
        reimbursement_no: undefined,
        ReportID: undefined,
        reimbursement_reason: undefined,
        reimbursement_date: Date.now().toString(),
        reimburser_name: userStore.userInfo?.nickname ?? '',
        reimbursement_department:
          (userStore.userInfo as any)?.deptId ?? undefined,
        project_id: undefined,
        receive_account: undefined,
        postscript: undefined,
        remark: undefined,
        total_amount: 0,
        status: 0,
      };
      await formApi.setValues(formData.value, false);
      selectedExpenses.value = Array.isArray(data?.items) ? data.items : [];
      syncSelectedGridData();
      syncTotalsToForm();
      return;
    }

    modalApi.lock();
    try {
      const detail: any = await getReimbursementApply(data.id);
      formData.value = {
        ...detail,
        reimbursement_date: (
          detail?.reimbursement_date ?? Date.now()
        ).toString(),
        reimburser_name:
          detail?.reimburser_name ??
          detail?.createuser ??
          userStore.userInfo?.nickname ??
          '',
        total_amount: Number(detail?.total_amount ?? 0),
      };

      await formApi.setValues(formData.value, false);

      const parsed = safeJsonParse(detail?.description);
      const items = parsed?.items;
      selectedExpenses.value = Array.isArray(items) ? items : [];
      syncSelectedGridData();
      syncTotalsToForm();
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal :title="title" class="!w-[80vw]" :show-confirm-button="false">
    <Form class="mx-3" />

    <div class="detail-section">
      <div class="detail-header">
        <div class="detail-title">费用明细</div>
        <div class="detail-actions">
          <el-button
            size="small"
            type="primary"
            plain
            :disabled="formType === 'detail'"
            @click="openExpenseSelect"
          >
            选择费用
          </el-button>
          <el-button
            size="small"
            :disabled="formType === 'detail'"
            @click="clearSelected"
          >
            清除
          </el-button>
        </div>
      </div>

      <SelectedGrid>
        <template #row_actions="{ row }">
          <TableAction
            :actions="[
              {
                label: '移除',
                type: 'danger',
                link: true,
                icon: ACTION_ICON.DELETE,
                onClick: removeSelected.bind(null, row),
              },
            ]"
          />
        </template>

        <template #bottom-extra>
          <div class="sum-bar">金额合计：{{ moneyText(totalAmount) }}</div>
        </template>
      </SelectedGrid>
    </div>

    <ExpenseSelect
      v-model="expenseSelectOpen"
      @confirm="handleExpenseSelectConfirm"
    />

    <template #footer>
      <div class="footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button
          type="primary"
          plain
          :disabled="formType === 'detail'"
          @click="saveWithStatus(0)"
        >
          保存草稿
        </el-button>
        <el-button
          type="primary"
          :disabled="formType === 'detail'"
          @click="saveWithStatus(10)"
        >
          保存并提交
        </el-button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.detail-section {
  margin: 10px 12px 0;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.detail-title {
  font-weight: 600;
}

.detail-actions {
  display: flex;
  gap: 10px;
}

.sum-bar {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  padding: 10px 12px;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
