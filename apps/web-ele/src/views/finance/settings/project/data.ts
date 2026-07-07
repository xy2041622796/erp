import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { BilSubjectApi } from '#/api/erp/finance/settings/project';

export const SUBJECT_TYPE_TABS: Array<{ label: string; value: number }> = [
  { label: '资产类', value: 1 },
  { label: '负债类', value: 2 },
  { label: '所有者权益类', value: 3 },
  { label: '成本类', value: 4 },
  { label: '损益类', value: 5 },
];

export const BALANCE_DIRECTION_OPTIONS: Array<{
  label: string;
  value: number;
}> = [
  { label: '借', value: 1 },
  { label: '贷', value: 2 },
];

export const SUBJECT_TYPE_BALANCE_DIRECTION_MAP: Record<string, number> = {
  '1': 1,
  '2': 2,
  '3': 2,
  '4': 1,
  '5': 2,
};

export const BALANCE_DIRECTION_TEXT: Record<number | string, string> = {
  1: '借',
  2: '贷',
  debit: '借',
  credit: '贷',
};

export const AUXILIARY_OPTIONS = [
  { label: '客户', value: 'AUX001' },
  { label: '供应商', value: 'AUX002' },
  { label: '职员', value: 'AUX003' },
  { label: '部门', value: 'AUX004' },
  { label: '项目', value: 'AUX005' },
  { label: '存货', value: 'AUX006' },
  { label: '现金流', value: 'AUX007' },
];

export function getBalanceDirectionBySubjectType(value: unknown) {
  const key = String(value ?? '').trim();
  return SUBJECT_TYPE_BALANCE_DIRECTION_MAP[key];
}

export function renderAuxiliary(value: any) {
  const arr = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value
          .split(',')
          .map((i) => i.trim())
          .filter(Boolean)
      : [];
  const labels = arr
    .map(
      (v) =>
        AUXILIARY_OPTIONS.find((o) => String(o.value) === String(v))?.label ||
        v,
    )
    .filter(Boolean);
  if (labels.length > 0) return labels.join('、');
  if (value === 0 || value === false) return String(value);
  return value || '';
}

export function balanceDirectionLabel(v: unknown) {
  if (v === undefined || v === null || v === '') return '';
  return BALANCE_DIRECTION_TEXT[String(v)] ?? String(v);
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      title: '科目编码',
      field: 'subject_number',
      treeNode: true,
      minWidth: 160,
    },
    {
      title: '科目名称',
      field: 'subject_name',
      minWidth: 220,
      className: 'font-medium',
    },
    {
      title: '余额方向',
      field: 'balance_direction',
      width: 120,
      formatter: ({ cellValue }) => balanceDirectionLabel(cellValue),
    },
    {
      title: '辅助核算',
      field: 'auxiliary_accounting',
      minWidth: 220,
      formatter: ({ cellValue }) => renderAuxiliary(cellValue),
    },
    {
      title: '状态',
      field: 'subject_state',
      width: 140,
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
  _formValue: Partial<BilSubjectApi.Subject>,
): VbenFormSchema[] {
  const readonly = formType === 'detail';
  const disabledAll = readonly;
  return [
    {
      fieldName: 'rowid',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'parent_subject_number',
      label: '上级科目',
      component: 'Select',
      componentProps: {
        placeholder: '请选择上级科目',
        disabled: disabledAll,
        filterable: true,
        clearable: true,
        options: [],
      },
    },
    {
      fieldName: 'subject_number',
      label: '科目编号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入科目编号',
        disabled: disabledAll,
      },
      rules: 'required',
    },
    {
      fieldName: 'subject_name',
      label: '科目名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入科目名称',
        disabled: disabledAll,
      },
      rules: 'required',
    },
    {
      fieldName: 'subject_type',
      label: '科目类别',
      component: 'Select',
      componentProps: {
        placeholder: '请选择科目类别',
        options: SUBJECT_TYPE_TABS.map((item) => ({
          label: item.label,
          value: String(item.value),
        })),
        disabled: disabledAll,
      },
      rules: 'required',
    },
    {
      fieldName: 'parent_subject_name',
      label: '上级科目名称',
      component: 'Input',
      componentProps: {
        placeholder: '选择上级科目后自动带出',
        disabled: true,
      },
    },
    {
      fieldName: 'balance_direction',
      label: '余额方向',
      component: 'RadioGroup',
      componentProps: {
        options: BALANCE_DIRECTION_OPTIONS,
        disabled: disabledAll,
      },
      rules: 'required',
    },
    {
      fieldName: 'auxiliary_accounting',
      label: '辅助核算',
      component: 'CheckboxGroup',
      componentProps: {
        options: AUXILIARY_OPTIONS,
      },
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'subject_state',
      label: '科目状态',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '启用', value: 1 },
          { label: '停用', value: 0 },
        ],
        disabled: disabledAll,
      },
      defaultValue: 1,
    },
    {
      fieldName: 'is_leaf_subject',
      label: '末级科目',
      component: 'Switch',
      componentProps: {
        activeValue: 1,
        inactiveValue: 0,
        disabled: disabledAll,
      },
    },
  ];
}
