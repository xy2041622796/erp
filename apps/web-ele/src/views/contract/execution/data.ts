import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getCustomerSimpleList } from '#/api/erp/customer';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'no',
      label: '合同编号',
      component: 'Input',
      componentProps: { placeholder: '请输入合同编号', clearable: true },
    },
    {
      fieldName: 'customerId',
      label: '客户/供应商',
      component: 'ApiSelect',
      componentProps: {
        api: getCustomerSimpleList,
        labelField: 'name',
        valueField: 'id',
        placeholder: '请选择客户/供应商',
        clearable: true,
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '合同编号', field: 'contract_no', minWidth: 150, fixed: 'left', slots: { default: 'contract_no' } },
    { title: '合同名称', field: 'contract_name', minWidth: 220 },
    { title: '客户/供应商', field: 'contract_party_b', minWidth: 180, slots: { default: 'party' } },
    { title: '合同金额', field: 'contract_total_amount', minWidth: 140, align: 'right', slots: { default: 'total_amount' } },
    { title: '已结算/未结算', field: 'settle_amount', minWidth: 170, slots: { default: 'settle_amount' } },
    { title: '已收付款/未收付款', field: 'receive_amount', minWidth: 180, slots: { default: 'receive_amount' } },
    { title: '已开票/未开票', field: 'invoice_amount', minWidth: 170, slots: { default: 'invoice_amount' } },
    { title: '签订日期', field: 'contract_signing_date', minWidth: 120, slots: { default: 'sign_date' } },
    { title: '履行状态', field: 'ConState', width: 120, align: 'center', slots: { default: 'status' } },
  ];
}
