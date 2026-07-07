import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { erpNumberFormatter } from '@vben/utils';

import { getCustomerSimpleList } from '#/api/erp/customer';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';
import { getRangePickerDefaultProps } from '#/utils';

import { useDataTablePermission } from '../../shared/useDataTablePermission';

export const SALE_OUT_STATUS_META_MAP: Record<
  number,
  { label: string; tagType?: 'danger' | 'info' | 'success' | 'warning' }
> = {
  10: { label: '待审批', tagType: 'warning' },
  20: { label: '审核通过', tagType: 'success' },
  30: { label: '审核不通过', tagType: 'danger' },
};

export function getSaleOutStatusMeta(status: unknown) {
  if (status === undefined || status === null || status === '') return null;
  const n = typeof status === 'number' ? status : Number(status);
  return SALE_OUT_STATUS_META_MAP[n] ?? null;
}

/** 表单的配置项 */
export function useFormSchema(
  formType: string,
  formValue: any,
): VbenFormSchema[] {
  const { hasFieldPermission } = useDataTablePermission();
  const isPer = hasFieldPermission(formValue);
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
      fieldName: 'rowid',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'order_id',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'no',
      label: '出库单号',
      component: 'Input',
      componentProps: {
        placeholder: '系统自动生成',
        disabled: true,
      },
    },
    {
      fieldName: 'order_no',
      label: '来源销售订单',
      component: 'Input',
      formItemClass: 'col-span-1',
      componentProps: {
        placeholder: '可选择来源销售订单，也可留空手工出库',
        disabled: true,
      },
    },
    {
      fieldName: 'warehouse_id',
      label: '执行仓库',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择执行仓库',
        api: getWarehouseSimpleList,
        labelField: 'name',
        valueField: 'rowid',
        showSearch: true,
        class: '!w-full',
        disabled:
          formType === 'detail' || isPer('fd:edit', 'warehouse_id', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'out_time',
      label: '出库时间',
      component: 'DatePicker',
      componentProps: {
        placeholder: '选择出库时间',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        class: '!w-full',
        disabled:
          formType === 'detail' || isPer('fd:edit', 'out_time', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'customer_id',
      label: '客户',
      component: 'Slot',
    },
    {
      fieldName: 'sale_user_id',
      label: '销售人员',
      component: 'Slot',
    },
    {
      fieldName: 'items',
      label: '',
      component: 'Input',
      formItemClass: 'col-span-3',
    },
    {
      fieldName: 'total_count',
      label: '合计数量',
      component: 'InputNumber',
      componentProps: {
        placeholder: '自动计算',
        precision: 6,
        disabled: true,
        controlsPosition: 'right',
        class: '!w-full',
      },
    },
  ];
}

/** 列表的搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'no',
      label: '出库单号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入出库单号',
        allowClear: true,
      },
    },
    {
      fieldName: 'order_no',
      label: '来源订单',
      component: 'Input',
      componentProps: {
        placeholder: '请输入来源订单号',
        allowClear: true,
      },
    },
    {
      fieldName: 'customer_id',
      label: '客户',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择客户',
        allowClear: true,
        showSearch: true,
        api: getCustomerSimpleList,
        labelField: 'name',
        valueField: 'id',
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
      fieldName: 'out_time',
      label: '出库时间',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        allowClear: true,
      },
    },
    {
      fieldName: 'sale_user_id',
      label: '销售员',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择销售人员',
        allowClear: true,
        showSearch: true,
        api: getSimpleUserList,
        labelField: 'UserName',
        valueField: 'ROWID',
      },
    },
  ];
}

/** 列表的字段 */
export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { field: 'no', title: '出库单号', width: 180, fixed: 'left' },
    {
      field: 'status',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
    },
    { field: 'order_no', title: '来源订单', minWidth: 160, formatter: ({ cellValue }) => cellValue || '无源单' },
    {
      field: 'warehouse_id',
      title: '仓库',
      minWidth: 140,
      slots: { default: 'warehouse_id' },
    },
    {
      field: 'customer_id',
      title: '客户',
      minWidth: 150,
      slots: { default: 'customer_id' },
    },
    {
      field: 'sale_user_id',
      title: '销售人',
      minWidth: 100,
      slots: { default: 'sale_user_id' },
    },
    {
      field: 'total_count',
      title: '数量',
      minWidth: 100,
      formatter: ({ cellValue }) => erpNumberFormatter(cellValue, 3),
    },
    {
      field: 'out_time',
      title: '出库时间',
      width: 180,
      formatter: 'formatDate',
    },
    { field: 'remark', title: '备注', minWidth: 200 },
    {
      title: '操作',
      width: 'auto',
      fixed: 'right',
      slots: { default: 'action' },
    },
  ];
}

/** 表单的明细表格列（出库明细） */
export function useFormItemColumns(
  formData?: any[],
  disabled?: boolean,
  amountVisible = false,
): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', minWidth: 50, fixed: 'left' },
    {
      field: 'warehouse_id',
      title: '仓库',
      minWidth: 140,
      slots: { default: 'warehouse_id' },
    },
    {
      field: 'product_id',
      title: '产品名称',
      minWidth: 200,
      slots: { default: 'product_id' },
    },
    {
      field: 'stock_count',
      title: '库存',
      minWidth: 80,
      formatter: 'formatAmount3',
    },
    { field: 'product_bar_code', title: '条码', minWidth: 120 },
    { field: 'product_unit_name', title: '单位', minWidth: 80 },
    { field: 'product_unit_id', title: '单位', visible: false },
    {
      field: 'remark',
      title: '备注',
      minWidth: 150,
      slots: { default: 'remark' },
    },
    {
      field: 'total_count',
      title: '计划数量',
      formatter: 'formatAmount3',
      minWidth: 120,
      visible: formData && formData[0]?.total_count !== undefined,
    },
    {
      field: 'out_count',
      title: '历史累计出库',
      formatter: 'formatAmount3',
      minWidth: 120,
      visible: formData && formData[0]?.out_count !== undefined,
    },
    {
      field: 'return_count',
      title: '历史累计退货',
      formatter: 'formatAmount3',
      minWidth: 120,
      visible: formData && formData[0]?.return_count !== undefined,
    },
    {
      field: 'count',
      title: '本次出库数量',
      minWidth: 140,
      slots: { header: 'count_header', default: 'count' },
    },
    {
      field: 'product_price',
      title: '产品金额',
      minWidth: 130,
      slots: { default: 'product_price' },
      visible: amountVisible,
    },
    {
      field: 'total_product_price',
      title: '未税金额',
      minWidth: 120,
      formatter: 'formatAmount2',
      visible: amountVisible,
    },
    {
      field: 'tax_percent',
      title: '税率(%)',
      minWidth: 105,
      slots: { default: 'tax_percent' },
      visible: amountVisible,
    },
    {
      field: 'tax_price',
      title: '税额',
      minWidth: 120,
      formatter: 'formatAmount2',
      visible: amountVisible,
    },
    {
      field: 'total_price',
      title: '含税合计',
      minWidth: 120,
      formatter: 'formatAmount2',
      visible: amountVisible,
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
