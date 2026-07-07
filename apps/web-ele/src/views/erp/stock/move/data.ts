import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DICT_TYPE } from '@vben/constants';
import { getDictOptions } from '@vben/hooks';

import { getRangePickerDefaultProps } from '#/utils';

const STOCK_MOVE_STATUS_OPTIONS = [
  { label: '待处理', value: 10 },
  { label: '已完成', value: 20 },
];

function getStatusOptions() {
  const dictOptions = getDictOptions(DICT_TYPE.ERP_AUDIT_STATUS, 'number');
  return Array.isArray(dictOptions) && dictOptions.length > 0
    ? STOCK_MOVE_STATUS_OPTIONS
    : STOCK_MOVE_STATUS_OPTIONS;
}

function formatStockMoveStatus(value: unknown) {
  const status = Number(value);
  if (status === 20) return '已完成';
  if (status === 10) return '待处理';
  return value === undefined || value === null || value === '' ? '-' : String(value);
}

/** 表单的配置项 */
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
      label: '调拨单号',
      component: 'Input',
      componentProps: {
        placeholder: '系统自动生成',
        disabled: true,
      },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: {
        options: getStatusOptions(),
        disabled: true,
      },
      dependencies: {
        triggerFields: [''],
        show: () => formType === 'detail',
      },
    },
    {
      fieldName: 'move_time',
      label: '调拨时间',
      component: 'DatePicker',
      componentProps: {
        placeholder: '选择调拨时间',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        class: '!w-full',
      },
      rules: 'required',
    },
    {
      fieldName: 'from_warehouse_id',
      label: '调出仓库',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'to_warehouse_id',
      label: '调入仓库',
      component: 'Input',
      rules: 'required',
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
      label: '产品清单',
      component: 'Input',
      formItemClass: 'col-span-3',
    },
  ];
}

/** 表单的明细表格列 */
export function useFormItemColumns(
  disabled: boolean,
): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', minWidth: 50, fixed: 'left' },
    {
      field: 'product_id',
      title: '产品名称',
      minWidth: 220,
      slots: { default: 'product_id', header: 'product_id_header' },
    },
    {
      field: 'stock_count',
      title: '调出库存',
      minWidth: 120,
      formatter: 'formatAmount3',
    },
    {
      field: 'product_bar_code',
      title: '条码',
      minWidth: 140,
    },
    {
      field: 'product_unit_name',
      title: '单位',
      minWidth: 100,
      slots: { default: 'product_unit_name' },
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 160,
      slots: { default: 'remark' },
    },
    {
      field: 'count',
      title: '数量',
      minWidth: 120,
      fixed: 'right',
      slots: { default: 'count', header: 'count_header' },
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      slots: { default: 'actions' },
      visible: true,
    },
  ];
}

/** 列表的搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'no',
      label: '调拨单号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入调拨单号',
        allowClear: true,
      },
    },
    {
      fieldName: 'from_warehouse_id',
      label: '调出仓库',
      component: 'Input',
      componentProps: {
        placeholder: '请输入调出仓库',
        allowClear: true,
      },
    },
    {
      fieldName: 'to_warehouse_id',
      label: '调入仓库',
      component: 'Input',
      componentProps: {
        placeholder: '请输入调入仓库',
        allowClear: true,
      },
    },
    {
      fieldName: 'move_time',
      label: '调拨时间',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        allowClear: true,
      },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: {
        options: getStatusOptions(),
        placeholder: '请选择状态',
        allowClear: true,
      },
    },
  ];
}

/** 列表的字段 */
export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'checkbox',
      width: 50,
      fixed: 'left',
    },
    {
      field: 'displayNo',
      title: '调拨单号',
      width: 200,
      fixed: 'left',
      formatter: ({ row }: any) => row.displayNo || row.no || '-',
    },
    {
      field: 'fromWarehouseName',
      title: '调出仓库',
      minWidth: 140,
      formatter: ({ row }: any) =>
        row.fromWarehouseName || row.from_warehouse_id || row.fromWarehouseId || '-',
    },
    {
      field: 'toWarehouseName',
      title: '调入仓库',
      minWidth: 140,
      formatter: ({ row }: any) =>
        row.toWarehouseName || row.to_warehouse_id || row.toWarehouseId || '-',
    },
    {
      field: 'productNamesDisplay',
      title: '产品信息',
      showOverflow: 'tooltip',
      minWidth: 180,
      formatter: ({ row }: any) =>
        row.productNamesDisplay || row.product_names || row.productNames || '-',
    },
    {
      field: 'move_time',
      title: '调拨时间',
      width: 160,
      formatter: 'formatDate',
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
      formatter: ({ cellValue }: any) => formatStockMoveStatus(cellValue),
    },
    {
      title: '操作',
      width: 260,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
