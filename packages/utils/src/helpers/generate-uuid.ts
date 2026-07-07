/**
 * 生成32位无序唯一字符串 (UUID去掉横杠)
 */
export function generateUUID(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.getRandomValues) {
    const b = new Uint8Array(16);
    c.getRandomValues(b);
    return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(16).slice(2).padEnd(32, '0').slice(0, 32);
}
