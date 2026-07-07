import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DICT_TYPE } from '@vben/constants';
import { getDictOptions } from '@vben/hooks';
import { erpNumberFormatter } from '@vben/utils';

import { getProductSimpleList } from '#/api/crm/product';
import { getSupplierSimpleList } from '#/api/erp/customer';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';
import { getRangePickerDefaultProps } from '#/utils';

import { useDataTablePermission } from '../../shared/useDataTablePermission';

export const PURCHASE_IN_STATUS_META_MAP: Record<
  number,
  { label: string; tagType?: 'danger' | 'info' | 'success' | 'warning' }
> = {
  10: { label: '待审批', tagType: 'warning' },
  20: { label: '审核通过', tagType: 'success' },
  30: { label: '审核不通过', tagType: 'danger' },
};

export function getPurchaseInStatusMeta(status: unknown) {
  if (status === undefined || status === null || status === '') return null;
  const n = typeof status === 'number' ? status : Number(status);
  return PURCHASE_IN_STATUS_META_MAP[n] ?? null;
}

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
      fieldName: 'order_id',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'no',
      label: '入库单号',
      component: 'Input',
      componentProps: {
        placeholder: '系统自动生成',
        disabled: true,
      },
    },
    {
      fieldName: 'order_no',
      label: '来源采购订单',
      component: 'Input',
      formItemClass: 'col-span-1',
      componentProps: {
        placeholder: '可选择来源采购订单，也可留空手工入库',
        disabled: true,
      },
    },
    {
      fieldName: 'warehouse_id',
      label: '执行仓库',
      component: 'ApiSelect',
      componentProps: {
        disabled:
          formType === 'detail' || isPer('fd:edit', 'warehouse_id', formType),
        placeholder: '请选择执行仓库',
        allowClear: true,
        showSearch: true,
        api: getWarehouseSimpleList,
        labelField: 'name',
        valueField: 'rowid',
      },
      rules: 'required',
    },
    {
      fieldName: 'in_time',
      label: '入库时间',
      component: 'DatePicker',
      componentProps: {
        disabled:
          formType === 'detail' || isPer('fd:edit', 'in_time', formType),
        placeholder: '选择入库时间',
        showTime: true,
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        class: '!w-full',
      },
      rules: 'required',
    },
    {
      fieldName: 'supplier_id',
      label: '供应商',
      component: 'ApiSelect',
      componentProps: {
        disabled:
          formType === 'detail' || isPer('fd:edit', 'supplier_id', formType),
        placeholder: '请选择供应商',
        allowClear: true,
        showSearch: true,
        api: getSupplierSimpleList,
        labelField: 'name',
        valueField: 'rowid',
      },
      rules: 'required',
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
    {
      fieldName: 'status',
      label: '审批状态',
      component: 'Select',
      componentProps: {
        options: getDictOptions(DICT_TYPE.ERP_AUDIT_STATUS, 'number'),
        disabled: true,
      },
      dependencies: {
        triggerFields: ['id'],
        show: () => false,
      },
    },
    {
      fieldName: 'remark_tip',
      label: '数量说明',
      component: 'Input',
      componentProps: {
        disabled: true,
        placeholder: '允许少执行或超执行，本阶段只做提示不做“不能超过”强校验',
      },
      dependencies: {
        triggerFields: ['warehouse_id'],
        show: () => true,
      },
    },
  ];
}

export function useFormItemColumns(
  formData?: any[],
  _disabled?: boolean,
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
    { field: 'stock_count', title: '库存', minWidth: 80 },
    { field: 'product_bar_code', title: '条码', minWidth: 120 },
    { field: 'product_unit_name', title: '单位', minWidth: 100, slots: { default: 'product_unit_name' } },
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
      field: 'in_count',
      title: '历史累计入库',
      formatter: 'formatAmount3',
      minWidth: 120,
      visible: formData && formData[0]?.in_count !== undefined,
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
      title: '本次入库数量',
      minWidth: 140,
      slots: { default: 'count' },
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

export function useGridFormSchema(): VbenFormSchema[] {
  return [
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
      fieldName: 'in_time',
      label: '入库时间',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        allowClear: true,
      },
    },
    {
      fieldName: 'supplier_id',
      label: '供应商',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择供应商',
        allowClear: true,
        showSearch: true,
        api: getSupplierSimpleList,
        labelField: 'name',
        valueField: 'rowid',
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
      fieldName: 'createuser',
      label: '创建人',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择创建人',
        allowClear: true,
        showSearch: true,
        api: getSimpleUserList,
        labelField: 'UserName',
        valueField: 'ROWID',
      },
    },
    {
      fieldName: 'status',
      label: '审批状态',
      component: 'Select',
      componentProps: {
        options: getDictOptions(DICT_TYPE.ERP_AUDIT_STATUS, 'number'),
        placeholder: '请选择审批状态',
        allowClear: true,
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { field: 'no', title: '采购入库单号', width: 200, fixed: 'left' },
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
      field: 'supplier_id',
      title: '供应商',
      minWidth: 120,
      slots: { default: 'supplier_id' },
    },
    {
      field: 'in_time',
      title: '入库时间',
      width: 160,
      formatter: 'formatDate',
    },
    {
      field: 'createuser',
      title: '创建人',
      minWidth: 120,
      slots: { default: 'createuser' },
    },
    {
      field: 'total_count',
      title: '数量',
      formatter: ({ cellValue }) => erpNumberFormatter(cellValue, 3),
      minWidth: 120,
    },
    {
      title: '操作',
      width: 'auto',
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

export function useOrderGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'no',
      label: '订单单号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入订单单号',
        allowClear: true,
      },
    },
    {
      fieldName: 'product_id',
      label: '产品',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择产品',
        allowClear: true,
        showSearch: true,
        api: getProductSimpleList,
        labelField: 'name',
        valueField: 'id',
      },
    },
    {
      fieldName: 'order_time',
      label: '订单时间',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        allowClear: true,
      },
    },
  ];
}

export function useOrderGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'radio', width: 50, fixed: 'left' },
    { field: 'no', title: '订单单号', width: 200, fixed: 'left' },
    {
      field: 'remark',
      title: '产品信息',
      showOverflow: 'tooltip',
      minWidth: 120,
    },
    {
      field: 'supplier_id',
      title: '供应商',
      minWidth: 120,
      slots: { default: 'supplier_id' },
    },
    {
      field: 'order_time',
      title: '订单时间',
      width: 160,
      formatter: 'formatDate',
    },
    {
      field: 'createuser',
      title: '创建人',
      minWidth: 120,
    },
    {
      field: 'total_count',
      title: '计划数量',
      formatter: 'formatAmount3',
      minWidth: 120,
    },
    {
      field: 'in_count',
      title: '历史累计入库',
      formatter: 'formatAmount3',
      minWidth: 120,
    },
    {
      field: 'return_count',
      title: '历史累计退货',
      formatter: 'formatAmount3',
      minWidth: 120,
    },
  ];
}
