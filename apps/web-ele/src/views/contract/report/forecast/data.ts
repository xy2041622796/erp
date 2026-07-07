import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getCustomerSimpleList } from '#/api/erp/customer';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    { fieldName: 'no', label: '合同编号', component: 'Input', componentProps: { clearable: true, placeholder: '请输入合同编号' } },
    { fieldName: 'customerId', label: '客户', component: 'ApiSelect', componentProps: { api: getCustomerSimpleList, clearable: true, labelField: 'name', valueField: 'id', placeholder: '请选择客户' } },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '合同编号', field: 'contract_no', minWidth: 150, fixed: 'left' },
    { title: '合同名称', field: 'contract_name', minWidth: 220 },
    { title: '客户', field: 'contract_party_b', minWidth: 160, slots: { default: 'party' } },
    { title: '合同金额', field: 'contract_total_amount', minWidth: 130, align: 'right', slots: { default: 'amount' } },
    { title: '已回款', field: 'received_amount', minWidth: 130, align: 'right', slots: { default: 'received' } },
    { title: '预计待回款', field: 'remaining_amount', minWidth: 130, align: 'right', slots: { default: 'remaining' } },
    { title: '预测状态', field: 'forecast_status', width: 120, align: 'center', slots: { default: 'forecast_status' } },
  ];
}
