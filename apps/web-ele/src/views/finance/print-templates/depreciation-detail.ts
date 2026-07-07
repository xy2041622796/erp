import { buildPrintDocument, escapeHtml, toMoney } from '#/views/finance/print-templates/common';

export type DepreciationDetailPrintRow = {
  accumulatedDepreciation?: number;
  assetCategory?: string;
  assetCode?: string;
  assetName?: string;
  assetProperty?: string;
  currentDepreciation?: number;
  impairmentProvision?: number;
  model?: string;
  netAssetValue?: number;
  originalValue?: number;
  period?: string;
  usingDepartment?: string;
  yearDepreciation?: number;
};

export type DepreciationDetailPrintData = {
  periodLabel?: string;
  printedAt?: string;
  rows: DepreciationDetailPrintRow[];
  title?: string;
};

function money(value: unknown) {
  const text = toMoney(value);
  return text || '0.00';
}

function buildRows(rows: DepreciationDetailPrintRow[]) {
  return rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.period || '')}</td>
          <td>${escapeHtml(row.assetCode || '')}</td>
          <td>${escapeHtml(row.assetCategory || '')}</td>
          <td>${escapeHtml(row.assetProperty || '')}</td>
          <td>${escapeHtml(row.assetName || '')}</td>
          <td>${escapeHtml(row.model || '')}</td>
          <td>${escapeHtml(row.usingDepartment || '')}</td>
          <td class="text-right">${escapeHtml(money(row.originalValue))}</td>
          <td class="text-right">${escapeHtml(money(row.currentDepreciation))}</td>
          <td class="text-right">${escapeHtml(money(row.yearDepreciation))}</td>
          <td class="text-right">${escapeHtml(money(row.accumulatedDepreciation))}</td>
          <td class="text-right">${escapeHtml(money(row.impairmentProvision))}</td>
          <td class="text-right">${escapeHtml(money(row.netAssetValue))}</td>
        </tr>`,
    )
    .join('');
}

export function buildDepreciationDetailPrintSection(data: DepreciationDetailPrintData) {
  return `
    <section class="print-sheet depreciation-detail-sheet">
      <div class="print-title">${escapeHtml(data.title || '摊销明细表')}</div>
      <div class="print-meta">
        <span>会计期间：${escapeHtml(data.periodLabel || '')}</span>
        <span>打印时间：${escapeHtml(data.printedAt || '')}</span>
      </div>
      <table class="print-table depreciation-detail-table">
        <thead>
          <tr>
            <th style="width: 7%">会计期间</th>
            <th style="width: 8%">资产编号</th>
            <th style="width: 8%">资产类别</th>
            <th style="width: 8%">资产属性</th>
            <th style="width: 9%">资产名称</th>
            <th style="width: 9%">规格型号</th>
            <th style="width: 8%">使用部门</th>
            <th style="width: 8%">资产原值</th>
            <th style="width: 8%">本期折旧</th>
            <th style="width: 8%">本年累计折旧</th>
            <th style="width: 7%">累计折旧</th>
            <th style="width: 6%">减值准备</th>
            <th style="width: 6%">资产净值</th>
          </tr>
        </thead>
        <tbody>
          ${buildRows(data.rows)}
        </tbody>
      </table>
    </section>`;
}

export function buildDepreciationDetailPrintHtml(data: DepreciationDetailPrintData) {
  return buildPrintDocument(
    data.title || '摊销明细表打印',
    buildDepreciationDetailPrintSection(data),
    `
      @page {
        size: A4 landscape;
        margin: 8mm;
      }

      .depreciation-detail-table th,
      .depreciation-detail-table td {
        font-size: 10px;
        padding: 5px 4px;
      }

      .depreciation-detail-table tbody tr:last-child td {
        font-weight: 600;
      }
    `,
  );
}
