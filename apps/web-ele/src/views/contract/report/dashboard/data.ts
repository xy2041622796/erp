import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '指标', field: 'name', minWidth: 180, fixed: 'left' },
    { title: '数值', field: 'value', minWidth: 160, align: 'right', slots: { default: 'value' } },
    { title: '说明', field: 'desc', minWidth: 260 },
  ];
}
