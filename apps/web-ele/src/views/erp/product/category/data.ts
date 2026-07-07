import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpProductCategoryApi } from '#/api/erp/product/category';

import { CommonStatusEnum } from '@vben/constants';

import { z } from '#/adapter/form';
import { getProductCategorySimpleList } from '#/api/erp/product/category';

const CATEGORY_STATUS_OPTIONS = [
  { label: '开启', value: CommonStatusEnum.ENABLE },
  { label: '禁用', value: CommonStatusEnum.DISABLE },
];

/** 新增/修改的表单 */
export function useFormSchema(): VbenFormSchema[] {
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
      fieldName: 'parent_id',
      label: '上级分类',
      component: 'ApiTreeSelect',
      componentProps: {
        allowClear: true,
        api: async () => {
          const data = await getProductCategorySimpleList();
          return [
            {
              id: '000000',
              name: '顶级分类',
              children: Array.isArray(data) ? data : [],
            },
          ];
        },
        labelField: 'name',
        valueField: 'id',
        childrenField: 'children',
        placeholder: '请选择上级分类',
        treeDefaultExpandAll: true,
      },
      rules: 'selectRequired',
    },
    {
      fieldName: 'name',
      label: '分类名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入分类名称',
      },
      rules: 'required',
    },
    {
      fieldName: 'code',
      label: '分类编码',
      component: 'Input',
      componentProps: {
        placeholder: '请输入分类编码',
      },
      rules: 'required',
    },
    {
      fieldName: 'sort',
      label: '显示顺序',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        placeholder: '请输入显示顺序',
        controlsPosition: 'right',
        class: '!w-full',
      },
      rules: 'required',
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'RadioGroup',
      componentProps: {
        options: CATEGORY_STATUS_OPTIONS,
      },
      rules: z.number().default(CommonStatusEnum.ENABLE),
    },
  ];
}

/** 查询表单 */
export function useQueryFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: '分类名称',
      componentProps: {
        placeholder: '请输入分类名称',
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: '开启状态',
      componentProps: {
        options: CATEGORY_STATUS_OPTIONS,
        placeholder: '请选择开启状态',
        allowClear: true,
      },
    },
  ];
}

/** 列表的字段 */
export function useGridColumns(): VxeTableGridOptions<ErpProductCategoryApi.ProductCategory>['columns'] {
  return [
    {
      field: 'name',
      title: '分类名称',
      align: 'left',
      treeNode: true,
    },
    {
      field: 'code',
      title: '分类编码',
    },
    {
      field: 'sort',
      title: '显示顺序',
    },
    {
      field: 'status',
      title: '分类状态',
      formatter: ({ cellValue }) => {
        if (Number(cellValue) === CommonStatusEnum.ENABLE) {
          return '开启';
        }
        if (Number(cellValue) === CommonStatusEnum.DISABLE) {
          return '禁用';
        }
        return '-';
      },
    },
    {
      field: 'createtime',
      title: '创建时间',
      formatter: 'formatDateTime',
    },
    {
      title: '操作',
      width: 220,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
