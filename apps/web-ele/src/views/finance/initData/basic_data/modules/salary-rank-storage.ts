export interface SalaryRankRow {
  rowid: string;
  rank_code: string;
  rank_name: string;
  rank_level: number;
  rank_type: string;
  is_enabled: boolean;
  remark: string;
}

export interface SalaryRankEmployeeRow {
  rowid: string;
  rank_id: string;
  employee_id: string;
  employee_no: string;
  employee_name: string;
  dept_id: string;
  dept_name: string;
  is_current: boolean;
  effective_date: string;
  expire_date: string;
  remark: string;
}

export interface SalaryRankItemRow {
  rowid: string;
  rank_id: string;
  item_id: string;
  is_required: boolean;
  is_default_selected: boolean;
  default_amount: number;
  sort_no: number;
  remark: string;
}

const RANK_KEY = 'finance-basic-data-salary-rank';
const EMPLOYEE_KEY = 'finance-basic-data-salary-rank-employee';
const ITEM_KEY = 'finance-basic-data-salary-rank-item';

function canUseStorage() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function readList<T>(key: string, fallback: T[]): T[] {
  if (!canUseStorage()) return [...fallback];
  return parseJson<T[]>(window.localStorage.getItem(key), fallback);
}

function writeList<T>(key: string, rows: T[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}

export function createRowId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const rankSeed: SalaryRankRow[] = [
  {
    rowid: 'rank_demo_p5',
    rank_code: 'P5',
    rank_name: '高级专员',
    rank_level: 5,
    rank_type: '技术',
    is_enabled: true,
    remark: '示例数据，可删除',
  },
  {
    rowid: 'rank_demo_m3',
    rank_code: 'M3',
    rank_name: '部门经理',
    rank_level: 3,
    rank_type: '管理',
    is_enabled: true,
    remark: '示例数据，可删除',
  },
];

const employeeSeed: SalaryRankEmployeeRow[] = [
  {
    rowid: 'rank_emp_demo_1',
    rank_id: 'rank_demo_p5',
    employee_id: 'EMP001',
    employee_no: 'A001',
    employee_name: '张三',
    dept_id: 'D001',
    dept_name: '研发中心',
    is_current: true,
    effective_date: '2026-04-01',
    expire_date: '',
    remark: '示例数据，可删除',
  },
];

const itemSeed: SalaryRankItemRow[] = [
  {
    rowid: 'rank_item_demo_1',
    rank_id: 'rank_demo_p5',
    item_id: '9d00b5f58e3e7669119af65832350ad3',
    is_required: true,
    is_default_selected: true,
    default_amount: 3000,
    sort_no: 10,
    remark: '示例：岗位工资 item_id',
  },
];

export function loadSalaryRankRows() {
  return readList(RANK_KEY, rankSeed);
}

export function saveSalaryRankRows(rows: SalaryRankRow[]) {
  writeList(RANK_KEY, rows);
}

export function loadSalaryRankEmployeeRows() {
  return readList(EMPLOYEE_KEY, employeeSeed);
}

export function saveSalaryRankEmployeeRows(rows: SalaryRankEmployeeRow[]) {
  writeList(EMPLOYEE_KEY, rows);
}

export function loadSalaryRankItemRows() {
  return readList(ITEM_KEY, itemSeed);
}

export function saveSalaryRankItemRows(rows: SalaryRankItemRow[]) {
  writeList(ITEM_KEY, rows);
}
