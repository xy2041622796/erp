import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    { fieldName: 'no', label: '调整单号', component: 'Input', componentProps: { allowClear: true, placeholder: '请输入调整单号' } },
    { fieldName: 'product_name', label: '商品名称', component: 'Input', componentProps: { allowClear: true, placeholder: '请输入商品名称' } },
    { fieldName: 'warehouse_name', label: '仓库名称', component: 'Input', componentProps: { allowClear: true, placeholder: '请输入仓库名称' } },
    { fieldName: 'status', label: '状态', component: 'Select', componentProps: { allowClear: true, placeholder: '请选择状态', options: [{ label: '草稿', value: 10 }, { label: '已审批', value: 20 }] } },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', width: 60, title: '序号' },
    { field: 'no', title: '调整单号', minWidth: 170 },
    { field: 'adjust_date', title: '调整日期', minWidth: 120 },
    { field: 'product_name', title: '商品名称', minWidth: 160 },
    { field: 'warehouse_name', title: '仓库', minWidth: 140 },
    { field: 'before_count', title: '调整前数量', minWidth: 120, formatter: 'formatAmount3' },
    { field: 'before_amount', title: '调整前金额', minWidth: 120, formatter: 'formatAmount2' },
    { field: 'adjust_amount', title: '调整金额', minWidth: 120, formatter: 'formatAmount2' },
    { field: 'after_amount', title: '调整后金额', minWidth: 120, formatter: 'formatAmount2' },
    { field: 'after_unit_cost', title: '调整后单价', minWidth: 120, formatter: 'formatAmount6' },
    { field: 'reason', title: '调整原因', minWidth: 180 },
    { field: 'status', title: '状态', width: 100, slots: { default: 'status' } },
    { title: '操作', width: 220, fixed: 'right', slots: { default: 'actions' } },
  ];
}
