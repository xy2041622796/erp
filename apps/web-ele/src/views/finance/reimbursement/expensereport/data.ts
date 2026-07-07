import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { z } from '#/adapter/form';
import { getRangePickerDefaultProps } from '#/utils';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import { getProjectSelectList } from '#/views/finance/reimbursement/mine/modules/data';

export const reimbursementCategoryOptions = [
  { label: '日常报销', value: 'daily' },
  { label: '差旅报销', value: 'travel' },
  { label: '其他', value: 'other' },
];

export const applyStatusOptions = [
  { label: '草稿', value: 0 },
  { label: '待审批', value: 10 },
  { label: '待付款', value: 20 },
  { label: '已完成', value: 30 },
] as const;

export function getApplyStatusLabel(value: any) {
  const item = applyStatusOptions.find((x) => x.value === value);
  return item?.label ?? (value === 0 || value ? String(value) : '-');
}

function getOptionLabel(
  options: Array<{ label: string; value: any }>,
  value: any,
) {
  const item = options.find((x) => x.value === value);
  return item?.label ?? (value === 0 || value ? String(value) : '-');
}

/** 表单 Schema（新增/编辑/详情） */
export function useFormSchema(
  formType: string,
  formValue: any,
): VbenFormSchema[] {
  const { hasFieldPermission } = useDataTablePermission();
  const isPer = hasFieldPermission(formValue);

  return [
    {
      fieldName: 'rowid',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'reimbursement_no',
      label: '报销单号',
      component: 'Input',
      componentProps: {
        placeholder: '系统自动生成',
        disabled: true,
      },
    },
    {
      fieldName: 'ReportID',
      label: '报销类别',
      component: 'Select',
      componentProps: {
        options: reimbursementCategoryOptions,
        placeholder: '请选择报销类别',
        disabled:
          formType === 'detail' || isPer('fd:edit', 'ReportID', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'reimbursement_reason',
      label: '事由',
      component: 'Input',
      componentProps: {
        placeholder: '请输入事由',
        disabled:
          formType === 'detail' ||
          isPer('fd:edit', 'reimbursement_reason', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'reimbursement_date',
      label: '日期',
      component: 'DatePicker',
      componentProps: {
        placeholder: '请选择日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'x',
        class: '!w-full',
        disabled:
          formType === 'detail' ||
          isPer('fd:edit', 'reimbursement_date', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'reimburser_name',
      label: '报销人',
      component: 'Input',
      componentProps: {
        disabled: true,
        placeholder: '自动带出',
      },
    },
    {
      fieldName: 'reimbursement_department',
      label: '部门',
      component: 'Input',
      componentProps: {
        placeholder: '请输入部门',
        disabled:
          formType === 'detail' ||
          isPer('fd:edit', 'reimbursement_department', formType),
      },
    },

    {
      fieldName: 'project_id',
      label: '项目',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择项目',
        api: getProjectSelectList,
        labelField: 'project_name',
        valueField: 'rowid',
        showSearch: true,
        disabled:
          formType === 'detail' || isPer('fd:edit', 'project_id', formType),
        class: '!w-full',
      },
    },
    {
      fieldName: 'receive_account',
      label: '收款账户',
      component: 'Input',
      componentProps: {
        placeholder: '请输入收款账户',
        disabled:
          formType === 'detail' ||
          isPer('fd:edit', 'receive_account', formType),
      },
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'postscript',
      label: '附言',
      component: 'Input',
      componentProps: {
        placeholder: '请输入附言',
        disabled:
          formType === 'detail' || isPer('fd:edit', 'postscript', formType),
      },
      formItemClass: 'col-span-2',
    },

    {
      fieldName: 'items',
      label: '产品清单',
      component: 'Input',
      formItemClass: 'col-span-3',
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入备注',
        autoSize: { minRows: 2, maxRows: 4 },
        disabled: formType === 'detail' || isPer('fd:edit', 'remark', formType),
      },
      formItemClass: 'col-span-3',
    },
    {
      fieldName: 'total_amount',
      label: '金额合计',
      component: 'InputNumber',
      componentProps: {
        placeholder: '自动计算',
        precision: 2,
        disabled: true,
        controlsPosition: 'right',
        class: '!w-full',
      },
      rules: z.number().min(0).optional(),
    },
    {
      fieldName: 'status',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'description',
      component: 'Textarea',
      dependencies: { triggerFields: [''], show: () => false },
    },
  ];
}

/** 列表搜索 Schema */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'reimbursement_no',
      label: '报销单号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入报销单号',
        allowClear: true,
      },
    },
    {
      fieldName: 'reimbursementDateRange',
      label: '日期',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        valueFormat: 'x',
        format: 'YYYY-MM-DD',
        allowClear: true,
      },
    },
    {
      fieldName: 'project_id',
      label: '项目',
      component: 'Input',
      componentProps: {
        placeholder: '请输入项目',
        allowClear: true,
      },
    },
    {
      fieldName: 'keyword',
      label: '关键字',
      component: 'Input',
      componentProps: {
        placeholder: '事由/备注/附言/报销人/部门',
        allowClear: true,
      },
    },
  ];
}

