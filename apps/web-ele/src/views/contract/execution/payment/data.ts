import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'status',
      label: '回款状态',
      component: 'Select',
      componentProps: {
        placeholder: '全部状态',
        clearable: true,
        options: [
          { label: '待确认', value: 'pending' },
          { label: '已确认', value: 'confirmed' },
        ],
      },
    },
    {
      fieldName: 'payment_method',
      label: '回款方式',
      component: 'Select',
      componentProps: {
        placeholder: '全部方式',
        clearable: true,
        options: [
          { label: '银行转账', value: 'bank' },
          { label: '支票', value: 'check' },
          { label: '现金', value: 'cash' },
          { label: '其他', value: 'other' },
        ],
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '回款编号', field: 'payment_no', minWidth: 150, fixed: 'left' },
    { title: '合同编号', field: 'contract_no', minWidth: 150 },
    { title: '合同名称', field: 'contract_name', minWidth: 220 },
    { title: '客户名称', field: 'client_name', minWidth: 160, slots: { default: 'client_name' } },
    { title: '回款类型', field: 'payment_type', minWidth: 110, slots: { default: 'payment_type' } },
    { title: '回款金额', field: 'amount', minWidth: 120, align: 'right', slots: { default: 'amount' } },
    { title: '回款日期', field: 'payment_date', minWidth: 120 },
    { title: '付款方式', field: 'payment_method', minWidth: 110, slots: { default: 'payment_method' } },
    { title: '付款方', field: 'payer_name', minWidth: 150 },
    { title: '状态', field: 'status', width: 110, align: 'center', slots: { default: 'status' } },
    { title: '操作', field: 'actions', fixed: 'right', width: 120, align: 'center', slots: { default: 'actions' } },
  ];
}
