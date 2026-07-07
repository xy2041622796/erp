import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { erpPriceInputFormatter } from '@vben/utils';

import { z } from '#/adapter/form';
import { getCustomerSimpleList } from '#/api/crm/customer';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

export function useFormSchema(
  formType: string,
  formValue: any,
): VbenFormSchema[] {
  const { hasFieldPermission } = useDataTablePermission();
  const isPer = hasFieldPermission(formValue);

  const disabled = formType === 'detail';

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
        disabled: disabled || isPer('fd:edit', 'customer_id', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'seller_company_id',
      label: '销方公司',
      component: 'Slot',
    },

    {
      fieldName: 'is_seller_invoice',
      label: '是否销项发票',
      component: 'Switch',
      componentProps: {
        activeValue: 1,
        inactiveValue: 0,
        disabled: disabled || isPer('fd:edit', 'is_seller_invoice', formType),
      },
      rules: z.number().default(1),
    },
    {
      fieldName: 'is_red_invoice',
      label: '红字发票',
      component: 'Switch',
      componentProps: {
        activeValue: 1,
        inactiveValue: 0,
        disabled: disabled || isPer('fd:edit', 'is_red_invoice', formType),
      },
      rules: z.number().default(0),
    },
    {
      fieldName: 'is_electronic_invoice',
      label: '电子发票',
      component: 'Switch',
      componentProps: {
        activeValue: 1,
        inactiveValue: 0,
        disabled:
          disabled || isPer('fd:edit', 'is_electronic_invoice', formType),
      },
      rules: z.number().default(1),
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
        disabled: disabled || isPer('fd:edit', 'invoice_type', formType),
      },
    },
    {
      fieldName: 'issue_date',
      label: '开票日期',
      component: 'DatePicker',
      componentProps: {
        placeholder: '选择开票日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'x',
        class: '!w-full',
        disabled: disabled || isPer('fd:edit', 'issue_date', formType),
      },
    },
    {
      fieldName: 'invoice_number',
      label: '发票号码',
      component: 'Input',
      componentProps: {
        placeholder: '请输入发票号码',
        disabled: disabled || isPer('fd:edit', 'invoice_number', formType),
      },
    },

    {
      fieldName: 'invoice_title',
      label: '发票抬头',
      component: 'Input',
      componentProps: {
        placeholder: '请输入发票抬头',
        disabled: disabled || isPer('fd:edit', 'invoice_title', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'tax_number',
      label: '税号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入税号',
        disabled: disabled || isPer('fd:edit', 'tax_number', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'address',
      label: '地址',
      component: 'Input',
      componentProps: {
        placeholder: '请输入地址',
        disabled: disabled || isPer('fd:edit', 'address', formType),
      },
    },
    {
      fieldName: 'contact_phone',
      label: '联系电话',
      component: 'Input',
      componentProps: {
        placeholder: '请输入联系电话',
        disabled: disabled || isPer('fd:edit', 'contact_phone', formType),
      },
    },
    {
      fieldName: 'bank_name',
      label: '开户行',
      component: 'Input',
      componentProps: {
        placeholder: '请输入开户行',
        disabled: disabled || isPer('fd:edit', 'bank_name', formType),
      },
    },
    {
      fieldName: 'bank_account',
      label: '银行账号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入银行账号',
        disabled: disabled || isPer('fd:edit', 'bank_account', formType),
      },
    },

    {
      fieldName: 'invoice_content',
      label: '开票内容（汇总）',
      component: 'Select',
      componentProps: {
        placeholder: '请选择或填写汇总开票内容',
        allowClear: true,
        options: [
          { label: '销售收入', value: 'sales' },
          { label: '服务费', value: 'service' },
          { label: '其他', value: 'other' },
        ],
        disabled: disabled || isPer('fd:edit', 'invoice_content', formType),
      },
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入备注',
        autoSize: { minRows: 1, maxRows: 3 },
        disabled: disabled || isPer('fd:edit', 'remark', formType),
      },
      formItemClass: 'col-span-3',
    },

    {
      fieldName: 'details',
      label: '开票明细',
      component: 'Input',
      formItemClass: 'col-span-3',
    },

    {
      fieldName: 'invoice_amount',
      label: '开票金额',
      component: 'InputNumber',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
      componentProps: {
        placeholder: '自动汇总',
        precision: 2,
        formatter: erpPriceInputFormatter,
        disabled: true,
        controlsPosition: 'right',
        class: '!w-full',
      },
      rules: z.number().min(0).optional(),
    },
    {
      fieldName: 'tax_amount',
      label: '税额',
      component: 'InputNumber',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
      componentProps: {
        placeholder: '自动汇总',
        precision: 2,
        formatter: erpPriceInputFormatter,
        disabled: true,
        controlsPosition: 'right',
        class: '!w-full',
      },
      rules: z.number().min(0).optional(),
    },
    {
      fieldName: 'total_amount',
      label: '价税合计',
      component: 'InputNumber',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
      componentProps: {
        placeholder: '自动汇总',
        precision: 2,
        formatter: erpPriceInputFormatter,
        disabled: true,
        controlsPosition: 'right',
        class: '!w-full',
      },
      rules: z.number().min(0).optional(),
    },
  ];
}

