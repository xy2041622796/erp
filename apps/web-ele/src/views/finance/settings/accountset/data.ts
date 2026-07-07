import type { VbenFormSchema } from '#/adapter/form';

// 基础信息表单 Schema
export function useAccountInfoSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'account_name',
      label: '账套名称',
      component: 'Input',
      componentProps: { placeholder: '请输入账套名称' },
      rules: 'required',
    },
    {
      fieldName: 'tax_number',
      label: '税号',
      component: 'Input',
      componentProps: { placeholder: '请输入税号' },
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
      },
      defaultValue: 'small',
    },
    {
      fieldName: 'vat_rate',
      label: '增值税率',
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
      },
      defaultValue: 0,
    },
    {
      fieldName: 'industry_type',
      label: '行业类型',
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: [
          { label: '互联网/软件', value: 'it' },
          { label: '制造业', value: 'manufacturing' },
          { label: '服务业', value: 'service' },
        ],
      },
    },
    {
      fieldName: 'staff_scale',
      label: '人员规模',
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: [
          { label: '0-20人', value: '0-20' },
          { label: '20-50人', value: '20-50' },
          { label: '50-100人', value: '50-100' },
          { label: '100人以上', value: '100+' },
        ],
      },
    },
    {
      fieldName: 'main_business',
      label: '主营业务',
      component: 'InputTextArea',
      componentProps: { placeholder: '请输入主营业务', rows: 2 },
    },
  ];
}

// 账期表单 Schema
export function useAccountPeriodSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'start_period',
      label: '初始账期',
      component: 'DatePicker',
      componentProps: {
        type: 'month',
        format: 'YYYY年MM月',
        valueFormat: 'YYYY-MM',
        border: false,
        // readonly: true,
        placeholder: '无',
        class: '!w-48',
      },
    },
  ];
}

// 保持原有的 Grid Schema 导出以免报错（如果其他地方引用）
export function useGridFormSchema() {
  return [];
}
export function useGridColumns() {
  return [];
}
export function useFormSchema() {
  return [];
}
