export const genderOptions = [
  { label: '男', value: 1 },
  { label: '女', value: 2 },
];

export const companyTypeTabs = [
  { label: '客户联系人', value: 1 },
  { label: '供应商联系人', value: 2 },
];

export function formatGender(value?: number | string) {
  if (String(value) === '1') return '男';
  if (String(value) === '2') return '女';
  if (String(value) === '0') return '未知';
  return '-';
}

export function formatPrimary(value?: number | string) {
  return Number(value || 0) === 1 ? '是' : '否';
}
