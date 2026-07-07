import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getRangePickerDefaultProps } from '#/utils';

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

export function useEmployeeGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 40 },
    { field: 'ROWID', title: '员工编号', minWidth: 120 },
    { field: 'UserName', title: '员工姓名', minWidth: 120 },
    { field: 'DepName', title: '部门', minWidth: 120 },
    { field: 'rank_name', title: '职级', minWidth: 100 },
    { field: 'LoginName', title: '登录账号', minWidth: 120 },
    { field: 'entInfoUserPhone', title: '手机号', minWidth: 120 },
    {
      field: 'State',
      title: '状态',
      minWidth: 100,
      align: 'center',
      formatter: ({ cellValue }) => (Number(cellValue) === 0 ? '启用' : '禁用'),
    },
    { field: 'CreateTime', title: '创建时间', minWidth: 180, formatter: 'formatDateTime' },
    { title: '操作', width: 100, fixed: 'right', slots: { default: 'actions' } },
  ];
}
