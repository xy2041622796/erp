import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getRangePickerDefaultProps } from '#/utils';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'customerCode',
      label: '供应商编号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入供应商编号',
        allowClear: true,
      },
    },
    {
      fieldName: 'name',
      label: '供应商名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入供应商名称',
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
      label: '联系人手机',
      component: 'Input',
      componentProps: {
        placeholder: '请输入联系人手机',
        allowClear: true,
      },
    },
    {
      fieldName: 'telephone',
      label: '公司电话',
      component: 'Input',
      componentProps: {
        placeholder: '请输入公司电话',
        allowClear: true,
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
      field: 'customerCode',
      title: '供应商编号',
      minWidth: 160,
      fixed: 'left',
    },
    {
      field: 'name',
      title: '供应商名称',
      minWidth: 220,
      fixed: 'left',
      slots: { default: 'name' },
    },
    {
      field: 'contactName',
      title: '联系人姓名',
      minWidth: 140,
    },
    {
      field: 'mobile',
      title: '联系人手机',
      minWidth: 130,
    },
    {
      field: 'telephone',
      title: '公司电话',
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
      title: '归属部门',
      minWidth: 140,
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
      width: 150,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
