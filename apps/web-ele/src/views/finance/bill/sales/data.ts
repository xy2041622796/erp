import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

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
    // {
    //   fieldName: 'seller_company_id',
    //   label: '销方公司',
    //   component: 'Input',
    //   componentProps: {
    //     placeholder: '请选择销方公司',
    //     disabled: disabled || isPer('fd:edit', 'seller_company_id', formType),
    //   },
    // },

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
        placeholder: '请选择',
        options: [
          { label: '增值税专用发票', value: 'vat_special' },
          { label: '增值税普通发票', value: 'vat_normal' },
          { label: '电子普通发票', value: 'electronic_normal' },
          { label: '其他', value: 'other' },
        ],
        disabled: disabled || isPer('fd:edit', 'invoice_type', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'invoice_number',
      label: '发票号码',
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
        disabled: disabled || isPer('fd:edit', 'invoice_number', formType),
      },
      rules: 'required',
    },

    {
      fieldName: 'issue_date',
      label: '开票日期',
      component: 'DatePicker',
      componentProps: {
        valueFormat: 'x',
        placeholder: '请选择',
        disabled: disabled || isPer('fd:edit', 'issue_date', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'invoice_title',
      label: '发票抬头',
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
        disabled: disabled || isPer('fd:edit', 'invoice_title', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'tax_number',
      label: '纳税人识别号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
        disabled: disabled || isPer('fd:edit', 'tax_number', formType),
      },
    },
    {
      fieldName: 'bank_name',
      label: '开户行',
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
        disabled: disabled || isPer('fd:edit', 'bank_name', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'bank_account',
      label: '银行账号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
        disabled: disabled || isPer('fd:edit', 'bank_account', formType),
      },
    },

    {
      fieldName: 'address',
      label: '地址',
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
        disabled: disabled || isPer('fd:edit', 'address', formType),
      },
    },
    {
      fieldName: 'contact_phone',
      label: '电话',
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
        disabled: disabled || isPer('fd:edit', 'contact_phone', formType),
      },
    },

    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入',
        disabled: disabled || isPer('fd:edit', 'remark', formType),
      },
    },
    {
      fieldName: 'details',
      label: '开票明细',
      component: 'Slot',
      formItemClass: 'col-span-3',
    },
  ];
}

/** 列表搜索表单 (Invoice Info - Done Tab) */
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
      component: 'DatePicker',
      componentProps: {
        type: 'daterange',
        valueFormat: 'x',
        startPlaceholder: '开始日期',
        endPlaceholder: '结束日期',
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

/** 列表搜索表单 (Invoice Apply - Pending Tab) */
export function useApplyGridFormSchema(): VbenFormSchema[] {
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
      title: '客户/抬头',
      minWidth: 140,
      slots: { default: 'customer_title_invoice' },
    },
    // {
    //   field: 'invoice_content',
    //   title: '开票内容',
    //   minWidth: 160,
    // },
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
// export function useGridColumns(): VxeTableGridOptions['columns'] {
//   return [
//     {
//       type: 'seq',
//       width: 50,
//       title: '序号',
//     },
//     {
//       field: 'invoice_number',
//       title: '发票号码',
//       minWidth: 120,
//     },
//     {
//       field: 'invoice_type',
//       title: '发票类型',
//       minWidth: 120,
//     },
//     {
//       field: 'invoice_title',
//       title: '发票抬头',
//       minWidth: 150,
//     },
//     {
//       field: 'total_amount',
//       title: '价税合计',
//       minWidth: 120,
//     },
//     {
//       field: 'issue_date',
//       title: '开票日期',
//       minWidth: 120,
//       formatter: ({ cellValue }) => {
//         return cellValue
//           ? new Date(Number(cellValue)).toLocaleDateString()
//           : '';
//       },
//     },
//     {
//       field: 'customer_name',
//       title: '客户',
//       minWidth: 150,
//     },
//     {
//       title: '操作',
//       fixed: 'right',
//       width: 140,
//       slots: { default: 'action' },
//     },
//   ];
// }

export function useApplyGridColumns(): VxeTableGridOptions['columns'] {
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
export function useDetailColumns(
  disabled: boolean,
): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'seq',
      width: 50,
      title: '序号',
    },
    {
      field: 'invoice_content',
      title: '开票内容(货物名称)',
      minWidth: 150,
      slots: { default: 'invoice_content' },
    },
    {
      field: 'invoice_amount',
      title: '金额(不含税)',
      width: 140,
      // slots: { default: 'invoice_amount' },
    },
    {
      field: 'tax_rate',
      title: '税率(%)',
      width: 120,
      formatter: ({ cellValue }) => {
        const rate = Number(cellValue);
        return Number.isFinite(rate) ? rate.toFixed(2) : '-';
      },
    },
    {
      field: 'tax_amount',
      title: '税额',
      width: 140,
      // slots: { default: 'tax_amount' },
    },
    {
      field: 'total_amount',
      title: '价税合计',
      width: 140,
      formatter: ({ cellValue }) => {
        return Number(cellValue).toFixed(2);
      },
    },
    // {
    //   title: '操作',
    //   width: 80,
    //   fixed: 'right',
    //   slots: { default: 'actions' },
    //   visible: !disabled,
    // },
  ];
}

// export function useDetailColumns(
//   disabled: boolean,
// ): VxeTableGridOptions['columns'] {
//   return [
//     {
//       type: 'seq',
//       width: 50,
//       title: '序号',
//     },
//     {
//       field: 'invoice_content',
//       title: '开票内容(货物名称)',
//       minWidth: 150,
//       slots: { default: 'invoice_content' },
//     },
//     {
//       field: 'invoice_amount',
//       title: '金额(不含税)',
//       width: 140,
//       slots: { default: 'invoice_amount' },
//     },
//     {
//       field: 'tax_rate',
//       title: '税率(%)',
//       width: 120,
//       slots: { default: 'tax_rate' },
//     },
//     {
//       field: 'tax_amount',
//       title: '税额',
//       width: 140,
//       slots: { default: 'tax_amount' },
//     },
//     {
//       field: 'total_amount',
//       title: '价税合计',
//       width: 140,
//       formatter: ({ cellValue }) => {
//         return Number(cellValue).toFixed(2);
//       },
//     },
//     {
//       title: '操作',
//       width: 80,
//       fixed: 'right',
//       slots: { default: 'actions' },
//       visible: !disabled,
//     },
//   ];
// }
