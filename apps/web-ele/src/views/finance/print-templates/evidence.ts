import { escapeHtml, toMoney, toRmbUpper } from '#/views/finance/print-templates/common';

export type FundsEvidencePrintRow = {
  date?: string;
  currencyName?: string;
  currency?: string;
  journalNo?: string;
  summary?: string;
  ioTypeName?: string;
  counterpartyName?: string;
  settlementMethod?: string;
  billNo?: string;
  remark?: string;
  income?: number;
  expense?: number;
};

export type FundsEvidencePrintData = {
  title: string;
  accountLabel: string;
  accountName: string;
  rows: FundsEvidencePrintRow[];
};

function formatEvidenceDate(value: unknown) {
  const text = String(value || '').slice(0, 10);
  if (!text) return '';
  const parts = text.split('-');
  if (parts.length !== 3) return text;
  return `${parts[0]}年${Number(parts[1])}月${Number(parts[2])}日`;
}

function buildEvidenceSheet(
  row: FundsEvidencePrintRow,
  index: number,
  total: number,
  data: FundsEvidencePrintData,
) {
  const income = Number(row.income || 0);
  const expense = Number(row.expense || 0);
  const isIncome = income > 0;
  const amount = isIncome ? income : expense;
  const title = isIncome ? '收款凭据' : '付款凭据';
  const dateText = formatEvidenceDate(row.date);

  const sheetClass = index % 2 === 1 ? 'evidence-sheet evidence-sheet--page-end' : 'evidence-sheet';

  return '<section class="' + sheetClass + '">'
    + '<h1>' + title + '</h1>'
    + '<div class="evidence-meta">'
    + '<span>' + escapeHtml(data.accountLabel) + '：' + escapeHtml(data.accountName) + '</span>'
    + '<span>币别：' + escapeHtml(row.currencyName || row.currency || '人民币') + '</span>'
    + '<span>' + escapeHtml(dateText) + '</span>'
    + '<span>NO. ' + escapeHtml(row.journalNo || '') + '</span>'
    + '</div>'
    + '<table class="evidence-table">'
    + '<tr><th>摘要</th><td colspan="5">' + escapeHtml(row.summary || '') + '</td></tr>'
    + '<tr><th>大写金额</th><td colspan="3">' + escapeHtml(toRmbUpper(amount)) + '</td><th>小写金额</th><td>' + escapeHtml(toMoney(amount) || '0.00') + '</td></tr>'
    + '<tr><th>往来单位</th><td colspan="3">' + escapeHtml(row.counterpartyName || '') + '</td><th>结算方式</th><td>' + escapeHtml(row.settlementMethod || '') + '</td></tr>'
    + '<tr><th>收支类别</th><td colspan="3">' + escapeHtml(row.ioTypeName || '') + '</td><th>票据号</th><td>' + escapeHtml(row.billNo || '') + '</td></tr>'
    + '<tr><th>备注</th><td colspan="5">' + escapeHtml(row.remark || '') + '</td></tr>'
    + '</table>'
    + '<div class="evidence-footer"><span>会计：</span><span>出纳：</span><span>经手人：</span></div>'
    + (total > 1 ? '<div class="evidence-page">第 ' + (index + 1) + ' / ' + total + ' 张</div>' : '')
    + '<div class="evidence-cut-line"><span></span><span></span></div>'
    + '</section>';
}

export function buildFundsEvidencePrintHtml(data: FundsEvidencePrintData) {
  const rows = data.rows || [];
  const sheets = rows.map((row, index) => buildEvidenceSheet(row, index, rows.length, data)).join('');

  return '<!doctype html><html><head><meta charset="utf-8"><title>' + escapeHtml(data.title) + '</title><style>'
    + 'body{font-family:Arial,\'Microsoft YaHei\',sans-serif;margin:0;color:#111;}'
    + '@page{size:A4 portrait;margin:8mm;}'
    + 'html,body{width:100%;}'
    + '.evidence-sheet{position:relative;box-sizing:border-box;break-inside:avoid;page-break-inside:avoid;page-break-after:auto;padding:12mm 18mm 14mm;height:136mm;min-height:136mm;}'
    + '.evidence-sheet--page-end{break-after:page;page-break-after:always;}'
    + 'h1{text-align:center;font-size:24px;font-weight:400;margin:0 0 12px;letter-spacing:2px;}'
    + '.evidence-meta{display:grid;grid-template-columns:1.2fr .8fr 1fr 1.2fr;gap:10px;font-size:13px;margin-bottom:8px;}'
    + '.evidence-meta span:last-child{text-align:right;}'
    + '.evidence-table{width:100%;border-collapse:collapse;border:1.5px solid #111;font-size:13px;table-layout:fixed;}'
    + '.evidence-table th,.evidence-table td{border:1px solid #111!important;padding:8px 10px;height:26px;vertical-align:middle;}'
    + '.evidence-table th{width:14%;font-weight:400;text-align:center;white-space:nowrap;}'
    + '.evidence-table td{word-break:break-all;}'
    + '.evidence-table tr{border-bottom:1px solid #111;}'
    + '.evidence-footer{display:flex;justify-content:space-between;font-size:13px;margin-top:14px;padding-left:2px;padding-right:2px;}'
    + '.evidence-page{text-align:right;font-size:12px;margin-top:8px;}'
    + '.evidence-cut-line{position:absolute;left:0;right:0;bottom:4mm;display:flex;justify-content:space-between;align-items:center;pointer-events:none;z-index:2;}'
    + '.evidence-cut-line span{display:block;width:18mm;border-top:1px solid #111;height:0;}'
    + '@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.evidence-sheet:last-child{break-after:auto;page-break-after:auto;}.evidence-table,.evidence-table th,.evidence-table td{border-color:#111!important;}.evidence-cut-line span{border-color:#111!important;}}'
    + '</style></head><body>' + sheets + '</body></html>';
}
