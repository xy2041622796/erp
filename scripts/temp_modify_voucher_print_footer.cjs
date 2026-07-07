const fs = require('fs');
const path = require('path');

const filePath = path.resolve('lmbill/apps/web-ele/src/views/erp/finance/Voucher/index.vue');
let s = fs.readFileSync(filePath, 'utf8');

s = s.replace(
  `type Voucher = {\n  id: string;\n  date: string;\n  no: string;\n  attachmentCount: number;\n  isReversed: boolean;\n  lines: VoucherLine[];\n};`,
  `type Voucher = {\n  id: string;\n  date: string;\n  no: string;\n  attachmentCount: number;\n  isReversed: boolean;\n  director?: string;\n  bookkeeper?: string;\n  reviewer?: string;\n  cashier?: string;\n  maker?: string;\n  lines: VoucherLine[];\n};`,
);

s = s.replace(
  `  return \`\n    <section class="voucher-item">\n      <div class="voucher-title">记 账 凭 证</div>\n      <div class="voucher-meta">\n        <span>日期：\${escapeHtml(voucher.date || '—')}</span>\n        <span>凭证字号：\${escapeHtml(voucher.no || '—')}</span>\n        <span>附件：\${escapeHtml(String(voucher.attachmentCount ?? 0))}</span>\n      </div>\n      <table class="voucher-table">\n        <thead>\n          <tr>\n            <th style="width:24%;">摘要</th>\n            <th>会计科目</th>\n            <th style="width:18%;">借方金额</th>\n            <th style="width:18%;">贷方金额</th>\n          </tr>\n        </thead>\n        <tbody>\n          \${rows}\n          <tr>\n            <td class="font-medium">合计</td>\n            <td>\${escapeHtml(voucherTotalUpper(voucher) || '　')}</td>\n            <td class="text-right font-medium">\${escapeHtml(toMoney(totals.debit) || '　')}</td>\n            <td class="text-right font-medium">\${escapeHtml(toMoney(totals.credit) || '　')}</td>\n          </tr>\n        </tbody>\n      </table>\n    </section>\`;`,
  `  return \`\n    <section class="voucher-item">\n      <div class="voucher-title">记 账 凭 证</div>\n      <div class="voucher-meta">\n        <span>日期：\${escapeHtml(voucher.date || '—')}</span>\n        <span>凭证字号：\${escapeHtml(voucher.no || '—')}</span>\n        <span>附件：\${escapeHtml(String(voucher.attachmentCount ?? 0))}</span>\n      </div>\n      <table class="voucher-table">\n        <thead>\n          <tr>\n            <th style="width:24%;">摘要</th>\n            <th>会计科目</th>\n            <th style="width:18%;">借方金额</th>\n            <th style="width:18%;">贷方金额</th>\n          </tr>\n        </thead>\n        <tbody>\n          \${rows}\n          <tr>\n            <td class="font-medium">合计</td>\n            <td>\${escapeHtml(voucherTotalUpper(voucher) || '　')}</td>\n            <td class="text-right font-medium">\${escapeHtml(toMoney(totals.debit) || '　')}</td>\n            <td class="text-right font-medium">\${escapeHtml(toMoney(totals.credit) || '　')}</td>\n          </tr>\n        </tbody>\n      </table>\n      <div class="voucher-footer">\n        <span>主管：\${escapeHtml(voucher.director || '')}</span>\n        <span>记账：\${escapeHtml(voucher.bookkeeper || '')}</span>\n        <span>审核：\${escapeHtml(voucher.reviewer || '')}</span>\n        <span>出纳：\${escapeHtml(voucher.cashier || '')}</span>\n        <span>制单：\${escapeHtml(voucher.maker || '')}</span>\n      </div>\n    </section>\`;`,
);

s = s.replace(
  `        .voucher-table {\n          width: 100%;\n          border-collapse: collapse;\n          table-layout: fixed;\n        }\n        .voucher-table th,\n        .voucher-table td {`,
  `        .voucher-table {\n          width: 100%;\n          border-collapse: collapse;\n          table-layout: fixed;\n        }\n        .voucher-footer {\n          display: flex;\n          justify-content: space-between;\n          gap: 16px;\n          margin-top: 14px;\n          font-size: 12px;\n        }\n        .voucher-footer span {\n          flex: 1;\n          white-space: nowrap;\n        }\n        .voucher-table th,\n        .voucher-table td {`,
);

s = s.replace(
  `      isReversed: Number((main as any)?.is_reversed ?? 0) === 1,\n      lines: (allDetails[i] ?? []).map((d) => ({`,
  `      isReversed: Number((main as any)?.is_reversed ?? 0) === 1,\n      director: '',\n      bookkeeper: '',\n      reviewer: pickNonEmptyText((main as any)?.reviewer),\n      cashier: pickNonEmptyText((main as any)?.cashier),\n      maker: pickNonEmptyText((main as any)?.operator, main.createuser, main.updateuser),\n      lines: (allDetails[i] ?? []).map((d) => ({`,
);

fs.writeFileSync(filePath, s, 'utf8');
console.log('updated voucher print footer');
