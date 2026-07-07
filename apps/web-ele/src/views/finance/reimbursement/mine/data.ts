import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { getProjectPage } from '#/api/erp/contract/project';
import { getRangePickerDefaultProps } from '#/utils';

let projectNameMap: Map<string, string> | null = null;
let projectNameMapLoading: null | Promise<Map<string, string>> = null;

async function ensureProjectNameMap() {
  if (projectNameMap) return projectNameMap;
  if (projectNameMapLoading) return await projectNameMapLoading;

  projectNameMapLoading = (async () => {
    const res: any = await getProjectPage({ showExpired: false });
    const list: any[] = res?.list ?? [];
    const map = new Map<string, string>();
    for (const x of list) {
      const id = String(x?.rowid ?? '').trim();
      if (!id) continue;
      const name = String(x?.project_name ?? x?.project_code ?? id);
      map.set(id, name);
    }
    projectNameMap = map;
    projectNameMapLoading = null;
    return map;
  })();

  return await projectNameMapLoading;
}

export async function fillProjectNames(rows: any[]) {
  const map = await ensureProjectNameMap();
  for (const row of rows ?? []) {
    const id = String(row?.project_id ?? '').trim();
    if (!id) continue;
    row.project_name = map.get(id) ?? id;
  }
}

/** 我的费用登记：列表 Columns（Bil_Expense_Regist） */
export function useExpenseRegistGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    {
      field: 'registration_no',
      title: '费用单号',
      width: 140,
      formatter: 'formatDate',
    },
    {
      field: 'registration_date',
      title: '发生日期',
      width: 140,
      formatter: 'formatDate',
    },
    {
      field: 'expense_type',
      title: '费用类型',
      width: 160,
      showOverflow: 'tooltip',
    },
    {
      field: 'createuser',
      title: '报销人/部门',
      minWidth: 180,
      formatter: ({ row }: any) => {
        const name = row?.createuser ?? row?.user_id ?? '-';
        const dept = row?.expense_depart ?? '-';
        return `${name}/${dept}`;
      },
    },
    {
      field: 'project_id',
      title: '项目',
      minWidth: 160,
      showOverflow: 'tooltip',
      formatter: ({ row }: any) => row?.project_name ?? row?.project_id ?? '-',
    },
    {
      field: 'expense_amount',
      title: '金额',
      width: 120,
      formatter: 'formatAmount2',
    },
    {
      field: 'remark',
      title: '费用说明',
      minWidth: 220,
      showOverflow: 'tooltip',
    },
    {
      title: '操作',
      width: 160,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

/** 我的费用登记：搜索 Schema */
export function useExpenseRegistGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'registrationDateRange',
      label: '发生日期',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        valueFormat: 'YYYY-MM-DD',
        format: 'YYYY-MM-DD',
      },
    },
    {
      fieldName: 'expense_type',
      label: '费用类型',
      component: 'Input',
      componentProps: {
        placeholder: '请输入费用类型',
        clearable: true,
      },
    },
    {
      fieldName: 'keyword',
      label: '关键字',
      component: 'Input',
      componentProps: {
        placeholder: '项目/说明/编号/报销人',
        clearable: true,
      },
    },
  ];
}
