import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { z } from '@vben/common-ui';
import { DICT_TYPE } from '@vben/constants';
import { useUserStore } from '@vben/stores';

import { getRangePickerDefaultProps } from '#/utils';

import { queryCompanyType } from '#/api/erp/customer';

/** 加载身份标签字典 */
export async function loadCompanyTypeDict() {
  const dict = await queryCompanyType();
  const dictMap = dict.reduce((map, item) => {
    map[item.value] = item.label;
    return map;
  }, {} as Record<string, string>);
  return dictMap;
}
export function useFormSchema(
  permissionData?: any,
  customerId?: number | string,
  companyTypeOptions?: { value: number; label: string }[],
): VbenFormSchema[] {
  const schemas = [
    {
      fieldName: 'name',
      label: '名称',
      component: 'Input',
      rules: 'required',
      componentProps: {
        placeholder: '请输入名称',
        disabled: permissionData
          ? !permissionData.isEditField(customerId, 'customer_name')
          : false,
      },
      formItemProps: {
        class: 'grid-column: span 2 !important; width: 100% !important;',
      },
    },
    {
      fieldName: 'customerCode',
      label: '编号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入编号',
        suffix: '自动生成',
        disabled: permissionData
          ? !permissionData.isEditField(customerId, 'customer_code')
          : false,
      },
    },
    {
      fieldName: 'contactName',
      label: '联系人',
      component: 'Input',
      componentProps: {
        placeholder: '请输入联系人',
        disabled: permissionData
          ? !permissionData.isEditField(customerId, 'contact_name')
          : false,
      },
      formItemProps: {
        class: 'grid-column: span 2 !important; width: 100% !important;',
      },
    },
    {
      fieldName: 'mobile',
      label: '手机',
      component: 'Input',
      componentProps: {
        placeholder: '请输入手机',
        prefix: '+86',
        disabled: permissionData
          ? !permissionData.isEditField(customerId, 'contact_mobile')
          : false,
      },
    },
    {
      fieldName: 'email',
      label: '邮箱',
      component: 'Input',
      componentProps: {
        placeholder: '请输入邮箱',
        disabled: permissionData
          ? !permissionData.isEditField(customerId, 'contact_email')
          : false,
      },
    },
    {
      fieldName: 'telephone',
      label: '公司电话',
      component: 'Input',
      componentProps: {
        placeholder: '请输入公司电话',
        disabled: permissionData
          ? !permissionData.isEditField(customerId, 'contact_phone')
          : false,
      },
      formItemProps: {
        class: 'grid-column: span 2 !important; width: 100% !important;',
      },
    },
    {
      fieldName: 'detailAddress',
      label: '地址',
      component: 'Input',
      componentProps: {
        placeholder: '请输入地址',
        disabled: permissionData
          ? !permissionData.isEditField(customerId, 'address')
          : false,
      },
      formItemProps: {
        class: 'grid-column: span 2 !important; width: 100% !important;',
      },
    },
    {
      fieldName: 'customerGroup',
      label: '分组',
      component: 'Select',
      componentProps: {
        placeholder: '请选择分组',
        options: [{ value: 'unclassified', label: '未分组' }],
        disabled: permissionData
          ? !permissionData.isEditField(customerId, 'customer_group')
          : false,
      },
    },
    {
      fieldName: 'lingmaSysEnt',
      label: '公司 / 分公司',
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: [{ value: 1, label: '1' }],
        disabled: permissionData
          ? !permissionData.isEditField(customerId, 'lingma_sys_ent')
          : false,
      },
      formItemProps: {
        class: 'grid-column: span 2 !important; width: 100% !important;',
      },
    },
    {
      fieldName: 'departName',
      label: '归属部门',
      component: 'Input',
      componentProps: {
        placeholder: '请输入归属部门',
        disabled: permissionData
          ? !permissionData.isEditField(customerId, 'depart_name')
          : false,
      },
    },
    {
      fieldName: 'ownerUserName',
      label: '归属人',
      component: 'Input',
      componentProps: {
        placeholder: '请输入归属人',
        disabled: permissionData
          ? !permissionData.isEditField(customerId, 'ownerUserName')
          : false,
      },
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Input',
      componentProps: {
        type: 'textarea',
        rows: 3,
        placeholder: '请输入备注',
      },
    },
  ];

  return schemas;
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'name',
      label: '客户名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入客户名称',
        allowClear: true,
      },
    },
    {
      fieldName: 'mobile',
      label: '手机号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入手机号',
        allowClear: true,
      },
    },
    {
      fieldName: 'telephone',
      label: '电话',
      component: 'Input',
      componentProps: {
        placeholder: '请输入电话',
        allowClear: true,
      },
    },
    {
      fieldName: 'createTime',
      label: '创建时间',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        placeholder: ['开始日期', '结束日期'],
        allowClear: true,
      },
    },
  ];
}

