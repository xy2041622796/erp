import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getRangePickerDefaultProps } from '#/utils';

export const STOCK_CHECK_STATUS_META_MAP: Record<
  number,
  { label: string; tagType?: 'danger' | 'info' | 'success' | 'warning' }
> = {
  10: { label: '未确认', tagType: 'warning' },
  20: { label: '已确认', tagType: 'success' },
};

export function getStockCheckStatusMeta(status: unknown) {
  if (status === undefined || status === null || status === '') return null;
  const n = typeof status === 'number' ? status : Number(status);
  return STOCK_CHECK_STATUS_META_MAP[n] ?? null;
}

export function useFormSchema(formType: string): VbenFormSchema[] {
  return [
    {
      fieldName: 'id',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'no',
      label: '盘点单号',
      component: 'Input',
      componentProps: {
        placeholder: '系统自动生成',
        disabled: true,
      },
    },
    {
      fieldName: 'warehouse_id',
      label: '盘点仓库',
      component: 'Slot',
      rules: 'required',
    },
    {
      fieldName: 'check_time',
      label: '盘点时间',
      component: 'DatePicker',
      componentProps: {
        placeholder: '选择盘点时间',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        class: '!w-full',
        disabled: formType === 'detail',
      },
      rules: 'required',
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入备注',
        autoSize: { minRows: 1, maxRows: 1 },
        disabled: formType === 'detail',
      },
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'file_url',
      label: '附件',
      component: 'FileUpload',
      componentProps: {
        maxNumber: 1,
        maxSize: 10,
        accept: [
          'pdf',
          'doc',
          'docx',
          'xls',
          'xlsx',
          'txt',
          'jpg',
          'jpeg',
          'png',
        ],
        showDescription: formType !== 'detail',
        disabled: formType === 'detail',
      },
      formItemClass: 'col-span-3',
    },
    {
      fieldName: 'items',
      label: '盘点清单',
      component: 'Input',
      formItemClass: 'col-span-3',
    },
  ];
}

export function useFormItemColumns(
  disabled: boolean,
): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', minWidth: 50, fixed: 'left' },
    { field: 'product_name', title: '产品名称', minWidth: 200 },
    {
      field: 'stock_count',
      title: '账面库存',
      minWidth: 120,
      formatter: 'formatAmount3',
    },
    { field: 'product_bar_code', title: '条码', minWidth: 120 },
    { field: 'product_unit_name', title: '单位', minWidth: 80 },
    {
      field: 'remark',
      title: '备注',
      minWidth: 150,
      slots: { default: 'remark' },
    },
    {
      field: 'actual_count',
      title: '实际库存',
      minWidth: 120,
      fixed: 'right',
      slots: { default: 'actual_count' },
      formatter: 'formatAmount3',
    },
    {
      field: 'count',
      title: '盈亏数量',
      minWidth: 120,
      fixed: 'right',
      formatter: 'formatAmount3',
    },
    {
      title: '操作',
      width: 80,
      fixed: 'right',
      slots: { default: 'actions' },
      visible: true,
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'no',
      label: '盘点单号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入盘点单号',
        allowClear: true,
      },
    },
    {
      fieldName: 'check_time',
      label: '盘点时间',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        allowClear: true,
      },
    },
    {
      fieldName: 'warehouse_id',
      label: '仓库',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择仓库',
        allowClear: true,
        showSearch: true,
        api: getWarehouseSimpleList,
        labelField: 'name',
        valueField: 'rowid',
      },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: {
        options: [
          { label: '未确认', value: 10 },
          { label: '已确认', value: 20 },
        ],
        placeholder: '请选择状态',
        allowClear: true,
      },
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Input',
      componentProps: {
        placeholder: '请输入备注',
        allowClear: true,
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { field: 'no', title: '盘点单号', width: 200, fixed: 'left' },
    {
      field: 'warehouse_name',
      title: '盘点仓库',
      minWidth: 160,
      slots: { default: 'warehouse_name' },
    },
    {
      field: 'product_names',
      title: '产品信息',
      showOverflow: 'tooltip',
      minWidth: 180,
    },
    {
      field: 'check_time',
      title: '盘点时间',
      width: 160,
      formatter: 'formatDate',
    },
    {
      field: 'creator_name',
      title: '创建人',
      minWidth: 120,
    },
    {
      field: 'total_count',
      title: '总数量',
      formatter: 'formatAmount3',
      minWidth: 120,
    },
    {
      field: 'status',
      title: '状态',
      minWidth: 120,
      slots: { default: 'status' },
    },
    {
      title: '操作',
      width: 220,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
