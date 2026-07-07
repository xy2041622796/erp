import { describe, expect, it } from 'vitest';

import {
  calculateSubjectYearBeginning,
  subjectYearBeginningToDebitPositiveRaw,
} from './subject-opening';

describe('subject opening calculation', () => {
  const opening = {
    beginning_balance: 100,
    debit_balance_sum: 30,
    cebit_balance_sum: 20,
  };

  it('calculates debit-direction opening without removing a negative sign', () => {
    expect(calculateSubjectYearBeginning(opening, '借')).toBe(90);
    expect(
      calculateSubjectYearBeginning(
        {
          beginning_balance: 0,
          debit_balance_sum: 4243.14,
          cebit_balance_sum: 0,
        },
        '借',
      ),
    ).toBe(-4243.14);
  });

  it('calculates credit-direction opening and converts it to debit-positive raw', () => {
    expect(calculateSubjectYearBeginning(opening, '贷')).toBe(110);
    expect(subjectYearBeginningToDebitPositiveRaw(opening, '贷')).toBe(-110);
  });

  it('uses a legacy stored year beginning only when calculation fields are empty', () => {
    expect(
      calculateSubjectYearBeginning(
        {
          beginning_balance: 0,
          debit_balance_sum: 0,
          cebit_balance_sum: 0,
          year_beginning_balance: -88,
        },
        '借',
      ),
    ).toBe(-88);
  });
});
