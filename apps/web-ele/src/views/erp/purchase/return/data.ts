import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { DICT_TYPE } from '@vben/constants';
import { getDictOptions } from '@vben/hooks';
import { erpNumberFormatter } from '@vben/utils';

import { getProductSimpleList } from '#/api/crm/product';
import { getSupplierSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';
import { getRangePickerDefaultProps } from '#/utils';

export function useFormSchema(
  formType: string,
  formValue?: any,
): VbenFormSchema[] {
  const hasSourceOrder = Boolean(formValue?.order_id || formValue?.order_no);
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
      fieldName: 'account_id',
      component: 'ApiSelect',
      componentProps: {
        api: getAccountSimpleList,
        labelField: 'name',
        valueField: 'rowid',
      },
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'discount_percent',
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        class: '!w-full',
      },
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'discount_price',
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        class: '!w-full',
      },
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'other_price',
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        class: '!w-full',
      },
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'total_price',
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        class: '!w-full',
      },
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'total_product_price',
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        class: '!w-full',
      },
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'total_tax_price',
      component: 'InputNumber',
      componentProps: {
        precision: 2,
        class: '!w-full',
      },
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'no',
      label: '退货单号',
      component: 'Input',
      componentProps: {
        placeholder: '系统自动生成',
        disabled: true,
      },
    },
    {
      fieldName: 'order_no',
      label: '来源采购订单（可选）',
      component: 'Input',
      formItemClass: 'col-span-1',
      componentProps: {
        placeholder: '可选择来源采购订单，也可不关联来源单手工退货',
        disabled: true,
      },
    },
    {
      fieldName: 'warehouse_id',
      label: '执行仓库',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '有关联来源单时由明细仓库自动带出；无源时在明细中手工选择',
        allowClear: true,
        showSearch: true,
        api: getWarehouseSimpleList,
        labelField: 'name',
        valueField: 'rowid',
        disabled: true,
      },
    },
    {
      fieldName: 'return_time',
      label: '退货时间',
      component: 'DatePicker',
      componentProps: {
        disabled: formType === 'detail',
        placeholder: '选择退货时间',
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
        disabled: formType === 'detail' || hasSourceOrder,
        placeholder: hasSourceOrder ? '来源订单自动带出供应商' : '请选择供应商',
        allowClear: !hasSourceOrder,
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
        show: (values) => !!values?.id && formType !== 'detail',
      },
    },
  ];
}

export function useFormItemColumns(
  formData?: any[],
  _disabled?: boolean,
): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', minWidth: 50 },
    {
      field: 'warehouse_id',
      title: '仓库名称',
      minWidth: 200,
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
    {
      field: 'remark',
      title: '备注',
      minWidth: 150,
      slots: { default: 'remark' },
    },
    {
      field: 'in_count',
      title: '已入库',
      formatter: 'formatAmount3',
      minWidth: 120,
      visible:
        formData &&
        (formData[0]?.inCount !== undefined ||
          formData[0]?.in_count !== undefined),
    },
    {
      field: 'return_count',
      title: '已退货',
      formatter: 'formatAmount3',
      minWidth: 120,
      visible:
        formData &&
        (formData[0]?.returnCount !== undefined ||
          formData[0]?.return_count !== undefined),
    },
    {
      field: 'count',
      title: '本次退货数量',
      minWidth: 120,
      slots: { default: 'count' },
    },
    {
      field: 'product_price',
      title: '产品单价',
      minWidth: 120,
      slots: { default: 'product_price' },
    },
    {
      field: 'total_product_price',
      title: '产品金额',
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
      title: '合计金额',
      minWidth: 120,
      formatter: 'formatAmount2',
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
      fieldName: 'no',
      label: '退货单号',
      component: 'Input',
      componentProps: { placeholder: '请输入退货单号', allowClear: true },
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
        labelField: 'product_name',
        valueField: 'rowid',
      },
    },
    {
      fieldName: 'return_time',
      label: '退货时间',
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
        resultField: 'list',
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
        valueField: 'id',
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
      fieldName: 'order_no',
      label: '来源采购订单',
      component: 'Input',
      componentProps: { placeholder: '请输入来源采购订单号', allowClear: true },
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
    { field: 'no', title: '采购退货单号', width: 200, fixed: 'left' },
    {
      field: 'remark',
      title: '退货产品信息',
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
      field: 'account_id',
      title: '结算账户',
      minWidth: 120,
      slots: { default: 'account_id' },
    },
    {
      field: 'return_time',
      title: '退货时间',
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
      title: '总数量',
      formatter: 'formatAmount3',
      minWidth: 120,
    },
    {
      field: 'total_price',
      title: '应退金额',
      formatter: 'formatAmount2',
      minWidth: 120,
    },
    {
      field: 'refund_price',
      title: '已退金额',
      formatter: 'formatAmount2',
      minWidth: 120,
    },
    {
      field: 'un_refund_price',
      title: '未退金额',
      formatter: ({ row }) =>
        `${erpNumberFormatter(row.total_price - row.refund_price, 2)}元`,
      minWidth: 120,
    },
    {
      field: 'status',
      title: '审批状态',
      minWidth: 120,
      cellRender: {
        name: 'CellDict',
        props: { type: DICT_TYPE.ERP_AUDIT_STATUS },
      },
    },
    {
      title: '操作',
      width: 260,
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
      componentProps: { placeholder: '请输入订单单号', allowClear: true },
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
        labelField: 'product_name',
        valueField: 'rowid',
      },
    },
    {
      fieldName: 'order_time',
      label: '订单时间',
      component: 'RangePicker',
      componentProps: { ...getRangePickerDefaultProps(), allowClear: true },
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
    { field: 'createuser', title: '创建人', minWidth: 120 },
    {
      field: 'total_count',
      title: '总数量',
      formatter: 'formatAmount3',
      minWidth: 120,
    },
    {
      field: 'in_count',
      title: '已入库数量',
      formatter: 'formatAmount3',
      minWidth: 120,
    },
    {
      field: 'return_count',
      title: '已退货数量',
      formatter: 'formatAmount3',
      minWidth: 120,
    },
    {
      field: 'total_product_price',
      title: '金额合计',
      formatter: 'formatAmount2',
      minWidth: 120,
    },
    {
      field: 'total_price',
      title: '含税金额',
      formatter: 'formatAmount2',
      minWidth: 120,
    },
  ];
}
