<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { erpPriceInputFormatter, generateUUID } from '@vben/utils';


import { useVbenForm } from '#/adapter/form';
import { getContract, getContractPage } from '#/api/erp/contract/contract';
import { getProject, getProjectPage } from '#/api/erp/contract/project';
import {
  createOpeningIncomeExpenseSettle,
  getOpeningIncomeExpenseSettleById,
  updateOpeningIncomeExpenseSettle,
} from '#/api/erp/finance/settings/init_data/opening_income_expense_settle';
import {
  getInitSettlementItemList,
  saveInitSettlementItems,
} from '#/api/erp/finance/settings/init_data/settlement_order';
import ContractPicker from '#/components/contract-selector/ContractPicker.vue';
import CustomerPicker from '#/components/customer-selector/CustomerPicker.vue';
import ProjectPicker from '#/components/project-selector/ProjectPicker.vue';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';

import InitOrderList from '#/views/finance/settings/init_data/modules/init-order-list.vue';

import { ElInput, ElMessage } from 'element-plus';

type BizType = 'expense' | 'income' | 'other_income' | 'other_expense';

type FormType = 'create' | 'detail' | 'edit';

type ModalData = {
  biz: BizType;
  row?: any;
  type: FormType;
};

const emit = defineEmits(['success']);

const biz = ref<BizType>('income');
const formType = ref<FormType>('create');

const customerIdRef = ref<string | undefined>();
const contractIdRef = ref<string | undefined>();
const projectIdRef = ref<string | undefined>();
const salesmanIdRef = ref<string | undefined>();
const deptNameRef = ref<string>('');
const orderItemsRef = ref<any[]>([]);

const isIncomeLike = computed(() =>
  ['income', 'other_income'].includes(String(biz.value)),
);

const contractCategory = computed(() => (isIncomeLike.value ? 0 : 1));

const readonly = computed(() => formType.value === 'detail');

const modalTitle = computed(() => {
  const bizText =
    biz.value === 'income'
      ? '期初收入结算'
      : biz.value === 'expense'
        ? '期初支出结算'
        : biz.value === 'other_income'
          ? '期初其他收入'
          : '期初其他支出';
  if (formType.value === 'create') return `新增${bizText}`;
  if (formType.value === 'edit') return `编辑${bizText}`;
  return `${bizText}详情`;
});

const customerLabel = computed(() => (isIncomeLike.value ? '客户' : '供应商'));
const paidReceivedLabel = computed(() =>
  isIncomeLike.value ? '期初已收款' : '期初已付款',
);
const balanceLabel = computed(() =>
  isIncomeLike.value ? '期初应收余额' : '期初应付余额',
);
const invoicedLabel = computed(() => '期初已开票');

const relateAccountLabel = computed(() =>
  isIncomeLike.value ? '收款账户' : '付款账户',
);

function toStr(v: any) {
  const s = String(v ?? '').trim();
  return s || undefined;
}

function handleCustomerIdChange(v?: string) {
  customerIdRef.value = v;
  contractIdRef.value = undefined;
  projectIdRef.value = undefined;
  formApi.setValues(
    {
      customer_id: v,
      contract_id: undefined,
      project_id: undefined,
    } as any,
    false,
  );
}

function handleContractIdChange(v?: string) {
  contractIdRef.value = v;
  formApi.setValues({ contract_id: v } as any, false);
  if (v) {
    getContract(v)
      .then((detail: any) => {
        const contractNo = String(detail?.contract_no ?? detail?.contractNo ?? '').trim();
        if (contractNo) formApi.setValues({ contract_no: contractNo } as any, false);
      })
      .catch(() => {
        // ignore
      });
  } else {
    formApi.setValues({ contract_no: undefined } as any, false);
  }
}

function handleProjectIdChange(v?: string) {
  projectIdRef.value = v;
  formApi.setValues({ project_id: v } as any, false);
}

function handleSalesmanIdChange(v?: string) {
  salesmanIdRef.value = v;
  formApi.setValues({ salesman_id: v } as any, false);
}

function handleSalesmanPicked(staff?: any) {
  if (!staff) {
    formApi.setValues({ dept_id: '' } as any, false);
    deptNameRef.value = '';
    return;
  }
  formApi.setValues({ dept_id: String(staff.DepID ?? '') } as any, false);
  deptNameRef.value = String(staff.DepName ?? '');
}

function handleItemsChange(items: any[]) {
  orderItemsRef.value = [...(items ?? [])];
}

