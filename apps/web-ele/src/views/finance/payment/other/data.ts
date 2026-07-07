import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { z } from '#/adapter/form';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getSimpleUserList } from '#/api/system/user';

import { getOtherExpenseProjectSimpleList } from '#/api/erp/finance/payment/other/project';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'settlement_no',
      label: '编号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入编号',
      },
    },
    {
      fieldName: 'supplier_id',
      label: '客户',
      component: 'ApiSelect',
      componentProps: {
        api: getCustomerSimpleList,
        labelField: 'name',
        valueField: 'id',
        placeholder: '请选择客户',
        clearable: true,
        showSearch: true,
      },
    },
    {
      fieldName: 'project_id',
      label: '项目',
      component: 'ApiSelect',
      componentProps: {
        api: getOtherExpenseProjectSimpleList,
        labelField: 'project_name',
        valueField: 'rowid',
        placeholder: '请选择项目',
        clearable: true,
        showSearch: true,
      },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: {
        options: [
          { label: '待审批', value: 10 },
          { label: '待付款', value: 20 },
          { label: '已完成', value: 30 },
        ],
        allowClear: true,
        placeholder: '请选择状态',
      },
    },
    {
      fieldName: 'settlement_date',
      label: '日期',
      component: 'RangePicker',
      componentProps: {
        valueFormat: 'x',
        class: '!w-full',
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 60, fixed: 'left' },
    { type: 'seq', title: '#', width: 60, fixed: 'left' },
    {
      field: 'settlement_date',
      title: '日期/编号',
      minWidth: 180,
      slots: { default: 'date_no' },
    },
    {
      field: 'supplier_id',
      title: '客户/项目',
      minWidth: 240,
      slots: { default: 'supplier_project' },
    },
    {
      field: 'salesman_id',
      title: '业务员/部门',
      minWidth: 160,
      slots: { default: 'sales_dept' },
    },
    {
      field: 'total_amount',
      title: '应付金额',
      minWidth: 120,
    },
    {
      field: 'pay_balance',
      title: '实付/余额',
      minWidth: 120,
      slots: { default: 'pay' },
    },
    {
      field: 'ticket_amount',
      title: '开票余额',
      minWidth: 120,
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 160,
    },
    {
      field: 'status',
      title: '状态',
      minWidth: 100,
      slots: { default: 'status' },
    },
    {
      field: 'actions',
      title: '操作',
      width: 'auto',
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

export function useFormSchema(formType: string): VbenFormSchema[] {
  const readonly = formType === 'detail';

  return [
    {
      fieldName: 'rowid',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'settlement_type',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },

    {
      fieldName: 'supplier_id',
      label: '客户',
      component: 'Slot',
      rules: z.string().min(1, '请选择客户'),
    },
    {
      fieldName: 'settlement_date',
      label: '日期',
      component: 'DatePicker',
      componentProps: {
        valueFormat: 'x',
        placeholder: '请选择日期',
        class: '!w-full',
        disabled: readonly,
      },
      rules: 'required',
    },

    {
      fieldName: 'salesman_id',
      label: '业务员',
      component: 'Slot',
    },
    {
      fieldName: 'depart_id',
      label: '部门',
      component: 'Slot',
    },

    {
      fieldName: 'project_id',
      label: '项目',
      component: 'Slot',
    },
    {
      fieldName: 'settlement_no',
      label: '编号',
      component: 'Input',
      componentProps: {
        disabled: true,
        placeholder: '系统自动生成',
      },
    },

    {
      fieldName: 'items',
      label: '支出明细',
      component: 'Slot',
      formItemClass: 'col-span-2',
    },

    {
      fieldName: 'pay_account',
      label: '付款账户',
      component: 'Input',
      componentProps: {
        placeholder: '请输入付款账户',
        disabled: readonly,
      },
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'InputTextArea',
      formItemClass: 'col-span-2',
      componentProps: {
        placeholder: '请输入内容',
        rows: 3,
        disabled: readonly,
      },
    },
  ];
}

export function useFormItemColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', width: 70 },
    {
      field: 'payment_type',
      title: '支出类别',
      minWidth: 180,
      slots: { default: 'payment_type' },
    },
    {
      field: 'tax_rate',
      title: '税率(%)',
      width: 120,
      slots: { default: 'tax_rate' },
    },
    {
      field: 'business_doc_amount',
      title: '金额',
      width: 140,
      slots: { default: 'business_doc_amount' },
    },
    {
      field: 'description',
      title: '备注',
      minWidth: 200,
      slots: { default: 'description' },
    },
    {
      field: 'actions',
      title: '操作',
      width: 'auto',
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
