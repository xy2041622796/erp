import Decimal from 'decimal.js';

export type MoneyInput = Decimal.Value | null | undefined;

export type MoneyRoundMode = 'ceil' | 'floor' | 'round';

const MONEY_SCALE = 2;

const ROUNDING_MAP: Record<MoneyRoundMode, Decimal.Rounding> = {
  ceil: Decimal.ROUND_CEIL,
  floor: Decimal.ROUND_FLOOR,
  round: Decimal.ROUND_HALF_UP,
};

export const MoneyDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -20,
  toExpPos: 40,
});

export function toDecimal(value: MoneyInput, fallback: Decimal.Value = 0) {
  if (value === null || value === undefined || value === '') {
    return new MoneyDecimal(fallback);
  }

  try {
    const decimal = new MoneyDecimal(value);
    return decimal.isFinite() ? decimal : new MoneyDecimal(fallback);
  } catch {
    return new MoneyDecimal(fallback);
  }
}

export function roundMoney(value: MoneyInput, mode: MoneyRoundMode = 'round', scale = MONEY_SCALE) {
  return toDecimal(value).toDecimalPlaces(scale, ROUNDING_MAP[mode]);
}

export function moneyNumber(value: MoneyInput, mode: MoneyRoundMode = 'round', scale = MONEY_SCALE) {
  return roundMoney(value, mode, scale).toNumber();
}

export function moneyText(value: MoneyInput, mode: MoneyRoundMode = 'round', scale = MONEY_SCALE) {
  return roundMoney(value, mode, scale).toFixed(scale);
}

export function addMoney(values: MoneyInput[], mode: MoneyRoundMode = 'round', scale = MONEY_SCALE) {
  const total = values.reduce((sum, item) => sum.plus(toDecimal(item)), new MoneyDecimal(0));
  return roundMoney(total, mode, scale);
}

export function subMoney(left: MoneyInput, right: MoneyInput, mode: MoneyRoundMode = 'round', scale = MONEY_SCALE) {
  return roundMoney(toDecimal(left).minus(toDecimal(right)), mode, scale);
}

export function mulMoney(left: MoneyInput, right: MoneyInput, mode: MoneyRoundMode = 'round', scale = MONEY_SCALE) {
  return roundMoney(toDecimal(left).mul(toDecimal(right)), mode, scale);
}

export function divMoney(left: MoneyInput, right: MoneyInput, mode: MoneyRoundMode = 'round', scale = MONEY_SCALE) {
  const divisor = toDecimal(right);
  if (divisor.isZero()) return new MoneyDecimal(0);
  return roundMoney(toDecimal(left).div(divisor), mode, scale);
}

export function clampMoney(value: MoneyInput, min?: MoneyInput, max?: MoneyInput, mode: MoneyRoundMode = 'round', scale = MONEY_SCALE) {
  let next = toDecimal(value);
  if (min !== undefined && next.lessThan(toDecimal(min))) next = toDecimal(min);
  if (max !== undefined && next.greaterThan(toDecimal(max))) next = toDecimal(max);
  return roundMoney(next, mode, scale);
}

export function sumByMoney<T>(items: T[], getter: (item: T) => MoneyInput, mode: MoneyRoundMode = 'round', scale = MONEY_SCALE) {
  return addMoney(items.map((item) => getter(item)), mode, scale);
}
