import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { erpNumberFormatter } from '@vben/utils';
import dayjs from 'dayjs';

import { getSupplierSimpleList } from '#/api/erp/customer';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';
import { getRangePickerDefaultProps } from '#/utils';



export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'bill_time',
      label: '单据日期',
      component: 'RangePicker',
      defaultValue: [dayjs().startOf('month').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')],
      componentProps: {
        ...getRangePickerDefaultProps(),
        allowClear: true,
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
      fieldName: 'buyer_id',
      label: '采购员',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择采购员',
        allowClear: true,
        showSearch: true,
        api: getSimpleUserList,
        labelField: 'UserName',
        valueField: 'ROWID',
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', width: 60, fixed: 'left' },
    { field: 'product_code', title: '产品编码', minWidth: 120, slots: { default: 'product_code' } },
    { field: 'product_name', title: '产品名称', minWidth: 180, slots: { default: 'product_name' } },
    { field: 'product_category_name', title: '产品类别', minWidth: 120, slots: { default: 'product_category_name' } },
    { field: 'warehouse_id', title: '仓库', minWidth: 140, slots: { default: 'warehouse_id' } },
    { field: 'in_count', title: '采购数量', minWidth: 110, align: 'right', formatter: ({ cellValue }) => erpNumberFormatter(cellValue, 3) },
    { field: 'return_count', title: '退货数量', minWidth: 110, align: 'right', formatter: ({ cellValue }) => erpNumberFormatter(cellValue, 3) },
    { field: 'net_count', title: '净采购数量', minWidth: 120, align: 'right', formatter: ({ cellValue }) => erpNumberFormatter(cellValue, 3) },
    { field: 'in_amount', title: '采购金额', minWidth: 120, align: 'right', formatter: ({ cellValue }) => erpNumberFormatter(cellValue, 2) },
    { field: 'return_amount', title: '退货金额', minWidth: 120, align: 'right', formatter: ({ cellValue }) => erpNumberFormatter(cellValue, 2) },
    { field: 'net_amount', title: '净采购金额', minWidth: 120, align: 'right', formatter: ({ cellValue }) => erpNumberFormatter(cellValue, 2) },
  ];
}
