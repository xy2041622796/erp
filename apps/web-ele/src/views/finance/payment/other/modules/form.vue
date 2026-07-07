<script lang="ts" setup>
import type { ErpOtherExpenseApi } from '#/api/erp/finance/payment/other';
import type { ErpPaymentDetailApi } from '#/api/erp/finance/payment/other/paymentDetails';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { formatDateTime } from '@vben/utils';


import type { Department, Staff } from '#/api/common/staff-selector';
import { getDepartmentList } from '#/api/common/staff-selector';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import CustomerPicker from '#/components/customer-selector/CustomerPicker.vue';

import { useVbenForm } from '#/adapter/form';
import {
  createOtherExpense,
  getOtherExpense,
  updateOtherExpense,
} from '#/api/erp/finance/payment/other';
import { getOtherExpenseProjectPage } from '#/api/erp/finance/payment/other/project';
import { ProjectSelectModal } from '#/components/project-selector';
import { $t } from '#/locales';

import { useFormSchema } from '#/views/finance/payment/other/data';
import OtherExpenseItemForm from '#/views/finance/payment/other/modules/item-form.vue';

import { ElButton, ElInput, ElMessage } from 'element-plus';

const emit = defineEmits(['success']);

const formData = ref<ErpOtherExpenseApi.OtherExpense>();
const formType = ref('');
const itemFormRef = ref<InstanceType<typeof OtherExpenseItemForm>>();
const taxIncluded = ref<number>(1);

const selectedProjectId = ref<string | undefined>();
const selectedProjectName = ref<string>('');
const currentSupplierId = ref<any>();

function handleCustomerIdChange(v?: string) {
  currentSupplierId.value = v;
  formApi.setValues({ supplier_id: v }, false);
}

const deptList = ref<Department[]>([]);
const deptNameMap = computed(() => {
  const map = new Map<string, string>();
  for (const d of deptList.value) map.set(String(d.DepID), String(d.DepName ?? d.DepID));
  return map;
});

async function ensureDeptListLoaded() {
  if (deptList.value.length > 0) return;
  try {
    deptList.value = await getDepartmentList();
  } catch (e) {
    console.error('load departments failed', e);
  }
}

function getDeptName(id: any) {
  const key = String(id ?? '').trim();
  if (!key) return '';
  return deptNameMap.value.get(key) || key;
}

const salesmanId = ref<string | undefined>();
const departId = ref<string | undefined>();

function handleSalesmanIdChange(v?: string) {
  salesmanId.value = v;
  if (!v) {
    handleSalesmanPicked(undefined);
    return;
  }
  formApi.setValues({ salesman_id: v }, false);
}

function handleSalesmanPicked(staff?: Staff) {
  if (!staff) {
    salesmanId.value = undefined;
    departId.value = undefined;
    formApi.setValues({ salesman_id: undefined, depart_id: undefined }, false);
    return;
  }

  salesmanId.value = staff.ROWID;
  departId.value = staff.DepID;
  formApi.setValues({ salesman_id: staff.ROWID, depart_id: staff.DepID }, false);
}

const getTitle = computed(() => {
  if (formType.value === 'create') return '新增其他支出';
  if (formType.value === 'edit') return '编辑其他支出';
  return '其他支出详情';
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  wrapperClass: 'grid-cols-2 gap-x-6 gap-y-4',
  layout: 'vertical',
  schema: useFormSchema(formType.value),
  showDefaultActions: false,
  handleValuesChange(values, fieldsChanged) {
    if (fieldsChanged?.includes('supplier_id')) {
      currentSupplierId.value = (values as any).supplier_id;
      selectedProjectId.value = undefined;
      selectedProjectName.value = '';
      formApi.setValues({ project_id: undefined });
    }
  },
});

const [ProjectSelectModalComp, projectSelectModalApi] = useVbenModal({
  connectedComponent: ProjectSelectModal,
  destroyOnClose: true,
});

async function openProjectSelect() {
  if (formType.value === 'detail') return;
  // 其他支出这里不强绑定 supplier_id 过滤（后端字段不确定），先提供通用搜索选择能力
  projectSelectModalApi.open();
}

async function handleProjectSelectConfirm(project: any) {
  selectedProjectId.value = String(project.rowid ?? '') || undefined;
  selectedProjectName.value = `${project.project_code ?? ''} ${project.project_name ?? ''}`.trim() || String(project.rowid ?? '');
  formApi.setValues({ project_id: selectedProjectId.value });
}

function handleUpdateItems(items: ErpPaymentDetailApi.PaymentDetail[]) {
  if (!formData.value) {
    formData.value = { details: [] };
  }
  formData.value.details = items;
}

async function handleUpdateSummary(summary: { amount: number; taxAmount: number; total: number }) {
  const values = (await formApi.getValues()) as any;
  const isTaxIncluded = Number(values?.is_tax_included || 0);

  const amount = summary.amount;
  const totalAmount = isTaxIncluded ? summary.total : amount;

  formApi.setValues({
    amount,
    total_amount: totalAmount,
  });
}

