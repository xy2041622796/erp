import type { VbenFormSchema } from '#/adapter/form';

import { getProjectPage } from '#/api/erp/contract/project';

export type Mode = 'create' | 'detail' | 'edit';

export const taxRateOptions = [0, 1, 3, 6, 9, 13].map((v) => ({
  label: `${v}%`,
  value: v,
}));

export const invoiceConfig = {
  maxCount: 10,
  addButtonText: '添加发票',
  deleteButtonText: '删除',
  dialogTitle: '添加发票',
  dialogWidth: '520px',
  hint: '您可以添加10张发票信息',
  invoiceNoPlaceholder: '请输入',
  amountPlaceholder: '请输入',
  cancelText: '取消',
  confirmText: '添加',
} as const;

export const attachmentConfig = {
  maxCount: 9,
  maxSizeMB: 50,
  addButtonText: '添加附件',
  selectFileButtonText: '选择文件',
  hint: '你可以上传9个附件，每张最大50MB',
} as const;

export async function getProjectSelectList(params?: any) {
  const res: any = await getProjectPage({
    pageNo: 1,
    page: 200,
    showExpired: false,
    ...(params || undefined),
  });
  return res?.list ?? [];
}

/** 费用登记弹窗表单 Schema（参考 sale/order 的 data.ts 写法） */
export function useExpenseRegistFormSchema(
  formType: Mode,
  fixedExpenseType?: string,
): VbenFormSchema[] {
  const isDetail = formType === 'detail';
  const isExpenseTypeLocked = !!fixedExpenseType;

  return [
    {
      fieldName: 'expense_type',
      label: '费用类型',
      component: 'Input',
      componentProps: {
        placeholder: '请输入费用类型',
        disabled: isDetail || isExpenseTypeLocked,
        class: '!w-full',
      },
      rules: 'required',
    },
    {
      fieldName: 'registration_date',
      label: '日期',
      component: 'DatePicker',
      componentProps: {
        placeholder: '请选择日期',
        type: 'date',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        class: '!w-full',
        disabled: isDetail,
      },
      rules: 'required',
    },
    {
      fieldName: 'reimburser_name',
      label: '借款人',
      component: 'Input',
      componentProps: {
        disabled: true,
        placeholder: '自动带出',
        class: '!w-full',
      },
    },
    {
      fieldName: 'expense_depart',
      label: '部门',
      component: 'Input',
      componentProps: {
        placeholder: '请输入部门',
        disabled: isDetail,
        class: '!w-full',
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
        disabled: isDetail,
        class: '!w-full',
      },
    },
    {
      fieldName: 'expense_amount',
      label: '借款金额',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        precision: 2,
        class: '!w-full',
        disabled: isDetail,
      },
      rules: 'required',
    },
    {
      fieldName: 'tax_rate',
      label: '利率',
      component: 'Select',
      componentProps: {
        options: taxRateOptions,
        placeholder: '请选择',
        class: '!w-full',
        disabled: isDetail,
      },
      rules: 'required',
    },
    {
      fieldName: 'remark',
      label: '费用说明',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入费用说明',
        autoSize: { minRows: 3, maxRows: 3 },
        disabled: isDetail,
      },
      formItemClass: 'col-span-2',
    },

    // 占位字段：用 slot 接管渲染（参考 sale/order 的 items 字段）
    // {
    //   fieldName: 'invoices',
    //   label: '发票',
    //   component: 'Input',
    //   formItemClass: 'col-span-2',
    // },
    // {
    //   fieldName: 'attachments',
    //   label: '附件',
    //   component: 'Input',
    //   formItemClass: 'col-span-2',
    // },
  ];
}
