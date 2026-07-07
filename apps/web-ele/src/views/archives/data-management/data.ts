import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export function useFileGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', width: 60, fixed: 'left' },
    {
      field: 'file_name',
      title: '文件名称',
      minWidth: 260,
      fixed: 'left',
      slots: { default: 'fileName' },
    },
    { field: 'file_type', title: '类型', minWidth: 120 },
    {
      field: 'file_size',
      title: '大小',
      minWidth: 120,
      slots: { default: 'fileSize' },
    },
    {
      field: 'createuser',
      title: '上传人',
      minWidth: 140,
      slots: { default: 'uploadUser' },
    },
    {
      field: 'createtime',
      title: '上传时间',
      formatter: 'formatDateTime',
      minWidth: 180,
    },
    { field: 'file_path', title: '存储路径', minWidth: 320, showOverflow: true },
    {
      title: '操作',
      width: 210,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

export function buildTreeData<T extends { Prowid?: string; children?: T[]; rowid: string }>(
  rows: T[],
) {
  const map = new Map<string, T>();
  const roots: T[] = [];
  rows.forEach((item) => {
    item.children = [];
    map.set(String(item.rowid), item);
  });
  rows.forEach((item) => {
    const parentId = String(item.Prowid || '000000');
    if (parentId === '000000') {
      roots.push(item);
      return;
    }
    const parent = map.get(parentId);
    if (parent) parent.children?.push(item);
    else roots.push(item);
  });
  return roots;
}

export function formatFileSize(size?: number | string | null) {
  const value = Number(size || 0);
  if (!Number.isFinite(value) || value <= 0) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function getFileExtension(fileName: string) {
  const match = String(fileName || '').match(/\.([^.]+)$/);
  return match?.[1] ? match[1].toLowerCase() : '';
}

export function splitArchivePath(path?: string) {
  const normalized = String(path || '').replaceAll('\\\\', '/').replaceAll('\\', '/');
  const parts = normalized.split('/').filter(Boolean);
  const fileName = parts.pop() || '';
  const customPath = parts.length > 0 ? `/${parts.join('/')}` : '';
  return { fileName, customPath };
}
