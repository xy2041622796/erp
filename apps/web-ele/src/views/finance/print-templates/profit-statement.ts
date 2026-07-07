import {
  buildPrintDocument,
  escapeHtml,
  toMoney,
} from '#/views/finance/print-templates/common';

export type ProfitStatementPrintRow = {
  label?: string;
  lineNo?: string | number;
  year?: number;
  current?: number;
};

export type ProfitStatementPrintData = {
  title?: string;
  companyName?: string;
  periodText?: string;
  unitText?: string;
  currentLabel?: string;
  rows: ProfitStatementPrintRow[];
};

function buildRows(rows: ProfitStatementPrintRow[]) {
  return (rows || [])
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.label || '')}</td>
          <td class="text-center">${escapeHtml(String(row.lineNo || ''))}</td>
          <td class="text-right">${escapeHtml(toMoney(row.year) || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.current) || '')}</td>
        </tr>`,
    )
    .join('');
}

export function buildProfitStatementPrintHtml(data: ProfitStatementPrintData) {
  const body = `
    <section class="print-sheet">
      <div class="profit-statement-title">${escapeHtml(data.title || '利润表')}</div>
      <table class="print-table profit-statement-table">
        <thead>
          <tr class="meta-row">
            <th class="text-left">编制单位：${escapeHtml(data.companyName || '')}</th>
            <th colspan="2" class="text-center">${escapeHtml(data.periodText || '')}</th>
            <th class="text-right">单位：${escapeHtml(data.unitText || '元')}</th>
          </tr>
          <tr>
            <th>项目</th>
            <th style="width: 12%;">行次</th>
            <th style="width: 24%;">本年累计金额</th>
            <th style="width: 24%;">${escapeHtml(data.currentLabel || '本期金额')}</th>
          </tr>
        </thead>
        <tbody>
          ${buildRows(data.rows)}
        </tbody>
      </table>
    </section>`;

  return buildPrintDocument(
    data.title || '利润表打印',
    body,
    `
      .profit-statement-title {
        text-align: center;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 2px;
        margin-bottom: 8px;
      }
      .profit-statement-table th,
      .profit-statement-table td {
        border: 1px solid #222;
        padding: 6px 8px;
        font-size: 12px;
        line-height: 1.25;
      }
      .profit-statement-table {
        width: calc(100% - 1px);
      }
      .profit-statement-table thead tr:not(.meta-row) th:last-child,
      .profit-statement-table tbody td:last-child {
        border-right: 1px solid #222 !important;
      }
      .profit-statement-table thead th {
        text-align: center;
        font-weight: 400;
      }
      .profit-statement-table .meta-row th {
        border-left: 0;
        border-right: 0;
        border-top: 0;
        font-weight: 400;
        padding: 4px 6px 6px;
      }
      .profit-statement-table tbody td:first-child {
        text-align: left;
      }
    `,
  );
}
