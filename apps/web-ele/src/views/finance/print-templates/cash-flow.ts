import { buildPrintDocument, escapeHtml, toMoney } from '#/views/finance/print-templates/common';

export type CashFlowPrintRow = {
  label?: string;
  lineNo?: string | number;
  year?: number;
  current?: number;
};

export type CashFlowPrintData = {
  title?: string;
  companyName?: string;
  periodText?: string;
  unitText?: string;
  yearLabel?: string;
  currentLabel?: string;
  rows: CashFlowPrintRow[];
};

function buildRows(rows: CashFlowPrintRow[]) {
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

export function buildCashFlowPrintHtml(data: CashFlowPrintData) {
  const body = `
    <section class="print-sheet">
      <div class="cash-flow-title">${escapeHtml(data.title || '现金流量表')}</div>
      <table class="print-table cash-flow-table">
        <thead>
          <tr class="meta-row">
            <th class="text-left">编制单位：${escapeHtml(data.companyName || '')}</th>
            <th colspan="2" class="text-center">${escapeHtml(data.periodText || '')}</th>
            <th class="text-right">单位：${escapeHtml(data.unitText || '元')}</th>
          </tr>
          <tr>
            <th>项目</th>
            <th style="width: 12%;">行次</th>
            <th style="width: 24%;">${escapeHtml(data.yearLabel || '本年累计金额')}</th>
            <th style="width: 24%;">${escapeHtml(data.currentLabel || '本期金额')}</th>
          </tr>
        </thead>
        <tbody>
          ${buildRows(data.rows)}
        </tbody>
      </table>
    </section>`;

  return buildPrintDocument(
    data.title || '现金流量表打印',
    body,
    `
      .cash-flow-title {
        text-align: center;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 2px;
        margin-bottom: 8px;
      }
      .cash-flow-table th,
      .cash-flow-table td {
        border: 1px solid #222;
        padding: 6px 8px;
        font-size: 12px;
        line-height: 1.25;
      }
      .cash-flow-table thead th {
        text-align: center;
        font-weight: 400;
      }
      .cash-flow-table .meta-row th {
        border-left: 0;
        border-right: 0;
        border-top: 0;
        font-weight: 400;
        padding: 4px 6px 6px;
      }
      .cash-flow-table tbody td:first-child {
        text-align: left;
      }
    `,
  );
}
