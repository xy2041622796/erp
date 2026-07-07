import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getProductSimpleList } from '#/api/erp/product/product';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    { fieldName: 'period', label: '期间', component: 'DatePicker', componentProps: { type: 'month', valueFormat: 'YYYY-MM', format: 'YYYY-MM', placeholder: '请选择期间', class: '!w-full' } },
    { fieldName: 'product_id', label: '商品', component: 'ApiSelect', componentProps: { api: getProductSimpleList, labelField: 'product_name', valueField: 'rowid', allowClear: true, showSearch: true, placeholder: '请选择商品' } },
    { fieldName: 'warehouse_id', label: '仓库', component: 'ApiSelect', componentProps: { api: getWarehouseSimpleList, labelField: 'name', valueField: 'rowid', allowClear: true, showSearch: true, placeholder: '请选择仓库' } },
    { fieldName: 'exception_type', label: '异常类型', component: 'Select', componentProps: { allowClear: true, placeholder: '请选择异常类型', options: [
      { label: '结存数量为负', value: '结存数量为负' },
      { label: '结存金额为负', value: '结存金额为负' },
      { label: '零数量有金额', value: '零数量有金额' },
      { label: '有数量无金额', value: '有数量无金额' },
      { label: '出库无成本', value: '出库无成本' },
      { label: '入库无金额', value: '入库无金额' },
    ] } },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', width: 60, title: '序号' },
    { field: 'period', title: '期间', minWidth: 100 },
    { field: 'product_code', title: '商品编码', minWidth: 130 },
    { field: 'product_name', title: '商品名称', minWidth: 180 },
    { field: 'warehouse_name', title: '仓库', minWidth: 140 },
    { field: 'ending_count', title: '结存数量', minWidth: 120, formatter: 'formatAmount3' },
    { field: 'ending_amount', title: '结存金额', minWidth: 120, formatter: 'formatAmount2' },
    { field: 'unit_cost', title: '单位成本', minWidth: 120, formatter: 'formatAmount6' },
    { field: 'in_count', title: '入库数量', minWidth: 120, formatter: 'formatAmount3' },
    { field: 'in_amount', title: '入库金额', minWidth: 120, formatter: 'formatAmount2' },
    { field: 'out_count', title: '出库数量', minWidth: 120, formatter: 'formatAmount3' },
    { field: 'out_amount', title: '出库成本', minWidth: 120, formatter: 'formatAmount2' },
    { field: 'exception_flag', title: '异常类型', minWidth: 160, fixed: 'right' },
  ];
}
