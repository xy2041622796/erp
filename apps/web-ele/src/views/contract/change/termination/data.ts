import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'contract_category',
      label: '合同类型',
      component: 'Select',
      componentProps: {
        clearable: true,
        placeholder: '全部类型',
        options: [
          { label: '收入合同', value: 0 },
          { label: '支出合同', value: 1 },
        ],
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '终结编号', field: 'apply_no', minWidth: 150, fixed: 'left' },
    { title: '合同类型', field: 'contract_category', width: 110, align: 'center', slots: { default: 'contract_category' } },
    { title: '合同编号', field: 'contract_no', minWidth: 150 },
    { title: '合同名称', field: 'contract_name', minWidth: 220 },
    { title: '客户名称', field: 'client_name', minWidth: 160, slots: { default: 'client_name' } },
    { title: '终结类型', field: 'termination_type', minWidth: 130, slots: { default: 'termination_type' } },
    { title: '合同金额', field: 'contract_amount', minWidth: 120, align: 'right', slots: { default: 'contract_amount' } },
    { title: '已收/付款', field: 'paid_amount', minWidth: 120, align: 'right', slots: { default: 'paid_amount' } },
    { title: '未收/付款', field: 'unpaid_amount', minWidth: 120, align: 'right', slots: { default: 'unpaid_amount' } },
    { title: '实际终结日期', field: 'actual_end_date', minWidth: 130 },
    { title: '操作', field: 'actions', fixed: 'right', width: 120, align: 'center', slots: { default: 'actions' } },
  ];
}
