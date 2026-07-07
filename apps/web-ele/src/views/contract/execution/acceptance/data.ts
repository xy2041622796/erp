import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'acceptance_result',
      label: '验收结果',
      component: 'Select',
      componentProps: {
        placeholder: '全部结果',
        clearable: true,
        options: [
          { label: '通过', value: 'pass' },
          { label: '整改后通过', value: 'conditional_pass' },
          { label: '不通过', value: 'fail' },
        ],
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '合同类型', field: 'contract_category', width: 110, align: 'center', slots: { default: 'contract_category' } },
    { title: '合同编号', field: 'contract_no', minWidth: 150, fixed: 'left' },
    { title: '合同名称', field: 'contract_name', minWidth: 220 },
    { title: '客户名称', field: 'client_name', minWidth: 160, slots: { default: 'client_name' } },
    { title: '验收阶段', field: 'acceptance_type', minWidth: 120, slots: { default: 'acceptance_type' } },
    { title: '验收日期', field: 'acceptance_date', minWidth: 120 },
    { title: '验收结果', field: 'acceptance_result', minWidth: 120, slots: { default: 'acceptance_result' } },
    { title: '说明', field: 'remark', minWidth: 180 },
    { title: '操作', field: 'actions', fixed: 'right', width: 120, align: 'center', slots: { default: 'actions' } },
  ];
}
