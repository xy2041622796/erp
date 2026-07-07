import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { DescriptionItemSchema } from '#/components/description';

import { erpPriceInputFormatter, formatDateTime } from '@vben/utils';

import { z } from '#/adapter/form';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getSimpleUserList } from '#/api/system/user';
import { getRangePickerDefaultProps } from '#/utils';

import { useDataTablePermission } from '../../shared/useDataTablePermission';

export const SALE_ORDER_STATUS_META_MAP: Record<
  number,
  { label: string; tagType?: 'danger' | 'info' | 'success' | 'warning' }
> = {
  10: { label: '未出库', tagType: 'warning' },
  20: { label: '全部出库', tagType: 'success' },
  30: { label: '部分出库', tagType: 'info' },
};

export function getSaleOrderStatusMeta(status: unknown) {
  if (status === undefined || status === null || status === '') return null;
  const n = typeof status === 'number' ? status : Number(status);
  return SALE_ORDER_STATUS_META_MAP[n] ?? null;
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
      fieldName: 'no',
      label: '销售单号',
      component: 'Input',
      componentProps: {
        placeholder: '系统自动生成',
        disabled: true,
      },
    },
    {
      fieldName: 'order_time',
      label: '下单时间',
      component: 'DatePicker',
      componentProps: {
        placeholder: '选择下单时间',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        class: '!w-full',
        disabled:
          formType === 'detail' || isPer('fd:edit', 'order_time', formType),
      },
      rules: 'required',
    },
    {
      fieldName: 'customer_id',
      label: '客户',
      component: 'Slot',
      rules: 'required',
    },
    {
      fieldName: 'sale_user_id',
      label: '销售人员',
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
        class: '!w-full',
        disabled:
          formType === 'detail' ||
          isPer('fd:edit', 'discount_percent', formType),
      },
      rules: z.number().min(0).optional(),
    },
    {
      fieldName: 'discount_price',
      label: '付款优惠',
      component: 'InputNumber',
      componentProps: {
        placeholder: '收款优惠',
        precision: 2,
        formatter: erpPriceInputFormatter,
        disabled:
          formType === 'detail' || isPer('fd:edit', 'discount_price', formType),
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
        disabled:
          formType === 'detail' || isPer('fd:edit', 'total_price', formType),
        class: '!w-full',
      },
    },
    {
      fieldName: 'account_id',
      label: '结算账户',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择结算账户',
        api: getAccountSimpleList,
        labelField: 'name',
        valueField: 'rowid',
        showSearch: true,
        class: '!w-full',
        disabled:
          formType === 'detail' || isPer('fd:edit', 'account_id', formType),
      },
    },
    {
      fieldName: 'deposit_price',
      label: '收取订金',
      component: 'InputNumber',
      dependencies: {
        triggerFields: ['total_price'],
        componentProps: (values) => ({
          max: values?.total_price ?? Number.MAX_SAFE_INTEGER,
        }),
      },
      componentProps: {
        placeholder: '请输入收取订金',
        precision: 2,
        min: 0,
        class: '!w-full',
        max: formValue?.total_price ?? Number.MAX_SAFE_INTEGER,
        disabled:
          formType === 'detail' || isPer('fd:edit', 'deposit_price', formType),
      },
      rules: z
        .number()
        .min(0)
        .max(
          formValue?.total_price ?? Number.MAX_SAFE_INTEGER,
          '收取定金不能大于优惠后金额',
        )
        .optional(),
    },
  ];
}

export function useDetailSchema(
  customerList: any[] = [],
  accountList: any[] = [],
  userList: any[] = [],
): DescriptionItemSchema[] {
  return [
    { field: 'no', label: '销售单号' },
    {
      field: 'customer_id',
      label: '客户',
      render: (val) => customerList.find((item) => item.id === val)?.name || val,
    },
    {
      field: 'sale_user_id',
      label: '销售员',
      render: (val) =>
        userList.find((item) => item.ROWID === val)?.UserName || val,
    },
    {
      field: 'order_time',
      label: '单据日期',
      render: (val) => formatDateTime(val),
    },
    {
      field: 'payment_date',
      label: '付款日期',
      render: (val) => formatDateTime(val),
    },
    {
      field: 'delivery_date',
      label: '发货日期',
      render: (val) => formatDateTime(val),
    },
    { field: 'discount_percent', label: '优惠率(%)' },
    { field: 'discount_price', label: '付款优惠' },
    { field: 'total_price', label: '优惠后金额' },
    {
      field: 'account_id',
      label: '结算账户',
      render: (val) => accountList.find((item) => item.rowid === val)?.name || val,
    },
    { field: 'deposit_price', label: '收取订金' },
    {
      field: 'status',
      label: '出库状态',
      render: (val) => getSaleOrderStatusMeta(val)?.label || val,
    },
  ];
}

