import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { erpNumberFormatter } from '@vben/utils';

import { getCustomerSimpleList } from '#/api/erp/customer';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';
import { getRangePickerDefaultProps } from '#/utils';

export const SALE_DETAIL_BIZ_TYPE_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '销售出库', value: 'sale_out' },
  { label: '销售退货', value: 'sale_return' },
];

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'biz_type',
      label: '业务类型',
      component: 'Select',
      defaultValue: 'all',
      componentProps: {
        options: SALE_DETAIL_BIZ_TYPE_OPTIONS,
        allowClear: true,
      },
    },
    {
      fieldName: 'no',
      label: '单据编号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入出库/退货单号',
        allowClear: true,
      },
    },
    {
      fieldName: 'customer_id',
      label: '客户',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择客户',
        allowClear: true,
        showSearch: true,
        api: getCustomerSimpleList,
        labelField: 'name',
        valueField: 'id',
      },
    },
    {
      fieldName: 'warehouse_id',
      label: '仓库',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择仓库',
        allowClear: true,
        showSearch: true,
        api: getWarehouseSimpleList,
        labelField: 'name',
        valueField: 'rowid',
      },
    },
    {
      fieldName: 'sale_user_id',
      label: '销售员',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择销售员',
        allowClear: true,
        showSearch: true,
        api: getSimpleUserList,
        labelField: 'UserName',
        valueField: 'ROWID',
      },
    },
    {
      fieldName: 'product_keyword',
      label: '产品',
      component: 'Input',
      componentProps: {
        placeholder: '请输入产品名称/编码/条码',
        allowClear: true,
      },
    },
    {
      fieldName: 'bill_time',
      label: '出入库日期',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        allowClear: true,
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', width: 60, fixed: 'left' },
    {
      field: 'biz_type_name',
      title: '业务类型',
      width: 110,
      fixed: 'left',
      slots: { default: 'biz_type_name' },
    },
    { field: 'bill_no', title: '单据编号', width: 180 },
    {
      field: 'product_name',
      title: '产品名称',
      minWidth: 180,
      slots: { default: 'product_name' },
    },
    {
      field: 'in_count',
      title: '入库数量',
      minWidth: 110,
      align: 'right',
      formatter: ({ cellValue }) => erpNumberFormatter(cellValue, 3),
    },
    {
      field: 'out_count',
      title: '出库数量',
      minWidth: 110,
      align: 'right',
      formatter: ({ cellValue }) => erpNumberFormatter(cellValue, 3),
    },
    {
      field: 'warehouse_id',
      title: '仓库',
      minWidth: 140,
      slots: { default: 'warehouse_id' },
    },
    {
      field: 'customer_id',
      title: '客户',
      minWidth: 150,
      slots: { default: 'customer_id' },
    },
    {
      field: 'bill_time',
      title: '出入库日期',
      width: 160,
      formatter: 'formatDate',
    },
    {
      field: 'sale_user_id',
      title: '销售员',
      minWidth: 120,
      slots: { default: 'sale_user_id' },
    },
    {
      field: 'count',
      title: '业务数量',
      minWidth: 110,
      align: 'right',
      formatter: ({ cellValue }) => erpNumberFormatter(cellValue, 3),
    },
    {
      field: 'product_price',
      title: '单价',
      minWidth: 100,
      align: 'right',
      formatter: ({ cellValue }) => erpNumberFormatter(cellValue, 2),
    },
    {
      field: 'total_price',
      title: '金额',
      minWidth: 120,
      align: 'right',
      formatter: ({ cellValue }) => erpNumberFormatter(cellValue, 2),
    },
    { field: 'remark', title: '备注', minWidth: 200 },
  ];
}
