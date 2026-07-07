import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

export function useFormSchema(
  formType: 'create' | 'detail' | 'edit',
  formValue: any,
): VbenFormSchema[] {
  const { hasFieldPermission } = useDataTablePermission();
  const isPer = hasFieldPermission(formValue);
  const disabled = formType === 'detail';

  return [
    {
      fieldName: 'id',
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
      fieldName: 'lingma_sys_ent',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },

    {
      fieldName: 'company_name',
      label: '公司名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入公司名称',
        disabled: disabled || isPer('fd:edit', 'company_name', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'taxID',
      label: '税号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入税号',
        maxlength: 188,
        showWordLimit: true,
        disabled: disabled || isPer('fd:edit', 'taxID', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'bank_name',
      label: '开户行',
      component: 'Input',
      componentProps: {
        placeholder: '请输入开户行',
        disabled: disabled || isPer('fd:edit', 'bank_name', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'bank_account',
      label: '银行账号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入银行账号',
        disabled: disabled || isPer('fd:edit', 'bank_account', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'phone',
      label: '电话',
      component: 'Input',
      componentProps: {
        placeholder: '请输入电话',
        disabled: disabled || isPer('fd:edit', 'phone', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'address',
      label: '地址',
      component: 'Input',
      componentProps: {
        placeholder: '请输入（100字以内）',
        maxlength: 100,
        showWordLimit: true,
        disabled: disabled || isPer('fd:edit', 'address', formType),
      },
    },
  ];
}

/** 列表的搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'company_name',
      label: '销方公司',
      component: 'Input',
      componentProps: {
        placeholder: '请输入销方公司',
        allowClear: true,
      },
    },
    {
      fieldName: 'taxID',
      label: '税号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入税号',
        allowClear: true,
      },
    },
    {
      fieldName: 'phone',
      label: '电话',
      component: 'Input',
      componentProps: {
        placeholder: '请输入电话',
        allowClear: true,
      },
    },
    {
      fieldName: 'keyword',
      label: '关键字',
      component: 'Input',
      componentProps: {
        placeholder: '公司/税号/开户行/账号/电话/地址',
        allowClear: true,
      },
    },
  ];
}

/** 列表的字段 */
export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    {
      field: 'company_name',
      title: '销方公司',
      minWidth: 200,
      showOverflow: 'tooltip',
    },
    {
      field: 'taxID',
      title: '税号',
      minWidth: 180,
      showOverflow: 'tooltip',
    },
    {
      field: 'bank_name',
      title: '开户行',
      minWidth: 160,
      showOverflow: 'tooltip',
    },
    {
      field: 'bank_account',
      title: '账号',
      minWidth: 180,
      showOverflow: 'tooltip',
    },
    {
      field: 'phone',
      title: '电话',
      minWidth: 140,
      showOverflow: 'tooltip',
    },
    {
      field: 'address',
      title: '地址',
      minWidth: 220,
      showOverflow: 'tooltip',
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
