const fs = require('fs');

const pagePath = 'lmbill/apps/web-ele/src/views/erp/finance/Voucher/index.vue';
let page = fs.readFileSync(pagePath, 'utf8');

const oldCard = `<div class="voucher-list-card mt-3 flex min-h-0 flex-1 flex-col rounded-md border border-border bg-card p-3 shadow-sm">`;
const newCard = `<div
        v-loading="loading"
        element-loading-text="凭证加载中..."
        class="voucher-list-card mt-3 flex min-h-0 flex-1 flex-col rounded-md border border-border bg-card p-3 shadow-sm"
      >`;
if (!page.includes(oldCard)) throw new Error('voucher list card anchor not found');
page = page.replace(oldCard, newCard);

fs.writeFileSync(pagePath, page, 'utf8');
console.log('patched voucher month loading');
