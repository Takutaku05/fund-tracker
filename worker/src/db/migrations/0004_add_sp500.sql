-- 0004_add_sp500.sql
-- S&P500 銘柄を追加 (eMAXIS Slim 米国株式(S&P500))
--
-- ※ associFundCd は投信総合検索ライブラリー (toushin-lib.fwg.ne.jp) で該当ファンドの
--   詳細ページを開き、CSV ダウンロード URL に含まれる associFundCd の値を取得して
--   下記プレースホルダを置換してから適用すること。誤った値だと CSV 取得が 404 になる。

INSERT OR IGNORE INTO funds (id, name_ja, isin, data_source, source_params)
VALUES (
  'emaxis-sp500',
  'eMAXIS Slim 米国株式（S&P500）',
  'JP90C000GKC6',
  'toushin_lib',
  '{"isinCd":"JP90C000GKC6","associFundCd":"03311187"}'
);