/** 列表 Columns */
export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    {
      field: 'reimbursement_date',
      title: '日期',
      width: 140,
      formatter: 'formatDate',
      fixed: 'left',
    },
    {
      field: 'reimbursement_no',
      title: '单号',
      width: 170,
      fixed: 'left',
    },
    {
      field: 'ReportID',
      title: '报销类别',
      width: 120,
      formatter: ({ row }: any) =>
        getOptionLabel(reimbursementCategoryOptions as any, row?.ReportID),
    },
    { field: 'project_id', title: '项目', minWidth: 160 },
    {
      field: 'reimburser_name',
      title: '报销人/部门',
      minWidth: 160,
      formatter: ({ row }: any) => {
        const name = row?.reimburser_name ?? '-';
        const dept = row?.reimbursement_department ?? '-';
        return `${name}/${dept}`;
      },
    },
    {
      field: 'total_amount',
      title: '报销金额',
      width: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'reimbursement_reason',
      title: '事由',
      minWidth: 180,
      showOverflow: 'tooltip',
    },
    {
      field: 'postscript',
      title: '备注/附言',
      minWidth: 200,
      showOverflow: 'tooltip',
      formatter: ({ row }: any) => row?.postscript || row?.remark || '-',
    },
    {
      field: 'status',
      title: '状态',
      width: 100,
      formatter: ({ row }: any) => getApplyStatusLabel(row?.status),
    },
    {
      title: '操作',
      width: 'auto',
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

/** 费用选择弹窗：表格 Columns */
export function useExpenseSelectColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    {
      field: 'registration_date',
      title: '日期',
      width: 140,
      formatter: 'formatDate',
    },
    { field: 'expense_type', title: '费用类型', width: 140 },
    {
      field: 'expense_amount',
      title: '金额',
      width: 110,
      formatter: 'formatAmount2',
    },
    { field: 'expense_depart', title: '部门', width: 140 },
    { field: 'project_id', title: '项目', minWidth: 160 },
    {
      field: 'remark',
      title: '费用说明',
      minWidth: 200,
      showOverflow: 'tooltip',
    },
  ];
}

/** 费用选择弹窗：搜索 Schema */
export function useExpenseSelectFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'registrationDateRange',
      label: '登记日期',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        valueFormat: 'x',
        format: 'YYYY-MM-DD',
      },
    },
    {
      fieldName: 'project_id',
      label: '项目',
      component: 'Input',
      componentProps: { placeholder: '请输入项目', allowClear: true },
    },
    {
      fieldName: 'keyword',
      label: '关键字',
      component: 'Input',
      componentProps: { placeholder: '摘要/备注/编号', allowClear: true },
    },
  ];
}

/** 报销单明细（已选费用）Columns */
export function useSelectedExpenseColumns(
  disabled: boolean,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'registration_no',
      title: '费用单号',
      width: 140,
    },
    {
      field: 'expense_type',
      title: '费用类型',
      width: 140,
    },
    {
      field: 'registration_date',
      title: '发生日期',
      width: 140,
      formatter: 'formatDate',
    },
    {
      field: 'expense_amount',
      title: '金额',
      width: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'tax_rate',
      title: '税率',
      width: 90,
      formatter: ({ row }: any) =>
        row?.tax_rate === 0 || row?.tax_rate ? `${row.tax_rate}%` : '-',
    },

    { field: 'expense_depart', title: '部门', width: 140 },
    { field: 'project_id', title: '项目', minWidth: 160 },
    {
      field: 'remark',
      title: '费用说明',
      minWidth: 220,
      showOverflow: 'tooltip',
    },
    {
      title: '操作',
      width: 'auto',
      fixed: 'right',
      slots: { default: 'row_actions' },
      visible: !disabled,
    },
  ];
}
