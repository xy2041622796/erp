<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';


import { useVbenForm } from '#/adapter/form';
import {
  createContractType,
  updateContractType,
} from '#/api/erp/finance/settings/basic_data/contract_type';
import {
  createUnit,
  updateUnit,
} from '#/api/erp/finance/settings/basic_data/unit';
import {
  createBasicWarehouse,
  updateBasicWarehouse,
} from '#/api/erp/finance/settings/basic_data/warehouse';

import { ElMessage } from 'element-plus';

type BizType = 'contractType' | 'unit' | 'warehouse';

type FormType = 'create' | 'detail' | 'edit';

type ModalData = {
  biz: BizType;
  row?: any;
  type: FormType;
};

const emit = defineEmits(['success']);

const biz = ref<BizType>('contractType');
const formType = ref<FormType>('create');

const readonly = computed(() => formType.value === 'detail');
const showWarehouseScope = computed(() => biz.value === 'warehouse');

function getNameLabel() {
  if (biz.value === 'contractType') return '名称';
  if (biz.value === 'unit') return '单位名称';
  return '仓库名称';
}

function getBizText() {
  if (biz.value === 'contractType') return '合同类型';
  if (biz.value === 'unit') return '单位';
  return '仓库';
}

const modalTitle = computed(() => {
  const bizText = getBizText();
  if (formType.value === 'create') return `新增${bizText}`;
  if (formType.value === 'edit') return `编辑${bizText}`;
  return `${bizText}详情`;
});

const buildSchema = () => {
  return [
    {
      fieldName: 'id',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'val',
      label: '使用范围',
      component: 'Input',
      componentProps: {
        placeholder: '可选',
        allowClear: true,
        disabled: readonly.value,
      },
      dependencies: {
        triggerFields: [''],
        show: () => showWarehouseScope.value,
      },
    },
    {
      fieldName: 'name',
      label: getNameLabel(),
      component: 'Input',
      componentProps: {
        placeholder: `请输入${getNameLabel()}`,
        allowClear: true,
        disabled: readonly.value,
      },
      rules: 'required',
    },
    {
      fieldName: 'remark',
      label: '说明',
      component: 'InputTextArea',
      componentProps: {
        placeholder: '可选',
        allowClear: true,
        disabled: readonly.value,
        rows: 3,
      },
    },
  ];
};

const [Form, formApi] = useVbenForm({
  commonConfig: { componentProps: { class: 'w-full' }, labelWidth: 120 },
  wrapperClass: 'grid-cols-1',
  layout: 'vertical',
  schema: buildSchema(),
  showDefaultActions: false,
});

watch([biz, formType], () => {
  formApi.updateSchema(buildSchema());
});

function mapRowToFormValues(row: any, currentBiz: BizType) {
  if (!row) {
    return {
      id: '',
      val: '',
      name: '',
      remark: '',
      ordIdx: 0,
      exVal_1: '',
      exVal_2: '',
      exVal_3: '',
      exVal_4: '',
    };
  }

  if (currentBiz === 'contractType') {
    return {
      id: row.id,
      val: row.val,
      name: row.type,
      remark: row.description,
      ordIdx: row.ordIdx,
      exVal_1: row.exVal_1,
      exVal_2: row.exVal_2,
      exVal_3: row.exVal_3,
      exVal_4: row.exVal_4,
    };
  }

  if (currentBiz === 'unit') {
    return {
      id: row.id,
      val: '',
      name: row.unit_name,
      remark: row.description,
    };
  }

  return {
    id: row.id,
    val: row.val,
    name: row.name,
    remark: row.description,
  };
}

async function save(values: any) {
  if (biz.value === 'contractType') {
    const name = String(values.name ?? '').trim();
    const val = String(values.val ?? '').trim() || name;
    const dto: any = {
      id: values.id,
      val,
      type: name,
      description: values.remark,
    };
    if (formType.value === 'create') return createContractType(dto);
    return updateContractType(dto);
  }

  if (biz.value === 'unit') {
    const dto: any = {
      id: values.id,
      unit_name: values.name,
      description: values.remark,
    };
    if (formType.value === 'create') return createUnit(dto);
    return updateUnit(dto);
  }

  const dto: any = {
    id: values.id,
    name: values.name,
    val: values.val,
    description: values.remark,
  };
  if (formType.value === 'create') return createBasicWarehouse(dto);
  return updateBasicWarehouse(dto);
}

const [Modal, modalApi] = useVbenModal({
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
    biz.value = data?.biz ?? 'contractType';
    formType.value = data?.type ?? 'create';

    formApi.updateSchema(buildSchema());

    const initial = mapRowToFormValues(data?.row, biz.value);

    // create 时，如果没填 val，默认用名称（对 contractType 更友好）
    if (
      biz.value === 'contractType' &&
      formType.value === 'create' &&
      !initial.val &&
      initial.name
    )
      initial.val = initial.name;

    await formApi.setValues(initial as any, false);
  },
});
</script>

<template>
  <Modal
    :title="modalTitle"
    confirm-text="保存"
    cancel-text="取消"
    :show-confirm-button="formType !== 'detail'"
    class="w-[680px]"
  >
    <Form class="mx-4" />
  </Modal>
</template>
