import { describe, it, expect } from 'vitest';
import { FUND_CATALOG } from '../config/fund-catalog';

describe('FUND_CATALOG', () => {
  it('エントリが1件以上ある', () => {
    expect(FUND_CATALOG.length).toBeGreaterThan(0);
  });

  it('id が重複していない', () => {
    const ids = FUND_CATALOG.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('全エントリに必須フィールドが揃っている', () => {
    for (const fund of FUND_CATALOG) {
      expect(fund.id, `${fund.id}: id が空`).toBeTruthy();
      expect(fund.nameJa, `${fund.id}: nameJa が空`).toBeTruthy();
      expect(fund.dataSource, `${fund.id}: dataSource が空`).toBeTruthy();
      expect(fund.sourceParams, `${fund.id}: sourceParams が空`).toBeTruthy();
    }
  });

  it('toushin_lib エントリは isinCd と associFundCd を持つ', () => {
    const toushinFunds = FUND_CATALOG.filter((f) => f.dataSource === 'toushin_lib');
    for (const fund of toushinFunds) {
      expect(fund.sourceParams.isinCd, `${fund.id}: isinCd が未設定`).toBeTruthy();
      expect(fund.sourceParams.associFundCd, `${fund.id}: associFundCd が未設定`).toBeTruthy();
    }
  });

  it('isin が設定されているエントリは重複していない', () => {
    const isins = FUND_CATALOG.map((f) => f.isin).filter((v): v is string => Boolean(v));
    expect(new Set(isins).size).toBe(isins.length);
  });
});
