import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getRangePickerDefaultProps } from '#/utils';

export interface AreaOption {
  label: string;
  value: string;
  children?: AreaOption[];
}

export const customerSubjectTypeOptions = [
  { label: '线索', value: 'lead' },
  { label: '公海', value: 'lead_pool' },
  { label: '正式客户', value: 'customer' },
];

export function useGridFormSchema(options?: {
  areaOptions?: AreaOption[];
  onSubjectTypeChange?: (value?: string) => void;
}): VbenFormSchema[] {
  const areaOptions = options?.areaOptions || [];
  return [
    {
      fieldName: 'subjectCode',
      label: '主体编号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入主体编号',
        allowClear: true,
      },
    },
    {
      fieldName: 'subjectName',
      label: '主体名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入主体名称',
        allowClear: true,
      },
    },
    {
      fieldName: 'contactName',
      label: '联系人',
      component: 'Input',
      componentProps: {
        placeholder: '请输入联系人',
        allowClear: true,
      },
    },
    {
      fieldName: 'mobile',
      label: '手机',
      component: 'Input',
      componentProps: {
        placeholder: '请输入手机',
        allowClear: true,
      },
    },
    {
      fieldName: 'telephone',
      label: '电话',
      component: 'Input',
      componentProps: {
        placeholder: '请输入电话',
        allowClear: true,
      },
    },
    {
      fieldName: 'regionCode',
      label: '地区',
      component: 'ApiCascader',
      componentProps: {
        options: areaOptions,
        props: {
          checkStrictly: false,
          emitPath: true,
          value: 'value',
          label: 'label',
          children: 'children',
        },
        clearable: true,
        filterable: true,
        placeholder: '请选择省/市/区',
      },
    },
    {
      fieldName: 'ownerUserName',
      label: '负责人',
      component: 'Input',
      componentProps: {
        placeholder: '请输入负责人',
        allowClear: true,
      },
    },
    {
      fieldName: 'subjectType',
      label: '客户形态',
      component: 'Select',
      componentProps: {
        placeholder: '请选择客户形态',
        allowClear: true,
        options: customerSubjectTypeOptions,
        onChange: (value?: string) => options?.onSubjectTypeChange?.(value),
      },
    },
    {
      fieldName: 'createTime',
      label: '创建时间',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        placeholder: ['开始日期', '结束日期'],
        allowClear: true,
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'seq',
      title: '序号',
      width: 60,
      fixed: 'left',
    },
    {
      field: 'subjectCode',
      title: '主体编号',
      minWidth: 160,
      fixed: 'left',
    },
    {
      field: 'subjectName',
      title: '主体名称',
      minWidth: 220,
      fixed: 'left',
      slots: { default: 'name' },
    },
    {
      field: 'subjectTypeLabel',
      title: '标签',
      minWidth: 110,
      slots: { default: 'tag' },
    },
    {
      field: 'contactName',
      title: '联系人',
      minWidth: 140,
    },
    {
      field: 'mobile',
      title: '手机',
      minWidth: 130,
    },
    {
      field: 'telephone',
      title: '电话',
      minWidth: 130,
    },
    {
      field: 'email',
      title: '邮箱',
      minWidth: 180,
    },
    {
      field: 'region',
      title: '地区',
      minWidth: 160,
    },
    {
      field: 'detailAddress',
      title: '详细地址',
      minWidth: 220,
    },
    {
      field: 'ownerUserName',
      title: '负责人',
      minWidth: 120,
    },
    {
      field: 'departName',
      title: '所属部门',
      minWidth: 140,
    },
    {
      field: 'sourceLeadName',
      title: '来源线索',
      minWidth: 180,
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 220,
    },
    {
      field: 'createTime',
      title: '创建时间',
      formatter: 'formatDateTime',
      minWidth: 180,
    },
    {
      field: 'updateTime',
      title: '更新时间',
      formatter: 'formatDateTime',
      minWidth: 180,
    },
    {
      title: '操作',
      width: 300,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
