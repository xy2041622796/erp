<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { erpPriceInputFormatter } from '@vben/utils';


import { useVbenForm } from '#/adapter/form';
import { getContractPage } from '#/api/erp/contract/contract';
import { getProject, getProjectPage } from '#/api/erp/contract/project';
import { getSupplierSimpleList } from '#/api/erp/customer';
import {
  createOpeningPrepayCollect,
  getOpeningPrepayCollectById,
  updateOpeningPrepayCollect,
} from '#/api/erp/finance/settings/init_data/opening_prepay_collect';
import { getSimpleDeptList } from '#/api/system/dept';
import ContractPicker from '#/components/contract-selector/ContractPicker.vue';
import CustomerPicker from '#/components/customer-selector/CustomerPicker.vue';
import ProjectPicker from '#/components/project-selector/ProjectPicker.vue';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';

import { ElInput, ElMessage } from 'element-plus';

type Kind = 'pre_receipt' | 'pre_payment';
type FormType = 'create' | 'detail' | 'edit';

type ModalData = {
  kind: Kind;
  row?: any;
  type: FormType;
};

const emit = defineEmits(['success']);

const kind = ref<Kind>('pre_receipt');
const formType = ref<FormType>('create');

const supplierIdRef = ref<string | undefined>();
const contractNoRef = ref<string | undefined>();
const projectIdRef = ref<string | undefined>();
const salesmanIdRef = ref<string | undefined>();
const deptNameRef = ref<string>('');

const readonly = computed(() => formType.value === 'detail');

const modalTitle = computed(() => {
  const bizText = kind.value === 'pre_receipt' ? '期初预收款' : '期初预付款';
  if (formType.value === 'create') return `新增${bizText}`;
  if (formType.value === 'edit') return `编辑${bizText}`;
  return `${bizText}详情`;
});

function toStr(v: any) {
  const s = String(v ?? '').trim();
  return s || undefined;
}

function handleProjectChange(v?: string) {
  projectIdRef.value = v;
  formApi.setValues({ project_id: v } as any, false);
}

function handleCounterpartyChange(v?: string) {
  supplierIdRef.value = v;
  // 关联客户变化时，合同编号与项目都清空，避免不一致
  contractNoRef.value = undefined;
  projectIdRef.value = undefined;
  formApi.setValues(
    {
      supplier_id: v,
      contract_no: undefined,
      project_id: undefined,
    } as any,
    false,
  );
}

function handleSupplierPickedBySelect(v?: any) {
  // ApiSelect（预付款）选择供应商时，同步 supplierIdRef，供项目/合同筛选使用
  const id = toStr(v);
  if (!id) return;
  supplierIdRef.value = id;
}

