import { describe, expect, it } from 'vitest';

import { calcYearBeginning } from './data';

describe('calcYearBeginning', () => {
  const amounts = {
    beginning_balance: 100,
    debit_balance_sum: 30,
    cebit_balance_sum: 20,
  };

  it.each([1, '借', 'debit'])(
    'uses beginning + credit - debit for debit direction %s',
    (balanceDirection) => {
      expect(
        calcYearBeginning({
          ...amounts,
          balance_direction: balanceDirection,
          subject_type: 2,
        }),
      ).toBe(90);
    },
  );

  it.each([2, '贷', 'credit'])(
    'uses beginning + debit - credit for credit direction %s',
    (balanceDirection) => {
      expect(
        calcYearBeginning({
          ...amounts,
          balance_direction: balanceDirection,
          subject_type: 1,
        }),
      ).toBe(110);
    },
  );
});
