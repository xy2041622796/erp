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
    {
      fieldName: 'change_type',
      label: '变更类型',
      component: 'Select',
      componentProps: {
        clearable: true,
        placeholder: '全部类型',
        options: [
          { label: '金额变更', value: '金额变更' },
          { label: '付款明细变更', value: '付款明细变更' },
          { label: '期限变更', value: '期限变更' },
          { label: '条款变更', value: '条款变更' },
          { label: '综合变更', value: '综合变更' },
        ],
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '变更编号', field: 'change_no', minWidth: 150, fixed: 'left' },
    { title: '合同类型', field: 'contract_category', width: 110, align: 'center', slots: { default: 'contract_category' } },
    { title: '合同编号', field: 'contract_no', minWidth: 150 },
    { title: '合同名称', field: 'contract_name', minWidth: 220 },
    { title: '客户名称', field: 'client_name', minWidth: 160, slots: { default: 'client_name' } },
    { title: '变更类型', field: 'change_type', minWidth: 130, slots: { default: 'change_type' } },
    { title: '金额变更', field: 'amount_change', minWidth: 120, align: 'right', slots: { default: 'amount_change' } },
    { title: '生效日期', field: 'effective_date', minWidth: 120 },
    { title: '登记日期', field: 'apply_date', minWidth: 120 },
    { title: '应用状态', field: 'apply_status', minWidth: 110, align: 'center', slots: { default: 'apply_status' } },
    { title: '操作', field: 'actions', fixed: 'right', width: 320, align: 'center', slots: { default: 'actions' } },
  ];
}
