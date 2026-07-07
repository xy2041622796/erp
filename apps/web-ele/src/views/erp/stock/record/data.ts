import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getProductSimpleList } from '#/api/erp/product/product';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getRangePickerDefaultProps } from '#/utils';

export const STOCK_RECORD_BIZ_TYPE_OPTIONS = [
  { label: '入库类', value: 1 },
  { label: '出库类', value: 2 },
  { label: '盘盈', value: 3 },
  { label: '盘亏', value: 4 },
  { label: '期初库存', value: 99 },
];

const STOCK_RECORD_BIZ_TYPE_LABEL_MAP: Record<number, string> = {
  1: '入库类',
  2: '出库类',
  3: '盘盈',
  4: '盘亏',
  99: '期初库存',
};

async function getWarehouseSelectOptions() {
  const list = await getWarehouseSimpleList();
  return (Array.isArray(list) ? list : []).map((item: any) => ({
    ...item,
    warehouse_select_value: String(item?.id || item?.rowid || ''),
  }));
}

function getStockRecordCountValue(row: any) {
  const value = Number(row?.count ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getStockRecordBizCategoryByNo(row: any) {
  const bizNo = String(row?.biz_no || '')
    .trim()
    .toUpperCase();

  if (bizNo.startsWith('OPEN-STOCK')) return '期初录入';
  if (bizNo.startsWith('CGRK-')) return '采购入库';
  if (bizNo.startsWith('CGTH-')) return '采购退货';
  if (bizNo.startsWith('CK-')) return '销售出库';
  if (bizNo.startsWith('TH-')) return '销售退货';
  if (bizNo.startsWith('STH-')) return '销售退货入库';
  if (bizNo.startsWith('CTH-')) return '采购退货出库';
  if (bizNo.startsWith('RK-')) return '其它入库';
  if (bizNo.startsWith('QTCK-')) return '其它出库';

  const description = String(row?.description || '').trim();
  if (description.includes('盘盈')) return '盘盈';
  if (description.includes('盘亏')) return '盘亏';
  if (description.includes('期初')) return '期初录入';

  const bizType = Number(row?.biz_type);
  return STOCK_RECORD_BIZ_TYPE_LABEL_MAP[bizType] || '-';
}

function formatStockRecordCount(value: number) {
  if (value === 0) return '-';
  return String(Number(Math.abs(value).toFixed(3)));
}

/** 搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
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
      fieldName: 'warehouse_id',
      label: '仓库',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择仓库',
        allowClear: true,
        showSearch: true,
        api: getWarehouseSelectOptions,
        labelField: 'name',
        valueField: 'warehouse_select_value',
      },
    },
    {
      fieldName: 'biz_type',
      label: '类型',
      component: 'Select',
      componentProps: {
        placeholder: '请选择类型',
        allowClear: true,
        options: STOCK_RECORD_BIZ_TYPE_OPTIONS,
      },
    },
    {
      fieldName: 'biz_no',
      label: '业务单号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入业务单号',
        allowClear: true,
      },
    },
    {
      fieldName: 'biz_time',
      label: '出入库时间',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        allowClear: true,
      },
    },
  ];
}

/** 列表的字段 */
export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'product_id',
      title: '产品名称',
      minWidth: 150,
      slots: { default: 'product_id' },
    },
    {
      field: 'product_category_name',
      title: '产品分类',
      width: 120,
      slots: { default: 'product_category_name' },
    },
    {
      field: 'product_unit_name',
      title: '产品单位',
      width: 100,
      slots: { default: 'product_unit_name' },
    },
    {
      field: 'warehouse_id',
      title: '仓库',
      width: 120,
      slots: { default: 'warehouse_id' },
    },
    {
      field: 'stock_biz_category',
      title: '出入库类别',
      width: 130,
      formatter: ({ row }) => getStockRecordBizCategoryByNo(row),
    },
    {
      field: 'biz_no',
      title: '出入库单号',
      width: 200,
      showOverflow: 'tooltip',
      slots: { default: 'biz_no' },
    },
    {
      field: 'biz_time',
      title: '出入库日期',
      width: 180,
      formatter: 'formatDateTime',
    },
    {
      field: 'in_count',
      title: '入库数量',
      width: 120,
      align: 'right',
      formatter: ({ row }) => {
        const count = getStockRecordCountValue(row);
        return count > 0 ? formatStockRecordCount(count) : '-';
      },
    },
    {
      field: 'out_count',
      title: '出库数量',
      width: 120,
      align: 'right',
      formatter: ({ row }) => {
        const count = getStockRecordCountValue(row);
        return count < 0 ? formatStockRecordCount(count) : '-';
      },
    },
    {
      field: 'total_count',
      title: '库存量',
      width: 100,
      formatter: 'formatAmount3',
    },
    {
      field: 'operator_name',
      title: '操作人',
      width: 120,
      slots: { default: 'operator_name' },
    },
  ];
}
