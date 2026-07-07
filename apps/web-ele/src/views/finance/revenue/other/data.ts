import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { erpPriceInputFormatter } from '@vben/utils';

import { z } from '#/adapter/form';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getSimpleUserList } from '#/api/system/user';

import { getOtherIncomeProjectSimpleList } from '#/api/erp/finance/revenue/other/project';

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
      fieldName: 'customer_id',
      label: '往来单位',
      component: 'ApiSelect',
      componentProps: {
        api: getCustomerSimpleList,
        labelField: 'name',
        valueField: 'id',
        placeholder: '请选择往来单位',
        clearable: true,
        showSearch: true,
      },
    },
    {
      fieldName: 'project_id',
      label: '项目',
      component: 'ApiSelect',
      componentProps: {
        api: getOtherIncomeProjectSimpleList,
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
          { label: '待收款', value: 20 },
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
      field: 'customer_id',
      title: '往来单位/项目',
      minWidth: 240,
      slots: { default: 'customer_project' },
    },
    {
      field: 'salesman_id',
      title: '业务员/部门',
      minWidth: 160,
      slots: { default: 'sales_dept' },
    },
    {
      field: 'total_amount',
      title: '应收金额',
      minWidth: 120,
    },
    {
      field: 'receive_balance',
      title: '实收/余额',
      minWidth: 120,
      slots: { default: 'receive' },
    },
    {
      field: 'ticket_amount',
      title: '已开票金额',
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
      width: "auto",
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
      fieldName: 'customer_id',
      label: '往来单位',
      component: 'Slot',
      rules: z.string().min(1, '请选择往来单位'),
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
      label: '收入明细',
      component: 'Slot',
      formItemClass: 'col-span-2',
    },

    // {
    //   fieldName: 'is_tax_included',
    //   label: '含税',
    //   component: 'Switch',
    //   componentProps: {
    //     activeValue: 1,
    //     inactiveValue: 0,
    //     disabled: readonly,
    //   },
    // },

    // {
    //   fieldName: 'amount',
    //   label: '金额小计',
    //   component: 'InputNumber',
    //   componentProps: {
    //     precision: 2,
    //     formatter: erpPriceInputFormatter,
    //     controlsPosition: 'right',
    //     class: '!w-full',
    //     disabled: true,
    //   },
    // },
    // {
    //   fieldName: 'total_amount',
    //   label: '金额合计',
    //   component: 'InputNumber',
    //   componentProps: {
    //     precision: 2,
    //     formatter: erpPriceInputFormatter,
    //     controlsPosition: 'right',
    //     class: '!w-full',
    //     disabled: true,
    //   },
    // },

    {
      fieldName: 'receive_account',
      label: '收款账户',
      component: 'Input',
      componentProps: {
        placeholder: '请输入收款账户',
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
      title: '收入类别',
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
      width: "auto",
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