export function useDetailItemColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', minWidth: 50 },
    { field: 'product_name', title: '产品名称', minWidth: 200 },
    { field: 'remark', title: '备注', minWidth: 150 },
    { field: 'count', title: '数量', minWidth: 120 },
    {
      field: 'product_price',
      title: '单价（含税）',
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'total_product_price',
      title: '未税金额',
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    { field: 'tax_percent', title: '税率(%)', minWidth: 105 },
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
  ];
}

export function useFormItemColumns(
  disabled: boolean,
): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', minWidth: 50 },
    {
      field: 'product_id',
      title: '产品名称',
      minWidth: 200,
      slots: { header: 'product_id_header', default: 'product_id' },
    },
    {
      field: 'warehouse_id',
      title: '分配仓库',
      minWidth: 160,
      slots: { header: 'warehouse_id_header', default: 'warehouse_id' },
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
      slots: { header: 'count_header', default: 'count' },
    },
    {
      field: 'product_price',
      title: '销售单价（含税）',
      minWidth: 120,
      slots: { header: 'product_price_header', default: 'product_price' },
    },
    {
      field: 'total_product_price',
      title: '产品金额（未税）',
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
      width: 'auto',
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
      label: '订单号',
      component: 'Input',
      componentProps: { placeholder: '请输入订单号', allowClear: true },
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
      fieldName: 'order_time',
      label: '下单时间',
      component: 'RangePicker',
      componentProps: { ...getRangePickerDefaultProps(), allowClear: true },
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
    {
      fieldName: 'status',
      label: '出库状态',
      component: 'Select',
      componentProps: {
        options: [
          { label: '未出库', value: 10 },
          { label: '全部出库', value: 20 },
          { label: '部分出库', value: 30 },
        ],
        placeholder: '请选择出库状态',
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
      title: '出库状态',
      minWidth: 120,
      slots: { default: 'status' },
    },
    {
      field: 'customer_id',
      title: '客户',
      minWidth: 120,
      slots: { default: 'customer_id' },
    },
    {
      field: 'account_id',
      title: '结算账户',
      minWidth: 120,
      slots: { default: 'account_id' },
    },
    {
      field: 'sale_user_id',
      title: '销售人员',
      minWidth: 120,
      slots: { default: 'sale_user_id' },
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
      minWidth: 100,
      formatter: 'formatAmount3',
    },
    {
      field: 'out_count',
      title: '已出库数量',
      minWidth: 120,
      formatter: 'formatAmount3',
    },
    {
      field: 'return_count',
      title: '退货数量',
      minWidth: 120,
      formatter: 'formatAmount3',
    },
    {
      field: 'total_product_price',
      title: '合计产品价格',
      minWidth: 130,
      formatter: 'formatAmount2',
    },
    {
      field: 'total_tax_price',
      title: '合计税额',
      minWidth: 120,
      formatter: 'formatAmount2',
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
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'deposit_price',
      title: '收取订金',
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'total_price',
      title: '优惠后金额',
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    { field: 'creator_name', title: '创建人', minWidth: 120 },
    { field: 'create_time', title: '创建时间', width: 160, formatter: 'formatDate' },
    { title: '操作', width: 220, fixed: 'right', slots: { default: 'actions' } },
  ];
}

export function useGridColumnsSelected(): VxeTableGridOptions['columns'] {
  return [
    { type: 'radio', width: 50, fixed: 'left' },
    { field: 'no', title: '订单号', width: 200, fixed: 'left' },
    {
      field: 'status',
      title: '出库状态',
      minWidth: 120,
      slots: { default: 'status' },
    },
    {
      field: 'customer_id',
      title: '客户',
      minWidth: 120,
      slots: { default: 'customer_id' },
    },
    {
      field: 'account_id',
      title: '结算账户',
      minWidth: 120,
      slots: { default: 'account_id' },
    },
    {
      field: 'sale_user_id',
      title: '销售人员',
      minWidth: 120,
      slots: { default: 'sale_user_id' },
    },
    { field: 'order_time', title: '下单时间', width: 160, formatter: 'formatDate' },
    {
      field: 'total_count',
      title: '总数量',
      minWidth: 100,
      formatter: 'formatAmount3',
    },
    {
      field: 'out_count',
      title: '已出库数量',
      minWidth: 120,
      formatter: 'formatAmount3',
    },
    {
      field: 'return_count',
      title: '退货数量',
      minWidth: 120,
      formatter: 'formatAmount3',
    },
    {
      field: 'total_product_price',
      title: '合计产品价格',
      minWidth: 130,
      formatter: 'formatAmount2',
    },
    {
      field: 'total_tax_price',
      title: '合计税额',
      minWidth: 120,
      formatter: 'formatAmount2',
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
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'deposit_price',
      title: '收取订金',
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'total_price',
      title: '优惠后金额',
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    { field: 'creator_name', title: '创建人', minWidth: 120 },
    { field: 'create_time', title: '创建时间', width: 160, formatter: 'formatDate' },
  ];
}
