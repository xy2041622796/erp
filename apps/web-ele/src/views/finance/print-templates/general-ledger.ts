import { buildPrintDocument, escapeHtml, toMoney } from '#/views/finance/print-templates/common';

export type GeneralLedgerPrintRow = {
  rowId?: string;
  subjectCode?: string;
  subjectName?: string;
  dateLabel?: string;
  period?: string;
  summary?: string;
  debit?: number;
  credit?: number;
  directionText?: string;
  balanceAbs?: number;
  children?: GeneralLedgerPrintRow[];
};

export type GeneralLedgerPrintData = {
  title?: string;
  monthLabel?: string;
  keyword?: string;
  rows: GeneralLedgerPrintRow[];
};

function flattenRows(rows: GeneralLedgerPrintRow[]) {
  const out: Array<GeneralLedgerPrintRow & { level: number }> = [];
  const walk = (list: GeneralLedgerPrintRow[], level: number) => {
    for (const row of list) {
      out.push({ ...row, level });
      if (Array.isArray(row.children) && row.children.length > 0) {
        walk(row.children, level + 1);
      }
    }
  };
  walk(rows, 0);
  return out;
}

function buildRows(rows: GeneralLedgerPrintRow[]) {
  return flattenRows(rows)
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.subjectCode || '')}</td>
          <td><span style="padding-left:${row.level * 16}px">${escapeHtml(row.subjectName || '')}</span></td>
          <td>${escapeHtml(row.dateLabel || '')}</td>
          <td>${escapeHtml(row.period || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.debit) || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.credit) || '')}</td>
          <td class="text-center">${escapeHtml(row.directionText || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.balanceAbs) || '')}</td>
        </tr>`,
    )
    .join('');
}

export function buildGeneralLedgerPrintHtml(data: GeneralLedgerPrintData) {
  const body = `
    <section class="print-sheet">
      <table class="print-table general-ledger-table">
        <thead>
          <tr class="general-ledger-title-row">
            <th colspan="8">${escapeHtml(data.title || '总账')}</th>
          </tr>
          <tr class="general-ledger-meta-row">
            <th colspan="8">
              <div class="general-ledger-meta">
                <span>期间：${escapeHtml(data.monthLabel || '')}</span>
                <span>关键字：${escapeHtml(data.keyword || '')}</span>
              </div>
            </th>
          </tr>
          <tr>
            <th style="width: 12%">科目编码</th>
            <th style="width: 18%">科目名称</th>
            <th style="width: 12%">日期</th>
            <th style="width: 12%">期间</th>
            <th style="width: 12%">借方金额</th>
            <th style="width: 12%">贷方金额</th>
            <th style="width: 8%">方向</th>
            <th style="width: 14%">余额</th>
          </tr>
        </thead>
        <tbody>
          ${buildRows(data.rows)}
        </tbody>
      </table>
    </section>`;

  return buildPrintDocument(
    data.title || '总账打印',
    body,
    `
      .print-sheet {
        break-inside: auto;
        page-break-inside: auto;
      }

      .general-ledger-table {
        border: 1px solid #000;
        border-collapse: collapse;
        break-inside: auto;
        page-break-inside: auto;
      }

      .general-ledger-table thead {
        display: table-header-group !important;
      }

      .general-ledger-table td,
      .general-ledger-table th {
        border: 1px solid #000 !important;
        font-size: 11px;
        padding: 6px 6px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .general-ledger-table .general-ledger-title-row th {
        border: 0 !important;
        font-size: 22px;
        font-weight: 600;
        letter-spacing: 6px;
        padding: 0 0 8px;
        text-align: center;
      }

      .general-ledger-table .general-ledger-meta-row th {
        border: 0 !important;
        color: #444;
        font-size: 12px;
        font-weight: 400;
        padding: 0 0 8px;
      }

      .general-ledger-meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
      }
    `,
  );
}
