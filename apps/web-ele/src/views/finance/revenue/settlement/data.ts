import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { erpPriceInputFormatter } from '@vben/utils';

import { z } from '#/adapter/form';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';

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
      label: '客户',
      component: 'ApiSelect',
      componentProps: {
        api: getCustomerSimpleList,
        labelField: 'name',
        valueField: 'id',
        placeholder: '请选择客户',
        clearable: true,
      },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: {
        options: [
          { label: '待审批', value: 10 },
          { label: '待提报', value: 20 },
          { label: '收款中', value: 25 },
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
      field: 'subject_type',
      title: '主体类别',
      minWidth: 150,
      slots: { default: 'subject_type' },
    },
    {
      field: 'contract_id',
      title: '主体编码',
      minWidth: 180,
      slots: { default: 'contract_id' },
    },
    {
      field: 'customer_id',
      title: '客户/项目',
      minWidth: 220,
      slots: { default: 'customer_project' },
    },
    {
      field: 'salesman_id',
      title: '业务员/部门',
      minWidth: 160,
      slots: { default: 'sales_dept' },
    },
    {
      field: 'source_no',
      title: '来源单号',
      minWidth: 160,
    },
    {
      field: 'voucher_code',
      title: '凭证号',
      minWidth: 160,
    },
    {
      field: 'journal_id',
      title: '流水号',
      minWidth: 140,
    },
    {
      field: 'writeoff_status',
      title: '核销状态',
      minWidth: 100,
      slots: { default: 'writeoff_status' },
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
      title: '开票余额',
      minWidth: 120,
    },
    {
      field: 'remark',
      title: '备注/附言',
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
      fieldName: 'contract_id',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'product_id',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'product_name',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'customer_id',
      label: '客户',
      component: 'Slot',
      rules: 'required',
    },
    {
      fieldName: 'account_period',
      label: '账期',
      component: 'DatePicker',
      componentProps: {
        valueFormat: 'x',
        placeholder: '请选择账期',
        class: '!w-full',
        disabled: readonly,
      },
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
      fieldName: 'subject_type',
      label: '主体类型',
      component: 'Slot',
      formItemClass: 'col-span-1',
    },
    {
      fieldName: '__spacer_subject_type',
      component: 'Slot',
      formItemClass: 'col-span-1',
    },
    {
      fieldName: 'subject_selector',
      label: '主体选择',
      component: 'Slot',
      formItemClass: 'col-span-1',
    },
    {
      fieldName: 'contract_detail_action',
      label: '',
      component: 'Slot',
      formItemClass: 'col-span-1',
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
      componentProps: {
        placeholder: '请选择项目',
      },
    },
    {
      fieldName: '__spacer_2',
      component: 'Slot',
      formItemClass: 'col-span-1',
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
        disabled: readonly,
      },
    },
    {
      fieldName: 'tax_rate',
      label: '税率(%)',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        max: 100,
        precision: 2,
        controlsPosition: 'right',
        class: '!w-full',
        disabled: readonly,
      },
      rules: z.number().min(0).optional(),
    },
    {
      fieldName: 'total_amount',
      label: '金额合计',
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        formatter: erpPriceInputFormatter,
        controlsPosition: 'right',
        class: '!w-full',
        disabled: true,
      },
    },
    {
      fieldName: '__spacer_1',
      component: 'Slot',
      formItemClass: 'col-span-1',
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入备注',
        autoSize: { minRows: 1, maxRows: 2 },
        disabled: readonly,
      },
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'items',
      label: '产品信息',
      component: 'Slot',
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'receive_account',
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
    },
  ];
}

export function useFormItemColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', minWidth: 60, fixed: 'left' },
    {
      field: 'product_name',
      title: '产品名称',
      minWidth: 220,
      slots: { default: 'product_name' },
    },
    {
      field: 'specification',
      title: '规格/说明',
      minWidth: 180,
      slots: { default: 'specification' },
    },
    {
      field: 'unit',
      title: '单位',
      minWidth: 90,
      slots: { default: 'unit' },
    },
    {
      field: 'num',
      title: '数量',
      minWidth: 100,
      slots: { default: 'num' },
    },
    {
      field: 'unit_price',
      title: '单价',
      minWidth: 120,
      slots: { default: 'unit_price' },
    },
    {
      field: 'amount',
      title: '未税金额',
      minWidth: 120,
      slots: { default: 'amount' },
    },
    {
      field: 'total_tax_price',
      title: '税额',
      minWidth: 120,
      slots: { default: 'total_tax_price' },
    },
    {
      field: 'total_price',
      title: '含税合计',
      minWidth: 120,
      slots: { default: 'total_price' },
    },
    {
      field: 'source_no',
      title: '来源单号',
      minWidth: 180,
      slots: { default: 'source_no' },
    },
  ];
}
