# Fund Tracker

Cloudflare 関連サービス (Workers, D1, Pages) を活用した、eMAXIS Slim 全世界株式（オール・カントリー）の基準価額および評価額トラッカーです。

## 技術スタック
- **バックエンド**: Cloudflare Workers, Hono, TypeScript
- **データベース**: Cloudflare D1 (SQLite)
- **フロントエンド**: Cloudflare Pages, React, Vite, Recharts, TypeScript

## アーキテクチャ
- **Cron Trigger**: 毎日 18:00 JST に eMAXIS の CSV API から最新の基準価額を取得して D1 に保存します。
- **Workers API**: フロントエンド向けに最新の基準価額、評価額、履歴データを提供します。
- **Pages**: Vite と React で構築された UI をホスティングし、ユーザーの端末にリアルタイムで計算結果を表示します。

## 使い方 (ローカル開発)

### 1. 準備
```bash
# パッケージをインストール
npm install
```

### 2. バックエンド (Worker) のセットアップ

`worker/wrangler.toml` 内の以下の環境変数を自分の保有数に変更してください。
- `FUND_CD`: ファンドコード (デフォルト: "253425")
- `TOTAL_UNITS`: 保有口数
- `TOTAL_INVESTED`: 投資総額

ローカルDBを初期化します:
```bash
cd worker
npm run db:init
npm run dev
```

### 3. フロントエンド (Web) の起動
新しいターミナルを開き、フロントエンドを起動します:
```bash
cd web
npm run dev
```

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

## 注意事項
- `fund_cd = 253425` は推定値です。変更が必要な場合は環境変数から設定可能です。
- 将来的なフォールバックとして、三菱UFJ AM の JSON API への対応を TODO コメントとして記載しています。