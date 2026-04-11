# Fund Tracker

Cloudflare 関連サービス (Workers, D1, Pages) を活用した、eMAXIS Slim 全世界株式（オール・カントリー）の基準価額・下落率トラッカーです。

## 主な機能
- **全期間最高値からの下落率**: データベース全レコードの最高値からの下落率を常時表示
- **期間ピーク下落率**: 選択した期間（1W / 1M / 3M / 6M / 1Y / ALL）の最高値からの下落率（ドローダウン）をリアルタイムで表示
- **基準価額チャート**: 期間内の価格推移をグラフで表示し、ピーク値に参照線を描画
- **自動データ収集**: 毎日 18:00 JST に最新の基準価額を取得して保存

## 技術スタック
- **バックエンド**: Cloudflare Workers, Hono, TypeScript
- **データベース**: Cloudflare D1 (SQLite)
- **フロントエンド**: Cloudflare Pages, React, Vite, Recharts, TypeScript

## アーキテクチャ
- **Cron Trigger**: 毎日 18:00 JST に投資信託協会の投信総合検索ライブラリー CSV API から最新の基準価額を取得して D1 に保存します。
- **Workers API**: フロントエンド向けに最新の基準価額、全期間最高値、履歴データを提供します。
- **Pages**: Vite と React で構築された UI をホスティングし、ユーザーの端末にリアルタイムで計算結果を表示します。

## 使い方 (ローカル開発)

### 1. バックエンド (Worker) のセットアップ

`worker/wrangler.toml` 内の以下の環境変数を必要に応じて変更してください。
- `FUND_CD`: ファンドコード (デフォルト: "253425")

依存パッケージをインストールしてローカル DB を初期化し、開発サーバーを起動します:
```bash
cd worker
npm install
npm run db:init
npm run dev
```

### 2. フロントエンド (Web) の起動
新しいターミナルを開き、フロントエンドを起動します:
```bash
cd web
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開くと、期間タブ切り替えに連動した下落率カードとチャートが確認できます。

## デプロイ方法

### 1. Cloudflare D1
```bash
cd worker
# D1 データベースを作成 (初回のみ)
npx wrangler d1 create fund-tracker-db

# 出力された database_id を wrangler.toml に反映

# リモート DB を初期化
npm run db:init:remote
```

### 2. Cloudflare Workers
```bash
cd worker
npm run deploy
```

### 3. Cloudflare Pages
1. Cloudflare Pages ダッシュボードから「Create a project」>「Connect to Git」を選択
2. このリポジトリを選択
3. ビルド設定
   - Framework preset: `Vite`
   - Build command: `npm run build` (ルートではないので `cd web && npm run build` にする等の工夫が必要、または monorepo 対応の設定)
   - Build output directory: `dist`
4. 環境変数設定
   - `VITE_API_BASE`: デプロイされた Worker の URL (例: `https://fund-tracker-worker.your-subdomain.workers.dev`)

## データソース
- 基準価額データは [投信総合検索ライブラリー](https://toushin-lib.fwg.ne.jp/FdsWeb/) (投資信託協会) の CSV API を使用しています。
- ISIN コード: `JP90C000H1T1` / ファンドコード: `0331418A`