import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { handleTree } from '@vben/utils';

import { z } from '#/adapter/form';
import { getSupplierSimpleList } from '#/api/erp/customer';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { uploadFile } from '#/api/infra/file';
import {
  getCateOfIn,
  getCateOfOut,
  getProdictType,
} from '#/api/system/dict/data';

export type ProductCategoryOption = {
  code?: string;
  id: string;
  name: string;
};

let cachedProductCategoryMap:
  | Map<number | string, ProductCategoryOption>
  | null
  | undefined;

export async function getProductCategoryMap() {
  if (cachedProductCategoryMap) {
    return cachedProductCategoryMap;
  }
  if (cachedProductCategoryMap === null) {
    return new Map<number | string, ProductCategoryOption>();
  }

  cachedProductCategoryMap = null;
  try {
    const data = await getProductCategorySimpleList();
    const map = new Map<number | string, ProductCategoryOption>();
    const walk = (items: any[]) => {
      for (const item of items || []) {
        if (item?.id !== null && item?.id !== undefined) {
          const option = {
            id: String(item.id),
            name: item?.name ?? item?.label ?? String(item.id),
            code: item?.code ?? '',
          };
          map.set(item.id, option);
          map.set(String(item.id), option);
        }
        if (Array.isArray(item?.children) && item.children.length > 0) {
          walk(item.children);
        }
      }
    };
    walk(Array.isArray(data) ? data : []);
    cachedProductCategoryMap = map;
    return map;
  } catch {
    cachedProductCategoryMap = new Map<
      number | string,
      ProductCategoryOption
    >();
    return cachedProductCategoryMap;
  }
}

export function clearProductCategoryCache() {
  cachedProductCategoryMap = undefined;
}

/** Tab1：基础信息 */
export function useFormSchemaBase(options?: {
  onCategoryChanged?: (
    category: null | ProductCategoryOption,
    formApi: any,
  ) => Promise<void> | void;
}): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'rowid',
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'product_code',
      label: '编码',
      component: 'Slot',
    },
    {
      fieldName: 'product_name',
      label: '名称',
      component: 'Input',
      rules: 'required',
      componentProps: { placeholder: '请输入产品名称' },
    },
    {
      fieldName: 'product_type',
      label: '分类名称',
      component: 'Input',
      componentProps: { placeholder: '分类名称' },
      dependencies: { triggerFields: [''], show: () => false },
    },
    {
      fieldName: 'barcode',
      label: '条码',
      component: 'Input',
      componentProps: { placeholder: '请输入条码' },
    },
    {
      fieldName: 'product_category_id',
      label: '分类',
      component: 'Slot',
      dependencies: {
        triggerFields: ['product_category_id'],
        async trigger(values, formApi) {
          const categoryId = values.product_category_id;
          if (
            categoryId === undefined ||
            categoryId === null ||
            categoryId === ''
          ) {
            await formApi.setFieldValue('product_type', undefined);
            await options?.onCategoryChanged?.(null, formApi);
            return;
          }
          const categoryMap = await getProductCategoryMap();
          const category = categoryMap.get(categoryId) ?? null;
          if (category?.name) {
            await formApi.setFieldValue('product_type', category.name);
          }
          await options?.onCategoryChanged?.(category, formApi);
        },
      },
    },
    {
      fieldName: 'default_warehouse_id',
      label: '默认仓库',
      component: 'Slot',
    },
    {
      fieldName: 'model',
      label: '规格型号',
      component: 'Input',
      componentProps: { placeholder: '请输入规格型号' },
    },
    {
      fieldName: 'unit',
      label: '单位',
      component: 'Input',
      componentProps: { placeholder: '如：个 / 件 / 箱' },
    },
    {
      fieldName: 'product_image',
      label: '图片',
      component: 'FileUpload',
      componentProps: {
        limit: 1,
        fileSize: 5,
        fileType: ['jpg', 'jpeg', 'png'],
        api: (file: File) => uploadFile({ file }),
      },
      formItemClass: 'col-span-2',
    },
    {
      label: '供应商',
      fieldName: 'manufacturer',
      component: 'ApiSelect',
      componentProps: {
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
      fieldName: 'launch_date',
      label: '上市日期',
      component: 'DatePicker',
      componentProps: {
        type: 'datetime',
        class: '!w-full',
        placeholder: '请选择上市日期',
      },
    },
    {
      label: '库存类型',
      fieldName: 'stock_type',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择供应商',
        allowClear: true,
        showSearch: true,
        api: getProdictType,
        labelField: 'txt',
        valueField: 'val',
      },
      rules: 'required',
    },
    {
      label: '默认支出类别',
      fieldName: 'defalut_expense_type',
      component: 'ApiSelect',
      defaultValue: 'OPERATING_COST',
      componentProps: {
        placeholder: '选择支出类别',
        allowClear: true,
        showSearch: true,
        api: getCateOfOut,
        labelField: 'txt',
        valueField: 'val',
      },
      rules: 'required',
    },
    {
      label: '默认收入类别',
      fieldName: 'default_income_type',
      component: 'ApiSelect',
      defaultValue: 'SALES_INCOME',
      componentProps: {
        placeholder: '选择收入类别',
        allowClear: true,
        showSearch: true,
        api: getCateOfIn,
        labelField: 'txt',
        valueField: 'val',
      },
      rules: 'required',
    },
    {
      fieldName: 'company_name',
      label: '归属公司',
      component: 'Input',
      componentProps: { placeholder: '公司名称（可选）' },
    },
    {
      fieldName: 'depart_name',
      label: '归属部门',
      component: 'Input',
      componentProps: { placeholder: '部门名称（可选）' },
    },
    {
      fieldName: 'product_description',
      label: '备注',
      component: 'Textarea',
      componentProps: { placeholder: '请输入备注', rows: 3 },
    },
    {
      fieldName: 'file_url',
      label: '附件',
      component: 'FileUpload',
      componentProps: {
        maxNumber: 5,
        maxSize: 50,
        accept: [
          'pdf',
          'doc',
          'docx',
          'xls',
          'xlsx',
          'txt',
          'jpg',
          'jpeg',
          'png',
        ],
      },
      formItemClass: 'col-span-2',
    },
  ];
}

