import { buildPrintDocument, escapeHtml, toMoney } from '#/views/finance/print-templates/common';

export type ReconcilePrintLineAmount = { opening?: number; debit?: number; credit?: number; ending?: number };
export type ReconcilePrintLine = { type?: 'subject'|'funds'|'diff'; name?: string; currency?: string; amount?: ReconcilePrintLineAmount };
export type ReconcilePrintGroup = { projectName?: string; subjectCode?: string; currency?: string; balanced?: boolean; lines?: ReconcilePrintLine[] };
export type ReconcilePrintData = {
  title?: string;
  accountName?: string;
  period?: string;
  printedAt?: string;
  totals?: { subject?: ReconcilePrintLineAmount; funds?: ReconcilePrintLineAmount; diff?: ReconcilePrintLineAmount };
  groups: ReconcilePrintGroup[];
};

function pickLine(g: ReconcilePrintGroup, type: 'subject'|'funds'|'diff') { return (g.lines || []).find((x) => x.type === type); }
function buildAmountCells(amount?: ReconcilePrintLineAmount) {
  return `
    <td class="text-right">${escapeHtml(toMoney(amount?.opening) || "")}</td>
    <td class="text-right">${escapeHtml(toMoney(amount?.debit) || "")}</td>
    <td class="text-right">${escapeHtml(toMoney(amount?.credit) || "")}</td>
    <td class="text-right">${escapeHtml(toMoney(amount?.ending) || "")}</td>`;
}
function buildGroups(groups: ReconcilePrintGroup[]) {
  return (groups || []).map((g) => `
    <tr class="group-row"><td colspan="7">${escapeHtml(g.projectName || "")}${g.subjectCode ? "（" + escapeHtml(g.subjectCode) + "）" : ""}${g.balanced === false ? '<span class="stamp">不平</span>' : ""}</td></tr>
    <tr><td>会计科目</td><td>${escapeHtml(g.projectName || "")}</td><td>${escapeHtml(g.currency || "人民币")}</td>${buildAmountCells(pickLine(g, "subject")?.amount)}</tr>
    <tr><td>资金账户</td><td>${escapeHtml(pickLine(g, "funds")?.name || "")}</td><td>${escapeHtml(g.currency || "人民币")}</td>${buildAmountCells(pickLine(g, "funds")?.amount)}</tr>
    <tr class="diff-row"><td>差异</td><td></td><td></td>${buildAmountCells(pickLine(g, "diff")?.amount)}</tr>`).join("");
}
export function buildReconcilePrintHtml(data: ReconcilePrintData) {
  const body = `
    <section class="print-sheet">
      <div class="print-title">${escapeHtml(data.title || "核对总账")}</div>
      <div class="print-grid-meta">
        <span>账户：${escapeHtml(data.accountName || "")}</span>
        <span>期间：${escapeHtml(data.period || "")}</span>
        <span>打印时间：${escapeHtml(data.printedAt || "")}</span>
      </div>
      <table class="print-table reconcile-table">
        <thead><tr><th style="width:12%">项目</th><th style="width:18%">名称</th><th style="width:10%">币别</th><th style="width:15%">期初余额</th><th style="width:15%">借方(收入)</th><th style="width:15%">贷方(支出)</th><th style="width:15%">余额</th></tr></thead>
        <tbody>
          <tr class="font-medium summary-row"><td>会计科目</td><td></td><td></td>${buildAmountCells(data.totals?.subject)}</tr>
          <tr class="font-medium summary-row"><td>资金账户</td><td></td><td></td>${buildAmountCells(data.totals?.funds)}</tr>
          <tr class="font-medium summary-row diff-row"><td>差异</td><td></td><td></td>${buildAmountCells(data.totals?.diff)}</tr>
          ${buildGroups(data.groups || [])}
        </tbody>
      </table>
    </section>`;
  return buildPrintDocument(data.title || "核对总账打印", body, `
    .reconcile-table td, .reconcile-table th { font-size: 11px; padding: 6px; }
    .summary-row td { background: #f5f5f5; }
    .group-row td { font-weight: 600; background: #fafafa; position: relative; }
    .diff-row td { color: #2563eb; }
    .stamp { float: right; color: #d60000; border: 2px solid #d60000; padding: 2px 8px; border-radius: 4px; font-weight: 700; }
  `);
}
