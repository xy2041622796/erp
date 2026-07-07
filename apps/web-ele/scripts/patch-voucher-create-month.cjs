const fs = require('fs');
const path = require('path');

function replaceExact(source, before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`未找到待替换片段: ${label}`);
  }
  return source.replace(before, after);
}

const root = process.cwd();
const indexFile = path.join(root, 'lmbill/apps/web-ele/src/views/erp/finance/Voucher/index.vue');
const skillFile = path.join(root, 'lmbill/apps/web-ele/src/views/erp/finance/Voucher/skills.md');

let indexContent = fs.readFileSync(indexFile, 'utf8');
indexContent = replaceExact(
  indexContent,
  `function formatYYYYMM(ts: number) {\n  const d = new Date(ts);\n  const y = d.getFullYear();\n  const m = String(d.getMonth() + 1).padStart(2, '0');\n  return \`\${y}\${m}\`;\n}\n`,
  `function formatYYYYMM(ts: number) {\n  const d = new Date(ts);\n  const y = d.getFullYear();\n  const m = String(d.getMonth() + 1).padStart(2, '0');\n  return \`\${y}\${m}\`;\n}\n\nfunction getCreateVoucherTimestampByMonth(monthText: string) {\n  const [yearText, monthNoText] = String(monthText || '').split('-');\n  const year = Number(yearText);\n  const monthNo = Number(monthNoText);\n  if (!year || !monthNo || monthNo < 1 || monthNo > 12) {\n    return Date.now();\n  }\n  return new Date(year, monthNo - 1, 1, 0, 0, 0, 0).getTime();\n}\n`,
  'insert create timestamp helper',
);

indexContent = replaceExact(
  indexContent,
  `function openCreate() {\n  formModalApi.setData({ type: 'create' }).open();\n}\n`,
  `function openCreate() {\n  formModalApi\n    .setData({\n      type: 'create',\n      initial: {\n        date: getCreateVoucherTimestampByMonth(monthValue.value),\n      },\n    })\n    .open();\n}\n`,
  'openCreate',
);
fs.writeFileSync(indexFile, indexContent, 'utf8');

let skillContent = fs.readFileSync(skillFile, 'utf8');
skillContent = replaceExact(
  skillContent,
  `- 新增凭证时，默认日期优先读取 \`localStorage[finance_voucher_last_date]\`\n`,
  `- 新增凭证时，若从凭证列表页直接点击“新增凭证”，会优先使用当前列表过滤月份作为默认凭证月份\n- 例如当前列表过滤在 \`2026-03\`，则新开凭证默认日期会落在 \`2026-03-01\`，不再沿用上次缓存日期或自动推导出的其他月份\n- 新增凭证时，默认日期优先读取 \`localStorage[finance_voucher_last_date]\`\n`,
  'skill abilities',
);
skillContent = replaceExact(
  skillContent,
  `- 顶部月份按钮切换当前会计期间\n`,
  `- 顶部月份按钮切换当前会计期间\n- 点击“新增凭证”时，会把当前列表的 \`monthValue\` 透传给凭证弹窗作为 \`initial.date\`\n`,
  'skill interaction',
);
fs.writeFileSync(skillFile, skillContent, 'utf8');

console.log('patched');
