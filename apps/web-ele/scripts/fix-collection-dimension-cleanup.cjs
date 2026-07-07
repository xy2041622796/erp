const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function mustReplace(text, search, replace, label) {
  if (!text.includes(search)) {
    throw new Error(`未找到片段: ${label}`);
  }
  return text.replace(search, replace);
}

const formPath = path.join(root, 'src/views/erp/finance/revenue/submit/modules/form.vue');
let form = fs.readFileSync(formPath, 'utf8');
form = form.replace("import { generateDimensionByCollectionSubmit } from '#/api/erp/finance/dimension';\n", '');
form = form.replace(
  /\n\s*try \{\n\s*await generateDimensionByCollectionSubmit\([\s\S]*?ElMessage\.warning\(\n\s*`保存成功，但业务维度同步失败：[\s\S]*?\n\s*\}\n/,
  '\n',
);
fs.writeFileSync(formPath, form, 'utf8');

const dimPath = path.join(root, 'src/api/erp/finance/dimension/index.ts');
let dim = fs.readFileSync(dimPath, 'utf8');

dim = dim.replace("const COLLECTION_SUBMIT_EVENT_CODE = 'COLLECTION_SUBMIT';\n", '');
dim = dim.replace("const COLLECTION_SUBMIT_BIZ_CATEGORY = '收款';\nconst COLLECTION_SUBMIT_CONFIRM_EVENT_CODE = 'COLLECTION_SUBMIT_CONFIRM';\nconst COLLECTION_SUBMIT_BIZ_CATEGORY = '收款';\n", "const COLLECTION_SUBMIT_CONFIRM_EVENT_CODE = 'COLLECTION_SUBMIT_CONFIRM';\nconst COLLECTION_SUBMIT_BIZ_CATEGORY = '收款';\n");

const extraBlock = /function resolveCollectionAccountSubjectCode\([\s\S]*?export async function getDimensionSetPage\(params: any = \{\}\) \{/;
if (extraBlock.test(dim)) {
  dim = dim.replace(extraBlock, 'export async function getDimensionSetPage(params: any = {}) {');
}

fs.writeFileSync(dimPath, dim, 'utf8');
console.log('cleaned');
