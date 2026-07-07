import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { h } from 'vue';

import { ElTag } from 'element-plus';

import { getSaleReturnStatusMeta } from '#/views/erp/sale/return/data';

export function getSaleReturnStatusLabel(status: unknown) {
  const meta = getSaleReturnStatusMeta(status);
  return (
    meta?.label ??
    (status === undefined || status === null || status === ''
      ? '-'
      : String(status))
  );
}

export function createSaleReturnSelectDialogColumns(options: {
  getAccountLabel: (accountId: unknown) => string;
  getCustomerLabel: (customerId: unknown) => string;
}): VxeTableGridOptions['columns'] {
  return [
    { type: 'radio', width: 50 },
    { type: 'seq', width: 60, title: '#' },
    { field: 'no', title: '退货单号', minWidth: 160 },
    {
      field: 'return_time',
      title: '退货时间',
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'customer_id',
      title: '客户',
      minWidth: 160,
      formatter: ({ row }: any) => options.getCustomerLabel(row.customer_id),
    },
    {
      field: 'account_id',
      title: '结算账户',
      minWidth: 160,
      formatter: ({ row }: any) => options.getAccountLabel(row.account_id),
    },
    { field: 'order_no', title: '销售订单号', minWidth: 160 },
    { field: 'total_count', title: '数量', minWidth: 100 },
    { field: 'total_price', title: '金额', minWidth: 100 },
    { field: 'refund_price', title: '已退款', minWidth: 100 },
    { field: 'total_tax_price', title: '税额', minWidth: 100 },
    {
      field: 'status',
      title: '状态',
      minWidth: 120,
      slots: {
        default: ({ row }: any) => {
          const meta = getSaleReturnStatusMeta(row.status);
          if (!meta) return getSaleReturnStatusLabel(row.status);
          return h(
            ElTag,
            {
              type: meta.tagType as any,
            },
            () => getSaleReturnStatusLabel(row.status),
          );
        },
      },
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 160,
      showOverflow: 'tooltip',
    },
  ];
}

export function useDetailColumns(
  redelony?: boolean,
): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', width: 60, title: '#', fixed: 'left' },
    {
      field: 'product_id',
      title: '商品',
      minWidth: 220,
      slots: { default: 'product_id' },
    },
    {
      field: 'product_num',
      title: '本次申请',
      minWidth: 120,
      slots: { default: 'product_num' },
    },

    {
      field: 'invoice_amount',
      title: '未税金额',
      minWidth: 140,
      // slots: { default: 'invoice_amount' },
    },
    // {
    //   field: 'tax_rate',
    //   title: '税率(%)',
    //   minWidth: 120,
    //   // slots: { default: 'tax_rate' },
    // },
    {
      field: 'tax_amount',
      title: '税额',
      minWidth: 140,
      slots: { default: 'tax_amount' },
    },
    {
      field: 'total_amount',
      title: '价税合计',
      minWidth: 140,
      slots: { default: 'total_amount' },
    },
    {
      field: 'invoice_content',
      title: '备注',
      minWidth: 200,

      slots: { default: 'invoice_content' },
    },
    {
      title: '操作',
      width: 90,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
