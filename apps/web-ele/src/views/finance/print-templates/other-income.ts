import { moneyNumber, sumByMoney } from '#/utils/finance/decimal-money';
import { buildPrintDocument, escapeHtml, toMoney, toRmbUpper } from '#/views/finance/print-templates/common';

export type OtherIncomePrintDetail = {
  summary?: string;
  itemName?: string;
  amount?: number;
  remark?: string;
};

export type OtherIncomePrintData = {
  id: string;
  settlementNo?: string;
  settlementDate?: string;
  customerName?: string;
  projectName?: string;
  salesmanName?: string;
  departmentName?: string;
  receiveAccount?: string;
  totalAmount?: number;
  receiveAmount?: number;
  receiveBalance?: number;
  remark?: string;
  reviewer?: string;
  cashier?: string;
  maker?: string;
  details?: OtherIncomePrintDetail[];
};

function totalOf(item: OtherIncomePrintData) {
  if (Number.isFinite(Number(item.totalAmount))) return Number(item.totalAmount);
  return moneyNumber(sumByMoney(item.details || [], (row) => row.amount));
}

function buildSection(item: OtherIncomePrintData) {
  const rows = (item.details || [])
    .map(
      (row, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${escapeHtml(row.summary || '')}</td>
          <td>${escapeHtml(row.itemName || '')}</td>
          <td class="text-right">${escapeHtml(toMoney(row.amount) || '')}</td>
          <td>${escapeHtml(row.remark || '')}</td>
        </tr>`,
    )
    .join('');

  const total = totalOf(item);

  return `
    <section class="print-sheet">
      <div class="print-title">其他收入单</div>
      <div class="print-grid-meta">
        <div>单号：${escapeHtml(item.settlementNo || '')}</div>
        <div>日期：${escapeHtml(item.settlementDate || '')}</div>
        <div>收款账户：${escapeHtml(item.receiveAccount || '')}</div>
        <div>客户：${escapeHtml(item.customerName || '')}</div>
        <div>项目：${escapeHtml(item.projectName || '')}</div>
        <div>业务员：${escapeHtml(item.salesmanName || '')}</div>
        <div>部门：${escapeHtml(item.departmentName || '')}</div>
        <div>收款金额：${escapeHtml(toMoney(item.receiveAmount) || '')}</div>
        <div>收款余额：${escapeHtml(toMoney(item.receiveBalance) || '')}</div>
      </div>
      <table class="print-table">
        <thead>
          <tr>
            <th style="width:8%;">序号</th>
            <th style="width:24%;">摘要</th>
            <th>收入项目</th>
            <th style="width:18%;">金额</th>
            <th style="width:24%;">备注</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td class="text-center">1</td><td></td><td></td><td></td><td></td></tr>'}
          <tr>
            <td class="font-medium text-center" colspan="2">合计（大写）</td>
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

export function buildOtherIncomePrintHtml(list: OtherIncomePrintData[]) {
  return buildPrintDocument('其他收入单打印', list.map((item) => buildSection(item)).join(''));
}
