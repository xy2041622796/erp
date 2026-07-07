import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { erpPriceInputFormatter } from '@vben/utils';

import { z } from '#/adapter/form';
import { getCustomerSimpleList } from '#/api/crm/customer';

export const INVOICE_APPLY_TAB_STATUS: Record<
  'all' | 'done' | 'todoApprove' | 'todoInvoice',
  number | undefined
> = {
  all: undefined,
  todoApprove: 10,
  todoInvoice: 20,
  done: 30,
};

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'keyword',
      label: '关键字',
      component: 'Input',
      componentProps: {
        placeholder: '编号/抬头/税号/备注',
        allowClear: true,
      },
    },
    {
      fieldName: 'customer_id',
      label: '客户',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择客户',
        allowClear: true,
        showSearch: true,
        api: getCustomerSimpleList,
        labelField: 'name',
        valueField: 'id',
      },
    },
    {
      fieldName: 'applyDateRange',
      label: '申请日期',
      component: 'DatePicker',
      componentProps: {
        type: 'daterange',
        valueFormat: 'x',
        class: '!w-full',
        startPlaceholder: '开始日期',
        endPlaceholder: '结束日期',
      },
    },
    {
      fieldName: 'is_red_invoice',
      label: '红字发票',
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        allowClear: true,
        options: [
          { label: '是', value: 1 },
          { label: '否', value: 0 },
        ],
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      title: '#',
      type: 'seq',
      width: 60,
      fixed: 'left',
    },
    {
      title: '申请日期/编号',
      field: 'apply_date',
      minWidth: 160,
      slots: { default: 'apply_date_no' },
    },
    {
      title: '申请人/部门',
      field: 'applicant',
      minWidth: 140,
      slots: { default: 'applicant_department' },
    },
    {
      title: '客户/抬头',
      field: 'customer_id',
      minWidth: 200,
      slots: { default: 'customer_title' },
    },
    {
      title: '申请金额/税率',
      field: 'total_amount',
      minWidth: 140,
      slots: { default: 'amount_tax' },
      formatter: ({ cellValue }: any) => cellValue ?? 0,
    },
    {
      title: '余额',
      field: 'balance',
      minWidth: 100,
      formatter: ({ cellValue }: any) => cellValue ?? 0,
    },
    {
      title: '备注',
      field: 'remark',
      minWidth: 140,
      showOverflow: 'tooltip',
    },
    {
      title: '状态',
      field: 'status',
      minWidth: 100,
      slots: { default: 'status' },
    },
    {
      title: '操作',
      field: 'actions',
      width: 'auto',
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

export function useFormSchema(
  formType: 'create' | 'detail' | 'edit',
  _formValue: any,
): VbenFormSchema[] {
  const readonly = formType === 'detail';

  return [
    {
      fieldName: 'rowid',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'lingma_sys_is_delete',
      component: 'InputNumber',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },

    {
      fieldName: 'applicant',
      label: '申请人',
      // component: 'Slot',
      component: 'Slot',
      rules: 'required',
    },
    {
      fieldName: 'apply_department',
      label: '部门',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: false,
      },

      componentProps: {
        placeholder: '请输入部门',
        disabled: readonly,
      },
    },
    {
      fieldName: 'apply_date',
      label: '申请日期',
      component: 'DatePicker',
      componentProps: {
        valueFormat: 'x',
        class: '!w-full',
        placeholder: '请选择日期',
        disabled: readonly,
      },
      rules: 'required',
    },

    {
      fieldName: 'customer_id',
      label: '客户',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择客户',
        allowClear: true,
        showSearch: true,
        api: getCustomerSimpleList,
        labelField: 'name',
        valueField: 'id',
        disabled: readonly,
      },
      rules: 'required',
    },

    {
      fieldName: 'is_red_invoice',
      label: '红字发票',
      component: 'Switch',
      componentProps: {
        activeValue: 1,
        inactiveValue: 0,
        disabled: readonly,
      },
      rules: z.number().default(0),
    },

    {
      fieldName: 'invoice_type',
      label: '发票类型',
      component: 'Select',
      componentProps: {
        placeholder: '请选择发票类型',
        options: [
          { label: '增值税专用发票', value: 'vat_special' },
          { label: '增值税普通发票', value: 'vat_normal' },
          { label: '电子普通发票', value: 'electronic_normal' },
          { label: '其他', value: 'other' },
        ],
        disabled: readonly,
      },
    },
    {
      fieldName: 'tax_rate',
      label: '税率',
      component: 'Select',
      componentProps: (props: any) => {
        return {
          placeholder: '请选择税率',
          options: [
            { label: '免税', value: 0 },
            { label: '1%', value: 1 },
            { label: '3%', value: 3 },
            { label: '6%', value: 6 },
            { label: '9%', value: 9 },
            { label: '13%', value: 13 },
          ],
          disabled: readonly,
          onChange: (val: any) => {
            if (val !== undefined && val !== null) {
              props.tax_rate = val;
            }
          },
        };
      },
      rules: z.number().min(0).optional(),
    },

    {
      fieldName: 'invoice_title',
      label: '发票抬头',
      component: 'Input',
      componentProps: {
        placeholder: '请输入抬头',
        disabled: readonly,
      },
    },
    {
      fieldName: 'tax_number',
      label: '税号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入税号',
        disabled: readonly,
      },
    },
    {
      fieldName: 'bank_name',
      label: '开户行',
      component: 'Input',
      componentProps: {
        placeholder: '请输入开户行',
        disabled: readonly,
      },
    },
    {
      fieldName: 'bank_account',
      label: '银行账号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入银行账号',
        disabled: readonly,
      },
    },
    {
      fieldName: 'address',
      label: '地址',
      component: 'Input',
      componentProps: {
        placeholder: '请输入地址',
        disabled: readonly,
      },
    },
    {
      fieldName: 'contact_phone',
      label: '联系电话',
      component: 'Input',
      componentProps: {
        placeholder: '请输入联系电话',
        disabled: readonly,
      },
    },

    {
      fieldName: 'recipient',
      label: '收件人',
      component: 'Input',
      componentProps: {
        placeholder: '请输入收件人',
        disabled: readonly,
      },
    },
    {
      fieldName: 'recipient_phone',
      label: '收件人电话',
      component: 'Input',
      componentProps: {
        placeholder: '请输入收件人电话',
        disabled: readonly,
      },
    },
    {
      fieldName: 'recipient_email',
      label: '收件人邮箱',
      component: 'Input',
      componentProps: {
        placeholder: '请输入收件人邮箱',
        disabled: readonly,
      },
    },
    {
      fieldName: 'recipient_address',
      label: '收件人地址',
      component: 'Input',
      componentProps: {
        placeholder: '请输入收件人地址',
        disabled: readonly,
      },
    },
    {
      fieldName: 'transfer_method',
      label: '移交方式',
      component: 'Input',
      componentProps: {
        placeholder: '例如：快递/自取/邮寄',
        disabled: readonly,
      },
    },
    {
      fieldName: 'relates',
      label: '关联合同/结算单',
      component: 'Slot',
      formItemClass: 'col-span-3',
    },
    {
      fieldName: 'details',
      label: '开票明细',
      component: 'Slot',
      formItemClass: 'col-span-3',
    },

    {
      fieldName: 'total_amount',
      label: '开票申请合计金额',
      component: 'InputNumber',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
      componentProps: {
        precision: 2,
        formatter: erpPriceInputFormatter,
        controlsPosition: 'right',
        class: '!w-full',
        disabled: true,
      },
    },
    // {
    //   fieldName: 'remark',
    //   label: '备注',
    //   component: 'InputTextArea',
    //   formItemClass: 'col-span-3',
    //   componentProps: {
    //     placeholder: '请输入备注',
    //     rows: 3,
    //     disabled: readonly,
    //   },
    // },

    {
      fieldName: 'status',
      component: 'InputNumber',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
  ];
}