function handleContractDataChange(contract?: any) {
  const no = String(contract?.contract_no ?? contract?.contractNo ?? '').trim();
  contractNoRef.value = no || undefined;
  formApi.setValues({ contract_no: contractNoRef.value } as any, false);
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

function buildSchema() {
  const amountLabel = kind.value === 'pre_receipt' ? '预收金额' : '预付金额';
  const openingLabel = kind.value === 'pre_receipt' ? '期初预收余额' : '期初预付余额';
  const counterpartyLabel = kind.value === 'pre_receipt' ? '客户' : '供应商';
  return [
    {
      fieldName: 'id',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'supplier_id',
      label: counterpartyLabel,
      component: kind.value === 'pre_receipt' ? 'Slot' : 'ApiSelect',
      componentProps:
        kind.value === 'pre_receipt'
          ? undefined
          : {
              placeholder: '请选择供应商',
              allowClear: true,
              showSearch: true,
              api: getSupplierSimpleList,
              labelField: 'name',
              valueField: 'rowid',
              disabled: readonly.value,
              onChange: handleSupplierPickedBySelect,
            },
      rules: 'required',
      formItemClass: 'col-span-2',
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
      fieldName: 'contract_no',
      label: '关联合同',
      component: 'Slot',
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'project_id',
      label: '项目',
      component: 'Slot',
      formItemClass: 'col-span-2',
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
      fieldName: 'prepay_collect_amount',
      label: amountLabel,
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        formatter: erpPriceInputFormatter,
        controlsPosition: 'right',
        class: '!w-full',
        disabled: readonly.value,
      },
      rules: 'required',
    },
    {
      fieldName: 'opening_balance',
      label: openingLabel,
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
  ];
}

const [Form, formApi] = useVbenForm({
  commonConfig: { componentProps: { class: 'w-full' }, labelWidth: 120 },
  wrapperClass: 'grid grid-cols-2 gap-x-6 gap-y-4',
  layout: 'vertical',
  schema: buildSchema(),
  showDefaultActions: false,
});

function mapRowToValues(row: any) {
  return {
    id: row?.id ?? row?.rowid ?? '',
    opening_no: row?.opening_no ?? row?.init_no ?? row?.bill_no ?? '',
    opening_date: row?.opening_date ?? row?.init_date ?? row?.bill_date ?? '',
    supplier_id: row?.supplier_id ?? row?.customer_id ?? '',
    contract_no: row?.contract_no ?? '',
    project_id: row?.project_id ?? '',
    salesman_id: row?.salesman_id ?? '',
    dept_id: row?.dept_id ?? row?.salesman_dept_id ?? '',
    prepay_collect_amount: row?.prepay_collect_amount ?? row?.init_amount ?? row?.advance_amount ?? row?.amount ?? 0,
    opening_balance: row?.opening_balance ?? row?.receivable_balance ?? row?.advance_balance ?? 0,
    remark: row?.remark ?? row?.description ?? '',
    attachment_ids: row?.attachment_ids ?? row?.file_url ?? '',
  };
}

async function resolveDeptName(deptId?: any) {
  const id = String(deptId ?? '').trim();
  if (!id) {
    deptNameRef.value = '';
    return;
  }
  try {
    const list = await getSimpleDeptList();
    deptNameRef.value = list.find((d: any) => String(d?.id ?? '') === id)?.name || '';
  } catch {
    deptNameRef.value = '';
  }
}

async function save(values: any) {
  const payload: any = {
    ...values,
    business_type: kind.value,
  };
  if (formType.value === 'create') return await createOpeningPrepayCollect(payload);
  return await updateOpeningPrepayCollect(payload);
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
      await save(values);
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
    kind.value = data?.kind ?? 'pre_receipt';
    formType.value = data?.type ?? 'create';

    let row = data?.row as any;
    if (formType.value !== 'create') {
      const id = toStr(row?.id ?? row?.rowid);
      if (id) {
        try {
          const full = await getOpeningPrepayCollectById(id);
          if (full) row = { ...row, ...full };
        } catch {
          // ignore
        }
      }
    }

    formApi.setDisabled(formType.value === 'detail');
    formApi.updateSchema(buildSchema());

    const initial = mapRowToValues(row);
    await formApi.setValues(initial as any, false);

    supplierIdRef.value = toStr(initial.supplier_id);
    contractNoRef.value = toStr(initial.contract_no);
    projectIdRef.value = toStr(initial.project_id);
    salesmanIdRef.value = toStr(initial.salesman_id);
    await resolveDeptName(initial.dept_id);
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
      <template #supplier_id>
        <CustomerPicker
          :model-value="supplierIdRef"
          :disabled="readonly"
          :placeholder="'请选择客户'"
          @update:model-value="handleCounterpartyChange"
        />
      </template>

      <template #contract_no>
        <ContractPicker
          :model-value="contractNoRef"
          :disabled="readonly"
          :customer-id="kind === 'pre_receipt' ? supplierIdRef : undefined"
          :contract-category="kind === 'pre_receipt' ? 0 : 1"
          :api="getContractPage as any"
          @update:data="handleContractDataChange"
        />
      </template>

      <template #project_id>
        <ProjectPicker
          :model-value="projectIdRef"
          :disabled="readonly"
          :customer-id="supplierIdRef"
          placeholder="可选"
          :api="getProjectPage as any"
          :get-by-id="getProject as any"
          @update:model-value="handleProjectChange"
        />
      </template>

      <template #salesman_id>
        <StaffPicker
          :model-value="salesmanIdRef"
          :disabled="readonly"
          placeholder="可选"
          @update:model-value="handleSalesmanIdChange"
          @picked="handleSalesmanPicked"
        />
      </template>

      <template #dept_id>
        <ElInput v-model="deptNameRef" disabled placeholder="自动带出" />
      </template>
    </Form>
  </Modal>
</template>
