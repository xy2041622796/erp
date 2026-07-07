const fs = require('fs');
const p = 'lmbill/apps/web-ele/src/views/erp/finance/Voucher/index.vue';
let s = fs.readFileSync(p, 'utf8');

s = s.replace("const page = ref(50);", "const page = ref(20);");
s = s.replace(":page-sizes=\"[20, 50, 100, 200]\"", ":page-sizes=\"[10, 20, 30, 50, 100]\"");

const oldBlock = `      <div class="mt-3 flex min-h-0 flex-1 flex-col rounded-md border border-border bg-card p-3 shadow-sm">\n        <table class="w-full border-collapse border border-border text-sm">`;
const newBlock = `      <div class="voucher-list-card mt-3 flex min-h-0 flex-1 flex-col rounded-md border border-border bg-card p-3 shadow-sm">\n        <div class="voucher-table-scroll min-h-0 flex-1 overflow-auto">\n          <table class="w-full min-w-[980px] border-collapse border border-border text-sm">`;
if (!s.includes(oldBlock)) throw new Error('top table block not found');
s = s.replace(oldBlock, newBlock);

const oldFooter = `        </table>\n\n        <div class="mt-3 flex items-center justify-between gap-3">`;
const newFooter = `          </table>\n        </div>\n\n        <div class="voucher-pagination mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">`;
if (!s.includes(oldFooter)) throw new Error('footer block not found');
s = s.replace(oldFooter, newFooter);

const styleAnchor = `.print-frame {\n  position: fixed;\n  right: 100%;\n  bottom: 100%;\n  width: 0;\n  height: 0;\n  border: 0;\n  opacity: 0;\n  pointer-events: none;\n}\n`;
const styleInsert = `.voucher-list-card {\n  overflow: hidden;\n}\n\n.voucher-table-scroll {\n  overflow: auto;\n}\n\n.voucher-pagination {\n  flex-shrink: 0;\n}\n\n.print-frame {\n  position: fixed;\n  right: 100%;\n  bottom: 100%;\n  width: 0;\n  height: 0;\n  border: 0;\n  opacity: 0;\n  pointer-events: none;\n}\n`;
if (!s.includes(styleAnchor)) throw new Error('style anchor not found');
s = s.replace(styleAnchor, styleInsert);

fs.writeFileSync(p, s, 'utf8');
console.log('patched voucher index');
