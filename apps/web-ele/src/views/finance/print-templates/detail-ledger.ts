import { buildPrintDocument, escapeHtml, toMoney } from '#/views/finance/print-templates/common';

export type DetailLedgerPrintRow = {
  type?: 'opening' | 'entry' | 'sumMonth' | 'sumYear' | string;
  date?: string;
  voucherNo?: string;
  subject?: string;
  summary?: string;
  debit?: number;
  credit?: number;
  directionText?: string;
  balanceAbs?: number;
};

export type DetailLedgerPrintData = {
  title?: string;
  monthLabel?: string;
  subjectTitle?: string;
  keyword?: string;
  rows: DetailLedgerPrintRow[];
};

function buildRows(rows: DetailLedgerPrintRow[]) {
  return rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.date || '')}</td>
          <td>${escapeHtml(row.voucherNo || '')}</td>
          <td>${escapeHtml(row.subject || '')}</td>
          <td>${escapeHtml(row.summary || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.debit) || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.credit) || '')}</td>
          <td class="text-center">${escapeHtml(row.directionText || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.balanceAbs) || '')}</td>
        </tr>`,
    )
    .join('');
}

export function buildDetailLedgerPrintSection(data: DetailLedgerPrintData) {
  return `
    <section class="print-sheet">
      <div class="print-title">${escapeHtml(data.title || '明细账')}</div>
      <div class="print-grid-meta">
        <span>期间：${escapeHtml(data.monthLabel || '')}</span>
        <span>科目：${escapeHtml(data.subjectTitle || '')}</span>
        <span>关键字：${escapeHtml(data.keyword || '')}</span>
      </div>
      <table class="print-table detail-ledger-table">
        <thead>
          <tr>
            <th style="width: 12%">日期</th>
            <th style="width: 14%">凭证字号</th>
            <th style="width: 20%">科目</th>
            <th>摘要</th>
            <th style="width: 11%">借方</th>
            <th style="width: 11%">贷方</th>
            <th style="width: 8%">方向</th>
            <th style="width: 14%">余额</th>
          </tr>
        </thead>
        <tbody>
          ${buildRows(data.rows)}
        </tbody>
      </table>
    </section>`;
}

export function buildDetailLedgerPrintHtml(data: DetailLedgerPrintData) {
  return buildDetailLedgerPrintDocument([buildDetailLedgerPrintSection(data)], data.title || '明细账打印');
}

export function buildDetailLedgerPrintDocument(sections: string[], title = '明细账打印') {
  return buildPrintDocument(
    title,
    sections.join(''),
    `
      .detail-ledger-table {
        border: 1px solid #000;
        border-collapse: collapse;
      }

      .detail-ledger-table td,
      .detail-ledger-table th {
        border: 1px solid #000 !important;
        font-size: 11px;
        padding: 6px 6px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    `,
  );
}
