import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    { fieldName: 'no', label: '调整单号', component: 'Input', componentProps: { allowClear: true, placeholder: '请输入调整单号' } },
    { fieldName: 'source_no', label: '来源入库单', component: 'Input', componentProps: { allowClear: true, placeholder: '请输入来源入库单' } },
    { fieldName: 'product_name', label: '商品名称', component: 'Input', componentProps: { allowClear: true, placeholder: '请输入商品名称' } },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', width: 60, title: '序号' },
    { field: 'no', title: '调整单号', minWidth: 180 },
    { field: 'adjust_date', title: '调整日期', minWidth: 120 },
    { field: 'source_no', title: '来源入库单', minWidth: 180 },
    { field: 'product_name', title: '商品名称', minWidth: 160 },
    { field: 'warehouse_name', title: '仓库', minWidth: 140 },
    { field: 'original_count', title: '原入库数量', minWidth: 120, formatter: 'formatAmount3' },
    { field: 'original_amount', title: '原入库金额', minWidth: 120, formatter: 'formatAmount2' },
    { field: 'adjust_amount', title: '调整金额', minWidth: 120, formatter: 'formatAmount2' },
    { field: 'adjusted_amount', title: '调整后金额', minWidth: 120, formatter: 'formatAmount2' },
    { field: 'adjusted_unit_cost', title: '调整后单价', minWidth: 120, formatter: 'formatAmount6' },
    { field: 'allocation_method', title: '分摊方式', minWidth: 120 },
    { field: 'status', title: '状态', width: 100, slots: { default: 'status' } },
    { title: '操作', width: 140, fixed: 'right', slots: { default: 'actions' } },
  ];
}
