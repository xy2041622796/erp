const fs = require('fs');
const p = 'lmbill/apps/web-ele/src/views/erp/finance/Voucher/modules/form.vue';
let s = fs.readFileSync(p, 'utf8');

const oldImport = `} from '#/api/erp/finance/voucher';
import { assertPeriodNotClosedByDate } from '#/api/erp/finance/period-status';`;
const newImport = `} from '#/api/erp/finance/voucher';
import {
  assertPeriodNotClosedByDate,
  getPeriodStatusList,
} from '#/api/erp/finance/period-status';`;
if (!s.includes(oldImport)) throw new Error('import anchor not found');
s = s.replace(oldImport, newImport);

const anchor = `function getMonthIsoRange(value: number) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0).toISOString();
  const end = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
  return [start, end] as const;
}
`;
const insert = `${anchor}
function addMonths(dateValue: number | string | Date, months: number) {
  const date = dateValue instanceof Date ? new Date(dateValue.getTime()) : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return new Date();
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, monthEnd));
  return date;
}

function getMonthStartTimestamp(dateValue: number | string | Date) {
  const date = dateValue instanceof Date ? new Date(dateValue.getTime()) : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return Date.now();
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0).getTime();
}

async function resolveCreateDefaultDate() {
  try {
    const rows = await getPeriodStatusList();
    const closedRows = (rows || []).filter((item) => Number(item?.close_status || 0) === 1);
    if (!closedRows.length) return Date.now();

    closedRows.sort((a, b) => {
      const yearDiff = Number(b?.fiscal_year || 0) - Number(a?.fiscal_year || 0);
      if (yearDiff !== 0) return yearDiff;
      return Number(b?.period_month || 0) - Number(a?.period_month || 0);
    });

    const latestClosed = closedRows[0];
    const baseDate = new Date(
      Number(latestClosed?.fiscal_year || 0),
      Number(latestClosed?.period_month || 1) - 1,
      1,
    );
    return getMonthStartTimestamp(addMonths(baseDate, 1));
  } catch (error) {
    console.error(error);
    return Date.now();
  }
}
`;
if (!s.includes(anchor)) throw new Error('range anchor not found');
s = s.replace(anchor, insert);

const handleNewOld = `  form.date = Date.now();`;
const handleNewNew = `  form.date = await resolveCreateDefaultDate();`;
if (!s.includes(handleNewOld)) throw new Error('handleNew date anchor not found');
s = s.replace(handleNewOld, handleNewNew);

const resetOld = `  syncMakerFromCurrentUser();
  await syncVoucherNoByMonth({ silent: true });
}`;
const resetNew = `  syncMakerFromCurrentUser();
  form.date = await resolveCreateDefaultDate();
  await syncVoucherNoByMonth({ silent: true });
}`;
const resetStart = s.indexOf('async function resetForNextCreate()');
const resetIdx = s.indexOf(resetOld, resetStart);
if (resetIdx === -1) throw new Error('reset block not found');
s = s.slice(0, resetIdx) + resetNew + s.slice(resetIdx + resetOld.length);

fs.writeFileSync(p, s, 'utf8');
console.log('patched form.vue');