/** Tab2：价格策略 */
export function useFormSchemaPriceTax(): VbenFormSchema[] {
  return [
    {
      fieldName: 'is_used_retail',
      label: '用于销售',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '是', value: 1 },
          { label: '否', value: 0 },
        ],
        style: {
          width: '500px',
        },
      },
      rules: z.number().default(1),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'purchase_tax',
      label: '默认采购税率',
      component: 'Input',
      componentProps: {
        placeholder: '如：13% / 0%（可选）',
        style: {
          width: '500px',
        },
      },
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'retail_price',
      label: '销售价',
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入销售价',
        precision: 2,
        min: 0,
        step: 0.01,
        controlsPosition: 'right',
        style: {
          width: '500px',
        },
      },
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'is_used_purchase',
      label: '用于采购',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '是', value: 1 },
          { label: '否', value: 0 },
        ],
        style: {
          width: '500px',
        },
      },
      rules: z.number().default(1),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'purchase_price',
      label: '采购价',
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入采购价',
        precision: 2,
        min: 0,
        step: 0.01,
        controlsPosition: 'right',
        style: {
          width: '500px',
        },
      },
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'retail_tax',
      label: '默认销售税率',
      component: 'Input',
      componentProps: {
        placeholder: '如：13% / 0%（可选）',
        style: {
          width: '500px',
        },
      },
      formItemClass: 'col-span-2',
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'product_name',
      label: '名称',
      component: 'Input',
      componentProps: { placeholder: '请输入名称', allowClear: true },
    },
    {
      fieldName: 'product_code',
      label: '编码',
      component: 'Input',
      componentProps: { placeholder: '请输入编码', allowClear: true },
    },
    {
      fieldName: 'product_type',
      label: '分类',
      component: 'ApiTreeSelect',
      componentProps: {
        allowClear: true,
        api: async () => {
          const data = await getProductCategorySimpleList();
          return handleTree(data);
        },
        labelField: 'name',
        valueField: 'id',
        childrenField: 'children',
        placeholder: '请选择产品分类',
        treeDefaultExpandAll: true,
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { title: '图片', width: 80, slots: { default: 'image' } },
    { field: 'product_name', title: '名称', minWidth: 220 },
    { field: 'product_code', title: '编码', minWidth: 120 },
    { field: 'model', title: '规格型号', minWidth: 140 },
    { field: 'unit', title: '单位', minWidth: 90 },
    {
      field: 'retail_price',
      title: '参考价格(卖)',
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'purchase_price',
      title: '参考价格(进)',
      minWidth: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'default_warehouse_id',
      title: '仓库名称',
      minWidth: 140,
      slots: { default: 'default_warehouse_id' },
    },
    {
      field: 'product_category_id',
      title: '分类',
      minWidth: 120,
      slots: { default: 'product_category_id' },
    },
    { field: 'product_description', title: '备注', minWidth: 180 },
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
