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

ローカル DB を手動で更新したい場合は、Worker 起動中に以下を実行してください:
```bash
curl http://localhost:8787/api/dev/seed
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

### 前提条件
- [Cloudflare アカウント](https://dash.cloudflare.com/sign-up)
- Wrangler CLI（`worker/node_modules` に含まれる）
- `npx wrangler login` で認証済みであること

### 1. D1 データベースの作成とスキーマ適用

```bash
cd worker

# D1 データベースを作成（初回のみ）
npx wrangler d1 create fund-tracker-db
```

出力される `database_id` を `worker/wrangler.toml` の以下の箇所に反映します:

```toml
[[d1_databases]]
binding = "DB"
database_name = "fund-tracker-db"
database_id = "<ここに出力された ID を貼り付け>"
```

スキーマとマイグレーションをリモート DB に適用します:

```bash
# 初期スキーマ
npm run db:init:remote

# マイグレーション
npx wrangler d1 migrations apply fund-tracker-db --remote
```

### 2. Workers のシークレット設定

`wrangler.toml` の `[vars]` に含まれない機密情報を設定します:

```bash
cd worker
npx wrangler secret put ENCRYPTION_KEY
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

プロンプトが表示されるので、それぞれの値を入力してください。

### 3. Workers のデプロイ

```bash
cd worker

# wrangler.toml の APP_BASE_URL を本番 Pages URL に変更してからデプロイ
npm run deploy
```

デプロイが完了すると Worker の URL が表示されます（例: `https://fund-tracker-worker.<your-subdomain>.workers.dev`）。

Cron Trigger（毎日 09:00 UTC / 18:00 JST）は `wrangler.toml` の設定に基づいて自動的に登録されます。

### 4. Pages（フロントエンド）のデプロイ

#### 方法 A: Cloudflare ダッシュボードから Git 連携

1. [Cloudflare ダッシュボード](https://dash.cloudflare.com/) > **Workers & Pages** > **Create** > **Pages** > **Connect to Git**
2. このリポジトリを選択
3. ビルド設定:
   - **Framework preset**: `None`
   - **Root directory**: `web`
   - **Build command**: `npm install && npm run build`
   - **Build output directory**: `dist`
4. 環境変数:
   - `VITE_API_BASE` = デプロイ済み Worker の URL（例: `https://fund-tracker-worker.<your-subdomain>.workers.dev`）

#### 方法 B: CLI から直接デプロイ

```bash
cd web
npm install
VITE_API_BASE=https://fund-tracker-worker.<your-subdomain>.workers.dev npm run build
npx wrangler pages deploy dist --project-name=fund-tracker-web
```

### 5. デプロイ後の確認

1. Pages の URL にアクセスし、チャートと下落率カードが表示されることを確認
2. Cloudflare ダッシュボード > **Workers & Pages** > `fund-tracker-worker` > **Triggers** で Cron が登録されていることを確認
3. 初回はデータが空のため、Worker の `/api/dev/seed` エンドポイントを叩いて初期データを投入（本番環境では Cron による自動取得を待つか、手動で実行）

## データソース
- 基準価額データは [投信総合検索ライブラリー](https://toushin-lib.fwg.ne.jp/FdsWeb/) (投資信託協会) の CSV API を使用しています。
- ISIN コード: `JP90C000H1T1` / ファンドコード: `0331418A`
