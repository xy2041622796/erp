import { moneyNumber, sumByMoney } from '#/utils/finance/decimal-money';
import { buildPrintDocument, escapeHtml, toMoney, toRmbUpper } from '#/views/finance/print-templates/common';

export type ReimbursementApplyPrintLine = {
  expenseDate?: string;
  expenseType?: string;
  summary?: string;
  amount?: number;
  remark?: string;
};

export type ReimbursementApplyPrintData = {
  id: string;
  reimbursementNo?: string;
  reimbursementDate?: string;
  projectName?: string;
  departmentName?: string;
  reimburserName?: string;
  reimbursementReason?: string;
  receiveAccount?: string;
  totalAmount?: number;
  postscript?: string;
  remark?: string;
  reviewer?: string;
  cashier?: string;
  maker?: string;
  details?: ReimbursementApplyPrintLine[];
};

function totalOf(item: ReimbursementApplyPrintData) {
  if (Number.isFinite(Number(item.totalAmount))) return Number(item.totalAmount);
  return moneyNumber(sumByMoney(item.details || [], (row) => row.amount));
}

function buildSection(item: ReimbursementApplyPrintData) {
  const rows = (item.details || [])
    .map(
      (row, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${escapeHtml(row.expenseDate || '')}</td>
          <td>${escapeHtml(row.expenseType || '')}</td>
          <td>${escapeHtml(row.summary || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.amount) || '')}</td>
          <td>${escapeHtml(row.remark || '')}</td>
        </tr>`,
    )
    .join('');

  const total = totalOf(item);

  return `
    <section class="print-sheet">
      <div class="print-title">报销申请单</div>
      <div class="print-grid-meta">
        <div>单号：${escapeHtml(item.reimbursementNo || '')}</div>
        <div>日期：${escapeHtml(item.reimbursementDate || '')}</div>
        <div>收款账户：${escapeHtml(item.receiveAccount || '')}</div>
        <div>报销人：${escapeHtml(item.reimburserName || '')}</div>
        <div>部门：${escapeHtml(item.departmentName || '')}</div>
        <div>项目：${escapeHtml(item.projectName || '')}</div>
      </div>
      <div class="print-note-row">
        <span>报销事由：${escapeHtml(item.reimbursementReason || '')}</span>
        <span>附言：${escapeHtml(item.postscript || '')}</span>
      </div>
      <table class="print-table">
        <thead>
          <tr>
            <th style="width:8%;">序号</th>
            <th style="width:16%;">费用日期</th>
            <th style="width:16%;">费用类型</th>
            <th>摘要</th>
            <th style="width:18%;">金额</th>
            <th style="width:20%;">备注</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td class="text-center">1</td><td></td><td></td><td></td><td></td><td></td></tr>'}
          <tr>
            <td class="font-medium text-center" colspan="3">合计（大写）</td>
            <td>${escapeHtml(toRmbUpper(total) || '')}</td>
            <td class="text-right font-medium">${escapeHtml(toMoney(total) || '')}</td>
            <td>${escapeHtml(item.remark || '')}</td>
          </tr>
        </tbody>
      </table>
      <div class="print-footer">
        <span>审核：${escapeHtml(item.reviewer || '')}</span>
        <span>出纳：${escapeHtml(item.cashier || '')}</span>
        <span>制单：${escapeHtml(item.maker || '')}</span>
      </div>
    </section>`;
}

export function buildReimbursementApplyPrintHtml(list: ReimbursementApplyPrintData[]) {
  return buildPrintDocument(
    '报销申请单打印',
    list.map((item) => buildSection(item)).join(''),
    `
      .print-note-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 10px;
        color: #444;
      }
      .print-note-row span {
        flex: 1;
      }
    `,
  );
}
