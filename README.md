# Fund Tracker

Cloudflare 関連サービス (Workers, D1, Pages) を活用した、eMAXIS Slim 全世界株式（オール・カントリー）の基準価額・下落率トラッカーです。下落率しきい値を超えた場合の Discord 通知にも対応しています。

[アクセスリンク](https://fund-tracker-web-awo.pages.dev/)

## 主な機能

### ダッシュボード
- **基準価額 / 純資産総額**: 最新の基準価額と前日比、純資産総額を表示
- **全期間最高値からの下落率**: データベース全レコードの最高値からの下落率（ドローダウン）
- **期間ピーク下落率 / 上昇率**: 選択した期間（1W / 1M / 3M / 6M / 1Y / ALL）の高値・安値を基準にしたドローダウンとリターン
- **基準価額チャート**: 期間内の価格推移を Recharts で可視化し、ピーク値に参照線を描画

### アラート通知（要ログイン）
- **Google OAuth ログイン**: Google アカウントでサインインし、ユーザーごとに設定を保持
- **監視銘柄 (Watchlist)**: 下落率しきい値、比較期間、再通知クールダウン時間を銘柄単位で設定
- **Discord Webhook 通知**: 暗号化して保存した Webhook URL に対して条件達成時に自動通知。テスト送信にも対応
- **自動判定**: 毎日の基準価額取得後に全ユーザーの watchlist を走査し、条件を満たしたものだけ通知

### 自動データ収集
- **Cron Trigger**: 毎日 18:00 UTC（03:00 JST）に投資信託協会の投信総合検索ライブラリー CSV API から最新の基準価額を取得して D1 に保存し、続けてアラート判定を実行

## 技術スタック
- **バックエンド**: Cloudflare Workers, Hono, TypeScript
- **データベース**: Cloudflare D1 (SQLite)
- **認証**: Google OAuth 2.0 + Cookie セッション
- **フロントエンド**: Cloudflare Pages, React 19, Vite, Recharts, TypeScript

## アーキテクチャ

```
┌──────────────┐   Cron (18:00 UTC)   ┌────────────────────┐
│ Cloudflare   │ ───────────────────▶ │ fetch-nav          │──▶ D1: nav_history
│ Scheduled    │                       │ → check-alerts     │──▶ Discord Webhook
└──────────────┘                       └────────────────────┘
                                              ▲
┌──────────────┐     /api/*  (CORS)          │
│ Pages (React)│ ───────────────────▶ ┌─────────────────────┐
│   + Recharts │   Cookie セッション  │ Workers (Hono)       │
└──────────────┘ ◀─────────────────── │  auth / nav / history│
                                       │  watchlists / channels│
                                       └─────────────────────┘
```

### 主要エンドポイント（Workers）
- `GET /api/auth/login` — Google OAuth 認可へリダイレクト
- `GET /api/auth/callback` — OAuth コールバック、セッション発行
- `GET /api/auth/me` / `POST /api/auth/logout`
- `GET /api/nav/latest` — 最新基準価額
- `GET /api/nav/alltime-peak` — 全期間最高値
- `GET /api/history?period=week|month|3month|6month|year|all`
- `GET|POST /api/settings/watchlists` / `PATCH|DELETE /api/settings/watchlists/:id`
- `GET|POST /api/settings/notification-channels` / `PATCH /api/settings/notification-channels/:id`
- `POST /api/settings/notification-channels/:id/test` — Webhook テスト送信
- `GET /api/dev/seed` — 開発用: 即時にデータ取得を実行
- `GET /api/health`

### データモデル（D1）
- `nav_history` — 日次基準価額・純資産総額
- `users` — OAuth プロバイダ + subject で一意管理
- `sessions` — セッション Cookie に対応
- `watchlists` — 監視銘柄（下落率しきい値・期間・クールダウン）
- `notification_channels` — Discord Webhook（暗号化保存）
- `price_snapshots` / `alert_events` — アラート判定・送信履歴

## ローカル開発

### 1. バックエンド (Worker)

`worker/wrangler.toml` の環境変数を必要に応じて編集してください。
- `FUND_CD`: ファンドコード（デフォルト: `253425`）
- `APP_BASE_URL`: Worker 自身の URL（OAuth redirect_uri に使用）
- `FRONTEND_URL`: フロントエンド URL（CORS / OAuth 後のリダイレクト）
- `DEFAULT_DROP_THRESHOLD` / `DEFAULT_WINDOW_HOURS` / `DEFAULT_COOLDOWN_MINUTES`

依存パッケージをインストールし、ローカル DB を初期化して開発サーバーを起動します。

```bash
cd worker
npm install
npm run db:init
npx wrangler d1 migrations apply fund-tracker-db --local
npm run dev
```

ローカル DB に基準価額を投入したい場合:

```bash
curl http://localhost:8787/api/dev/seed
```

### 2. フロントエンド (Web)

```bash
cd web
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。認証を試す場合は、Worker 側に Google OAuth のシークレットを設定し、`APP_BASE_URL` / `FRONTEND_URL` をローカルに合わせてください。

## デプロイ方法

### 前提条件
- [Cloudflare アカウント](https://dash.cloudflare.com/sign-up)
- Wrangler CLI（`worker/node_modules` に含まれる）
- `npx wrangler login` で認証済みであること
- Google Cloud Console で OAuth クライアントを作成し、承認済みリダイレクト URI に `https://<worker-domain>/api/auth/callback` を登録済みであること

### 1. D1 データベースの作成とスキーマ適用

```bash
cd worker

# 初回のみ
npx wrangler d1 create fund-tracker-db
```

出力された `database_id` を `worker/wrangler.toml` に反映します。

```toml
[[d1_databases]]
binding = "DB"
database_name = "fund-tracker-db"
database_id = "<ここに出力された ID を貼り付け>"
```

スキーマとマイグレーションをリモート DB に適用します。

```bash
npm run db:init:remote
npx wrangler d1 migrations apply fund-tracker-db --remote
```

### 2. Workers のシークレット設定

`wrangler.toml` に入れない機密情報を設定します。

```bash
cd worker
npx wrangler secret put ENCRYPTION_KEY        # Webhook URL 暗号化用（任意の強いランダム文字列）
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
# 任意
npx wrangler secret put PRICE_API_KEY
```

### 3. Workers のデプロイ

```bash
cd worker
# wrangler.toml の APP_BASE_URL / FRONTEND_URL を本番値に更新してから
npm run deploy
```

Cron Trigger（`0 18 * * *` = 18:00 UTC / 03:00 JST）は `wrangler.toml` の設定から自動登録されます。

### 4. Pages（フロントエンド）のデプロイ

#### 方法 A: Cloudflare ダッシュボードから Git 連携

1. **Workers & Pages** > **Create** > **Pages** > **Connect to Git**
2. このリポジトリを選択
3. ビルド設定:
   - **Framework preset**: `None`
   - **Root directory**: `web`
   - **Build command**: `npm install && npm run build`
   - **Build output directory**: `dist`
4. 環境変数:
   - `VITE_API_BASE` = デプロイ済み Worker の URL

#### 方法 B: CLI から直接デプロイ

```bash
cd web
npm install
VITE_API_BASE=https://fund-tracker-worker.<your-subdomain>.workers.dev npm run build
npx wrangler pages deploy dist --project-name=fund-tracker-web
```

### 5. デプロイ後の確認

1. Pages の URL でチャートと下落率カードが表示されること
2. **Workers & Pages** > `fund-tracker-worker` > **Triggers** に Cron が登録されていること
3. 初回はデータが空のため、`/api/dev/seed` を叩くか Cron 実行を待って初期データを投入
4. Google ログインを試し、設定ページから watchlist / Discord Webhook を登録

## データソース
- 基準価額データは [投信総合検索ライブラリー](https://toushin-lib.fwg.ne.jp/FdsWeb/) (投資信託協会) の CSV API を使用しています。
- ISIN コード: `JP90C000H1T1` / ファンドコード: `0331418A`
