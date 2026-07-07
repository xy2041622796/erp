const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function replaceOnce(content, searchValue, replaceValue, label) {
  if (!content.includes(searchValue)) {
    throw new Error(`未找到替换锚点: ${label}`);
  }
  return content.replace(searchValue, replaceValue);
}

const dimPath = path.join(root, 'src/api/erp/finance/dimension/index.ts');
let dim = fs.readFileSync(dimPath, 'utf8');

if (!dim.includes("import type { ErpCollectionSubmitApi } from '#/api/erp/finance/revenue/submit';")) {
  dim = replaceOnce(
    dim,
    "import type { ErpSaleReturnApi } from '#/api/erp/sale/return';\n",
    "import type { ErpSaleReturnApi } from '#/api/erp/sale/return';\nimport type { ErpCollectionSubmitApi } from '#/api/erp/finance/revenue/submit';\n",
    'dimension import',
  );
}

if (!dim.includes("const COLLECTION_SUBMIT_EVENT_CODE = 'COLLECTION_SUBMIT';")) {
  dim = replaceOnce(
    dim,
    "const SALE_RETURN_EVENT_CODE = 'SALE_RETURN';\nconst SALE_RETURN_BIZ_CATEGORY = '销售';\n",
    "const SALE_RETURN_EVENT_CODE = 'SALE_RETURN';\nconst SALE_RETURN_BIZ_CATEGORY = '销售';\nconst COLLECTION_SUBMIT_EVENT_CODE = 'COLLECTION_SUBMIT';\nconst COLLECTION_SUBMIT_BIZ_CATEGORY = '收款';\n",
    'dimension const',
  );
}

