import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

const DEFAULT_TEXT: Record<string | number, string> = {
  1: '是',
  0: '否',
  true: '是',
  false: '否',
};

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'keyword',
      label: '关键字',
      component: 'Input',
      componentProps: {
        placeholder: '凭证字/打印标题',
        allowClear: true,
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '凭证字', field: 'word', minWidth: 120 },
    { title: '打印标题', field: 'printTitle', minWidth: 220 },
    {
      title: '是否默认',
      field: 'isDefault',
      width: 120,
      formatter: ({ cellValue }) => DEFAULT_TEXT[String(cellValue)] ?? '否',
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
      fieldName: 'id',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      // 可选：用于按账套隔离（打开弹窗时注入）
      fieldName: 'accountSetId',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'word',
      label: '凭证字',
      component: 'Input',
      componentProps: {
        placeholder: '例如：记 / 收 / 付 / 转',
        maxlength: 10,
        showWordLimit: true,
        disabled: readonly,
      },
      rules: 'required',
    },
    {
      fieldName: 'printTitle',
      label: '打印标题',
      component: 'Input',
      componentProps: {
        placeholder: '例如：记账凭证',
        maxlength: 50,
        showWordLimit: true,
        disabled: readonly,
      },
      rules: 'required',
    },
    {
      fieldName: 'isDefault',
      label: '是否默认',
      component: 'Switch',
      componentProps: {
        disabled: readonly,
      },
      defaultValue: false,
    },
    {
      fieldName: 'ordIdx',
      label: '排序',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        controlsPosition: 'right',
        class: '!w-full',
        disabled: readonly,
      },
      defaultValue: 0,
    },
  ];
}
