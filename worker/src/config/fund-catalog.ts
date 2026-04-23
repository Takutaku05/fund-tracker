import type { FundDataSource } from '../types';

export interface FundDefinition {
  id: string;
  nameJa: string;
  nameEn?: string;
  isin?: string;
  ticker?: string;
  dataSource: FundDataSource;
  sourceParams: Record<string, string | number | boolean>;
  currency?: string;
  unitLabel?: string;
  /** false にするとcronのNAV取得から除外（DB行は残る） */
  enabled?: boolean;
}

// 銘柄を追加する場合はこの配列にエントリを追加するだけ。
// デプロイ後の初回 cron 実行で DB に自動反映される。
// 配列からエントリを削除した場合、対応する DB 行は enabled=0 に落ちるだけで物理削除はされない
// （nav_history の外部キー整合性を保つため）。完全に消したい場合は手動で DELETE すること。
export const FUND_CATALOG: FundDefinition[] = [
  {
    id: 'emaxis-ac',
    nameJa: 'eMAXIS Slim 全世界株式（オール・カントリー）',
    isin: 'JP90C000H1T1',
    dataSource: 'toushin_lib',
    sourceParams: { isinCd: 'JP90C000H1T1', associFundCd: '0331418A' },
  },
  {
    id: 'emaxis-sp500',
    nameJa: 'eMAXIS Slim 米国株式（S&P500）',
    isin: 'JP90C000GKC6',
    dataSource: 'toushin_lib',
    sourceParams: { isinCd: 'JP90C000GKC6', associFundCd: '03311187' },
  },
];
