const fs = require('fs');
const path = require('path');

const filePath = path.resolve('lmbill/apps/web-ele/src/views/erp/finance/Voucher/index.vue');
let s = fs.readFileSync(filePath, 'utf8');

s = s.replace(
  "import type { ErpVoucherApi } from '#/api/erp/finance/voucher';\n",
  "import type { ErpVoucherApi } from '#/api/erp/finance/voucher';\nimport { buildVoucherPrintHtml, type VoucherPrintData } from '../print-templates/voucher';\n",
);

s = s.replace(
  /function escapeHtml\([\s\S]*?function printVoucher\(v: Voucher\) \{\n/s,
  `function toVoucherPrintData(v: Voucher): VoucherPrintData {\n  return {\n    id: v.id,\n    date: v.date,\n    no: v.no,\n    attachmentCount: v.attachmentCount,\n    director: v.director,\n    bookkeeper: v.bookkeeper,\n    reviewer: v.reviewer,\n    cashier: v.cashier,\n    maker: v.maker,\n    lines: v.lines.map((line) => ({ ...line })),\n  };\n}\n\nfunction printVoucher(v: Voucher) {\n`,
);

s = s.replace(
  "  const html = buildPrintHtml(list.map(cloneVoucher));\n",
  "  const html = buildVoucherPrintHtml(list.map(toVoucherPrintData));\n",
);

fs.writeFileSync(filePath, s, 'utf8');
console.log('refactored voucher print template');