/** 列表搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'invoice_number',
      label: '发票号码',
      component: 'Input',
      componentProps: {
        placeholder: '请输入发票号码',
        allowClear: true,
      },
    },
    {
      fieldName: 'invoice_title',
      label: '发票抬头',
      component: 'Input',
      componentProps: {
        placeholder: '请输入发票抬头',
        allowClear: true,
      },
    },
    {
      fieldName: 'tax_number',
      label: '税号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入税号',
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
      fieldName: 'issueDateRange',
      label: '开票日期',
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
      },
    },
    {
      fieldName: 'keyword',
      label: '关键字',
      component: 'Input',
      componentProps: {
        placeholder: '抬头/税号/号码/内容/备注',
        allowClear: true,
      },
    },
  ];
}

/** 列表列 */
export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'issue_date',
      title: '开票日期',
      width: 120,
      formatter: 'formatDate',
    },
    {
      field: 'invoice_number',
      title: '发票号码/销方公司',
      width: 200,
      slots: { default: 'invoice_number' },
    },
    {
      field: 'customer_id',
      title: '往来单位',
      minWidth: 140,
      slots: { default: 'customer_id' },
    },
    {
      field: 'invoice_content',
      title: '开票内容',
      minWidth: 160,
    },
    // {
    //   field: 'tax_rate',
    //   title: '税率',
    //   minWidth: 80,
    // },
    {
      field: 'invoice_amount',
      title: '金额/税额',
      minWidth: 120,
      slots: { default: 'invoice_info' },
    },
    {
      field: 'total_amount',
      title: '价税合计',
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'flowstate',
      title: '状态',
      minWidth: 100,
      slots: { default: 'flowstate' },
    },
    {
      title: '操作',
      width: 'auto',
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

/** 表单明细列 */
export function useDetailColumns(
  disabled: boolean,
): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', minWidth: 50, fixed: 'left' },
    {
      field: 'invoice_content',
      title: '开票内容',
      minWidth: 180,
      slots: { default: 'invoice_content' },
    },

    {
      field: 'product_num',
      title: '采购数量',
      minWidth: 180,
      slots: { default: 'product_num' },
    },
    {
      field: 'invoice_amount',
      title: '开票金额',
      minWidth: 120,
      fixed: 'right',
      slots: { default: 'invoice_amount' },
    },
    {
      field: 'tax_rate',
      title: '税率(%)',
      minWidth: 100,
      fixed: 'right',
      slots: { default: 'tax_rate' },
    },
    {
      field: 'tax_amount',
      title: '税额',
      minWidth: 120,
      fixed: 'right',
      slots: { default: 'tax_amount' },
    },
    {
      field: 'total_amount',
      title: '价税合计',
      minWidth: 120,
      fixed: 'right',
      formatter: 'formatAmount2',
    },
    {
      title: '操作',
      width: 80,
      fixed: 'right',
      slots: { default: 'actions' },
      visible: !disabled,
    },
  ];
}
