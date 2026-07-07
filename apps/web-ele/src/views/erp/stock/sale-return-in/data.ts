import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { erpNumberFormatter } from '@vben/utils';

import { getCustomerSimpleList } from '#/api/erp/customer';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';
import { getRangePickerDefaultProps } from '#/utils';

export const SALE_RETURN_IN_STATUS_META_MAP: Record<
  number,
  { label: string; tagType?: 'success' | 'warning' | 'info' | 'danger' }
> = {
  10: { label: '待审批', tagType: 'warning' },
  20: { label: '已审批', tagType: 'success' },
};

export function getSaleReturnInStatusMeta(status: unknown) {
  if (status === undefined || status === null || status === '') return null;
  return SALE_RETURN_IN_STATUS_META_MAP[Number(status)] ?? null;
}

export function useFormSchema(formType: string): VbenFormSchema[] {
  return [
    {
      fieldName: 'id',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'return_id',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'no',
      label: '入库执行单号',
      component: 'Input',
      componentProps: { disabled: true, placeholder: '系统自动生成' },
    },
    {
      fieldName: 'return_no',
      label: '来源销售退货单',
      component: 'Input',
      componentProps: { disabled: true, placeholder: '请选择来源销售退货单' },
      rules: 'required',
    },
    {
      fieldName: 'warehouse_id',
      label: '执行仓库',
      component: 'ApiSelect',
      componentProps: {
        disabled: true,
        placeholder: '选择来源单后自动带出',
        api: getWarehouseSimpleList,
        labelField: 'name',
        valueField: 'rowid',
        showSearch: true,
      },
      rules: 'required',
    },
    {
      fieldName: 'in_time',
      label: '入库时间',
      component: 'DatePicker',
      componentProps: {
        disabled: formType === 'detail',
        placeholder: '请选择入库时间',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        class: '!w-full',
      },
      rules: 'required',
    },
    {
      fieldName: 'customer_id',
      label: '客户',
      component: 'ApiSelect',
      componentProps: {
        disabled: true,
        placeholder: '自动带出',
        api: getCustomerSimpleList,
        labelField: 'name',
        valueField: 'id',
        showSearch: true,
      },
      rules: 'required',
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      formItemClass: 'col-span-2',
      componentProps: {
        disabled: formType === 'detail',
        autoSize: { minRows: 1, maxRows: 2 },
      },
    },
    { fieldName: 'items', label: '入库明细', component: 'Input', formItemClass: 'col-span-3' },
    {
      fieldName: 'total_count',
      label: '合计数量',
      component: 'InputNumber',
      componentProps: { disabled: true, precision: 6, class: '!w-full' },
    },
    {
      fieldName: 'status',
      label: '审批状态',
      component: 'Input',
      componentProps: { disabled: true },
      dependencies: { triggerFields: ['id'], show: (values) => !!values?.id && formType !== 'detail' },
    },
  ];
}

export function useFormItemColumns(formData?: any[], disabled?: boolean): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', minWidth: 50, fixed: 'left' },
    { field: 'warehouse_id', title: '仓库', minWidth: 140, slots: { default: 'warehouse_id' } },
    { field: 'product_id', title: '产品名称', minWidth: 200, slots: { default: 'product_id' } },
    { field: 'stock_count', title: '当前库存', minWidth: 100, formatter: 'formatAmount3' },
    { field: 'product_bar_code', title: '条码', minWidth: 120 },
    { field: 'product_unit_name', title: '单位', minWidth: 80 },
    { field: 'remark', title: '备注', minWidth: 150, slots: { default: 'remark' } },
    {
      field: 'source_count',
      title: '来源退货数量',
      minWidth: 120,
      formatter: 'formatAmount3',
      visible: formData && formData[0]?.source_count !== undefined,
    },
    {
      field: 'in_count',
      title: '历史累计入库',
      minWidth: 120,
      formatter: 'formatAmount3',
      visible: formData && formData[0]?.in_count !== undefined,
    },
    { field: 'count', title: '本次入库数量', minWidth: 140, slots: { default: 'count' } },
    { title: '操作', width: 60, fixed: 'right', slots: { default: 'actions' }, visible: true },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    { fieldName: 'return_no', label: '来源退货单', component: 'Input', componentProps: { allowClear: true } },
    {
      fieldName: 'in_time',
      label: '入库时间',
      component: 'RangePicker',
      componentProps: { ...getRangePickerDefaultProps(), allowClear: true },
    },
    {
      fieldName: 'customer_id',
      label: '客户',
      component: 'ApiSelect',
      componentProps: {
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
        allowClear: true,
        showSearch: true,
        api: getWarehouseSimpleList,
        labelField: 'name',
        valueField: 'rowid',
      },
    },
    {
      fieldName: 'createuser',
      label: '创建人',
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        showSearch: true,
        api: getSimpleUserList,
        labelField: 'UserName',
        valueField: 'ROWID',
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { field: 'no', title: '退货入库单号', width: 200, fixed: 'left' },
    { field: 'status', title: '状态', width: 100, slots: { default: 'status' } },
    { field: 'return_no', title: '来源退货单', minWidth: 160 },
    { field: 'warehouse_id', title: '仓库', minWidth: 140, slots: { default: 'warehouse_id' } },
    { field: 'customer_id', title: '客户', minWidth: 120, slots: { default: 'customer_id' } },
    { field: 'in_time', title: '入库时间', width: 160, formatter: 'formatDate' },
    { field: 'createuser', title: '创建人', minWidth: 120 },
    {
      field: 'total_count',
      title: '数量',
      minWidth: 120,
      formatter: ({ cellValue }) => erpNumberFormatter(cellValue, 3),
    },
    { title: '操作', fixed: 'right', width: 240, slots: { default: 'action' } },
  ];
}
