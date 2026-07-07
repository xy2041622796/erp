import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { moneyNumber, moneyText } from '#/utils/finance/decimal-money';
import { calculateSubjectYearBeginning } from '#/utils/finance/subject-opening';
import {
  BALANCE_DIRECTION_TEXT,
  SUBJECT_TYPE_TABS,
} from '#/views/finance/settings/project/data';

export const SUBJECT_OPENING_COLUMNS: VxeTableGridOptions['columns'] = [
  {
    title: '科目编码',
    field: 'subject_code',
    treeNode: true,
    minWidth: 160,
  },
  {
    title: '科目名称',
    field: 'subject_name',
    minWidth: 200,
    className: 'font-medium',
  },
  {
    title: '方向',
    field: 'balance_direction',
    width: 90,
    formatter: ({ cellValue }) => balanceDirectionLabel(cellValue),
  },
  {
    title: '期初余额',
    field: 'beginning_balance',
    minWidth: 160,
    slots: { default: 'beginning_balance' },
  },
  {
    title: '借方累计',
    field: 'debit_balance_sum',
    minWidth: 160,
    slots: { default: 'debit_balance_sum' },
  },
  {
    title: '贷方累计',
    field: 'cebit_balance_sum',
    minWidth: 160,
    slots: { default: 'cebit_balance_sum' },
  },
  {
    title: '年初余额',
    field: 'year_beginning_balance_calc',
    minWidth: 140,
    formatter: ({ row }) => formatAmount(calcYearBeginning(row)),
  },
];

export function balanceDirectionLabel(v: unknown) {
  if (v === undefined || v === null || v === '') return '';
  return BALANCE_DIRECTION_TEXT[String(v)] ?? String(v);
}

export function calcYearBeginning(row: any) {
  return moneyNumber(calculateSubjectYearBeginning(row));
}

export function formatAmount(v: any) {
  return moneyText(v);
}

export { SUBJECT_TYPE_TABS };
