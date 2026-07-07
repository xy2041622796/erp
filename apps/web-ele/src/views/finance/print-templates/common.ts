export function escapeHtml(text: string) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function toMoney(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '';
  const displayValue = Object.is(n, -0) ? 0 : n;
  const text = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return text === '-0.00' ? '0.00' : text;
}

export function toRmbUpper(amount: any): string {
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

export function buildPrintDocument(title: string, body: string, extraStyle = '') {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        * { box-sizing: border-box; }

        html, body {
          margin: 0;
          padding: 0;
          color: #222;
          background: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
          font-size: 12px;
        }

        .print-root {
          padding: 0;
        }

        .print-sheet {
          margin: 0 0 12px 0;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .print-sheet:last-child {
          margin-bottom: 0;
        }

        .print-title {
          text-align: center;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: 6px;
          margin-bottom: 8px;
        }

        .print-meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          color: #444;
          font-size: 12px;
        }

        .print-grid-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px 16px;
          margin-bottom: 10px;
          color: #444;
          font-size: 12px;
        }

        .print-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .print-table th,
        .print-table td {
          border: 1px solid #222;
          padding: 7px 8px;
          vertical-align: top;
          word-break: break-word;
        }

        .print-table th {
          text-align: center;
          font-weight: 600;
        }

        .print-table thead {
          display: table-header-group;
        }

        .print-table tfoot {
          display: table-footer-group;
        }

        .print-table tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .print-footer {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-top: 14px;
          font-size: 12px;
        }

        .print-footer span {
          flex: 1;
          white-space: nowrap;
        }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-medium { font-weight: 600; }
        .muted { color: #666; }

        ${extraStyle}
      </style>
    </head>
    <body>
      <div class="print-root">${body}</div>
    </body>
  </html>`;
}
