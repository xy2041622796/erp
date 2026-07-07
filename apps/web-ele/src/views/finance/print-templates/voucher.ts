import { moneyNumber, sumByMoney } from '#/utils/finance/decimal-money';
export type VoucherPrintLine = {
  summary: string;
  subject: string;
  debit?: number;
  credit?: number;
};

export type VoucherPrintData = {
  id: string;
  date: string;
  no: string;
  attachmentCount: number;
  company?: string;
  director?: string;
  bookkeeper?: string;
  reviewer?: string;
  cashier?: string;
  maker?: string;
  lines: VoucherPrintLine[];
};

export type VoucherPrintOptions = {
  voucherRows?: number;
  paperSize?: 'A4';
  verticalAlign?: 'center' | 'top';
  fontFamily?: 'KaiTi' | 'Microsoft YaHei' | 'SimSun';
  fontSize?: number;
  orientation?: 'landscape' | 'portrait';
  marginLeft?: number;
  marginRight?: number;
  marginTop?: number;
  marginBottom?: number;
};

type VoucherPrintChunk = {
  voucher: VoucherPrintData;
  index: number;
  pageCount: number;
  lines: VoucherPrintLine[];
  isLastChunk: boolean;
};

function escapeHtml(text: string) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toMoney(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '';
  const absText = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `-${absText}` : absText;
}

function toRmbUpper(amount: any): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  if (n === 0) return '零元整';

  const cnNum = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'] as const;
  const cnUnit = ['', '拾', '佰', '仟'] as const;
  const cnGroup = ['', '万', '亿', '兆'] as const;

  const negative = n < 0;
  const cents = Math.round(Math.abs(n) * 100);
  const yuan = Math.floor(cents / 100);
  const jiao = Math.floor((cents % 100) / 10);
  const fen = cents % 10;

  const fourToCn = (num: number) => {
    let out = '';
    let zero = false;
    for (let i = 0; i < 4; i++) {
      const divisor = 10 ** (3 - i);
      const digit = Math.floor(num / divisor) % 10;
      if (digit === 0) {
        zero = out.length > 0;
        continue;
      }
      if (zero) out += cnNum[0];
      zero = false;
      out += cnNum[digit]! + cnUnit[3 - i]!;
    }
    return out;
  };

  const intToCn = (num: number) => {
    if (num === 0) return cnNum[0];

    const groups: number[] = [];
    let x = num;
    while (x > 0) {
      groups.push(x % 10000);
      x = Math.floor(x / 10000);
    }

    let out = '';
    for (let gi = groups.length - 1; gi >= 0; gi--) {
      const g = groups[gi] ?? 0;
      const part = fourToCn(g);
      if (!part) {
        if (out && gi > 0 && groups.slice(0, gi).some((v) => v && v > 0)) {
          if (!out.endsWith(cnNum[0])) out += cnNum[0];
        }
        continue;
      }

      if (out && g < 1000 && !out.endsWith(cnNum[0])) out += cnNum[0];
      out += part + (cnGroup[gi] ?? '');
    }

    return out;
  };

  let out = `${intToCn(yuan)}元`;
  if (jiao === 0 && fen === 0) {
    out += '整';
  } else {
    if (jiao > 0) out += `${cnNum[jiao]}角`;
    if (jiao === 0 && fen > 0) out += cnNum[0];
    if (fen > 0) out += `${cnNum[fen]}分`;
  }

  return negative ? `负${out}` : out;
}

function voucherTotals(voucher: VoucherPrintData) {
  const debit = moneyNumber(sumByMoney(voucher.lines, (r) => r.debit));
  const credit = moneyNumber(sumByMoney(voucher.lines, (r) => r.credit));
  return { debit, credit };
}

function voucherTotalUpper(voucher: VoucherPrintData) {
  const { debit, credit } = voucherTotals(voucher);
  const base = debit || credit;
  return base ? toRmbUpper(base) : '';
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(num)));
}

