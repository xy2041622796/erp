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
      fieldName: 'contract_name',
      label: '合同名称',
      component: 'Input',
      componentProps: { placeholder: '请输入合同名称', clearable: true },
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
    { title: '项目', field: 'project_name', minWidth: 180 },
    { title: '合同类型', field: 'contract_type', minWidth: 120 },
    { title: '签订日期', field: 'contract_signing_date', minWidth: 120, slots: { default: 'sign_date' } },
    { title: '未税金额', field: 'contract_amount', minWidth: 130, align: 'right', slots: { default: 'amount' } },
    { title: '含税金额', field: 'contract_total_amount', minWidth: 130, align: 'right', slots: { default: 'total_amount' } },
    { title: '履行状态', field: 'ConState', minWidth: 110, align: 'center', slots: { default: 'status' } },
    { title: '备注', field: 'remark', minWidth: 180 },
  ];
}
