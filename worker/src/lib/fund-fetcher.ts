import type { FundRow, ParsedNavRow } from '../types';
import { fetchNavFromToushinLib, type ToushinLibParams } from './emaxis';

/**
 * 銘柄の data_source に応じて適切な fetcher を呼び分ける
 */
export async function fetchNavForFund(fund: FundRow): Promise<ParsedNavRow[]> {
  switch (fund.data_source) {
    case 'toushin_lib': {
      const params = parseSourceParams<ToushinLibParams>(fund);
      if (!params.isinCd || !params.associFundCd) {
        throw new Error(
          `[fund:${fund.id}] toushin_lib requires isinCd and associFundCd in source_params`
        );
      }
      return fetchNavFromToushinLib({ isinCd: params.isinCd, associFundCd: params.associFundCd });
    }
    default: {
      const exhaustive: never = fund.data_source;
      throw new Error(`[fund:${fund.id}] unknown data_source: ${String(exhaustive)}`);
    }
  }
}

function parseSourceParams<T>(fund: FundRow): Partial<T> {
  try {
    return JSON.parse(fund.source_params) as Partial<T>;
  } catch (err) {
    throw new Error(`[fund:${fund.id}] invalid source_params JSON: ${String(err)}`);
  }
}
