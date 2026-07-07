import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { z } from '#/adapter/form';
import { getSettlementProjectSimpleList } from '#/api/erp/finance/revenue/settlement/project';
import { getAccountSimpleList } from '#/api/erp/finance/account';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'sumbit_code',
      label: '编号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入编号',
      },
    },
    {
      fieldName: 'income_type',
      label: '类型',
      component: 'Select',
      componentProps: {
        options: [
          { label: '业务收款', value: '业务收款' },
          { label: '预收款收款', value: '预收款收款' },
        ],
        allowClear: true,
        placeholder: '请选择类型',
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
      fieldName: 'createtime',
      label: '提报日期',
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
      field: 'createtime',
      title: '提报日期/编号',
      minWidth: 180,
      slots: { default: 'date_no' },
    },
    {
      field: 'income_type',
      title: '类型/部门',
      minWidth: 180,
      slots: { default: 'type_dept' },
    },
    {
      field: 'user_name',
      title: '提报人/项目',
      minWidth: 200,
      slots: { default: 'user_project' },
    },
    {
      field: 'customer_id',
      title: '往来单位/收款账户',
      minWidth: 220,
      slots: { default: 'customer_account' },
    },
    {
      field: 'payer_account',
      title: '对方户名/到账日期',
      minWidth: 220,
      slots: { default: 'payer_date' },
    },
    {
      field: 'collection_amount',
      title: '金额',
      minWidth: 120,
    },
    {
      field: 'remark',
      title: '打款附言/备注',
      minWidth: 220,
      slots: { default: 'remark_desc' },
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
      fieldName: 'income_type',
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
      label: '提报编号',
      component: 'Input',
      componentProps: {
        disabled: true,
        placeholder: '系统自动生成',
      },
    },
    {
      fieldName: 'user_name',
      label: '提报人',
      component: 'Slot',
      rules: z.string().optional(),
    },
    {
      fieldName: 'depart_name',
      label: '部门',
      component: 'Slot',
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

    {
      fieldName: 'biz_bills',
      label: '',
      component: 'Slot',
      formItemClass: 'col-span-2',
    },

    {
      fieldName: 'collection_account',
      label: '收款账户',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择收款账户',
        api: getAccountSimpleList,
        labelField: 'name',
        valueField: 'rowid',
        showSearch: true,
        allowClear: true,
        class: '!w-full',
        disabled: readonly,
      },
      formItemClass: 'col-span-1',
    },
        {
      fieldName: '__spacer_52',
      component: 'Slot',
      formItemClass: 'col-span-1',
    },

    {
      fieldName: 'collection_amount',
      label: '到账金额',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        controls: false,
        disabled: readonly,
      },
      rules: 'required',
    },
    {
      fieldName: 'collection_date',
      label: '到账日期',
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
      fieldName: 'payer_account',
      label: '对方户名',
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
        disabled: readonly,
      },
    },
    {
      fieldName: 'payer_bank',
      label: '对方开户行',
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
        disabled: readonly,
      },
    },
    {
      fieldName: 'remark',
      label: '打款附言',
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

export function useSettlementSelectFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'settlement_no',
      label: '单据编号',
      component: 'Input',
      componentProps: { placeholder: '请输入' },
    },
    {
      fieldName: 'settlement_type',
      label: '单据类型',
      component: 'Select',
      componentProps: {
        options: [
          { label: '全部单据类型', value: undefined },
          { label: '收入结算', value: 1 },
          { label: '其他收入', value: 2 },
        ],
        allowClear: true,
        placeholder: '全部单据类型',
      },
    },
    {
      fieldName: 'project_id',
      label: '项目',
      component: 'ApiSelect',
      componentProps: {
        api: getSettlementProjectSimpleList,
        labelField: 'project_name',
        valueField: 'rowid',
        allowClear: true,
        showSearch: true,
        placeholder: '全部项目',
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

export function useSettlementSelectColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 60, fixed: 'left' },
    {
      field: 'settlement_date',
      title: '日期/编号',
      minWidth: 180,
      slots: { default: 'date_no' },
    },
    {
      field: 'settlement_type',
      title: '单据类型',
      minWidth: 120,
      slots: { default: 'bill_type' },
    },
    {
      field: 'project_id',
      title: '项目',
      minWidth: 160,
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
      title: '可申请金额',
      minWidth: 120,
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 200,
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
    { field: 'total_amount', title: '应收金额', minWidth: 120 },
    { field: 'receive_amount', title: '应收余额', minWidth: 120 },
    { field: 'receive_balance', title: '可申请余额', minWidth: 120 },
    {
      field: 'apply_amount',
      title: '本次核销',
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
