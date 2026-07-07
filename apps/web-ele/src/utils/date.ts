export function formatDateOnly(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';

  // Date instance
  if (value instanceof Date) {
    return formatYmdFromDate(value);
  }

  // number / numeric string
  if (typeof value === 'number') {
    return formatYmdFromTimestamp(value);
  }

  const str = String(value).trim();
  if (!str) return '';

  // milliseconds/seconds timestamp in string
  if (/^\d{10,13}$/.test(str)) {
    return formatYmdFromTimestamp(Number(str));
  }

  // ISO or datetime strings
  if (str.includes('T')) {
    return str.split('T')[0] || '';
  }
  if (str.length >= 10 && str[4] === '-' && str[7] === '-') {
    return str.slice(0, 10);
  }

  const date = new Date(str);
  if (!Number.isNaN(date.getTime())) {
    return formatYmdFromDate(date);
  }

  return str;
}

function formatYmdFromTimestamp(ts: number): string {
  // guess seconds vs ms
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '';
  return formatYmdFromDate(date);
}

function formatYmdFromDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
