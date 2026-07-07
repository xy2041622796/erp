import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { useUserStore } from '@vben/stores';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getSimpleDeptList } from '#/api/system/dept';
import { queryCompanyType } from '#/api/erp/contract/contract';

/** 新增/修改表单（收入合同） */
export function useFormSchema(): VbenFormSchema[] {
  const userStore = useUserStore();
  return [
    {
      fieldName: 'rowid',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'contract_party_b',
      label: '客户',
      component: 'Slot',
      rules: 'required',
      formItemClass: 'col-span-1',
    },
    {
      fieldName: 'contract_name',
      label: '合同名称',
      component: 'Input',
      rules: 'required',
      componentProps: {
        placeholder: '请输入合同名称',
        class: '!w-full',
      },
    },
    {
      fieldName: 'contract_no',
      label: '编号',
      component: 'Input',
      componentProps: {
        placeholder: '自动生成',
        disabled: true,
      },
    },
    {
      fieldName: 'contract_signing_date',
      label: '签订日期',
      component: 'DatePicker',
      rules: 'required',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        placeholder: '请选择',
        class: '!w-full',
      },
    },
    {
      fieldName: 'salesperson',
      label: '业务员',
      component: 'Slot',
      rules: 'required',
      defaultValue: userStore.userInfo?.id,
    },
    {
      fieldName: 'deptid',
      label: '部门',
      component: 'ApiSelect',
      componentProps: {
        api: getSimpleDeptList,
        labelField: 'name',
        valueField: 'id',
        placeholder: '请选择',
        allowClear: true,
        showSearch: true,
        class: '!w-full',
      },
      defaultValue: (userStore.userInfo as any)?.deptId,
    },
    {
      fieldName: 'project_id',
      label: '项目',
      component: 'Slot',
    },
    {
      fieldName: 'contract_period',
      label: '期限',
      component: 'DatePicker',
      componentProps: {
        type: 'daterange',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        placeholder: ['开始日期', '结束日期'],
        class: '!w-full',
      },
      dependencies: {
        triggerFields: ['contract_period'],
        trigger(values, form) {
          const range = values.contract_period as any;
          if (Array.isArray(range) && range.length === 2) {
            form.setFieldValue('contract_start_date', range[0]);
            form.setFieldValue('contract_end_date', range[1]);
          }
        },
      },
    },
    {
      fieldName: 'contract_start_date',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'contract_end_date',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'delivery_address',
      label: '交付地址',
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
    },
    {
      fieldName: 'delivery_date',
      label: '交付日期',
      component: 'DatePicker',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        placeholder: '请选择',
        class: '!w-full',
      },
    },
    {
      fieldName: 'product_items',
      component: 'Slot',
      formItemClass: 'col-span-2',
      wrapperClass: 'w-full',
      dependencies: {
        triggerFields: ['rowid'],
      },
    },
    {
      fieldName: 'contract_amount',
      label: '未税金额',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        precision: 2,
        placeholder: '0',
        disabled: true,
        controlsPosition: 'right',
        class: '!w-full',
      },
    },
    {
      fieldName: 'contract_tax_rate',
      label: '税率',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        precision: 2,
        placeholder: '0',
        disabled: true,
        controlsPosition: 'right',
        class: '!w-full',
      },
    },
    {
      fieldName: 'contract_total_amount',
      label: '含税金额',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        precision: 2,
        disabled: true,
        controlsPosition: 'right',
        class: '!w-full',
      },
    },
    {
      fieldName: '__spacer_3',
      component: 'Slot',
      formItemClass: 'col-span-1',
    },
    {
      fieldName: '__divider_base',
      component: 'Divider',
      formItemClass: 'col-span-2',
      componentProps: {
        contentPosition: 'left',
      },
    },
    {
      fieldName: 'contract_tax_amount',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'receiving_account',
      label: '收款账户',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '默认账户',
        allowClear: true,
        showSearch: true,
        api: getAccountSimpleList,
        labelField: 'name',
        valueField: 'rowid',
        class: '!w-full',
      },
    },
    {
      fieldName: 'invoice_amount',
      label: '约定开票金额',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        precision: 2,
        placeholder: '0',
        controlsPosition: 'right',
        class: '!w-full',
      },
    },
    {
      fieldName: 'receivable_plan',
      component: 'Slot',
      formItemClass: 'col-span-2',
      wrapperClass: 'w-full',
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入内容',
        rows: 4,
      },
    },
    {
      fieldName: 'description',
      label: '附言(不打印)',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入内容',
        rows: 4,
      },
    },
  ];
}

/** 列表的搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'contract_no',
      label: '合同编号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入合同编号',
        clearable: true,
      },
    },
    {
      fieldName: 'contract_name',
      label: '合同名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入合同名称',
        clearable: true,
      },
    },
    {
      fieldName: 'contract_party_b',
      label: '客户',
      component: 'ApiSelect',
      componentProps: {
        api: getCustomerSimpleList,
        labelField: 'name',
        valueField: 'id',
        placeholder: '请选择客户',
        clearable: true,
      },
    },
    {
      fieldName: 'ConState',
      label: '合同状态',
      component: 'Select',
      componentProps: {
        placeholder: '请选择合同状态',
        clearable: true,
        options: [
          { label: '全部', value: '' },
          { label: '待审批', value: 0 },
          { label: '待结算', value: 1 },
          { label: '待收款', value: 2 },
          { label: '完成', value: 3 },
        ],
      },
    },
  ];
}

/** 表格列 */
export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      title: '#',
      type: 'seq',
      width: 60,
      fixed: 'left',
    },
    {
      title: '日期/编号',
      field: 'contract_signing_date',
      minWidth: 160,
      fixed: 'left',
      slots: { default: 'date_no' },
    },
    {
      title: '客户/项目',
      field: 'contract_party_b',
      minWidth: 200,
      slots: { default: 'customer_project' },
    },
    {
      title: '合同名称',
      field: 'contract_name',
      minWidth: 180,
    },
    {
      title: '业务员/部门',
      field: 'salesperson',
      minWidth: 180,
      slots: { default: 'sales_dept' },
    },
    {
      title: '未税金额/含税金额',
      field: 'contract_total_amount',
      minWidth: 170,
      slots: { default: 'amount_origin_total' },
    },
    {
      title: '已结算/未结算',
      field: 'settle_amount',
      minWidth: 170,
      slots: { default: 'settle_amount' },
    },
    {
      title: '已收款/未收款',
      field: 'receive_amount',
      minWidth: 170,
      slots: { default: 'receive_amount' },
    },
    {
      title: '已开票/未开票',
      field: 'invoice_amount',
      minWidth: 170,
      slots: { default: 'invoice_amount' },
    },
    {
      title: '备注/附言',
      field: 'remark',
      minWidth: 200,
      slots: { default: 'remark_note' },
    },
    {
      title: '状态',
      field: 'ConState',
      fixed: 'right',
      width: 120,
      align: 'center',
      slots: { default: 'status' },
    },
    {
      title: '操作',
      field: 'actions',
      fixed: 'right',
      width: 280,
      slots: { default: 'actions' },
    },
  ];
}