if (!dim.includes('function resolveCollectionAccountSubjectCode(')) {
  const helperBlock = [
    "function resolveCollectionAccountSubjectCode(submit: ErpCollectionSubmitApi.CollectionSubmit) {",
    "  const accountText = String(",
    "    submit?.collection_account ?? submit?.payer_bank ?? submit?.payer_account ?? '',",
    "  ).trim();",
    "  return /现金/.test(accountText) ? '1001' : '1002';",
    "}",
    "",
    "function resolveCollectionReceivableSubjectCode(submit: ErpCollectionSubmitApi.CollectionSubmit) {",
    "  const incomeType = String(submit?.income_type ?? '').trim();",
    "  return incomeType.includes('预收') ? '2203' : '1122';",
    "}",
    "",
    "function buildCollectionFinancialDimensionDetails(",
    "  setId: string,",
    "  submit: ErpCollectionSubmitApi.CollectionSubmit,",
    "): ErpDimensionApi.DimensionDetail[] {",
    "  const amount = toNumber((submit as any)?.collection_amount, 0);",
    "  const period = formatPeriod(",
    "    (submit as any)?.collection_date || (submit as any)?.createtime || new Date(),",
    "  );",
    "  const accountSubjectCode = resolveCollectionAccountSubjectCode(submit);",
    "  const receivableSubjectCode = resolveCollectionReceivableSubjectCode(submit);",
    "",
    "  return [",
    "    {",
    "      rowid: generateUUID(),",
    "      set_id: setId,",
    "      dim_category: 'FINANCIAL',",
    "      dim_code: 'SUBJECT',",
    "      value_code: accountSubjectCode,",
    "      amount,",
    "      direction: 'INFLOW',",
    "      currency: 'CNY',",
    "      period,",
    "      lingma_sys_is_delete: 0,",
    "    },",
    "    {",
    "      rowid: generateUUID(),",
    "      set_id: setId,",
    "      dim_category: 'FINANCIAL',",
    "      dim_code: 'SUBJECT',",
    "      value_code: receivableSubjectCode,",
    "      amount,",
    "      direction: 'OUTFLOW',",
    "      currency: 'CNY',",
    "      period,",
    "      lingma_sys_is_delete: 0,",
    "    },",
    "  ];",
    "}",
    "",
    "function buildCollectionBizDimensionDetails(",
    "  setId: string,",
    "  submit: ErpCollectionSubmitApi.CollectionSubmit,",
    "): ErpDimensionApi.DimensionDetail[] {",
    "  const period = formatPeriod(",
    "    (submit as any)?.collection_date || (submit as any)?.createtime || new Date(),",
    "  );",
    "  const incomeType = String((submit as any)?.income_type ?? '').trim() || '业务收款';",
    "  const customerId = String((submit as any)?.customer_id ?? '').trim();",
    "  const projectId = String((submit as any)?.project_id ?? '').trim();",
    "  const contractId = String((submit as any)?.contract_id ?? '').trim();",
    "  const accountSubjectCode = resolveCollectionAccountSubjectCode(submit);",
    "  const receivableSubjectCode = resolveCollectionReceivableSubjectCode(submit);",
    "  const financeMapping = `\${incomeType}->借:\${accountSubjectCode},贷:\${receivableSubjectCode}`;",
    "",
    "  return [",
    "    {",
    "      rowid: generateUUID(),",
    "      set_id: setId,",
    "      dim_category: 'BIZ',",
    "      dim_code: 'INCOME_TYPE',",
    "      value_code: incomeType,",
    "      amount: undefined,",
    "      direction: '',",
    "      currency: '',",
    "      period,",
    "      lingma_sys_is_delete: 0,",
    "    },",
    "    {",
    "      rowid: generateUUID(),",
    "      set_id: setId,",
    "      dim_category: 'BIZ',",
    "      dim_code: 'BIZ_TO_FINANCE',",
    "      value_code: financeMapping,",
    "      amount: undefined,",
    "      direction: '',",
    "      currency: '',",
    "      period,",
    "      lingma_sys_is_delete: 0,",
    "    },",
    "    {",
    "      rowid: generateUUID(),",
    "      set_id: setId,",
    "      dim_category: 'ANALYSIS',",
    "      dim_code: 'COLLECTION_STATUS',",
    "      value_code: String((submit as any)?.status ?? 0),",
    "      amount: undefined,",
    "      direction: '',",
    "      currency: '',",
    "      period,",
    "      lingma_sys_is_delete: 0,",
    "    },",
    "    ...(customerId",
    "      ? [{",
    "          rowid: generateUUID(),",
    "          set_id: setId,",
    "          dim_category: 'BIZ',",
    "          dim_code: 'CUSTOMER',",
    "          value_code: customerId,",
    "          amount: undefined,",
    "          direction: '',",
    "          currency: '',",
    "          period,",
    "          lingma_sys_is_delete: 0,",
    "        }]",
    "      : []),",
    "    ...(projectId",
    "      ? [{",
    "          rowid: generateUUID(),",
    "          set_id: setId,",
    "          dim_category: 'BIZ',",
    "          dim_code: 'PROJECT',",
    "          value_code: projectId,",
    "          amount: undefined,",
    "          direction: '',",
    "          currency: '',",
    "          period,",
    "          lingma_sys_is_delete: 0,",
    "        }]",
    "      : []),",
    "    ...(contractId",
    "      ? [{",
    "          rowid: generateUUID(),",
    "          set_id: setId,",
    "          dim_category: 'BIZ',",
    "          dim_code: 'CONTRACT',",
    "          value_code: contractId,",
    "          amount: undefined,",
    "          direction: '',",
    "          currency: '',",
    "          period,",
    "          lingma_sys_is_delete: 0,",
    "        }]",
    "      : []),",
    "  ];",
    "}",
    "",
    "",
  ].join('\n');

  dim = replaceOnce(
    dim,
    'export async function getDimensionSetPage(params: any = {}) {\n',
    `${helperBlock}export async function getDimensionSetPage(params: any = {}) {\n`,
    'collection helper block',
  );
}

if (!dim.includes('export async function removeDimensionByCollectionSubmit(')) {
  dim = replaceOnce(
    dim,
    "export async function generateDimensionBySaleShipment(saleOut: ErpSaleOutApi.SaleOut) {\n",
    "export async function removeDimensionByCollectionSubmit(refId: string) {\n  await softDeleteDimensionByEventAndRef(\n    COLLECTION_SUBMIT_EVENT_CODE,\n    COLLECTION_SUBMIT_BIZ_CATEGORY,\n    refId,\n  );\n}\n\nexport async function generateDimensionBySaleShipment(saleOut: ErpSaleOutApi.SaleOut) {\n",
    'removeDimensionByCollectionSubmit',
  );
}

