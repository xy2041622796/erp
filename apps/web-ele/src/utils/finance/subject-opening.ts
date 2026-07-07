export type SubjectBalanceDirection = '借' | '贷';

export type SubjectOpeningAmounts = {
  balance_direction?: null | number | string;
  beginning_balance?: null | number;
  cebit_balance_sum?: null | number;
  debit_balance_sum?: null | number;
  year_beginning_balance?: null | number;
};

function finiteNumber(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function normalizeSubjectBalanceDirection(
  value: unknown,
): SubjectBalanceDirection {
  const direction = String(value ?? '')
    .trim()
    .toLowerCase();
  return direction === '2' ||
    direction === '贷' ||
    direction === '贷方' ||
    direction === 'credit'
    ? '贷'
    : '借';
}

export function calculateSubjectYearBeginning(
  opening: SubjectOpeningAmounts | undefined,
  directionValue?: unknown,
) {
  if (!opening) return 0;

  const direction = normalizeSubjectBalanceDirection(
    directionValue ?? opening.balance_direction,
  );
  const beginning = finiteNumber(opening.beginning_balance);
  const debit = finiteNumber(opening.debit_balance_sum);
  const credit = finiteNumber(opening.cebit_balance_sum);
  const hasCalculationAmounts =
    Math.abs(beginning) > 1e-9 ||
    Math.abs(debit) > 1e-9 ||
    Math.abs(credit) > 1e-9 ||
    opening.year_beginning_balance === null ||
    opening.year_beginning_balance === undefined;

  if (hasCalculationAmounts) {
    return direction === '贷'
      ? beginning + debit - credit
      : beginning + credit - debit;
  }

  return finiteNumber(opening.year_beginning_balance);
}

export function subjectYearBeginningToDebitPositiveRaw(
  opening: SubjectOpeningAmounts | undefined,
  directionValue?: unknown,
) {
  const direction = normalizeSubjectBalanceDirection(
    directionValue ?? opening?.balance_direction,
  );
  const amount = calculateSubjectYearBeginning(opening, direction);
  return direction === '贷' ? -amount : amount;
}
