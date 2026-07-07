import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export const genderOptions = [
  { label: '男', value: 1 },
  { label: '女', value: 2 },
];

export const companyTypeTabs = [
  { label: '客户联系人', value: 1 },
  { label: '供应商联系人', value: 2 },
];

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'customerName',
      label: '主体名称',
      component: 'Input',
      componentProps: { placeholder: '请输入主体名称', allowClear: true },
    },
    {
      fieldName: 'customerCode',
      label: '主体编号',
      component: 'Input',
      componentProps: { placeholder: '请输入主体编号', allowClear: true },
    },
    {
      fieldName: 'contactName',
      label: '联系人姓名',
      component: 'Input',
      componentProps: { placeholder: '请输入联系人姓名', allowClear: true },
    },
    {
      fieldName: 'mobile',
      label: '手机号',
      component: 'Input',
      componentProps: { placeholder: '请输入手机号', allowClear: true },
    },
    {
      fieldName: 'email',
      label: '邮箱',
      component: 'Input',
      componentProps: { placeholder: '请输入邮箱', allowClear: true },
    },
    {
      fieldName: 'ownerUserName',
      label: '负责人',
      component: 'Input',
      componentProps: { placeholder: '请输入负责人', allowClear: true },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', width: 60, fixed: 'left' },
    { field: 'customerCode', title: '主体编号', minWidth: 150, fixed: 'left' },
    { field: 'customerName', title: '主体名称', minWidth: 180, fixed: 'left' },
    { field: 'contactName', title: '联系人姓名', minWidth: 140, slots: { default: 'name' } },
    {
      field: 'gender',
      title: '性别',
      minWidth: 90,
      formatter: ({ cellValue }: any) => formatGender(cellValue),
    },
    { field: 'mobile', title: '手机号', minWidth: 140 },
    { field: 'phone', title: '联系电话', minWidth: 140 },
    { field: 'email', title: '邮箱', minWidth: 180 },
    { field: 'positionName', title: '职务/岗位', minWidth: 120 },
    {
      field: 'isPrimary',
      title: '主联系人',
      minWidth: 100,
      formatter: ({ cellValue }: any) => formatPrimary(cellValue),
    },
    { field: 'ownerUserName', title: '负责人', minWidth: 100 },
    { field: 'remark', title: '备注', minWidth: 180, showOverflow: 'tooltip' },
    {
      field: 'createTime',
      title: '创建时间',
      minWidth: 140,
      formatter: ({ cellValue }: any) => formatDate(cellValue),
    },
    {
      field: 'updateTime',
      title: '更新时间',
      minWidth: 140,
      formatter: ({ cellValue }: any) => formatDate(cellValue),
    },
    { title: '操作', width: 160, fixed: 'right', slots: { default: 'actions' } },
  ];
}

export function formatGender(value?: number | string) {
  if (String(value) === '1') return '男';
  if (String(value) === '2') return '女';
  if (String(value) === '0') return '未知';
  return '-';
}

export function formatPrimary(value?: number | string) {
  return Number(value || 0) === 1 ? '是' : '否';
}

export function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('zh-CN');
}