/** 导入客户的表单 */
export function useImportFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'ownerUserId',
      label: '负责人',
      component: 'Input',
      componentProps: {
        placeholder: '请输入负责人',
        clearable: true,
      },
      rules: 'required',
    },
    {
      fieldName: 'file',
      label: '客户数据',
      component: 'Upload',
      rules: 'required',
      help: '仅允许导入 xls、xlsx 格式文件',
    },
    {
      fieldName: 'updateSupport',
      label: '是否覆盖',
      component: 'Switch',
      componentProps: {
        activeValue: true,
        inactiveValue: false,
      },
      rules: z.boolean().default(false),
      help: '是否更新已经存在的客户数据',
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'name',
      title: '客户名称',
      fixed: 'left',
      minWidth: 160,
      slots: { default: 'name' },
    },
    {
      field: 'source',
      title: '客户来源',
      minWidth: 100,
      cellRender: {
        name: 'CellDict',
        props: { type: DICT_TYPE.CRM_CUSTOMER_SOURCE },
      },
    },
    {
      field: 'mobile',
      title: '手机',
      minWidth: 120,
    },
    {
      field: 'telephone',
      title: '电话',
      minWidth: 130,
    },
    {
      field: 'email',
      title: '邮箱',
      minWidth: 180,
    },
    {
      field: 'level',
      title: '客户级别',
      minWidth: 135,
      cellRender: {
        name: 'CellDict',
        props: { type: DICT_TYPE.CRM_CUSTOMER_LEVEL },
      },
    },
    {
      field: 'industryId',
      title: '客户行业',
      minWidth: 100,
      cellRender: {
        name: 'CellDict',
        props: { type: DICT_TYPE.CRM_CUSTOMER_INDUSTRY },
      },
    },
    {
      field: 'contactNextTime',
      title: '下次联系时间',
      formatter: 'formatDateTime',
      minWidth: 180,
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 200,
    },
    {
      field: 'lockStatus',
      title: '锁定状态',
      minWidth: 120,
      cellRender: {
        name: 'CellDict',
        props: { type: DICT_TYPE.INFRA_BOOLEAN_STRING },
      },
    },
    {
      field: 'dealStatus',
      title: '成交状态',
      minWidth: 120,
      cellRender: {
        name: 'CellDict',
        props: { type: DICT_TYPE.INFRA_BOOLEAN_STRING },
      },
    },
    {
      field: 'contactLastTime',
      title: '最后跟进时间',
      formatter: 'formatDateTime',
      minWidth: 180,
    },
    {
      field: 'contactLastContent',
      title: '最后跟进记录',
      minWidth: 200,
    },
    {
      field: 'detailAddress',
      title: '地址',
      minWidth: 180,
    },
    {
      field: 'poolDay',
      title: '距离进入公海天数',
      minWidth: 140,
      formatter: ({ cellValue }) =>
        cellValue === null ? '-' : `${cellValue} 天`,
    },
    {
      field: 'ownerUserName',
      title: '负责人',
      minWidth: 100,
    },
    {
      field: 'ownerUserDeptName',
      title: '所属部门',
      minWidth: 100,
    },
    {
      field: 'updateTime',
      title: '更新时间',
      formatter: 'formatDateTime',
      minWidth: 180,
    },
    {
      field: 'createTime',
      title: '创建时间',
      formatter: 'formatDateTime',
      minWidth: 180,
    },
    {
      field: 'creatorName',
      title: '创建人',
      minWidth: 100,
    },
    {
      title: '操作',
      width: 130,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
