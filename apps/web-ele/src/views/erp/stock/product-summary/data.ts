import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';

export interface ProductStockSummaryRow {
  id: string;
  account_set_id?: string;
  lingma_sys_ent?: string;
  product_id?: string;
  product_code?: string;
  product_name?: string;
  product_category_id?: string;
  product_category_name?: string;
  model?: string;
  unit_name?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  in_count?: number;
  in_amount?: number;
  out_count?: number;
  out_amount?: number;
  net_change_count?: number;
  ending_count?: number;
  ending_amount?: number;
  first_biz_time?: string;
  last_biz_time?: string;
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'product_name',
      label: '商品名称',
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '请输入商品名称' },
    },
    {
      fieldName: 'product_code',
      label: '商品编码',
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '请输入商品编码' },
    },
    {
      fieldName: 'product_category_id',
      label: '商品分类',
      component: 'ApiTreeSelect',
      componentProps: {
        allowClear: true,
        api: getProductCategorySimpleList,
        labelField: 'name',
        valueField: 'id',
        childrenField: 'children',
        placeholder: '请选择商品分类',
        treeCheckStrictly: true,
        checkStrictly: true,
        treeDefaultExpandAll: true,
      },
    },
    {
      fieldName: 'warehouse_id',
      label: '仓库',
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: getWarehouseSimpleList,
        labelField: 'name',
        valueField: 'rowid',
        placeholder: '请选择仓库',
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions<ProductStockSummaryRow>['columns'] {
  return [
    { type: 'seq', width: 60, title: '序号' },
    { field: 'product_code', title: '商品编码', minWidth: 130 },
    {
      field: 'product_name',
      title: '商品名称',
      minWidth: 180,
      slots: { default: 'product_name' },
    },
    {
      field: 'product_category_name',
      title: '商品分类',
      minWidth: 120,
      formatter: ({ row }: { row: ProductStockSummaryRow }) =>
        row.product_category_name || row.product_category_id || '-',
    },
    { field: 'unit_name', title: '单位', minWidth: 90 },
    { field: 'warehouse_name', title: '仓库', minWidth: 140 },
    {
      title: '本期入库',
      children: [
        { field: 'in_count', title: '数量', minWidth: 110, formatter: 'formatAmount2' },
        { field: 'in_amount', title: '金额', minWidth: 120, formatter: 'formatAmount2' },
      ],
    },
    {
      title: '本期出库',
      children: [
        { field: 'out_count', title: '数量', minWidth: 110, formatter: 'formatAmount2' },
        { field: 'out_amount', title: '金额', minWidth: 120, formatter: 'formatAmount2' },
      ],
    },
    { field: 'net_change_count', title: '净变化数量', minWidth: 120, formatter: 'formatAmount2' },
    {
      title: '期末',
      children: [
        { field: 'ending_count', title: '数量', minWidth: 110, formatter: 'formatAmount2' },
        { field: 'ending_amount', title: '金额', minWidth: 120, formatter: 'formatAmount2' },
      ],
    },
    { field: 'first_biz_time', title: '首笔发生时间', minWidth: 180, formatter: 'formatDateTime' },
    { field: 'last_biz_time', title: '末笔发生时间', minWidth: 180, formatter: 'formatDateTime' },
  ];
}
