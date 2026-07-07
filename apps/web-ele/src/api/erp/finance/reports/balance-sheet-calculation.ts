import { calculateSubjectYearBeginning } from '#/utils/finance/subject-opening';

export type BalanceDirection = '借' | '贷';

export type OpeningBalanceLike = {
  beginning_balance?: number | null;
  cebit_balance_sum?: number | null;
  debit_balance_sum?: number | null;
  year_beginning_balance?: number | null;
};

export type VoucherAmountLike = {
  credit: number;
  debit: number;
};

function finiteNumber(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function signedAmountByBalanceDirection(
  direction: BalanceDirection,
  debit: number,
  credit: number,
) {
  return direction === '借' ? debit - credit : credit - debit;
}

export function directionForSignedBalance(
  normalDirection: BalanceDirection,
  signedBalance: number,
) {
  if (signedBalance >= 0) return normalDirection;
  return normalDirection === '借' ? '贷' : '借';
}

export function signedBalanceBySubjectType(
  amount: number,
  direction: BalanceDirection,
  subjectType: number,
) {
  const normalDirection: BalanceDirection = subjectType === 1 ? '借' : '贷';
  const absoluteAmount = Math.abs(finiteNumber(amount));
  return direction === normalDirection ? absoluteAmount : -absoluteAmount;
}

/**
 * Matches the subject-opening page formula:
 * year beginning = beginning balance + directional cumulative movement.
 */
export function getOpeningSignedBalance(
  opening: OpeningBalanceLike | undefined,
  direction: BalanceDirection,
) {
  return calculateSubjectYearBeginning(opening, direction);
}

export function sumSignedVoucherAmounts(
  amounts: VoucherAmountLike[],
  direction: BalanceDirection,
) {
  return amounts.reduce(
    (total, amount) =>
      total
      + signedAmountByBalanceDirection(
        direction,
        finiteNumber(amount.debit),
        finiteNumber(amount.credit),
      ),
    0,
  );
}
