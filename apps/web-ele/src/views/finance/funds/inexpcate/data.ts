import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export const USE_SCOPE_OPTIONS = [{ label: '全公司', value: 1 }];

export const CATEGORY_TYPE_TEXT: Record<number | string, string> = {
  1: '收入',
  2: '支出',
};

const ENABLE_TEXT: Record<number | string, string> = {
  1: '启用',
  0: '停用',
};

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'keyword',
      label: '输入编码或名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入编码或名称',
        allowClear: true,
      },
    },
  ];
}

function getMatchKeywords(row: any) {
  return String(row?.description || row?.match_keywords || row?.keywords || '').trim();
}

function getCashFlowText(row: any) {
  return String(row?.cash_flow_name || row?.cashFlowName || row?.cash_flow_item_name || '').trim();
}

export function useGridColumns(type: 'expense' | 'income' = 'income'): VxeTableGridOptions['columns'] {
  const typeText = type === 'expense' ? '支出' : '收入';

  return [
    {
      title: `${typeText}编码`,
      field: 'code',
      minWidth: 120,
    },
    {
      title: `${typeText}名称`,
      field: 'name',
      minWidth: 180,
    },
    {
      title: '智能匹配关键字',
      field: 'description',
      minWidth: 280,
      formatter: ({ row }) => getMatchKeywords(row),
    },
    {
      title: '关联现金流',
      field: 'cash_flow_name',
      minWidth: 260,
      formatter: ({ row }) => getCashFlowText(row),
    },
    {
      title: '启用状态',
      field: 'enabled',
      width: 100,
      formatter: ({ cellValue }) =>
        ENABLE_TEXT[String(cellValue)] ??
        (Number(cellValue) === 1 ? '启用' : '停用'),
    },
    {
      title: '操作',
      field: 'actions',
      width: 180,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}


export const CASH_FLOW_OPTIONS = [
  { label: '销售商品、提供劳务收到的现金', value: '1' },
  { label: '收到其他与经营活动有关的现金', value: '2' },
  { label: '购买商品、接受劳务支付的现金', value: '3' },
  { label: '支付给职工以及为职工支付的现金', value: '4' },
  { label: '支付的各项税费', value: '5' },
  { label: '支付其他与经营活动有关的现金', value: '6' },
  { label: '收回投资收到的现金', value: '7' },
  { label: '取得投资收益收到的现金', value: '8' },
  { label: '处置固定资产、无形资产和其他长期资产收回的现金净额', value: '9' },
  { label: '投资支付的现金', value: '10' },
  { label: '购建固定资产、无形资产和其他长期资产支付的现金', value: '11' },
  { label: '取得借款收到的现金', value: '12' },
  { label: '吸收投资收到的现金', value: '13' },
  { label: '偿还债务支付的现金', value: '14' },
  { label: '分配股利、利润或偿付利息支付的现金', value: '15' },
  { label: '支付的其他与筹资活动有关的现金', value: '16' },
  { label: '收到的税费返还', value: '19' },
  { label: '处置子公司及其他营业单位收到的现金净额', value: '20' },
  { label: '收到其他与投资活动有关的现金', value: '21' },
  { label: '取得子公司及其他营业单位支付的现金净额', value: '22' },
  { label: '支付其他与投资活动有关的现金', value: '23' },
  { label: '收到其他与筹资活动有关的现金', value: '24' },
  { label: '支付其他与筹资活动有关的现金', value: '25' },
  { label: '汇率变动对现金及现金等价物的影响', value: '26' },
];

export function useFormSchema(
  formType: 'create' | 'detail' | 'edit',
  _formValue: any,
  extra?: {
    onCashFlowChange?: (value: string) => void;
  },
): VbenFormSchema[] {
  const readonly = formType === 'detail';
  const isCreate = formType === 'create';

  return [
    {
      fieldName: 'id',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'parent_id',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'category_type',
      component: 'InputNumber',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'cash_flow_name',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'use_scope',
      component: 'InputNumber',
      dependencies: { triggerFields: [''], show: () => false },
      defaultValue: 1,
    },
    {
      fieldName: 'enabled',
      component: 'InputNumber',
      dependencies: { triggerFields: [''], show: () => false },
      defaultValue: 1,
    },
    {
      fieldName: 'sort_no',
      component: 'InputNumber',
      dependencies: { triggerFields: [''], show: () => false },
      defaultValue: 0,
    },
    {
      fieldName: 'code',
      label: '编码',
      component: 'Input',
      componentProps: {
        placeholder: isCreate ? '请输入编码，不填则自动生成' : '请输入编码',
        disabled: readonly,
      },
    },
    {
      fieldName: 'name',
      label: '名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入类别名称',
        disabled: readonly,
      },
      rules: 'required',
    },
    {
      fieldName: 'parent_name',
      label: '上级类别',
      component: 'Input',
      componentProps: {
        placeholder: '全部类别',
        disabled: true,
      },
      defaultValue: '全部类别',
    },
    {
      fieldName: 'cash_flow_code',
      label: '关联现金流',
      component: 'Select',
      componentProps: {
        options: CASH_FLOW_OPTIONS,
        placeholder: '请选择',
        allowClear: true,
        showSearch: true,
        optionFilterProp: 'label',
        disabled: readonly,
        onChange: (val: any) => extra?.onCashFlowChange?.(val as string),
      },
    },
    {
      fieldName: 'description',
      label: '智能匹配摘要关键字',
      component: 'InputTextArea',
      componentProps: {
        rows: 4,
        disabled: readonly,
        placeholder: '请输入关键字，多个关键词可用逗号、顿号或空格分隔',
      },
    },
  ];
}
