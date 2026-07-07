import { buildPrintDocument, escapeHtml, toMoney } from '#/views/finance/print-templates/common';

export type SubjectBalancePrintRow = {
  subjectCode?: string;
  subjectName?: string;
  openingDebit?: number;
  openingCredit?: number;
  currentDebit?: number;
  currentCredit?: number;
  endingDebit?: number;
  endingCredit?: number;
  level?: number;
  isLeaf?: boolean;
  isTotal?: boolean;
};

export type SubjectBalancePrintData = {
  title?: string;
  companyName?: string;
  periodText?: string;
  unitText?: string;
  rows: SubjectBalancePrintRow[];
};

function getNamePadding(level?: number) {
  const currentLevel = Math.max(Number(level || 1), 1);
  return (currentLevel - 1) * 16;
}

function buildRows(rows: SubjectBalancePrintRow[]) {
  return (rows || [])
    .map((row) => {
      const weight = row.isLeaf && !row.isTotal ? '400' : '700';
      return `
        <tr>
          <td>${escapeHtml(row.subjectCode || '')}</td>
          <td style="padding-left:${getNamePadding(row.level)}px;font-weight:${weight};">${escapeHtml(row.subjectName || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.openingDebit) || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.openingCredit) || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.currentDebit) || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.currentCredit) || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.endingDebit) || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.endingCredit) || '')}</td>
        </tr>`;
    })
    .join('');
}

export function buildSubjectBalancePrintHtml(data: SubjectBalancePrintData) {
  const body = `
    <section class="print-sheet">
      <table class="print-table subject-balance-table">
        <thead>
          <tr class="subject-balance-title-row">
            <th colspan="8">${escapeHtml(data.title || '科目余额表')}</th>
          </tr>
          <tr class="meta-row">
            <th colspan="2" class="text-left">编制单位：${escapeHtml(data.companyName || '')}</th>
            <th colspan="4" class="text-center">${escapeHtml(data.periodText || '')}</th>
            <th colspan="2" class="text-right">单位：${escapeHtml(data.unitText || '元')}</th>
          </tr>
          <tr>
            <th rowspan="2" style="width: 12%;">科目编码</th>
            <th rowspan="2" style="width: 20%;">科目名称</th>
            <th colspan="2" style="width: 22%;">期初余额</th>
            <th colspan="2" style="width: 22%;">本期发生额</th>
            <th colspan="2" style="width: 24%;">期末余额</th>
          </tr>
          <tr>
            <th>借方</th>
            <th>贷方</th>
            <th>借方</th>
            <th>贷方</th>
            <th>借方</th>
            <th>贷方</th>
          </tr>
        </thead>
        <tbody>
          ${buildRows(data.rows)}
        </tbody>
      </table>
    </section>`;

  return buildPrintDocument(
    data.title || '科目余额表打印',
    body,
    `
      .print-sheet {
        break-inside: auto;
        page-break-inside: auto;
      }

      .subject-balance-table {
        border: 1px solid #000;
        border-collapse: collapse;
        break-inside: auto;
        page-break-inside: auto;
      }

      .subject-balance-table thead {
        display: table-header-group !important;
      }

      .subject-balance-table th,
      .subject-balance-table td {
        border: 1px solid #000 !important;
        padding: 6px 8px;
        font-size: 12px;
        line-height: 1.25;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .subject-balance-table thead th {
        text-align: center;
        font-weight: 400;
      }

      .subject-balance-table .subject-balance-title-row th {
        border: 0 !important;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 2px;
        padding: 0 0 8px;
        text-align: center;
      }

      .subject-balance-table .meta-row th {
        border-left: 0 !important;
        border-right: 0 !important;
        border-top: 0 !important;
        font-weight: 400;
        padding: 4px 6px 6px;
      }

      .subject-balance-table tbody td:first-child,
      .subject-balance-table tbody td:nth-child(2) {
        text-align: left;
      }
    `,
  );
}