function buildSchema() {
  return [
    {
      fieldName: 'id',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'biz_type',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'customer_id',
      label: customerLabel.value,
      component: 'Slot',
      rules: 'required',
    },
    {
      fieldName: 'opening_no',
      label: '编号',
      component: 'Input',
      componentProps: {
        placeholder: '可选',
        allowClear: true,
        disabled: readonly.value,
        class: '!w-full',
      },
    },
    {
      fieldName: 'opening_date',
      label: '日期',
      component: 'DatePicker',
      componentProps: {
        valueFormat: 'x',
        placeholder: '请选择日期',
        class: '!w-full',
        disabled: readonly.value,
      },
      rules: 'required',
    },
    {
      fieldName: 'contract_id',
      label: '关联合同',
      component: 'Slot',
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'contract_no',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'salesman_id',
      label: '业务员',
      component: 'Slot',
    },
    {
      fieldName: 'dept_id',
      label: '部门',
      component: 'Slot',
    },
    {
      fieldName: 'project_id',
      label: '项目',
      component: 'Slot',
    },
    {
      fieldName: 'items',
      label: '订单',
      component: 'Slot',
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'payment_term',
      label: '付款账期',
      component: 'Input',
      componentProps: {
        placeholder: '可选',
        allowClear: true,
        disabled: readonly.value,
        class: '!w-full',
      },
    },
    {
      fieldName: 'receive_pay_account_id',
      label: relateAccountLabel.value,
      component: 'Input',
      componentProps: {
        placeholder: '可选',
        allowClear: true,
        disabled: readonly.value,
        class: '!w-full',
      },
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'tax_rate',
      label: '税率(%)',
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        controlsPosition: 'right',
        class: '!w-full',
        disabled: readonly.value,
      },
    },
    {
      fieldName: 'tax_amount',
      label: '税额',
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        formatter: erpPriceInputFormatter,
        controlsPosition: 'right',
        class: '!w-full',
        disabled: readonly.value,
      },
    },
    {
      fieldName: 'amount',
      label: '金额',
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        formatter: erpPriceInputFormatter,
        controlsPosition: 'right',
        class: '!w-full',
        disabled: readonly.value,
      },
    },
    {
      fieldName: 'total_amount',
      label: '价税合计',
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        formatter: erpPriceInputFormatter,
        controlsPosition: 'right',
        class: '!w-full',
        disabled: readonly.value,
      },
    },
    {
      fieldName: 'opening_received_paid_amount',
      label: paidReceivedLabel.value,
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        formatter: erpPriceInputFormatter,
        controlsPosition: 'right',
        class: '!w-full',
        disabled: readonly.value,
      },
    },
    {
      fieldName: 'opening_invoiced_amount',
      label: invoicedLabel.value,
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        formatter: erpPriceInputFormatter,
        controlsPosition: 'right',
        class: '!w-full',
        disabled: readonly.value,
      },
    },
    {
      fieldName: 'opening_balance',
      label: balanceLabel.value,
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        formatter: erpPriceInputFormatter,
        controlsPosition: 'right',
        class: '!w-full',
        disabled: readonly.value,
      },
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'InputNumber',
      componentProps: {
        precision: 0,
        controlsPosition: 'right',
        class: '!w-full',
        disabled: readonly.value,
      },
    },
    {
      fieldName: 'attachment_ids',
      label: '附件',
      component: 'FileUpload',
      componentProps: {
        maxNumber: 1,
        maxSize: 10,
        accept: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png'],
        showDescription: formType.value !== 'detail',
        disabled: readonly.value,
      },
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'InputTextArea',
      componentProps: {
        placeholder: '可选',
        allowClear: true,
        rows: 3,
        disabled: readonly.value,
        class: '!w-full',
      },
      formItemClass: 'col-span-2',
    },
  ];
}

const [Form, formApi] = useVbenForm({
  commonConfig: { componentProps: { class: 'w-full' }, labelWidth: 120 },
  wrapperClass: 'grid grid-cols-2 gap-x-6 gap-y-4',
  layout: 'vertical',
  schema: buildSchema(),
  showDefaultActions: false,
});

function mapRowToFormValues(row: any) {
  return {
    id: row?.id ?? row?.rowid ?? '',
    biz_type: row?.biz_type ?? row?.business_type ?? '',
    opening_date: row?.opening_date ?? row?.init_date ?? row?.bill_date ?? '',
    opening_no: row?.opening_no ?? row?.init_no ?? row?.bill_no ?? '',
    customer_id: row?.customer_id ?? row?.customerId ?? '',
    contract_id: row?.contract_id ?? row?.contractId ?? '',
    contract_no: row?.contract_no ?? '',
    project_id: row?.project_id ?? row?.projectId ?? '',
    salesman_id: row?.salesman_id ?? row?.salesmanId ?? '',
    dept_id: row?.dept_id ?? row?.salesman_dept_id ?? '',
    payment_term: row?.payment_term ?? '',
    receive_pay_account_id: row?.receive_pay_account_id ?? row?.relate_account ?? row?.receive_account ?? '',
    tax_rate: row?.tax_rate ?? 0,
    tax_amount: row?.tax_amount ?? 0,
    amount: row?.amount ?? row?.init_amount ?? 0,
    total_amount: row?.total_amount ?? 0,
    opening_received_paid_amount: row?.opening_received_paid_amount ?? row?.received_amount ?? row?.paid_received_amount ?? 0,
    opening_invoiced_amount: row?.opening_invoiced_amount ?? row?.invoiced_amount ?? 0,
    opening_balance: row?.opening_balance ?? row?.receivable_balance ?? row?.after_balance ?? row?.init_balance ?? 0,
    status: row?.status ?? undefined,
    attachment_ids: row?.attachment_ids ?? row?.file_url ?? '',
    remark: row?.remark ?? row?.description ?? '',
  };
}

