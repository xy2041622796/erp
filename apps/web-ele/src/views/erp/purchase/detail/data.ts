import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { erpNumberFormatter } from '@vben/utils';

import { getSupplierSimpleList } from '#/api/erp/customer';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getRangePickerDefaultProps } from '#/utils';

export const PURCHASE_DETAIL_BIZ_TYPE_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '采购入库', value: 'purchase_in' },
  { label: '采购退货', value: 'purchase_return' },
];

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'biz_type',
      label: '业务类型',
      component: 'Select',
      defaultValue: 'all',
      componentProps: {
        options: PURCHASE_DETAIL_BIZ_TYPE_OPTIONS,
        allowClear: true,
      },
    },
    {
      fieldName: 'no',
      label: '单据编号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入入库/退货单号',
        allowClear: true,
      },
    },
    {
      fieldName: 'supplier_id',
      label: '供应商',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择供应商',
        allowClear: true,
        showSearch: true,
        api: getSupplierSimpleList,
        labelField: 'name',
        valueField: 'rowid',
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
      field: 'bill_time',
      title: '出入库日期',
      width: 160,
      formatter: 'formatDate',
    },
    {
      field: 'supplier_id',
      title: '供应商',
      minWidth: 150,
      slots: { default: 'supplier_id' },
    },
    {
      field: 'warehouse_id',
      title: '仓库',
      minWidth: 140,
      slots: { default: 'warehouse_id' },
    },
    {
      field: 'product_name',
      title: '产品名称',
      minWidth: 180,
      slots: { default: 'product_name' },
    },
    { field: 'product_bar_code', title: '条码', minWidth: 140 },
    { field: 'product_unit_name', title: '单位', minWidth: 80 },
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
