import { getAccountCurrentAccount } from '#/api/erp/finance/settings/accountset';
import { getStoredAccountSetName } from '#/utils/accountSet';

export function escapeHtml(text: any) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function toNumber(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function toCount(value: any) {
  const n = toNumber(value);
  if (!n) return '';
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export function toMoney(value: any) {
  const n = toNumber(value);
  if (!n) return '';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function toMoneyText(value: any) {
  const n = toNumber(value);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function toRmbUpper(value: any) {
  const n = toNumber(value);
  if (n === 0) return '零元整';

  const cnNum = [
    '零',
    '壹',
    '贰',
    '叁',
    '肆',
    '伍',
    '陆',
    '柒',
    '捌',
    '玖',
  ] as const;
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
      out += (cnNum[digit] ?? '') + (cnUnit[3 - i] ?? '');
    }
    return out;
  };

  const intToCn = (num: number) => {
    if (num === 0) return cnNum[0];
    const groups: number[] = [];
    let x = num;
    while (x > 0) {
      groups.push(x % 10_000);
      x = Math.floor(x / 10_000);
    }

    let out = '';
    for (let gi = groups.length - 1; gi >= 0; gi--) {
      const groupValue = groups[gi] ?? 0;
      const part = fourToCn(groupValue);
      if (!part) {
        if (
          out &&
          gi > 0 &&
          groups.slice(0, gi).some((v) => v > 0) &&
          !out.endsWith(cnNum[0])
        ) {
          out += cnNum[0];
        }
        continue;
      }
      if (out && groupValue < 1000 && !out.endsWith(cnNum[0])) out += cnNum[0];
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

export function formatDate(value: any) {
  if (!value) return '';
  if (typeof value === 'string') {
    const matched = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (matched) return matched[1] || '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? '');
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getErpPrintCompanyName() {
  const stored = String(getStoredAccountSetName() ?? '').trim();
  if (stored) return stored;
  try {
    const res = await getAccountCurrentAccount({ pageNo: 1, page: 1 });
    const account = (res?.list ?? [])[0] as any;
    return String(account?.account_name ?? account?.description ?? '').trim();
  } catch {
    return '';
  }
}

export function buildErpPrintDocument(
  title: string,
  body: string,
  extraStyle = '',
) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: A5 landscape; margin: 7mm; }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        color: #222;
        background: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        font-size: 11px;
      }
      .erp-print-root { width: 100%; }
      .erp-print-sheet { width: 100%; break-after: page; page-break-after: always; }
      .erp-print-sheet:last-child { break-after: auto; page-break-after: auto; }
      .erp-print-company { text-align: center; font-size: 12px; margin-bottom: 2px; }
      .erp-print-title { text-align: center; font-size: 20px; font-weight: 700; letter-spacing: 4px; margin-bottom: 6px; }
      .erp-print-meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px 10px; margin-bottom: 6px; }
      .erp-print-meta div { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .erp-print-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .erp-print-table th, .erp-print-table td { border: 1px solid #222; padding: 4px 5px; vertical-align: top; word-break: break-word; }
      .erp-print-table th { text-align: center; font-weight: 600; }
      .erp-print-table thead { display: table-header-group; }
      .erp-print-table tfoot { display: table-footer-group; }
      .erp-print-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid #222; border-top: 0; }
      .erp-print-summary div { padding: 4px 6px; border-right: 1px solid #222; }
      .erp-print-summary div:last-child { border-right: 0; }
      .erp-print-remark { margin-top: 6px; min-height: 18px; }
      .erp-print-sign { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 12px; }
      .erp-print-sign span { white-space: nowrap; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .muted { color: #666; }
      @media print {
        a[href]::after { content: '' !important; }
      }
      ${extraStyle}
    </style>
  </head>
  <body><div class="erp-print-root">${body}</div></body>
</html>`;
}

export async function writePrintHtmlAndPrint(html: string) {
  const iframe = document.createElement('iframe');
  iframe.src = 'about:blank';
  iframe.style.position = 'fixed';
  iframe.style.right = '100%';
  iframe.style.bottom = '100%';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.append(iframe);
  try {
    const doc = iframe.contentWindow?.document;
    if (!doc) throw new Error('无法获取打印文档');
    doc.open();
    doc.write(html);
    doc.close();
    await new Promise((resolve) => setTimeout(resolve, 120));
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  } finally {
    setTimeout(() => iframe.remove(), 1000);
  }
}
