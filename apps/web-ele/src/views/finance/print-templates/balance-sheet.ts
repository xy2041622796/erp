import {
  buildPrintDocument,
  escapeHtml,
  toMoney,
} from '#/views/finance/print-templates/common';

export type BalanceSheetPrintRow = {
  leftLabel?: string;
  leftLineNo?: string | number;
  leftEnding?: number;
  leftBeginning?: number;
  rightLabel?: string;
  rightLineNo?: string | number;
  rightEnding?: number;
  rightBeginning?: number;
};

export type BalanceSheetPrintData = {
  title?: string;
  companyName?: string;
  periodText?: string;
  unitText?: string;
  rows: BalanceSheetPrintRow[];
};

function buildRows(rows: BalanceSheetPrintRow[]) {
  return (rows || [])
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.leftLabel || '')}</td>
          <td class="text-center">${escapeHtml(String(row.leftLineNo || ''))}</td>
          <td class="text-right">${escapeHtml(toMoney(row.leftEnding) || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.leftBeginning) || '')}</td>
          <td>${escapeHtml(row.rightLabel || '')}</td>
          <td class="text-center">${escapeHtml(String(row.rightLineNo || ''))}</td>
          <td class="text-right">${escapeHtml(toMoney(row.rightEnding) || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.rightBeginning) || '')}</td>
        </tr>`,
    )
    .join('');
}

export function buildBalanceSheetPrintHtml(data: BalanceSheetPrintData) {
  const body = `
    <section class="print-sheet">
      <div class="balance-sheet-title">${escapeHtml(data.title || '资产负债表')}</div>
      <table class="print-table balance-sheet-table">
        <thead>
          <tr class="meta-row">
            <th colspan="2" class="text-left">编制单位：${escapeHtml(data.companyName || '')}</th>
            <th colspan="4" class="text-center">${escapeHtml(data.periodText || '')}</th>
            <th colspan="2" class="text-right">单位：${escapeHtml(data.unitText || '元')}</th>
          </tr>
          <tr>
            <th>资产</th>
            <th style="width: 6%; white-space: nowrap;">行次</th>
            <th style="width: 11%;">期末余额</th>
            <th style="width: 11%;">年初余额</th>
            <th>负债和所有者权益</th>
            <th style="width: 6%; white-space: nowrap;">行次</th>
            <th style="width: 11%;">期末余额</th>
            <th style="width: 11%;">年初余额</th>
          </tr>
        </thead>
        <tbody>
          ${buildRows(data.rows)}
        </tbody>
      </table>
    </section>`;

  return buildPrintDocument(
    data.title || '资产负债表打印',
    body,
    `
      .balance-sheet-title {
        text-align: center;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 2px;
        margin-bottom: 8px;
      }
      .balance-sheet-table th,
      .balance-sheet-table td {
        border: 1px solid #222;
        padding: 6px 8px;
        font-size: 12px;
        line-height: 1.25;
      }
      .balance-sheet-table {
        width: calc(100% - 1px);
      }
      .balance-sheet-table thead tr:not(.meta-row) th:last-child,
      .balance-sheet-table tbody td:last-child {
        border-right: 1px solid #222 !important;
      }
      .balance-sheet-table thead th {
        text-align: center;
        font-weight: 400;
      }
      .balance-sheet-table .meta-row th {
        border-left: 0;
        border-right: 0;
        border-top: 0;
        font-weight: 400;
        padding: 4px 6px 6px;
      }
    `,
  );
}
