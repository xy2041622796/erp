import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { z } from '#/adapter/form';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'apply_no',
      label: '编号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入编号',
      },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: {
        options: [
          { label: '待审批', value: 0 },
          { label: '待确认', value: 1 },
          { label: '已确认', value: 2 },
        ],
        allowClear: true,
        placeholder: '请选择状态',
      },
    },
    {
      fieldName: 'apply_date',
      label: '申请日期',
      component: 'RangePicker',
      componentProps: {
        valueFormat: 'x',
        class: '!w-full',
      },
    },
    {
      fieldName: 'keyword',
      label: '关键字',
      component: 'Input',
      componentProps: {
        placeholder: '用途/收款方/备注/说明',
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 60, fixed: 'left' },
    { type: 'seq', title: '#', width: 60, fixed: 'left' },
    {
      field: 'apply_date',
      title: '申请日期/编号',
      minWidth: 180,
      slots: { default: 'date_no' },
    },
    {
      field: 'customer_id',
      title: '往来单位',
      minWidth: 180,
      slots: { default: 'customer' },
    },
    {
      field: 'payment_type',
      title: '类型/项目',
      minWidth: 220,
      slots: { default: 'type_project' },
    },
    {
      field: 'applicant_name',
      title: '申请人/部门',
      minWidth: 180,
      slots: { default: 'user_dept' },
    },
    {
      field: 'payment_purpose',
      title: '用途/收款方',
      minWidth: 240,
      slots: { default: 'purpose_payee' },
    },
    {
      field: 'payment_amount',
      title: '申请金额',
      minWidth: 120,
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

export function useFormSchema(mode: 'create' | 'edit' | 'detail'): VbenFormSchema[] {
  const readonly = mode === 'detail';

  return [
    {
      fieldName: 'rowid',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'status',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'ReportID',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },

    {
      fieldName: 'apply_no',
      label: '申请编号',
      component: 'Input',
      componentProps: {
        disabled: true,
        placeholder: '系统自动生成',
      },
    },

    // 付款类型：新增时从列表选择写入（中文），不在详情页面展示
    {
      fieldName: 'payment_type',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },

    {
      fieldName: 'payment_purpose',
      label: '事由',
      component: 'Input',
      componentProps: {
        type: 'textarea',
        autosize: { minRows: 2, maxRows: 4 },
        placeholder: '请输入事由',
        disabled: readonly,
      },
      formItemClass: 'col-span-2',
      rules: 'required',
    },

    {
      fieldName: 'applicant_name',
      label: '申请人',
      component: 'Slot',
      rules: z.string().optional(),
    },
    {
      fieldName: 'apply_depart',
      label: '部门',
      component: 'Slot',
    },
    {
      fieldName: 'apply_date',
      label: '申请日期',
      component: 'DatePicker',
      componentProps: {
        valueFormat: 'x',
        class: '!w-full',
        placeholder: '请选择',
        disabled: readonly,
      },
      rules: 'required',
    },

    {
      fieldName: 'customer_id',
      label: '往来单位',
      component: 'Slot',
      rules: 'required',
    },

    {
      fieldName: 'project_id',
      label: '项目',
      component: 'Slot',
    },

    // 退回预收款/业务付款：预收款单据列表（放在项目下方、金额上方）
    {
      fieldName: 'pre_receipt_bills',
      label: '结算单据',
      component: 'Slot',
      formItemClass: 'col-span-2',
      dependencies: {
        triggerFields: ['payment_type'],
        show: (values) =>
          ['退回预收款', '业务付款'].includes(String((values as any)?.payment_type ?? '')),
      },
    },

    // 直接付款：支出明细列表
    {
      fieldName: 'expense_details',
      label: '支出明细',
      component: 'Slot',
      formItemClass: 'col-span-2',
      dependencies: {
        triggerFields: ['payment_type'],
        show: (values) => String((values as any)?.payment_type ?? '') === '直接付款',
      },
    },

    {
      fieldName: 'contract_id',
      label: '关联合同',
      component: 'Slot',
    },

    {
      fieldName: 'payee_name',
      label: '收款方',
      component: 'Input',
      componentProps: {
        placeholder: '请输入收款方名称',
        disabled: readonly,
      },
      rules: 'required',
    },

    {
      fieldName: 'payment_amount',
      label: '申请金额',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        precision: 2,
        controls: false,
        disabled: readonly,
      },
      rules: 'required',
    },

    {
      fieldName: 'pay_account',
      label: '收款账户',
      component: 'Input',
      componentProps: {
        placeholder: '请输入收款账户',
        disabled: readonly,
      },
    },

    {
      fieldName: 'repay_date',
      label: '期望付款日期',
      component: 'DatePicker',
      componentProps: {
        valueFormat: 'x',
        class: '!w-full',
        placeholder: '请选择',
        disabled: readonly,
      },
    },

    {
      fieldName: 'remark',
      label: '备注',
      component: 'Input',
      componentProps: {
        type: 'textarea',
        autosize: { minRows: 2, maxRows: 4 },
        placeholder: '请输入',
        disabled: readonly,
      },
      formItemClass: 'col-span-2',
    },

    {
      fieldName: 'description',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
  ];
}


export function useSelectedSettlementColumns(disabled: boolean): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', width: 70, fixed: 'left' },
    {
      field: 'settlement_date',
      title: '日期/编号',
      minWidth: 180,
      slots: { default: 'date_no' },
    },
    { field: 'project_id', title: '项目', minWidth: 160 },
    {
      field: 'salesman_id',
      title: '业务员/部门',
      minWidth: 160,
      slots: { default: 'sales_dept' },
    },
    { field: 'remark', title: '备注', minWidth: 160 },
    { field: 'total_amount', title: '应付金额', minWidth: 120 },
    { field: 'pay_amount', title: '实付金额', minWidth: 120 },
    { field: 'pay_balance', title: '可付款余额', minWidth: 120 },
    {
      field: 'apply_amount',
      title: '本次付款',
      minWidth: 120,
      slots: { default: disabled ? 'apply_amount_view' : 'apply_amount' },
    },
    {
      field: 'row_actions',
      title: '操作',
      width: 80,
      fixed: 'right',
      slots: { default: 'row_actions' },
    },
  ];
}
