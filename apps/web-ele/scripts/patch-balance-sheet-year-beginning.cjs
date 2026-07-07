const fs = require('fs');
const path = require('path');

function replaceOrThrow(source, searchValue, replaceValue, label) {
  if (!source.includes(searchValue)) {
    throw new Error(`未找到待替换片段: ${label}`);
  }
  return source.replace(searchValue, replaceValue);
}

const files = [
  'src/api/erp/finance/reports/index.ts',
  'src/views/erp/finance/reports/balance-sheet/index.vue',
  'src/views/erp/finance/print-templates/balance-sheet.ts',
  'skills/FinanceBalanceSheetReport.skill.md',
];

const baseDir = process.cwd();

for (const rel of files) {
  const abs = path.join(baseDir, rel);
  let content = fs.readFileSync(abs, 'utf8');

  if (rel === 'src/api/erp/finance/reports/index.ts') {
    content = replaceOrThrow(
      content,
      "function getOpeningAbs(opening?: BilSubjectOpeningApi.SubjectOpening) {\n  return Number(opening?.beginning_balance ?? opening?.year_beginning_balance ?? 0) || 0;\n}\n",
      "function getOpeningAbs(opening?: BilSubjectOpeningApi.SubjectOpening) {\n  return Number(opening?.beginning_balance ?? opening?.year_beginning_balance ?? 0) || 0;\n}\n\nfunction getYearBeginningAbs(opening?: BilSubjectOpeningApi.SubjectOpening) {\n  return Number(opening?.year_beginning_balance ?? 0) || 0;\n}\n",
      'add getYearBeginningAbs',
    );

    content = replaceOrThrow(
      content,
      "      const openingAbs = getOpeningAbs(opening);\n      const agg = aggMap.get(code) || { ytdDebit: 0, ytdCredit: 0, monthDebit: 0, monthCredit: 0 };\n      const ytdBeforeDebit = agg.ytdDebit - agg.monthDebit;\n      const ytdBeforeCredit = agg.ytdCredit - agg.monthCredit;\n      const ytdBeforeMoveSigned = dir === '借' ? ytdBeforeDebit - ytdBeforeCredit : ytdBeforeCredit - ytdBeforeDebit;\n      const monthMoveSigned = dir === '借' ? agg.monthDebit - agg.monthCredit : agg.monthCredit - agg.monthDebit;\n      const beginningSigned = openingAbs + ytdBeforeMoveSigned;\n      const endingSigned = beginningSigned + monthMoveSigned;\n",
      "      const yearBeginningAbs = getYearBeginningAbs(opening);\n      const agg = aggMap.get(code) || { ytdDebit: 0, ytdCredit: 0, monthDebit: 0, monthCredit: 0 };\n      const ytdMoveSigned = dir === '借' ? agg.ytdDebit - agg.ytdCredit : agg.ytdCredit - agg.ytdDebit;\n      const endingSigned = yearBeginningAbs + ytdMoveSigned;\n",
      'balance sheet year beginning logic',
    );

    content = replaceOrThrow(
      content,
      "        beginningBalance: Math.abs(beginningSigned),\n",
      "        beginningBalance: Math.abs(yearBeginningAbs),\n",
      'beginningBalance assignment',
    );
  }

  if (rel === 'src/views/erp/finance/reports/balance-sheet/index.vue') {
    content = replaceOrThrow(
      content,
      '<thead><tr><th>资产</th><th class="w-line">行次</th><th class="w-amount">期末余额</th><th class="w-amount">月初余额</th><th>负债和所有者权益</th><th class="w-line">行次</th><th class="w-amount">期末余额</th><th class="w-amount">月初余额</th></tr></thead>',
      '<thead><tr><th>资产</th><th class="w-line">行次</th><th class="w-amount">期末余额</th><th class="w-amount">年初余额</th><th>负债和所有者权益</th><th class="w-line">行次</th><th class="w-amount">期末余额</th><th class="w-amount">年初余额</th></tr></thead>',
      'page table header labels',
    );
  }

  if (rel === 'src/views/erp/finance/print-templates/balance-sheet.ts') {
    content = replaceOrThrow(
      content,
      '<th style="width: 13%;">月初余额</th>',
      '<th style="width: 13%;">年初余额</th>',
      'print header first month->year',
    );
    content = replaceOrThrow(
      content,
      '<th style="width: 13%;">月初余额</th>',
      '<th style="width: 13%;">年初余额</th>',
      'print header second month->year',
    );
  }

  if (rel === 'skills/FinanceBalanceSheetReport.skill.md') {
    content = `# FinanceBalanceSheetReport\n\n- 页面入口：\`apps/web-ele/src/views/erp/finance/reports/balance-sheet/index.vue\`\n- 相关接口：\`apps/web-ele/src/api/erp/finance/reports/index.ts\` 中的 \`fetchBalanceSheetReport\`\n- 关联接口：\`apps/web-ele/src/api/erp/finance/settings/accountset\` 中的 \`getAccountCurrentAccount\`\n- 页面能力：展示资产负债表，按资产、负债和所有者权益两栏对照显示期末余额与年初余额，并支持打印、导出、报表分享、刷新。\n- 当前筛选交互：\n  - 顶部期间按钮使用系统主题色展示当前会计月份\n  - 鼠标 hover 后展开筛选面板\n  - 面板内使用“年份下拉 + 月份下拉”选择会计期间\n  - 点击“确定”后应用筛选，点击“重置”恢复到当前自然月\n- 页面计算逻辑：\n  - 页面基于接口返回的 \`assetRows\`、\`liabilityRows\`、\`equityRows\` 按科目前缀归集标准报表行\n  - 资产负债表中的“年初余额”取上一年度 12 月期末余额，对应接口字段 \`year_beginning_balance\`；当年建账时年初余额按 0 展示\n  - 资产负债表中的“期末余额”按所选月份结账后的余额展示，即年初余额加本年截至所选月份的累计发生额\n  - 自动汇总流动资产、非流动资产、流动负债、非流动负债、所有者权益及总计行\n- 适用场景：统一财务报表顶部筛选体验，并确保资产负债表的“年初余额 / 期末余额”口径符合财务报表定义。\n`;
  }

  fs.writeFileSync(abs, content, 'utf8');
  console.log(`patched: ${rel}`);
}
