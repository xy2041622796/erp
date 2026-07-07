import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { erpPriceInputFormatter } from '@vben/utils';

import { z } from '#/adapter/form';
import { getSupplierSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getSimpleUserList } from '#/api/system/user';
import { getRangePickerDefaultProps } from '#/utils';

export const PURCHASE_ORDER_STATUS_META_MAP: Record<
  number,
  { label: string; tagType?: 'danger' | 'info' | 'success' | 'warning' }
> = {
  10: { label: '待审批', tagType: 'warning' },
  20: { label: '审核通过', tagType: 'success' },
  30: { label: '审核不通过', tagType: 'danger' },
};

export function getPurchaseOrderStatusMeta(status: unknown) {
  if (status === undefined || status === null || status === '') return null;
  const n = typeof status === 'number' ? status : Number(status);
  return PURCHASE_ORDER_STATUS_META_MAP[n] ?? null;
}

export function useFormSchema(formType: string): VbenFormSchema[] {
  return [
    {
      fieldName: 'id',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'total_count',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'total_product_price',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'no',
      label: '订单单号',
      component: 'Input',
      componentProps: { placeholder: '系统自动生成', disabled: true },
    },
    {
      fieldName: 'order_time',
      label: '订单时间',
      component: 'DatePicker',
      componentProps: {
        placeholder: '选择订单时间',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        class: '!w-full',
      },
      rules: 'required',
    },
    {
      label: '供应商',
      fieldName: 'supplier_id',
      component: 'Slot',
      rules: 'required',
    },
    {
      label: '采购人员',
      fieldName: 'purchase_user_id',
      component: 'Slot',
      rules: 'required',
    },
    {
      fieldName: 'items',
      label: '',
      component: 'Input',
      formItemClass: 'col-span-3',
    },
    {
      fieldName: 'discount_percent',
      label: '优惠率(%)',
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入优惠率',
        min: 0,
        max: 100,
        precision: 2,
        controlsPosition: 'right',
        class: '!w-full',
      },
      rules: z.number().min(0).optional(),
    },
    {
      fieldName: 'discount_price',
      label: '付款优惠',
      component: 'InputNumber',
      componentProps: {
        placeholder: '付款优惠',
        precision: 2,
        formatter: erpPriceInputFormatter,
        disabled: true,
        controlsPosition: 'right',
        class: '!w-full',
      },
    },
    {
      fieldName: 'total_price',
      label: '优惠后金额',
      component: 'InputNumber',
      componentProps: {
        placeholder: '优惠后金额',
        precision: 2,
        formatter: erpPriceInputFormatter,
        disabled: true,
        controlsPosition: 'right',
        class: '!w-full',
      },
    },
    {
      fieldName: 'account_id',
      label: '结算账户',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择结算账户',
        allowClear: true,
        showSearch: true,
        api: getAccountSimpleList,
        labelField: 'product_name',
        valueField: 'rowid',
      },
    },
    {
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入支付订金',
        precision: 2,
        min: 0,
        controlsPosition: 'right',
        class: '!w-full',
      },
      fieldName: 'deposit_price',
      label: '支付订金',
      rules: z.number().min(0).optional(),
    },
  ];
}

export function useFormItemColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', minWidth: 50 },
    { field: 'id', title: '唯一值', minWidth: 200, visible: false },
    {
      field: 'product_id',
      title: '产品名称',
      minWidth: 200,
      slots: { default: 'product_id' },
    },
    {
      field: 'warehouse_id',
      title: '分配仓库',
      minWidth: 160,
      slots: { default: 'warehouse_id' },
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 150,
      slots: { default: 'remark' },
    },
    {
      field: 'count',
      title: '数量',
      minWidth: 120,
      slots: { default: 'count' },
    },
    {
      field: 'product_price',
      title: '采购单价（含税）',
      minWidth: 120,
      slots: { default: 'product_price' },
    },
    {
      field: 'total_product_price',
      title: '未税金额',
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'tax_percent',
      title: '税率(%)',
      minWidth: 105,
      slots: { default: 'tax_percent' },
    },
    {
      field: 'tax_price',
      title: '税额',
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'total_price',
      title: '含税合计',
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'no',
      label: '订单单号',
      component: 'Input',
      componentProps: { placeholder: '请输入订单单号', allowClear: true },
    },
    {
      fieldName: 'order_time',
      label: '订单时间',
      component: 'RangePicker',
      componentProps: { ...getRangePickerDefaultProps(), allowClear: true },
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
      fieldName: 'creator',
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
        options: [
          { label: '待审批', value: 10 },
          { label: '审核通过', value: 20 },
          { label: '审核不通过', value: 30 },
        ],
        placeholder: '请选择审批状态',
        allowClear: true,
      },
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Input',
      componentProps: { placeholder: '请输入备注', allowClear: true },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { field: 'no', title: '订单号', width: 200, fixed: 'left' },
    {
      field: 'status',
      title: '审批状态',
      minWidth: 120,
      slots: { default: 'status' },
    },
    {
      field: 'supplier_id',
      title: '供应商',
      minWidth: 120,
      slots: { default: 'supplier_id' },
    },
    {
      field: 'account_id',
      title: '结算账户',
      minWidth: 120,
      slots: { default: 'account_id' },
    },
    {
      field: 'order_time',
      title: '下单时间',
      width: 160,
      formatter: 'formatDate',
    },
    {
      field: 'total_count',
      title: '总数量',
      formatter: 'formatAmount3',
      minWidth: 100,
    },
    {
      field: 'in_count',
      title: '已入库数量',
      formatter: 'formatAmount3',
      minWidth: 120,
    },
    {
      field: 'return_count',
      title: '退货数量',
      formatter: 'formatAmount3',
      minWidth: 120,
    },
    {
      field: 'total_product_price',
      title: '合计产品价格',
      formatter: 'formatAmount2',
      minWidth: 130,
    },
    {
      field: 'discount_percent',
      title: '优惠率(%)',
      minWidth: 100,
      formatter: 'formatAmount3',
    },
    {
      field: 'discount_price',
      title: '付款优惠',
      formatter: 'formatAmount2',
      minWidth: 120,
    },
    {
      field: 'deposit_price',
      title: '支付订金',
      formatter: 'formatAmount2',
      minWidth: 120,
    },
    {
      field: 'total_price',
      title: '优惠后金额',
      formatter: 'formatAmount2',
      minWidth: 120,
    },
    {
      field: 'creator_name',
      title: '创建人',
      minWidth: 120,
      slots: { default: 'creator_name' },
    },
    {
      field: 'create_time',
      title: '创建时间',
      width: 160,
      formatter: 'formatDate',
    },
    {
      title: '操作',
      width: 220,
      slots: { default: 'actions' },
    },
  ];
}