function normalizeOptions(options?: VoucherPrintOptions) {
  return {
    voucherRows: clampNumber(options?.voucherRows, 4, 12, 7),
    paperSize: 'A4' as const,
    verticalAlign: options?.verticalAlign === 'center' ? 'center' : 'top',
    fontFamily: (['SimSun', 'Microsoft YaHei', 'KaiTi'] as const).includes(options?.fontFamily as any)
      ? (options?.fontFamily as 'KaiTi' | 'Microsoft YaHei' | 'SimSun')
      : 'SimSun',
    fontSize: clampNumber(options?.fontSize, 11, 16, 13),
    orientation: options?.orientation === 'landscape' ? 'landscape' : 'portrait',
    marginLeft: clampNumber(options?.marginLeft, 0, 50, 18),
    marginRight: clampNumber(options?.marginRight, 0, 50, 12),
    marginTop: clampNumber(options?.marginTop, 0, 50, 8),
    marginBottom: clampNumber(options?.marginBottom, 0, 80, 30),
  };
}

function splitVoucherToChunks(voucher: VoucherPrintData, options: ReturnType<typeof normalizeOptions>): VoucherPrintChunk[] {
  const rowSize = Math.max(1, options.voucherRows);
  const sourceLines = voucher.lines.length > 0
    ? voucher.lines
    : [{ summary: '', subject: '', debit: undefined, credit: undefined }];
  const pageCount = Math.max(1, Math.ceil(sourceLines.length / rowSize));

  return Array.from({ length: pageCount }, (_, index) => {
    const start = index * rowSize;
    const end = start + rowSize;
    return {
      voucher,
      index: index + 1,
      pageCount,
      lines: sourceLines.slice(start, end),
      isLastChunk: index === pageCount - 1,
    };
  });
}

function buildVoucherPrintSection(chunk: VoucherPrintChunk, options: ReturnType<typeof normalizeOptions>) {
  const targetRows = options.voucherRows;
  const paddedLines = [
    ...chunk.lines,
    ...Array.from({ length: Math.max(0, targetRows - chunk.lines.length) }, () => ({
      summary: '',
      subject: '',
      debit: undefined,
      credit: undefined,
    })),
  ];

  const bodyRows = paddedLines
    .map(
      (line) => `
        <tr>
          <td class="voucher-text-cell voucher-content-cell"><div class="voucher-cell-inner voucher-cell-inner-wrap voucher-cell-inner-middle voucher-cell-inner-left">${escapeHtml(line.summary || '　')}</div></td>
          <td class="voucher-text-cell voucher-content-cell"><div class="voucher-cell-inner voucher-cell-inner-wrap voucher-cell-inner-middle voucher-cell-inner-left">${escapeHtml(line.subject || '　')}</div></td>
          <td class="text-right voucher-amount-cell voucher-content-cell"><div class="voucher-cell-inner voucher-cell-inner-single voucher-cell-inner-middle voucher-cell-inner-right">${escapeHtml(toMoney(line.debit) || '　')}</div></td>
          <td class="text-right voucher-amount-cell voucher-content-cell"><div class="voucher-cell-inner voucher-cell-inner-single voucher-cell-inner-middle voucher-cell-inner-right">${escapeHtml(toMoney(line.credit) || '　')}</div></td>
        </tr>`,
    )
    .join('');

  const totals = voucherTotals(chunk.voucher);
  const totalUpper = chunk.isLastChunk ? voucherTotalUpper(chunk.voucher) || '　' : '续页';
  const debitText = chunk.isLastChunk ? escapeHtml(toMoney(totals.debit) || '0.00') : '　';
  const creditText = chunk.isLastChunk ? escapeHtml(toMoney(totals.credit) || '0.00') : '　';
  const pageIndicator =
    chunk.pageCount > 1
      ? `<div class="voucher-page-indicator">[${chunk.index}/${chunk.pageCount}]</div>`
      : '';

  return `
    <section class="voucher-item">
      <div class="voucher-title-row">
        <div class="voucher-title">记账凭证</div>
        ${pageIndicator}
      </div>
      <div class="voucher-head">
        <div class="voucher-head-left">单位：${escapeHtml(chunk.voucher.company || '')}</div>
        <div class="voucher-head-center">日期：${escapeHtml(chunk.voucher.date || '—')}</div>
        <div class="voucher-head-right">
          <span>凭证号：${escapeHtml(chunk.voucher.no || '—')}</span>
          <span>附单据数：${escapeHtml(String(chunk.voucher.attachmentCount ?? 0))}</span>
        </div>
      </div>
      <table class="voucher-table">
        <tbody>
          <tr class="voucher-header-row">
            <td style="width:24%;"><div class="voucher-cell-inner voucher-header-cell-inner">摘要</div></td>
            <td><div class="voucher-cell-inner voucher-header-cell-inner">科目</div></td>
            <td style="width:18%;"><div class="voucher-cell-inner voucher-header-cell-inner">借方金额</div></td>
            <td style="width:18%;"><div class="voucher-cell-inner voucher-header-cell-inner">贷方金额</div></td>
          </tr>
          ${bodyRows}
          <tr>
            <td colspan="2" class="font-medium total-summary-cell"><div class="voucher-cell-inner voucher-cell-inner-wrap voucher-cell-inner-middle voucher-cell-inner-left">合计：${escapeHtml(totalUpper)}</div></td>
            <td class="text-right font-medium voucher-amount-cell voucher-content-cell"><div class="voucher-cell-inner voucher-cell-inner-single voucher-cell-inner-middle voucher-cell-inner-right">${debitText}</div></td>
            <td class="text-right font-medium voucher-amount-cell voucher-content-cell"><div class="voucher-cell-inner voucher-cell-inner-single voucher-cell-inner-middle voucher-cell-inner-right">${creditText}</div></td>
          </tr>
        </tbody>
      </table>
      <div class="voucher-footer">
        <span>主管：${escapeHtml(chunk.voucher.director || '')}</span>
        <span>记账：${escapeHtml(chunk.voucher.bookkeeper || '')}</span>
        <span>审核：${escapeHtml(chunk.voucher.reviewer || '')}</span>
        <span>出纳：${escapeHtml(chunk.voucher.cashier || '')}</span>
        <span>制单：${escapeHtml(chunk.voucher.maker || '')}</span>
      </div>
    </section>`;
}

