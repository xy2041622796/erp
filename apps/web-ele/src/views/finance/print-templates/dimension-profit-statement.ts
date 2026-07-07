import { buildPrintDocument, escapeHtml, toMoney } from '#/views/finance/print-templates/common';

export type DimensionProfitPrintColumn = {
  id: string;
  name: string;
};

export type DimensionProfitPrintCell = {
  currentAmount?: number;
  yearAmount?: number;
};

export type DimensionProfitPrintRow = {
  label?: string;
  lineNo?: string | number;
  values?: Record<string, DimensionProfitPrintCell>;
};

export type DimensionProfitPrintData = {
  title: string;
  companyName?: string;
  periodText?: string;
  unitText?: string;
  currentLabel?: string;
  yearLabel?: string;
  dimensionColumns: DimensionProfitPrintColumn[];
  rows: DimensionProfitPrintRow[];
};

function buildHeader(data: DimensionProfitPrintData) {
  const dimensionHeaders = data.dimensionColumns
    .map((column) => `<th colspan="2">${escapeHtml(column.name)}</th>`)
    .join('');
  const amountHeaders = data.dimensionColumns
    .map(
      () => `
        <th>${escapeHtml(data.currentLabel || '本期金额')}</th>
        <th>${escapeHtml(data.yearLabel || '本年累计金额')}</th>`,
    )
    .join('');

  const columnCount = 2 + data.dimensionColumns.length * 2;
  const metaRight = data.unitText ? `单位：${data.unitText}` : '';
  const metaRow = data.dimensionColumns.length > 0
    ? `
      <tr class="meta-row">
        <th class="text-left">编制单位：${escapeHtml(data.companyName || '')}</th>
        <th colspan="${columnCount - 2}" class="text-center">${escapeHtml(data.periodText || '')}</th>
        <th class="text-right">${escapeHtml(metaRight)}</th>
      </tr>`
    : `
      <tr class="meta-row">
        <th class="text-left">编制单位：${escapeHtml(data.companyName || '')}</th>
        <th class="text-right">${escapeHtml([data.periodText, metaRight].filter(Boolean).join('  '))}</th>
      </tr>`;

  return `
    <thead>
      ${metaRow}
      <tr>
        <th rowspan="${data.dimensionColumns.length > 0 ? 2 : 1}">项目</th>
        <th rowspan="${data.dimensionColumns.length > 0 ? 2 : 1}" class="line-no-col">行次</th>
        ${dimensionHeaders}
      </tr>
      ${
        data.dimensionColumns.length > 0
          ? `<tr>${amountHeaders}</tr>`
          : ''
      }
    </thead>`;
}

function buildRows(data: DimensionProfitPrintData) {
  return (data.rows || [])
    .map((row) => {
      const amountCells = data.dimensionColumns
        .map((column) => {
          const cell = row.values?.[column.id] || {};
          return `
            <td class="text-right">${escapeHtml(toMoney(cell.currentAmount) || '')}</td>
            <td class="text-right">${escapeHtml(toMoney(cell.yearAmount) || '')}</td>`;
        })
        .join('');
      return `
        <tr>
          <td>${escapeHtml(row.label || '')}</td>
          <td class="text-center">${escapeHtml(String(row.lineNo || ''))}</td>
          ${amountCells}
        </tr>`;
    })
    .join('');
}

export function buildDimensionProfitStatementPrintHtml(data: DimensionProfitPrintData) {
  const body = `
    <section class="print-sheet dimension-profit-sheet">
      <div class="print-title">${escapeHtml(data.title)}</div>
      <table class="print-table dimension-profit-table">
        ${buildHeader(data)}
        <tbody>
          ${buildRows(data)}
        </tbody>
      </table>
    </section>`;

  return buildPrintDocument(
    `${data.title}打印`,
    body,
    `
      @page { size: A4 landscape; margin: 8mm; }
      .dimension-profit-sheet {
        break-inside: auto;
        page-break-inside: auto;
      }
      .dimension-profit-table {
        table-layout: auto;
        min-width: 100%;
      }
      .dimension-profit-table th,
      .dimension-profit-table td {
        border: 1px solid #222;
        padding: 6px 8px;
        font-size: 11px;
        line-height: 1.25;
        white-space: nowrap;
      }
      .dimension-profit-table thead th {
        text-align: center;
        font-weight: 400;
      }
      .dimension-profit-table .meta-row th {
        border-left: 0;
        border-right: 0;
        border-top: 0;
        font-weight: 400;
        padding: 4px 6px 6px;
      }
      .dimension-profit-table tbody td:first-child {
        min-width: 220px;
        text-align: left;
      }
      .dimension-profit-table .line-no-col {
        min-width: 48px;
      }
    `,
  );
}
