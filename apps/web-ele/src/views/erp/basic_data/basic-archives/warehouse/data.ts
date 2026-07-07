import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpWarehouseApi } from '#/api/erp/stock/warehouse';

import { CommonStatusEnum, DICT_TYPE } from '@vben/constants';
import { getDictOptions } from '@vben/hooks';

import { z } from '#/adapter/form';

/** 新增/修改的表单 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'rowid',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'name',
      label: '仓库名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入仓库名称',
      },
      rules: 'required',
    },
    {
      fieldName: 'address',
      label: '仓库地址',
      component: 'Input',
      componentProps: {
        placeholder: '请输入仓库地址',
      },
    },
    {
      fieldName: 'status',
      label: '开启状态',
      component: 'Switch',
      componentProps: {
        activeValue: CommonStatusEnum.ENABLE,
        inactiveValue: CommonStatusEnum.DISABLE,
      },
      rules: z.number().default(CommonStatusEnum.ENABLE),
    },
    {
      fieldName: 'default_status',
      label: '是否默认',
      component: 'Switch',
      componentProps: {
        activeValue: 1,
        inactiveValue: 0,
      },
    },
    {
      fieldName: 'warehouse_price',
      label: '仓储费(元)',
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入仓储费，单位：元/天/KG',
        min: 0,
        precision: 2,
        controlsPosition: 'right',
        class: '!w-full',
      },
    },
    {
      fieldName: 'truckage_price',
      label: '搬运费(元)',
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入搬运费，单位：元',
        min: 0,
        precision: 2,
        controlsPosition: 'right',
        class: '!w-full',
      },
    },
    {
      fieldName: 'principal',
      label: '负责人',
      component: 'Input',
      componentProps: {
        placeholder: '请输入负责人',
      },
    },
    {
      fieldName: 'sort',
      label: '排序',
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入排序',
        precision: 0,
        controlsPosition: 'right',
        class: '!w-full',
      },
      rules: 'required',
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入备注',
      },
    },
  ];
}

/** 搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'name',
      label: '仓库名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入仓库名称',
        allowClear: true,
      },
    },
    {
      fieldName: 'status',
      label: '仓库状态',
      component: 'Select',
      componentProps: {
        placeholder: '请选择仓库状态',
        allowClear: true,
        options: getDictOptions(DICT_TYPE.COMMON_STATUS, 'number'),
      },
    },
  ];
}

/** 列表的字段 */
export function useGridColumns(
  onStatusChange?: (
    newStatus: number,
    row: ErpWarehouseApi.Warehouse,
  ) => PromiseLike<boolean | undefined>,
  onDefaultStatusChange?: (
    newStatus: number,
    row: ErpWarehouseApi.Warehouse,
  ) => PromiseLike<boolean | undefined>,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'name',
      title: '仓库名称',
      minWidth: 150,
    },
    {
      field: 'address',
      title: '仓库地址',
      minWidth: 200,
      showOverflow: 'tooltip',
    },
    {
      field: 'warehouse_price',
      title: '仓储费',
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'truckage_price',
      title: '搬运费',
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'principal',
      title: '负责人',
      minWidth: 100,
    },
    {
      field: 'sort',
      title: '排序',
      minWidth: 80,
    },
    {
      field: 'status',
      title: '状态',
      minWidth: 100,
      cellRender: {
        attrs: { beforeChange: onStatusChange },
        name: 'CellSwitch',
        props: {
          activeValue: CommonStatusEnum.ENABLE,
          inactiveValue: CommonStatusEnum.DISABLE,
        },
      },
    },
    {
      field: 'default_status',
      title: '是否默认',
      minWidth: 100,
      cellRender: {
        attrs: {
          beforeChange: (newStatus: number, row: ErpWarehouseApi.Warehouse) => {
            return onDefaultStatusChange?.(newStatus, row);
          },
        },
        name: 'CellSwitch',
        props: {
          activeValue: 1,
          inactiveValue: 0,
        },
      },
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 150,
      showOverflow: 'tooltip',
    },
    {
      field: 'createtime',
      title: '创建时间',
      minWidth: 180,
      formatter: 'formatDateTime',
    },
    {
      title: '操作',
      width: 130,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