function buildPaperPages(chunks: VoucherPrintChunk[], options: ReturnType<typeof normalizeOptions>) {
  const pageAlign = options.verticalAlign === 'center' ? 'center' : 'flex-start';
  const papers: string[] = [];

  for (let i = 0; i < chunks.length; i += 2) {
    const current = chunks.slice(i, i + 2);
    const slots = [0, 1]
      .map((slotIndex) => {
        const chunk = current[slotIndex];
        if (!chunk) {
          return '<div class="paper-slot paper-slot-empty"></div>';
        }
        const cutMarks =
          slotIndex === 0
            ? '<div class="paper-cut-marks" aria-hidden="true"><span class="paper-cut-mark paper-cut-mark-left"></span><span class="paper-cut-mark paper-cut-mark-right"></span></div>'
            : '';
        return `<div class="paper-slot">${buildVoucherPrintSection(chunk, options)}${cutMarks}</div>`;
      })
      .join('');

    papers.push(`<div class="paper-page paper-align-${pageAlign}">${slots}</div>`);
  }

  return papers.join('');
}

export function buildVoucherPrintHtml(list: VoucherPrintData[], options?: VoucherPrintOptions) {
  const normalized = normalizeOptions(options);
  const chunks = list.flatMap((item) => splitVoucherToChunks(item, normalized));
  const papers = buildPaperPages(chunks, normalized);
  const titleSize = Math.max(normalized.fontSize + 8, 20);

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>凭证打印</title>
      <style>
        @page {
          size: ${normalized.paperSize} ${normalized.orientation};
          margin: ${normalized.marginTop}mm ${normalized.marginRight}mm ${normalized.marginBottom}mm ${normalized.marginLeft}mm;
        }
        :root {
          --voucher-font-size: ${normalized.fontSize}px;
          --voucher-line-height: 1.15;
          --voucher-row-height: 34px;
          --voucher-cell-padding-y: 0px;
          --voucher-cell-padding-x: 0px;
          --voucher-inner-padding-x: 4px;
          --voucher-inner-padding-y: 2px;
          --voucher-block-gap: 8mm;
          --cut-mark-width: 10mm;
          --cut-mark-height: 1px;
        }
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          color: #222;
          background: #fff;
          font-family: ${normalized.fontFamily}, 'Songti SC', 'STSong', 'Times New Roman', serif;
          font-size: var(--voucher-font-size);
          line-height: var(--voucher-line-height);
        }
        .print-root {
          width: 100%;
        }
        .paper-page {
          min-height: calc(297mm - ${normalized.marginTop + normalized.marginBottom}mm);
          display: flex;
          flex-direction: column;
          gap: var(--voucher-block-gap);
          page-break-after: always;
          break-after: page;
        }
        .paper-page:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .paper-align-center {
          justify-content: center;
        }
        .paper-align-flex-start {
          justify-content: flex-start;
        }
        .paper-slot {
          position: relative;
          flex: 1 1 0;
          min-height: 0;
          display: flex;
        }
        .paper-slot-empty {
          visibility: hidden;
        }
        .paper-cut-marks {
          position: absolute;
          left: 0;
          right: 0;
          bottom: calc(var(--voucher-block-gap) / -2);
          height: 0;
          pointer-events: none;
        }
        .paper-cut-mark {
          position: absolute;
          display: block;
          width: var(--cut-mark-width);
          height: var(--cut-mark-height);
          background: #666;
          top: 0;
        }
        .paper-cut-mark-left {
          left: 0;
        }
        .paper-cut-mark-right {
          right: 0;
        }
        .voucher-item {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          border: 0;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .voucher-title-row {
          position: relative;
          margin-bottom: 2px;
        }
        .voucher-title {
          text-align: center;
          font-size: ${titleSize}px;
          font-weight: 700;
          letter-spacing: 2px;
          line-height: 1.1;
        }
        .voucher-page-indicator {
          position: absolute;
          top: 50%;
          right: 0;
          transform: translateY(-50%);
          font-size: var(--voucher-font-size);
          font-weight: 400;
        }
        .voucher-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(180px, 1fr);
          align-items: end;
          column-gap: 16px;
          margin-bottom: 4px;
          min-height: 24px;
          line-height: 1.15;
        }
        .voucher-head-left {
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-right: 6px;
        }
        .voucher-head-center {
          justify-self: center;
          text-align: center;
          white-space: nowrap;
        }
        .voucher-head-right {
          justify-self: end;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: flex-end;
          gap: 14px;
          min-width: 180px;
          white-space: nowrap;
          line-height: 1.15;
        }
        .voucher-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          flex: 1 1 auto;
        }
        .voucher-table tbody tr {
          height: var(--voucher-row-height);
          min-height: var(--voucher-row-height);
        }
        .voucher-table td {
          height: var(--voucher-row-height);
          border: 1px solid #222;
          padding: var(--voucher-cell-padding-y) var(--voucher-cell-padding-x);
          vertical-align: top;
          word-break: break-word;
          min-height: var(--voucher-row-height);
          line-height: var(--voucher-line-height);
        }
        .voucher-cell-inner {
          display: block;
          min-height: calc(var(--voucher-row-height) - 2px);
          line-height: var(--voucher-line-height);
          padding: var(--voucher-inner-padding-y) var(--voucher-inner-padding-x);
        }
        .voucher-cell-inner-wrap {
          display: -webkit-box;
          max-height: calc(var(--voucher-row-height) - 2px);
          overflow: hidden;
          white-space: normal;
          word-break: break-all;
          overflow-wrap: anywhere;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
        .voucher-cell-inner-single {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .voucher-cell-inner-middle {
          display: flex;
          align-items: center;
          min-height: calc(var(--voucher-row-height) - 2px);
          max-height: calc(var(--voucher-row-height) - 2px);
          overflow: hidden;
        }
        .voucher-cell-inner-wrap.voucher-cell-inner-middle {
          display: -webkit-box;
          align-items: initial;
          line-height: 1.25;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
        .voucher-cell-inner-left {
          justify-content: flex-start;
          text-align: left;
        }
        .voucher-cell-inner-right {
          justify-content: flex-end;
          text-align: right;
        }
        .voucher-text-cell {
          vertical-align: middle;
          overflow: hidden;
        }
        .voucher-content-cell {
          vertical-align: middle !important;
        }
        .voucher-amount-cell {
          vertical-align: middle;
        }
        .voucher-header-row td {
          font-weight: 400;
          text-align: center;
          vertical-align: middle;
        }
        .voucher-header-cell-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          min-height: calc(var(--voucher-row-height) - 2px);
          padding-top: 0;
          padding-bottom: 0;
        }
        .voucher-footer {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-top: 8px;
          font-size: var(--voucher-font-size);
          line-height: 1.15;
        }
        .voucher-footer span {
          white-space: nowrap;
        }
        .text-right { text-align: right; }
        .font-medium { font-weight: 400; }
        .total-summary-cell {
          white-space: normal;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="print-root">${papers}</div>
    </body>
  </html>`;
}