async function save(values: any) {
  // 避免把订单相关字段写入主表（订单关系单独存储在结算订单表）
  const { items: _items, ...rest } = values ?? {};

  const bizTypeMap: Record<string, string> = {
    income: 'SRJS',
    expense: 'ZCJS',
    other_income: 'QTSR',
    other_expense: 'QTZC',
  };

  const payload: any = {
    ...rest,
    biz_type: bizTypeMap[String(biz.value)] || String(rest?.biz_type || '').trim() || 'SRJS',
  };

  if (formType.value === 'create') return await createOpeningIncomeExpenseSettle(payload);
  return await updateOpeningIncomeExpenseSettle(payload);
}

const [Modal, modalApi] = useVbenModal({
  closeOnClickModal: false,
  closeOnPressEscape: false,
  async onConfirm() {
    if (formType.value === 'detail') {
      await modalApi.close();
      return;
    }

    const { valid } = await formApi.validate();
    if (!valid) return;

    modalApi.lock();
    try {
      const values = await formApi.getValues();
      if (formType.value === 'create') {
        const id = toStr(values?.id);
        if (!id) {
          const newId = generateUUID();
          await formApi.setValues({ id: newId } as any, false);
        }
      }
      const settlementType = isIncomeLike.value ? 0 : 1;
      // 先保存主表，保证 id 存在
      await save(await formApi.getValues());
      const id = toStr((await formApi.getValues())?.id);
      if (id) {
        await saveInitSettlementItems(id, settlementType, orderItemsRef.value || []);
      }
      ElMessage.success('保存成功');
      emit('success');
      await modalApi.close();
    } catch (error: any) {
      ElMessage.error(error?.message || '保存失败');
    } finally {
      modalApi.unlock();
    }
  },

  async onOpenChange(isOpen: boolean) {
    if (!isOpen) return;

    const data = modalApi.getData<ModalData>();
    biz.value = data?.biz ?? 'income';
    formType.value = data?.type ?? 'create';

    let row = data?.row as any;
    if (formType.value !== 'create') {
      const id = toStr(row?.id ?? row?.rowid);
      if (id) {
        try {
          const full = await getOpeningIncomeExpenseSettleById(id);
          if (full) row = { ...row, ...full };
        } catch {
          // ignore
        }
      }
    }

    formApi.setDisabled(formType.value === 'detail');

    formApi.updateSchema(buildSchema());

    const initial = mapRowToFormValues(row);
    await formApi.setValues(initial as any, false);

    customerIdRef.value = toStr(row?.customer_id ?? (initial as any).customer_id);
    contractIdRef.value = toStr(
      row?.contract_id ?? (initial as any).contract_id,
    );
    projectIdRef.value = toStr(
      row?.project_id ?? (initial as any).project_id,
    );
    salesmanIdRef.value = toStr(
      row?.salesman_id ?? (initial as any).salesman_id,
    );
    try {
      const settlementType = isIncomeLike.value ? 0 : 1;
      const id = toStr(row?.id ?? row?.rowid ?? initial.id);
      orderItemsRef.value = id
        ? await getInitSettlementItemList(id!, settlementType)
        : [];
    } catch {
      orderItemsRef.value = [];
    }
    deptNameRef.value = String(
      row?.dept_name ?? '',
    );
  },
});
</script>

<template>
  <Modal
    :title="modalTitle"
    confirm-text="保存"
    cancel-text="取消"
    :show-confirm-button="formType !== 'detail'"
    class="w-4/5"
  >
    <Form class="mx-3">
      <template #customer_id>
        <CustomerPicker
          :model-value="customerIdRef"
          :disabled="readonly"
          :placeholder="`请选择${customerLabel}`"
          @update:model-value="handleCustomerIdChange"
        />
      </template>

      <template #contract_id>
        <ContractPicker
          :model-value="contractIdRef"
          :disabled="readonly"
          :customer-id="customerIdRef"
          :contract-category="contractCategory"
          :api="getContractPage as any"
          :get-by-id="getContract as any"
          @update:model-value="handleContractIdChange"
        />
      </template>

      <template #project_id>
        <ProjectPicker
          :model-value="projectIdRef"
          :disabled="readonly"
          :customer-id="customerIdRef"
          placeholder="请选择项目"
          :api="getProjectPage as any"
          :get-by-id="getProject as any"
          @update:model-value="handleProjectIdChange"
        />
      </template>

      <template #salesman_id>
        <StaffPicker
          :model-value="salesmanIdRef"
          :disabled="readonly"
          placeholder="请选择业务员"
          @update:model-value="handleSalesmanIdChange"
          @update:data="handleSalesmanPicked"
        />
      </template>

      <template #dept_id>
        <ElInput
          :model-value="deptNameRef"
          readonly
          placeholder="自动带出"
          class="!w-full"
        />
      </template>

      <template #items>
        <InitOrderList
          :biz="biz"
          :customer-id="customerIdRef"
          :items="orderItemsRef"
          :disabled="readonly"
          @update:items="handleItemsChange"
        />
      </template>
    </Form>
  </Modal>
</template>
