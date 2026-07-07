import { describe, expect, it } from 'vitest';

import subjectOpeningResponse from './__fixtures__/balance-sheet/subject-openings.json';
import voucherDetailResponse from './__fixtures__/balance-sheet/voucher-details.json';
import voucherMainResponse from './__fixtures__/balance-sheet/voucher-mains.json';
import {
  directionForSignedBalance,
  getOpeningSignedBalance,
  signedBalanceBySubjectType,
  sumSignedVoucherAmounts,
} from './balance-sheet-calculation';

const subjectOpenings = subjectOpeningResponse.Result.data.items;
const voucherMains = voucherMainResponse.Result.data.items;
const voucherDetails = voucherDetailResponse.Result.data.items;

describe('balance sheet calculation', () => {
  it('loads the complete uploaded fixture set', () => {
    const voucherIds = new Set(voucherMains.map((voucher) => voucher.rowid));
    const linkedVoucherIds = new Set(
      voucherDetails.map((detail) => detail.voucher_id),
    );

    expect(subjectOpenings).toHaveLength(12);
    expect(voucherMains).toHaveLength(33);
    expect(voucherDetails).toHaveLength(114);
    expect(linkedVoucherIds).toEqual(voucherIds);
  });

  it('uses reverse cumulative opening and keeps carry-forward vouchers once', () => {
    const openingByType = (subjectType: string) =>
      subjectOpenings
        .filter((opening) => String(opening.subject_type) === subjectType)
        .reduce(
          (total, opening) =>
            total
            + getOpeningSignedBalance(
              opening,
              String(opening.balance_direction) === '2' ? '贷' : '借',
            ),
          0,
        );

    const movementByPrefix = (prefix: string) =>
      sumSignedVoucherAmounts(
        voucherDetails
          .filter((detail) => String(detail.account_code).startsWith(prefix))
          .map((detail) => ({
            debit: Number(detail.debit_amount || 0),
            credit: Number(detail.credit_amount || 0),
          })),
        '贷',
      );

    const liabilityOpening = openingByType('2');
    const equityOpening = openingByType('3');
    const liabilityMovement = movementByPrefix('2');
    const equityMovement = movementByPrefix('3');
    const carryForwardVouchers = voucherMains.filter((voucher) =>
      ['结转损益', '结转利润'].includes(String(voucher.business_name)),
    );

    expect(liabilityOpening + equityOpening).toBeCloseTo(-232_738.3, 2);
    expect(liabilityOpening).toBeCloseTo(-174_641.08, 2);
    expect(equityOpening).toBeCloseTo(-58_097.22, 2);
    expect(liabilityMovement).toBeCloseTo(-19_641.08, 2);
    expect(equityMovement).toBeCloseTo(-79_453.6, 2);
    expect(liabilityMovement + equityMovement).toBeCloseTo(-99_094.68, 2);
    expect(carryForwardVouchers).toHaveLength(2);
    expect(
      liabilityOpening
      + equityOpening
      + liabilityMovement
      + equityMovement,
    ).toBeCloseTo(-331_832.98, 2);
  });

  it('does not add profit again after profit and loss accounts are closed', () => {
    const residualProfit = sumSignedVoucherAmounts(
      voucherDetails
        .filter((detail) => /^(5|6)/.test(String(detail.account_code)))
        .map((detail) => ({
          debit: Number(detail.debit_amount || 0),
          credit: Number(detail.credit_amount || 0),
        })),
      '贷',
    );

    expect(residualProfit).toBeCloseTo(0, 2);
  });

  it('falls back to legacy year beginning balance when cumulative fields are empty', () => {
    expect(
      getOpeningSignedBalance(
        {
          beginning_balance: 0,
          debit_balance_sum: 0,
          cebit_balance_sum: 0,
          year_beginning_balance: 79_453.6,
        },
        '贷',
      ),
    ).toBeCloseTo(79_453.6, 2);
  });

  it('preserves a negative year beginning calculated from debit cumulative amount', () => {
    expect(
      getOpeningSignedBalance(
        {
          beginning_balance: 0,
          debit_balance_sum: 4_243.14,
          cebit_balance_sum: 0,
          year_beginning_balance: null,
        },
        '借',
      ),
    ).toBeCloseTo(-4_243.14, 2);
  });

  it('calculates monetary funds year beginning as -224818 from the fixture', () => {
    const prefixes = ['1001', '1002', '1012'];
    let total = 0;

    for (const opening of subjectOpenings) {
      const code = String(opening.subject_code);
      if (!prefixes.some((prefix) => code.startsWith(prefix))) continue;
      const direction = Number(opening.balance_direction) === 2 ? '贷' : '借';
      total += getOpeningSignedBalance(opening, direction);
    }

    expect(total).toBeCloseTo(-224_818, 2);
  });

  it('keeps beginning and ending directions independent after reversal', () => {
    const normalDirection = '借';
    const beginningSigned = 4_243.14;
    const endingSigned = -8_824.8;
    const beginningDirection = directionForSignedBalance(
      normalDirection,
      beginningSigned,
    );
    const endingDirection = directionForSignedBalance(
      normalDirection,
      endingSigned,
    );

    expect(beginningDirection).toBe('借');
    expect(endingDirection).toBe('贷');
    expect(
      signedBalanceBySubjectType(
        Math.abs(beginningSigned),
        beginningDirection,
        1,
      ),
    ).toBeCloseTo(4_243.14, 2);
    expect(
      signedBalanceBySubjectType(
        Math.abs(endingSigned),
        endingDirection,
        1,
      ),
    ).toBeCloseTo(-8_824.8, 2);
  });
});
