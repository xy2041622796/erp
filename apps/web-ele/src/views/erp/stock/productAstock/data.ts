import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getProductSimpleList } from '#/api/erp/product/product';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';

/** 搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'product_id', // Changed productId to product_id
      label: '产品',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择产品',
        allowClear: true,
        showSearch: true,
        api: getProductSimpleList,
        labelField: 'name',
        valueField: 'rowid',
      },
    },
    {
      fieldName: 'warehouse_id', // Changed warehouseId to warehouse_id
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
  ];
}

/** 列表的字段 */
export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      title: '产品名称',
      minWidth: 150,
      field: 'product_name',
    },
    {
      field: 'warehouse_name',
      title: '仓库名称',
      minWidth: 100,
    },
    {
      field: 'category_name',
      title: '产品分类',
      minWidth: 120,
    },
    {
      field: 'count',
      title: '库存量',
      minWidth: 100,
      formatter: 'formatAmount3',
    },
    {
      field: 'unit_name',
      title: '单位',
      minWidth: 100,
    },
  ];
}
