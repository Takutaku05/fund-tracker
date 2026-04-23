# Fund Tracker

Cloudflare Workers / D1 / Pages を使った投資信託の基準価額・下落率トラッカーです。
複数銘柄の切り替え、全期間および任意期間のドローダウン可視化、下落率しきい値を超えたときの Discord 通知に対応しています。

[アクセスリンク](https://fund-tracker-web-awo.pages.dev/)

現在カタログに含まれる銘柄:

- eMAXIS Slim 全世界株式（オール・カントリー） — ISIN `JP90C000H1T1`
- eMAXIS Slim 米国株式（S&P500） — ISIN `JP90C000GKC6`

## 主な機能

### ダッシュボード
- **銘柄セレクタ**: `/api/funds` から有効な銘柄一覧を取得し、ヘッダーで切替。選択はローカルストレージに保持
- **基準価額 / 純資産総額**: 最新の基準価額と前日比、純資産総額を表示
- **全期間最高値からの下落率**: DB 全レコードの最高値からのドローダウン
- **期間ピーク下落率 / 上昇率**: 選択期間（1W / 1M / 3M / 6M / 1Y / ALL）の高値・安値からのドローダウン・リターン
- **基準価額チャート**: Recharts による時系列チャート。期間ピークに参照線を描画

### アラート通知（要ログイン）
- **Google OAuth ログイン**: ユーザーごとに設定を保持
- **監視銘柄 (Watchlist)**: 銘柄単位で下落率しきい値・比較期間・再通知クールダウンを設定
- **Discord Webhook 通知**: Webhook URL は暗号化して D1 に保存。テスト送信エンドポイントあり
- **自動判定**: 日次 NAV 取得後に全ユーザーの watchlist を走査し、条件合致のみ通知

### 自動データ収集
- **Cron Trigger**: 毎日 18:00 UTC (03:00 JST) に実行
  1. `FUND_CATALOG`（コード上の定義）を `funds` テーブルへ同期（upsert + カタログから消えたものは `enabled=0`）
  2. 有効な全銘柄について投信総合検索ライブラリー CSV API から基準価額を取得し `nav_history` へ upsert
  3. 全ユーザーの watchlist を評価して Discord 通知

## 技術スタック
- **バックエンド**: Cloudflare Workers, Hono, TypeScript
- **データベース**: Cloudflare D1 (SQLite)
- **認証**: Google OAuth 2.0 + Cookie セッション
- **フロントエンド**: Cloudflare Pages, React 19, Vite, Recharts, TypeScript
- **テスト**: Vitest（Worker 側）

## アーキテクチャ

```
┌──────────────┐   Cron (18:00 UTC)   ┌──────────────────────────────┐
│ Cloudflare   │ ───────────────────▶ │ syncCatalogToDb              │──▶ D1: funds
│ Scheduled    │                       │ → fetchNavForFund (全銘柄)   │──▶ D1: nav_history
└──────────────┘                       │ → check-alerts               │──▶ Discord Webhook
                                       └──────────────────────────────┘
                                              ▲
┌──────────────┐     /api/*  (CORS)          │
│ Pages (React)│ ───────────────────▶ ┌─────────────────────────────┐
│  + Recharts  │   Cookie セッション   │ Workers (Hono)              │
│  FundSelector│ ◀─────────────────── │ auth/nav/history/funds/     │
└──────────────┘                       │ watchlists/channels         │
                                       └─────────────────────────────┘
```

### 主要エンドポイント（Workers）
- `GET /api/auth/login` — Google OAuth 認可へリダイレクト
- `GET /api/auth/callback` — OAuth コールバック、セッション発行
- `GET /api/auth/me` / `POST /api/auth/logout`
- `GET /api/funds` — 有効な銘柄一覧（フロントの切り替え UI 用）
- `GET /api/nav/latest?fundId=...` — 指定銘柄の最新基準価額
- `GET /api/nav/alltime-peak?fundId=...` — 指定銘柄の全期間最高値
- `GET /api/history?fundId=...&period=week|month|3month|6month|year|all`
- `GET|POST /api/settings/watchlists` / `PATCH|DELETE /api/settings/watchlists/:id`
- `GET|POST /api/settings/notification-channels` / `PATCH /api/settings/notification-channels/:id`
- `POST /api/settings/notification-channels/:id/test` — Webhook テスト送信
- `GET /api/dev/seed` — 開発用: カタログ同期 + NAV 取得を即時実行
- `GET /api/health`

`fundId` を省略した場合は `DEFAULT_FUND_ID`（`wrangler.toml` の `vars`）にフォールバックします。

### データモデル（D1）
- `funds` — 銘柄マスタ。`FUND_CATALOG` から同期される
- `nav_history` — `(fund_id, date)` ユニークな日次基準価額・純資産総額
- `users` — OAuth プロバイダ + subject で一意管理
- `sessions` — セッション Cookie
- `watchlists` — 銘柄ごとの下落率しきい値・期間・クールダウン
- `notification_channels` — Discord Webhook（暗号化保存）
- `price_snapshots` / `alert_events` — アラート判定・送信履歴

マイグレーション（`worker/src/db/migrations/`）:
- `0001_add_alert_system.sql`
- `0002_add_sessions.sql`
- `0003_multi_fund.sql` — 複数銘柄対応（`funds` テーブル追加、`nav_history` に `fund_id`）
- `0004_add_sp500.sql`

## 銘柄の追加方法

1. `worker/src/config/fund-catalog.ts` の `FUND_CATALOG` にエントリを追加
   ```ts
   {
     id: 'your-fund-id',
     nameJa: '銘柄名',
     isin: 'JPxxxxxxxxxx',
     dataSource: 'toushin_lib',
     sourceParams: { isinCd: 'JPxxxxxxxxxx', associFundCd: 'xxxxxxxx' },
   }
   ```
2. デプロイ後、次回 cron または `GET /api/dev/seed` 実行時に `funds` テーブルへ自動反映されます。
3. カタログから消したエントリは物理削除せず `enabled=0` に落ちます（`nav_history` の FK 整合のため）。完全削除したい場合は手動で `DELETE` してください。

## ローカル開発

### 1. バックエンド (Worker)

```bash
cd worker
npm install
npm run db:init                                       # スキーマ適用
npx wrangler d1 migrations apply fund-tracker-db --local
npm run dev
```

ローカル DB に初期データを投入:

```bash
curl http://localhost:8787/api/dev/seed
```

テスト:

```bash
cd worker
npm test      # Vitest
```

`wrangler.toml` の主な環境変数:
- `DEFAULT_FUND_ID` — `fundId` 未指定時のフォールバック（デフォルト `emaxis-ac`）
- `APP_BASE_URL` — Worker 自身の URL（OAuth redirect_uri に使用）
- `FRONTEND_URL` — フロントエンド URL（CORS / OAuth 後のリダイレクト）
- `DEFAULT_DROP_THRESHOLD` / `DEFAULT_WINDOW_HOURS` / `DEFAULT_COOLDOWN_MINUTES`

### 2. フロントエンド (Web)

```bash
cd web
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。`VITE_API_BASE` を指定しない場合はデフォルトの Worker URL（`web/src/lib/api.ts` 参照）が使われます。

## デプロイ方法

### 前提条件
- [Cloudflare アカウント](https://dash.cloudflare.com/sign-up)
- Wrangler CLI（`worker/node_modules` に含まれる）
- `npx wrangler login` で認証済み
- Google Cloud Console で OAuth クライアントを作成し、承認済みリダイレクト URI に `https://<worker-domain>/api/auth/callback` を登録済み

### 1. D1 データベースの作成とスキーマ適用

```bash
cd worker

# 初回のみ
npx wrangler d1 create fund-tracker-db
```

出力された `database_id` を `worker/wrangler.toml` の `[[d1_databases]]` セクションに反映します。

スキーマとマイグレーションをリモート DB に適用:

```bash
npm run db:init:remote
npx wrangler d1 migrations apply fund-tracker-db --remote
```

### 2. Workers のシークレット設定

```bash
cd worker
npx wrangler secret put ENCRYPTION_KEY        # Webhook URL 暗号化用の強いランダム文字列
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

Cron Trigger（`0 18 * * *`）は `wrangler.toml` から自動登録されます。

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

1. Pages の URL でチャートと下落率カードが表示されること、銘柄セレクタで切り替えできること
2. **Workers & Pages** > `fund-tracker-worker` > **Triggers** に Cron が登録されていること
3. 初回はデータが空のため、`/api/dev/seed` を叩くか Cron 実行を待って初期データを投入
4. Google ログインを試し、設定ページから watchlist / Discord Webhook を登録

## データソース
- 基準価額データは [投信総合検索ライブラリー](https://toushin-lib.fwg.ne.jp/FdsWeb/) (投資信託協会) の CSV API を使用しています。
- 銘柄定義は `worker/src/config/fund-catalog.ts` の `FUND_CATALOG` で一元管理しています。