function handleUpdateTaxIncluded(v: number) {
  formApi.setValues({ is_tax_included: v });
  taxIncluded.value = v;
}

function handleUpdateExpenseCategoryNames(names: string) {
  if (names) {
    formApi.setValues({ expense_category: names });
  }
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    const itemFormInstance = Array.isArray(itemFormRef.value)
      ? itemFormRef.value[0]
      : itemFormRef.value;

    try {
      itemFormInstance?.validate?.();
    } catch (error: any) {
      ElMessage.error(error?.message || '子表单验证失败');
      return;
    }

    modalApi.lock();
    try {
      const data = (await formApi.getValues()) as ErpOtherExpenseApi.OtherExpense;
      data.details = formData.value?.details || [];

      // 强制其他支出
      data.settlement_type = 2;

      if (data.settlement_date) {
        const ts = Number(data.settlement_date);
        const date = Number.isNaN(ts) ? new Date(data.settlement_date) : new Date(ts);
        data.settlement_date = formatDateTime(date);
      }
      if (data.account_period) {
        const ts = Number(data.account_period);
        const date = Number.isNaN(ts) ? new Date(data.account_period) : new Date(ts);
        data.account_period = formatDateTime(date);
      }

      await (formType.value === 'create' ? createOtherExpense(data) : updateOtherExpense(data));

      await modalApi.close();
      emit('success');
      ElMessage.success($t('ui.actionMessage.operationSuccess'));
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = undefined;
      return;
    }

    await ensureDeptListLoaded();

    const data = modalApi.getData<{ rowid?: string; type: string }>();
    formType.value = data.type;

    formApi.setDisabled(formType.value === 'detail');
    formApi.updateSchema(useFormSchema(formType.value));

    if (!data?.rowid) {
      formData.value = { details: [] };
      taxIncluded.value = 1;
      await formApi.setValues({
        settlement_type: 2,
        is_tax_included: 1,
        amount: 0,
        total_amount: 0,
      });

      salesmanId.value = undefined;
      departId.value = undefined;
      currentSupplierId.value = undefined;
      return;
    }

    modalApi.lock();
    try {
      formData.value = await getOtherExpense(data.rowid);

      const formValues = { ...formData.value } as any;

      if (typeof formValues.settlement_date === 'number') {
        formValues.settlement_date = String(formValues.settlement_date);
      }
      if (typeof formValues.account_period === 'number') {
        formValues.account_period = String(formValues.account_period);
      }

      await formApi.setValues(formValues);

      salesmanId.value = (formValues as any)?.salesman_id ? String((formValues as any).salesman_id) : undefined;
      departId.value = (formValues as any)?.depart_id ? String((formValues as any).depart_id) : undefined;

      selectedProjectId.value = (formValues as any)?.project_id ? String((formValues as any).project_id) : undefined;
      selectedProjectName.value = selectedProjectId.value || '';
      currentSupplierId.value = (formValues as any)?.supplier_id;

      if (formData.value && !formData.value.details) {
        formData.value.details = [];
      }
      taxIncluded.value = Number(formData.value?.is_tax_included ?? 1);
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-4/5" :show-confirm-button="formType !== 'detail'">
    <Form class="mx-3">
      <template #supplier_id>
        <CustomerPicker
          :model-value="currentSupplierId"
          :disabled="formType === 'detail'"
          placeholder="请选择客户"
          @update:model-value="handleCustomerIdChange"
        />
      </template>

      <template #salesman_id>
        <StaffPicker
          :model-value="salesmanId"
          :disabled="formType === 'detail'"
          placeholder="请选择业务员"
          @update:model-value="handleSalesmanIdChange"
          @update:data="handleSalesmanPicked"
        />
      </template>

      <template #depart_id>
        <ElInput
          :model-value="getDeptName(departId)"
          readonly
          placeholder="部门"
          class="!w-full"
        />
      </template>

      <template #project_id>
        <div class="w-full">
          <ElInput
            :model-value="selectedProjectName"
            readonly
            placeholder="请选择项目"
            class="!w-full"
            :disabled="formType === 'detail'"
            @click="openProjectSelect"
          >
            <template #append>
              <ElButton :disabled="formType === 'detail'" @click="openProjectSelect">查询</ElButton>
            </template>
          </ElInput>
        </div>
      </template>

      <template #items>
        <OtherExpenseItemForm
          ref="itemFormRef"
          :items="formData?.details ?? []"
          :disabled="formType === 'detail'"
          :tax-included="taxIncluded"
          @update:items="handleUpdateItems"
          @update:summary="handleUpdateSummary"
          @update:tax-included="handleUpdateTaxIncluded"
          @update:expense-category-names="handleUpdateExpenseCategoryNames"
        />
      </template>
    </Form>

    <ProjectSelectModalComp
      :api="getOtherExpenseProjectPage"
      :value="selectedProjectId"
      title="选择项目"
      @confirm="handleProjectSelectConfirm"
    />
  </Modal>
</template>
