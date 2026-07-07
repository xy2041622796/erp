import type { ProjectSubmoduleCrudConfig } from '#/views/project/_shared/crud';

import { listData as listEquipmentData } from '#/api/erp/project/resource/equipment';

export const EQUIPMENT_RECORD_STATUS_OPTIONS = [
  { label: '领用中', value: '领用中' },
  { label: '已归还', value: '已归还' },
  { label: '维修中', value: '维修中' },
  { label: '已取消', value: '已取消' },
] as const;

async function listEquipmentOptions(projectId?: string) {
  const res = await listEquipmentData({ pageNo: 1, page: 100, ...(projectId ? { project_id: projectId } : {}) });
  const rows = Array.isArray((res as any)?.list)
    ? (res as any).list
    : Array.isArray((res as any)?.data?.list)
      ? (res as any).data.list
      : [];
  return rows.map((row: Record<string, any>) => ({
    value: String(row.id || ''),
    label: String(row.equipment_name || row.equipment_code || row.id || ''),
    equipment_code: row.equipment_code,
    equipment_name: row.equipment_name,
    project_id: row.project_id,
  })).filter((item: Record<string, any>) => item.value);
}

export const resourceEquipmentRecordConfig: ProjectSubmoduleCrudConfig = {
  title: '设备领用记录',
  description: '维护 project_resource_equipment_record 设备领用流水，和设备台账表分离。',
  primaryKey: 'id',
  defaultValues: {
    project_id: '',
    equipment_id: '',
    equipment_code: '',
    equipment_name: '',
    owner_user_rowid: '',
    owner_user_name: '',
    borrow_date: '',
    return_date: '',
    status: '领用中',
    remark: '',
  },
  staffPickerFields: [
    {
      fieldName: 'owner_user_rowid',
      placeholder: '请选择领用人',
      relatedFields: {
        UserName: 'owner_user_name',
      },
    },
  ],
  customSelectFields: [
    {
      fieldName: 'equipment_id',
      projectField: 'project_id',
      placeholder: '请选择设备',
      emptyText: '暂无设备',
      labelField: 'label',
      valueField: 'value',
      loader: async (projectId: string) => listEquipmentOptions(projectId),
      relatedFields: {
        equipment_code: 'equipment_code',
        equipment_name: 'equipment_name',
      },
    },
  ],
  searchSchema: [],
  formSchema: [
    { fieldName: 'id', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    {
      fieldName: 'project_id',
      label: '领用项目',
      component: 'Slot',
    },
    { fieldName: 'equipment_id', label: '设备', component: 'Slot', rules: 'required' },
    { fieldName: 'equipment_code', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    { fieldName: 'equipment_name', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    { fieldName: 'owner_user_rowid', label: '领用人', component: 'Slot' },
    { fieldName: 'owner_user_name', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    { fieldName: 'borrow_date', label: '领用日期', component: 'DatePicker', componentProps: { class: '!w-full', valueFormat: 'YYYY-MM-DD' } },
    { fieldName: 'return_date', label: '归还日期', component: 'DatePicker', componentProps: { class: '!w-full', valueFormat: 'YYYY-MM-DD' } },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: EQUIPMENT_RECORD_STATUS_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    { fieldName: 'remark', label: '备注', component: 'Textarea', componentProps: { rows: 3 }, formItemClass: 'col-span-2' },
  ],
  columns: [],
};
