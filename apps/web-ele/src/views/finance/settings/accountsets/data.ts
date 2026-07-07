import type { VbenFormSchema } from '#/adapter/form';


export const TAX_TYPE_TEXT: Record<string, string> = {
  general: '一般纳税人',
  small: '小规模纳税人',
};

export const ACCOUNT_VERSION_TEXT: Record<string, string> = {
  1: '小企业会计准则',
  2: '企业会计准则',
  3: '民间非营利组织会计制度',
};

export function useFormSchema(
  formType: 'create' | 'detail' | 'edit',
  _formValue: any,
  currencyOptions: Array<{ label: string; value: string }> = [
    { label: '人民币(CNY)', value: 'CNY' },
  ],
): VbenFormSchema[] {
  const readonly = formType === 'detail';

  return [
    {
      fieldName: 'rowid',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'lingma_sys_is_delete',
      component: 'InputNumber',
      dependencies: { triggerFields: [''], show: () => false },
      defaultValue: 0,
    },
    {
      fieldName: 'account_name',
      label: '账套名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入账套名称',
        disabled: readonly,
      },
      rules: 'required',
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
      fieldName: 'tax_type',
      label: '纳税类型',
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: [
          { label: '一般纳税人', value: 'general' },
          { label: '小规模纳税人', value: 'small' },
        ],
        disabled: readonly,
      },
      defaultValue: 'small',
    },
    {
      fieldName: 'vat_rate',
      label: '增值税率(%)',
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: [
          { label: '0%', value: 0 },
          { label: '1%', value: 1 },
          { label: '3%', value: 3 },
          { label: '6%', value: 6 },
          { label: '9%', value: 9 },
          { label: '13%', value: 13 },
        ],
        disabled: readonly,
      },
      defaultValue: 0,
    },
    {
      fieldName: 'account_version',
      label: '会计准则',
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: Object.entries(ACCOUNT_VERSION_TEXT).map(([value, label]) => ({
          label,
          value: Number(value),
        })),
        disabled: readonly,
      },
    },
    {
      fieldName: 'recording_currency',
      label: '记账本位币',
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: Array.isArray(currencyOptions) && currencyOptions.length > 0
          ? currencyOptions
          : [{ label: '人民币(CNY)', value: 'CNY' }],
        disabled: readonly,
      },
      defaultValue: 'CNY',
    },
    {
      fieldName: 'start_date',
      label: '启用时间',
      component: 'DatePicker',
      componentProps: {
        type: 'month',
        format: 'YYYY年MM月',
        valueFormat: 'YYYY-MM',
        placeholder: '请选择',
        disabled: readonly,
      },
    },
    {
      fieldName: 'init_date',
      label: '初始账期',
      component: 'DatePicker',
      componentProps: {
        type: 'datetime',
        format: 'YYYY年MM月DD日 HH:mm:ss',
        valueFormat: 'YYYY-MM-DD',
        placeholder: '请选择',
        disabled: readonly,
      },
      rules: 'required',
    },
    {
      fieldName: 'industry_type',
      label: '行业类型',
      component: 'Input',
      componentProps: {
        placeholder: '请输入行业类型',
        disabled: readonly,
      },
    },
    {
      fieldName: 'staff_scale',
      label: '人员规模',
      component: 'Input',
      componentProps: {
        placeholder: '请输入人员规模',
        disabled: readonly,
      },
    },
    {
      fieldName: 'main_business',
      label: '主营业务',
      component: 'InputTextArea',
      formItemClass: 'accountset-form-main-business',
      componentProps: {
        placeholder: '请输入主营业务',
        rows: 2,
        disabled: readonly,
      },
    },
  ];
}
