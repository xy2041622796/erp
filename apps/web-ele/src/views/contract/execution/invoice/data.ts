import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'status',
      label: '开票状态',
      component: 'Select',
      componentProps: {
        placeholder: '全部状态',
        clearable: true,
        options: [
          { label: '待审批', value: 'pending' },
          { label: '已通过', value: 'approved' },
          { label: '已开票', value: 'invoiced' },
          { label: '已驳回', value: 'rejected' },
        ],
      },
    },
    {
      fieldName: 'invoice_type',
      label: '发票类型',
      component: 'Select',
      componentProps: {
        placeholder: '全部类型',
        clearable: true,
        options: [
          { label: '普票', value: 'normal' },
          { label: '专票', value: 'special' },
          { label: '电子发票', value: 'electronic' },
        ],
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '发票号码', field: 'invoice_no', minWidth: 150, fixed: 'left', slots: { default: 'invoice_no' } },
    { title: '合同编号', field: 'contract_no', minWidth: 150 },
    { title: '合同名称', field: 'contract_name', minWidth: 220 },
    { title: '客户名称', field: 'client_name', minWidth: 160, slots: { default: 'client_name' } },
    { title: '发票类型', field: 'invoice_type', minWidth: 130, slots: { default: 'invoice_type' } },
    { title: '开票金额', field: 'amount', minWidth: 120, align: 'right', slots: { default: 'amount' } },
    { title: '税率', field: 'tax_rate', width: 90, align: 'right', slots: { default: 'tax_rate' } },
    { title: '税额', field: 'tax_amount', minWidth: 120, align: 'right', slots: { default: 'tax_amount' } },
    { title: '申请日期', field: 'apply_date', minWidth: 120 },
    { title: '状态', field: 'status', width: 110, align: 'center', slots: { default: 'status' } },
    { title: '操作', field: 'actions', fixed: 'right', width: 120, align: 'center', slots: { default: 'actions' } },
  ];
}
