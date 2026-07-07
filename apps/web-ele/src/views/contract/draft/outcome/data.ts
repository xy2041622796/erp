import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridPropTypes } from '#/adapter/vxe-table';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getSimpleDeptList } from '#/api/system/dept';
import { useUserStore } from '@vben/stores';

export function useGridFormSchema(): VxeGridPropTypes.FormConfig['items'] {
  return [
    { field: 'no', title: '合同编号', span: 6 },
    { field: 'contract_name', title: '合同名称', span: 6 },
    { field: 'customerId', title: '甲方（客户）', span: 6 },
    { field: 'salesperson', title: '负责人', span: 6 },
  ];
}

export function useGridColumns(): VxeGridPropTypes.Columns {
  return [
    { field: 'contract_no', title: '合同编号', minWidth: 180 },
    { field: 'customerName', title: '甲方（客户）', minWidth: 160 },
    { field: 'contract_name', title: '合同名称', minWidth: 200 },
    { field: 'salesperson', title: '负责人', minWidth: 120 },
    { field: 'contract_amount', title: '未税金额', minWidth: 120, align: 'right' },
    { field: 'contract_total_amount', title: '含税金额', minWidth: 120, align: 'right' },
    { field: 'contract_signing_date', title: '签订日期', minWidth: 120 },
  ];
}

/** 新增/修改表单（支出合同） */
export function useFormSchema(): VbenFormSchema[] {
  const userStore = useUserStore();
  return [
    {
      fieldName: 'rowid',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'contract_party_b',
      label: '客户',
      component: 'Slot',
      rules: 'required',
      formItemClass: 'col-span-1',
    },
    {
      fieldName: 'contract_name',
      label: '合同名称',
      component: 'Input',
      rules: 'required',
      componentProps: {
        placeholder: '请输入合同名称',
        class: '!w-full',
      },
    },
    {
      fieldName: 'contract_no',
      label: '编号',
      component: 'Input',
      componentProps: {
        placeholder: '自动生成',
        disabled: true,
      },
    },
    {
      fieldName: 'contract_signing_date',
      label: '签订日期',
      component: 'DatePicker',
      rules: 'required',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        placeholder: '请选择',
        class: '!w-full',
      },
    },
    {
      fieldName: 'salesperson',
      label: '业务员',
      component: 'Slot',
      rules: 'required',
      defaultValue: userStore.userInfo?.id,
    },
    {
      fieldName: 'deptid',
      label: '部门',
      component: 'ApiSelect',
      componentProps: {
        api: getSimpleDeptList,
        labelField: 'name',
        valueField: 'id',
        placeholder: '请选择',
        allowClear: true,
        showSearch: true,
        class: '!w-full',
      },
      defaultValue: (userStore.userInfo as any)?.deptId,
    },
    {
      fieldName: 'project_id',
      label: '项目',
      component: 'Slot',
    },
    {
      fieldName: 'contract_period',
      label: '期限',
      component: 'DatePicker',
      componentProps: {
        type: 'daterange',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        placeholder: ['开始日期', '结束日期'],
        class: '!w-full',
      },
      dependencies: {
        triggerFields: ['contract_period'],
        trigger(values, form) {
          const range = values.contract_period as any;
          if (Array.isArray(range) && range.length === 2) {
            form.setFieldValue('contract_start_date', range[0]);
            form.setFieldValue('contract_end_date', range[1]);
          }
        },
      },
    },
    {
      fieldName: 'contract_start_date',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'contract_end_date',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'delivery_address',
      label: '交付地址',
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
    },
    {
      fieldName: 'delivery_date',
      label: '交付日期',
      component: 'DatePicker',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        placeholder: '请选择',
        class: '!w-full',
      },
    },
    {
      fieldName: 'product_items',
      component: 'Slot',
      formItemClass: 'col-span-2',
      wrapperClass: 'w-full',
      dependencies: {
        triggerFields: ['rowid'],
      },
    },
    {
      fieldName: 'contract_amount',
      label: '未税金额',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        precision: 2,
        placeholder: '0',
        disabled: true,
        controlsPosition: 'right',
        class: '!w-full',
      },
    },
    {
      fieldName: 'contract_tax_rate',
      label: '税率',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        precision: 2,
        placeholder: '0',
        disabled: true,
        controlsPosition: 'right',
        class: '!w-full',
      },
    },
    {
      fieldName: 'contract_total_amount',
      label: '含税金额',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        precision: 2,
        disabled: true,
        controlsPosition: 'right',
        class: '!w-full',
      },
    },
    {
      fieldName: 'contract_tax_amount',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'account_id',
      label: '结算账户',
      component: 'ApiSelect',
      componentProps: {
        api: getAccountSimpleList,
        labelField: 'name',
        valueField: 'rowid',
        placeholder: '默认账户',
        allowClear: true,
        showSearch: true,
        class: '!w-full',
      },
    },
    {
      fieldName: 'receivable_plan',
      component: 'Slot',
      label: '收款计划',
      formItemClass: 'col-span-2',
      wrapperClass: 'w-full',
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入内容',
        rows: 4,
      },
    },
    {
      fieldName: 'description',
      label: '附言(不打印)',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入内容',
        rows: 4,
      },
    },
  ];
}
