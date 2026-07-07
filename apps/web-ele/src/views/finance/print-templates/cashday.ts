import { buildPrintDocument, escapeHtml, toMoney } from '#/views/finance/print-templates/common';

export type CashdayPrintRow = {
  date?: string;
  currencyName?: string;
  currency?: string;
  summary?: string;
  ioTypeName?: string;
  counterpartyName?: string;
  income?: number;
  expense?: number;
  balance?: number;
  voucherNo?: string;
  journalNo?: string;
  projectName?: string;
  deptName?: string;
  settlementMethod?: string;
  billNo?: string;
  remark?: string;
  transactionNo?: string;
};

export type CashdayPrintData = {
  title?: string;
  companyName?: string;
  accountName?: string;
  period?: string;
  printedAt?: string;
  openingBalance?: number;
  rows: CashdayPrintRow[];
  incomeTotal?: number;
  expenseTotal?: number;
  endingBalance?: number;
  /** 是否打印“显示全部”列；false 时只打印当前页面常规可见列 */
  showAll?: boolean;
};

type PrintColumn = {
  key: string;
  title: string;
  className?: string;
  getValue: (row: CashdayPrintRow) => string;
};

function getPrintColumns(showAll?: boolean): PrintColumn[] {
  const columns: PrintColumn[] = [
    { key: 'journalNo', title: '单据编号', getValue: (row) => row.journalNo || '' },
    { key: 'date', title: '日期', getValue: (row) => String(row.date || '').slice(0, 10) },
    { key: 'summary', title: '摘要', getValue: (row) => row.summary || '' },
    { key: 'ioTypeName', title: '收支类别', getValue: (row) => row.ioTypeName || '' },
    { key: 'counterpartyName', title: '往来单位', getValue: (row) => row.counterpartyName || '' },
  ];
  if (showAll) {
    columns.push(
      { key: 'projectName', title: '项目', getValue: (row) => row.projectName || '' },
      { key: 'deptName', title: '部门', getValue: (row) => row.deptName || '' },
    );
  }
  columns.push(
    { key: 'income', title: '收入', className: 'text-right', getValue: (row) => toMoney(row.income) || '' },
    { key: 'expense', title: '支出', className: 'text-right', getValue: (row) => toMoney(row.expense) || '' },
    { key: 'balance', title: '余额', className: 'text-right', getValue: (row) => toMoney(row.balance) || '' },
    { key: 'voucherNo', title: '关联凭证', getValue: (row) => row.voucherNo || '' },
  );
  if (showAll) {
    columns.push(
      { key: 'settlementMethod', title: '结算方式', getValue: (row) => row.settlementMethod || '' },
      { key: 'billNo', title: '票据号', getValue: (row) => row.billNo || '' },
      { key: 'remark', title: '备注', getValue: (row) => row.remark || '' },
      { key: 'transactionNo', title: '交易流水号', getValue: (row) => row.transactionNo || '' },
    );
  }
  return columns;
}

function buildCell(value: string, className?: string) {
  return `<td${className ? ` class="${className}"` : ''}>${escapeHtml(value)}</td>`;
}

function hasPrintableColumnData(data: CashdayPrintData, column: PrintColumn) {
  if (column.key === 'income') return Number(data.incomeTotal || 0) !== 0 || (data.rows || []).some((row) => Number(row.income || 0) !== 0);
  if (column.key === 'expense') return Number(data.expenseTotal || 0) !== 0 || (data.rows || []).some((row) => Number(row.expense || 0) !== 0);
  if (column.key === 'balance') return Number(data.openingBalance || 0) !== 0 || Number(data.endingBalance || 0) !== 0 || (data.rows || []).some((row) => Number(row.balance || 0) !== 0);
  return (data.rows || []).some((row) => String(column.getValue(row) || '').trim());
}

function filterPrintableColumns(data: CashdayPrintData, columns: PrintColumn[]) {
  return columns.filter((column) => hasPrintableColumnData(data, column));
}

