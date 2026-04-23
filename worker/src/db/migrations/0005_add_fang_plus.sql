-- 0005_add_fang_plus.sql
-- FANG+ 銘柄を追加 (iFreeNEXT FANG+インデックス / 大和アセットマネジメント)
--
-- associFundCd は投信総合検索ライブラリー (toushin-lib.fwg.ne.jp) の該当ファンド
-- 詳細ページの CSV ダウンロード URL に含まれる値。この migration では "04311181"
-- を使用する。誤った値だと CSV 取得が 404 になる。

INSERT OR IGNORE INTO funds (id, name_ja, isin, data_source, source_params)
VALUES (
  'ifree-fang-plus',
  'iFreeNEXT FANG+インデックス',
  'JP90C000FZD4',
  'toushin_lib',
  '{"isinCd":"JP90C000FZD4","associFundCd":"04311181"}'
);
