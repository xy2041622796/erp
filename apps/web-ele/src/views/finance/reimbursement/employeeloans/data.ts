import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getRangePickerDefaultProps } from '#/utils';

/** 员工借款：固定费用类型 */
export const EMPLOYEE_LOAN_EXPENSE_TYPE = '员工借款' as const;

/** 员工借款列表 Columns（Bil_Expense_Regist） */
export function useEmployeeLoansGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    {
      field: 'registration_date',
      title: '日期',
      width: 140,
      formatter: 'formatDate',
    },
    { field: 'registration_no', title: '编号', minWidth: 160 },
    {
      field: 'user_id',
      title: '职员/部门',
      minWidth: 180,
      formatter: ({ row }: any) => {
        const user = row?.user_id ?? row?.createuser ?? '-';
        const dept = row?.expense_depart ?? '-';
        return `${user}/${dept}`;
      },
    },
    { field: 'project_id', title: '项目', minWidth: 160 },
    {
      field: 'expense_amount',
      title: '借款金额',
      width: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'loan_balance',
      title: '借款余额',
      width: 120,
      formatter: ({ row }: any) => {
        // 后端若提供余额字段则展示，否则默认 0
        const val =
          row?.loan_balance ?? row?.current_balance ?? row?.balance ?? 0;
        const num = Number(val ?? 0);
        return Number.isFinite(num) ? num.toFixed(2) : '0.00';
      },
    },
    { field: 'remark', title: '备注', minWidth: 200 },
    {
      title: '操作',
      width: 150,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

/** 员工借款搜索 Schema */
export function useEmployeeLoansGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'registrationDateRange',
      label: '日期',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        valueFormat: 'YYYY-MM-DD',
        format: 'YYYY-MM-DD',
      },
    },
    {
      fieldName: 'registration_no',
      label: '编号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入登记编号',
        clearable: true,
      },
    },
    {
      fieldName: 'expense_depart',
      label: '部门',
      component: 'Input',
      componentProps: {
        placeholder: '请输入部门/部门ID',
        clearable: true,
      },
    },
    {
      fieldName: 'project_id',
      label: '项目',
      component: 'Input',
      componentProps: {
        placeholder: '请输入项目',
        clearable: true,
      },
    },
    {
      fieldName: 'user_id',
      label: '职员',
      component: 'Input',
      componentProps: {
        placeholder: '请输入职员ID/姓名',
        clearable: true,
      },
    },
    {
      fieldName: 'keyword',
      label: '关键字',
      component: 'Input',
      componentProps: {
        placeholder: '摘要/备注/项目/编号/职员',
        clearable: true,
      },
    },
  ];
}
