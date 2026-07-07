import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { erpNumberFormatter } from '@vben/utils';

import { getCustomerSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';
import { getRangePickerDefaultProps } from '#/utils';

import { useDataTablePermission } from '../../shared/useDataTablePermission';

export const SALE_RETURN_STATUS_META_MAP: Record<
  number,
  { label: string; tagType?: 'danger' | 'info' | 'success' | 'warning' }
> = {
  10: { label: '待审批', tagType: 'warning' },
  20: { label: '审核通过', tagType: 'success' },
  30: { label: '审核不通过', tagType: 'danger' },
};

export const SALE_RETURN_INVOICE_STATUS_META_MAP: Record<
  number,
  { label: string; tagType?: 'danger' | 'info' | 'success' | 'warning' }
> = {
  0: { label: '不可开票', tagType: 'info' },
  1: { label: '待开票', tagType: 'warning' },
  10: { label: '未开票', tagType: 'info' },
  20: { label: '部分开票', tagType: 'warning' },
  30: { label: '待生成发票', tagType: 'success' },
  40: { label: '开票申请中', tagType: 'warning' },
  41: { label: '申请驳回', tagType: 'danger' },
  42: { label: '申请已取消', tagType: 'info' },
  50: { label: '待生成发票', tagType: 'warning' },
  51: { label: '开票中', tagType: 'warning' },
  52: { label: '开票失败', tagType: 'danger' },
  53: { label: '已开票待发送', tagType: 'info' },
  60: { label: '已发送待签收', tagType: 'info' },
  61: { label: '已签收', tagType: 'success' },
  70: { label: '已作废', tagType: 'info' },
  71: { label: '红冲申请中', tagType: 'warning' },
  72: { label: '红冲失败', tagType: 'danger' },
  73: { label: '部分红冲', tagType: 'warning' },
  74: { label: '已红冲', tagType: 'info' },
  90: { label: '关联异常', tagType: 'danger' },
  91: { label: '金额异常', tagType: 'danger' },
  92: { label: '状态冲突', tagType: 'danger' },
};

export function getSaleReturnStatusMeta(status: unknown) {
  if (status === undefined || status === null || status === '') return null;
  const n = typeof status === 'number' ? status : Number(status);
  return SALE_RETURN_STATUS_META_MAP[n] ?? null;
}

export function getSaleReturnInvoiceStatusMeta(status: unknown) {
  if (status === undefined || status === null || status === '') return null;
  const n = typeof status === 'number' ? status : Number(status);
  return SALE_RETURN_INVOICE_STATUS_META_MAP[n] ?? null;
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
      fieldName: 'refund_price',
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
      fieldName: 'invoice_status',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'status',
      component: 'Input',
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
      label: '来源销售订单（可选）',
      component: 'Input',
      formItemClass: 'col-span-1',
      componentProps: {
        placeholder: '可选择来源销售订单，也可不关联来源单手工退货',
        disabled: true,
      },
    },
    {
      fieldName: 'warehouse_id',
      label: '执行仓库',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '有关联来源单时由明细仓库自动带出；无源时在明细中手工选择',
        api: getWarehouseSimpleList,
        labelField: 'name',
        valueField: 'rowid',
        showSearch: true,
        class: '!w-full',
        disabled: true,
      },
    },
    {
      fieldName: 'return_time',
      label: '退货时间',
      component: 'DatePicker',
      componentProps: {
        placeholder: '选择退货时间',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        class: '!w-full',
        disabled:
          formType === 'detail' || isPer('fd:edit', 'return_time', formType),
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
      label: '退货产品清单',
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

/** 表单的明细表格列 */
export function useFormItemColumns(
  formData?: any[],
  _disabled?: boolean,
): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', minWidth: 50, fixed: 'left' },
    {
      field: 'warehouse_id',
      title: '仓库名称',
      minWidth: 200,
      slots: { header: 'warehouse_id_header', default: 'warehouse_id' },
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
    {
      field: 'product_bar_code',
      title: '条码',
      minWidth: 120,
    },
    {
      field: 'product_unit_name',
      title: '单位',
      minWidth: 80,
    },
    {
      field: 'product_unit_id',
      title: '单位',
      visible: false,
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 150,
      slots: { default: 'remark' },
    },
    {
      field: 'total_count',
      title: '产品数量',
      formatter: 'formatAmount3',
      minWidth: 120,
      fixed: 'right',
      visible: formData && formData[0]?.total_count !== undefined,
    },
    {
      field: 'out_count',
      title: '已出库',
      formatter: 'formatAmount3',
      minWidth: 120,
      fixed: 'right',
      visible:
        formData &&
        (formData[0]?.out_count !== undefined || formData[0]?.outCount !== undefined),
    },
    {
      field: 'return_count',
      title: '已退货',
      formatter: 'formatAmount3',
      minWidth: 120,
      fixed: 'right',
      visible:
        formData &&
        (formData[0]?.return_count !== undefined ||
          formData[0]?.returnCount !== undefined),
    },
    {
      field: 'count',
      title: '本次退货数量',
      minWidth: 120,
      fixed: 'right',
      slots: { header: 'count_header', default: 'count' },
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

/** 列表的搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'no',
      label: '退货单号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入退货单号',
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
      fieldName: 'return_time',
      label: '退货时间',
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

/** 列表的字段 */
export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'checkbox',
      width: 50,
      fixed: 'left',
    },
    {
      field: 'no',
      title: '退货单号',
      width: 150,
      fixed: 'left',
    },
    {
      field: 'status',
      title: '退货状态',
      minWidth: 100,
      slots: { default: 'status' },
    },
    {
      field: 'invoice_status',
      title: '开票状态',
      minWidth: 100,
      slots: { default: 'invoice_status' },
    },
    {
      field: 'customer_id',
      title: '客户',
      minWidth: 120,
      slots: { default: 'customer_id' },
    },
    {
      field: 'sale_user_id',
      title: '销售人员',
      minWidth: 120,
      slots: { default: 'sale_user_id' },
    },
    {
      field: 'return_time',
      title: '退货时间',
      width: 160,
      formatter: 'formatDate',
    },
    {
      field: 'total_count',
      title: '合计数量',
      minWidth: 100,
      formatter: 'formatAmount3',
    },
    {
      field: 'creator',
      title: '创建者',
      minWidth: 100,
    },
    {
      field: 'create_time',
      title: '创建时间',
      width: 160,
      formatter: 'formatDate',
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 150,
      showOverflow: 'tooltip',
    },
    {
      title: '操作',
      width: 260,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
