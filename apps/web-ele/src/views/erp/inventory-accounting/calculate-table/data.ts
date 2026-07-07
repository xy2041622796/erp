import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getRangePickerDefaultProps } from '#/utils';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    { fieldName: 'period', label: '期间', component: 'DatePicker', componentProps: { type: 'month', valueFormat: 'YYYY-MM', format: 'YYYY-MM', placeholder: '请选择期间', class: '!w-full' } },
    { fieldName: 'product_id', label: '商品', component: 'ApiSelect', componentProps: { api: getProductSimpleList, labelField: 'product_name', valueField: 'rowid', allowClear: true, showSearch: true, placeholder: '请选择商品' } },
    { fieldName: 'product_category_id', label: '商品分类', component: 'ApiTreeSelect', componentProps: { api: getProductCategorySimpleList, labelField: 'name', valueField: 'id', childrenField: 'children', allowClear: true, treeDefaultExpandAll: true, placeholder: '请选择商品分类' } },
    { fieldName: 'warehouse_id', label: '仓库', component: 'ApiSelect', componentProps: { api: getWarehouseSimpleList, labelField: 'name', valueField: 'rowid', allowClear: true, showSearch: true, placeholder: '请选择仓库' } },
    { fieldName: 'biz_time', label: '业务日期', component: 'RangePicker', componentProps: { ...getRangePickerDefaultProps(), allowClear: true } },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', width: 60, title: '序号' },
    { field: 'period', title: '期间', minWidth: 100 },
    { field: 'product_code', title: '商品编码', minWidth: 130 },
    { field: 'product_name', title: '商品名称', minWidth: 180 },
    { field: 'product_category_name', title: '商品分类', minWidth: 120 },
    { field: 'warehouse_name', title: '仓库', minWidth: 140 },
    { title: '期初', children: [
      { field: 'opening_count', title: '数量', minWidth: 110, formatter: 'formatAmount3' },
      { field: 'opening_amount', title: '金额', minWidth: 120, formatter: 'formatAmount2' },
    ] },
    { title: '本期入库', children: [
      { field: 'in_count', title: '数量', minWidth: 110, formatter: 'formatAmount3' },
      { field: 'in_amount', title: '金额', minWidth: 120, formatter: 'formatAmount2' },
    ] },
    { title: '本期出库', children: [
      { field: 'out_count', title: '数量', minWidth: 110, formatter: 'formatAmount3' },
      { field: 'out_amount', title: '成本金额', minWidth: 120, formatter: 'formatAmount2' },
    ] },
    { title: '结存', children: [
      { field: 'ending_count', title: '数量', minWidth: 110, formatter: 'formatAmount3' },
      { field: 'ending_amount', title: '金额', minWidth: 120, formatter: 'formatAmount2' },
      { field: 'unit_cost', title: '单位成本', minWidth: 120, formatter: 'formatAmount6' },
    ] },
    { field: 'exception_flag', title: '异常标记', minWidth: 150 },
  ];
}