if (!dim.includes('export async function generateDimensionByCollectionSubmit(')) {
  const appendBlock = [
    '',
    'export async function generateDimensionByCollectionSubmit(',
    '  submit: ErpCollectionSubmitApi.CollectionSubmit,',
    ') {',
    "  const refId = String((submit as any)?.ReportID ?? (submit as any)?.rowid ?? '').trim();",
    '  if (!refId) {',
    "    throw new Error('收款提报缺少 ReportID/rowid，无法生成维度');",
    '  }',
    '',
    '  await removeDimensionByCollectionSubmit(refId);',
    '',
    '  const setTable = createDimensionSetTable();',
    '  const detailTable = createDimensionDetailTable();',
    '',
    '  const setId = generateUUID();',
    '  const bizDate = formatDateTime(',
    '    (submit as any)?.collection_date || (submit as any)?.createtime || new Date(),',
    '  );',
    '  const description = `收款提报 ${String((submit as any)?.ReportID ?? refId)} 自动生成维度`;',
    '',
    '  const setAdded: ErpDimensionApi.DimensionSet[] = [',
    '    {',
    '      rowid: setId,',
    '      event_code: COLLECTION_SUBMIT_EVENT_CODE,',
    '      biz_category: COLLECTION_SUBMIT_BIZ_CATEGORY,',
    '      ref_id: refId,',
    '      biz_date: bizDate,',
    '      description,',
    '      is_voucher_required: 1,',
    "      voucher_no: '',",
    '      lingma_sys_is_delete: 0,',
    '    },',
    '  ];',
    '',
    '  const detailAdded = [',
    '    ...buildCollectionFinancialDimensionDetails(setId, submit),',
    '    ...buildCollectionBizDimensionDetails(setId, submit),',
    '  ];',
    '',
    '  const reqList = [',
    '    ...setTable.getSaveParam(setAdded as any, [], []),',
    '    ...detailTable.getSaveParam(detailAdded as any, [], []),',
    '  ];',
    '',
    '  return await requestClient.post(setTable.saveUrl, reqList, {',
    '    headers: setTable.getRequestHeader(),',
    '  });',
    '}',
    '',
  ].join('\n');
  dim += appendBlock;
}

fs.writeFileSync(dimPath, dim, 'utf8');

const formPath = path.join(root, 'src/views/erp/finance/revenue/submit/modules/form.vue');
let form = fs.readFileSync(formPath, 'utf8');

if (!form.includes("import { generateDimensionByCollectionSubmit } from '#/api/erp/finance/dimension';")) {
  form = replaceOnce(
    form,
    "import {\n  getIncomeSettlementPage,\n  updateIncomeSettlementStatus,\n} from '#/api/erp/finance/revenue/settlement';\n",
    "import {\n  getIncomeSettlementPage,\n  updateIncomeSettlementStatus,\n} from '#/api/erp/finance/revenue/settlement';\nimport { generateDimensionByCollectionSubmit } from '#/api/erp/finance/dimension';\n",
    'form import',
  );
}

if (!form.includes('保存成功，但业务维度同步失败')) {
  form = replaceOnce(
    form,
    "      if (formType.value === 'create') {\n        await syncSettlementStatusAfterSubmitCreated();\n      }\n    }\n\n    await modalApi.close();\n",
    "      if (formType.value === 'create') {\n        await syncSettlementStatusAfterSubmitCreated();\n      }\n\n      try {\n        await generateDimensionByCollectionSubmit({\n          ...values,\n          rowid: submitId,\n          ReportID:\n            (formType.value === 'create'\n              ? (res as any)?.ReportID\n              : values.ReportID) ??\n            formData.value.ReportID ??\n            submitId,\n        });\n      } catch (error: any) {\n        console.error('sync collection submit dimension failed', error);\n        ElMessage.warning(\n          `保存成功，但业务维度同步失败：${error?.message || '请稍后重试'}`\n        );\n      }\n    }\n\n    await modalApi.close();\n",
    'form save hook',
  );
}

fs.writeFileSync(formPath, form, 'utf8');

const skillPath = path.join(root, 'src/views/erp/finance/revenue/submit/skill.md');
let skill = fs.readFileSync(skillPath, 'utf8');
if (!skill.includes('## 收款提报维度同步')) {
  skill += `\n\n## 收款提报维度同步\n- 收款提报保存成功后，会按 \`COLLECTION_SUBMIT\` 事件写入财务维度台账。\n- 维度主表分类为 \`biz_category=收款\`，业务单号优先使用 \`ReportID\`，兜底使用 \`rowid\`。\n- 财务维度会落两条科目映射：\n  - 借方：根据收款账户识别为 \`1001=库存现金\` 或 \`1002=银行存款\`；\n  - 贷方：根据业务类型识别为 \`1122=应收账款\` 或 \`2203=预收账款/合同负债\`。\n- 业务维度新增 \`BIZ_TO_FINANCE\`，用于记录“业务类型 -> 财务科目”的转换内容，同时补充 \`CUSTOMER\`、\`PROJECT\`、\`CONTRACT\` 等业务维度。\n- 同一张提报再次编辑保存时，会先软删除旧维度，再按最新数据重建，避免重复脏数据。\n`;
}
fs.writeFileSync(skillPath, skill, 'utf8');

console.log('patched');
