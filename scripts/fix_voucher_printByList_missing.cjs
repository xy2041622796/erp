const fs = require('fs');
const path = require('path');

const filePath = path.resolve('lmbill/apps/web-ele/src/views/erp/finance/Voucher/index.vue');
let s = fs.readFileSync(filePath, 'utf8');

const anchor = `function printVoucher(v: Voucher) {\n  printByList([v]);\n}\n`;
const insert = `async function printByList(list: Voucher[]) {\n  if (list.length === 0) {\n    ElMessage.warning('请先选择需要打印的凭证');\n    return;\n  }\n\n  await nextTick();\n  const iframe = printFrameRef.value;\n  const win = iframe?.contentWindow;\n  const doc = iframe?.contentDocument || win?.document;\n  if (!iframe || !win || !doc) {\n    ElMessage.error('打印容器初始化失败');\n    return;\n  }\n\n  printLoading.value = true;\n  const html = buildVoucherPrintHtml(list.map(toVoucherPrintData));\n\n  doc.open();\n  doc.write(html);\n  doc.close();\n\n  window.setTimeout(() => {\n    try {\n      win.focus();\n      win.print();\n    } finally {\n      printLoading.value = false;\n    }\n  }, 120);\n}\n\nfunction printVoucher(v: Voucher) {\n  printByList([v]);\n}\n`;

if (!s.includes('async function printByList(list: Voucher[])')) {
  s = s.replace(anchor, insert);
}

fs.writeFileSync(filePath, s, 'utf8');
console.log('fixed missing printByList');
