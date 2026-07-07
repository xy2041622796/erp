import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { z } from '#/adapter/form';

const UNIT_STATUS_OPTIONS = [
  { label: '开启', value: 0 },
  { label: '禁用', value: 1 },
];

/** 新增/修改的表单 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'id',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: '单位名称',
      rules: 'required',
      componentProps: {
        placeholder: '请输入单位名称',
      },
    },
    {
      fieldName: 'status',
      label: '单位状态',
      component: 'RadioGroup',
      componentProps: {
        options: UNIT_STATUS_OPTIONS,
      },
      rules: z.number().default(0),
    },
  ];
}

/** 列表的搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'name',
      label: '单位名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入单位名称',
        allowClear: true,
      },
    },
    {
      fieldName: 'status',
      label: '单位状态',
      component: 'Select',
      componentProps: {
        placeholder: '请选择单位状态',
        allowClear: true,
        options: UNIT_STATUS_OPTIONS,
      },
    },
  ];
}

/** 列表的字段 */
export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'name',
      title: '单位名称',
      minWidth: 200,
    },
    {
      field: 'status',
      title: '单位状态',
      minWidth: 100,
      formatter: ({ cellValue }) => {
        if (cellValue === 0 || cellValue === '0') {
          return '开启';
        }
        if (cellValue === 1 || cellValue === '1') {
          return '禁用';
        }
        return '-';
      },
    },
    {
      field: 'create_time',
      title: '创建时间',
      minWidth: 180,
      formatter: 'formatDateTime',
    },
    {
      title: '操作',
      width: 130,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
