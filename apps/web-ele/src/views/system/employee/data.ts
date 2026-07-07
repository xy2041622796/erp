import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemUserApi } from '#/api/system/user';

import { CommonStatusEnum, DICT_TYPE } from '@vben/constants';
import { getDictOptions } from '@vben/hooks';

import { z } from '#/adapter/form';
import { getRangePickerDefaultProps } from '#/utils';

export function useEmployeeFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'ID',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'UserName',
      label: '员工姓名',
      component: 'Input',
      componentProps: { placeholder: '请输入员工姓名' },
      rules: 'required',
    },
    {
      fieldName: 'LoginName',
      label: '登录账号',
      component: 'Input',
      componentProps: { placeholder: '请输入登录账号' },
      rules: 'required',
    },
    {
      fieldName: 'LoginPass',
      label: '初始密码',
      component: 'Input',
      componentProps: { showPassword: true, placeholder: '请输入初始密码' },
      rules: 'required',
      dependencies: {
        triggerFields: ['ID'],
        show: (values) => !values.ID,
      },
    },
    {
      fieldName: 'entInfoUserPhone',
      label: '手机号',
      component: 'Input',
      componentProps: { placeholder: '请输入手机号' },
    },
    {
      fieldName: 'mailbox',
      label: '邮箱',
      component: 'Input',
      componentProps: { placeholder: '请输入邮箱' },
      rules: z.string().email('邮箱格式不正确').or(z.literal('')).optional(),
    },
    {
      fieldName: 'Sex',
      label: '性别',
      component: 'RadioGroup',
      componentProps: { options: getDictOptions(DICT_TYPE.SYSTEM_USER_SEX, 'number') },
    },
    {
      fieldName: 'Birthday',
      label: '生日',
      component: 'DatePicker',
      componentProps: { valueFormat: 'YYYY-MM-DD' },
    },
    {
      fieldName: 'NativePlace',
      label: '籍贯',
      component: 'Input',
      componentProps: { placeholder: '请输入籍贯' },
    },
    {
      fieldName: 'Address',
      label: '地址',
      component: 'Input',
      componentProps: { placeholder: '请输入地址' },
    },
    {
      fieldName: 'State',
      label: '状态',
      component: 'RadioGroup',
      componentProps: { options: getDictOptions(DICT_TYPE.COMMON_STATUS, 'number') },
      rules: z.number().default(CommonStatusEnum.ENABLE),
    },
    {
      fieldName: 'memo',
      label: '备注',
      component: 'Textarea',
      componentProps: { placeholder: '请输入备注' },
    },
  ];
}

export function useEmployeeGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'UserName',
      label: '员工姓名',
      component: 'Input',
      componentProps: { placeholder: '请输入员工姓名', clearable: true },
    },
    {
      fieldName: 'LoginName',
      label: '登录账号',
      component: 'Input',
      componentProps: { placeholder: '请输入登录账号', clearable: true },
    },
    {
      fieldName: 'entInfoUserPhone',
      label: '手机号',
      component: 'Input',
      componentProps: { placeholder: '请输入手机号', clearable: true },
    },
    {
      fieldName: 'CreateTime',
      label: '创建时间',
      component: 'RangePicker',
      componentProps: { ...getRangePickerDefaultProps(), clearable: true },
    },
  ];
}

export function useEmployeeGridColumns(
  onStatusChange?: (
    newStatus: number,
    row: SystemUserApi.User,
  ) => PromiseLike<boolean | undefined>,
): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 40 },
    { field: 'ID', title: '员工编号', minWidth: 120 },
    { field: 'UserName', title: '员工姓名', minWidth: 120 },
    { field: 'LoginName', title: '登录账号', minWidth: 120 },
    { field: 'entInfoUserPhone', title: '手机号', minWidth: 120 },
    { field: 'mailbox', title: '邮箱', minWidth: 180 },
    {
      field: 'State',
      title: '状态',
      minWidth: 100,
      align: 'center',
      cellRender: {
        attrs: { beforeChange: onStatusChange },
        name: 'CellSwitch',
        props: {
          activeValue: CommonStatusEnum.ENABLE,
          inactiveValue: CommonStatusEnum.DISABLE,
        },
      },
    },
    { field: 'CreateTime', title: '创建时间', minWidth: 180, formatter: 'formatDateTime' },
    { title: '操作', width: 160, fixed: 'right', slots: { default: 'actions' } },
  ];
}