function buildSummaryRow(columns: PrintColumn[], label: string, data: CashdayPrintData) {
  return `<tr class="font-medium summary-row">${columns.map((column, index) => {
    if (column.key === 'summary') return buildCell(label);
    if (index === 0) return buildCell('');
    if (column.key === 'income') return buildCell(toMoney(data.incomeTotal) || '', 'text-right');
    if (column.key === 'expense') return buildCell(toMoney(data.expenseTotal) || '', 'text-right');
    if (column.key === 'balance') return buildCell(toMoney(data.endingBalance) || '', 'text-right');
    return buildCell('');
  }).join('')}</tr>`;
}

function buildOpeningRow(columns: PrintColumn[], data: CashdayPrintData) {
  return `<tr class="font-medium">${columns.map((column, index) => {
    if (column.key === 'summary') return buildCell('初始化余额');
    if (index === 0) return buildCell('');
    if (column.key === 'balance') return buildCell(toMoney(data.openingBalance) || '', 'text-right');
    return buildCell('');
  }).join('')}</tr>`;
}

function buildRows(data: CashdayPrintData, columns: PrintColumn[]) {
  const body = (data.rows || []).map((row) => `
    <tr>${columns.map((column) => buildCell(column.getValue(row), column.className)).join('')}</tr>`).join('');
  return `
    ${buildOpeningRow(columns, data)}
    ${body}
    ${buildSummaryRow(columns, '合计', data)}`;
}

export function buildCashdayPrintHtml(data: CashdayPrintData) {
  const columns = filterPrintableColumns(data, getPrintColumns(data.showAll));
  const columnCount = Math.max(columns.length, 1);
  const metaHtml = [
    ['编制单位', data.companyName || ''],
    ['账户', data.accountName || ''],
    ['期间', data.period || ''],
    ['打印时间', data.printedAt || ''],
  ].map(([label, value]) => `<span><b>${escapeHtml(label)}：</b>${escapeHtml(value)}</span>`).join('');
  const body = `
    <section class="print-sheet">
      <table class="print-table journal-table">
        <thead>
          <tr class="journal-print-title-row">
            <th colspan="${columnCount}">${escapeHtml(data.title || '现金日记账')}</th>
          </tr>
          <tr class="journal-print-meta-row">
            <th colspan="${columnCount}"><div class="journal-print-meta">${metaHtml}</div></th>
          </tr>
          <tr class="journal-print-column-row">${columns.map((column) => `<th>${escapeHtml(column.title)}</th>`).join('')}</tr>
        </thead>
        <tbody>${buildRows(data, columns)}</tbody>
      </table>
    </section>`;
  return buildPrintDocument(data.title || '现金日记账', body, `
    /* 日记账列表需要允许表格自然跨页，并把标题、期间、列名一起放进 thead，确保续页重复打印表头 */
    .print-sheet { break-inside: auto; page-break-inside: auto; }
    .journal-table { break-inside: auto; page-break-inside: auto; }
    .journal-table thead { display: table-header-group !important; }
    .journal-table tbody { display: table-row-group !important; }
    .journal-table tfoot { display: table-footer-group !important; }
    .journal-table tr { break-inside: avoid; page-break-inside: avoid; }
    .journal-table td, .journal-table th { font-size: 9px; padding: 4px; }
    .journal-print-title-row th { border: 0; font-size: 22px; font-weight: 600; letter-spacing: 6px; padding: 0 0 8px 0; text-align: center; }
    .journal-print-meta-row th { border: 0; color: #444; font-size: 12px; font-weight: 400; padding: 0 0 8px 0; }
    .journal-print-meta { display: grid; grid-template-columns: repeat(4, 1fr); align-items: center; width: 100%; }
    .journal-print-meta span { display: block; white-space: nowrap; }
    .journal-print-meta span:nth-child(1) { text-align: left; }
    .journal-print-meta span:nth-child(2) { text-align: center; }
    .journal-print-meta span:nth-child(3) { text-align: center; }
    .journal-print-meta span:nth-child(4) { text-align: right; }
    .journal-print-meta b { font-weight: 400; }
    .journal-print-column-row th { border: 1px solid #222; text-align: center; }
    .summary-row td { background: #f5f5f5; }
  `);
}
