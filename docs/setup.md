# セットアップガイド

---

## 必要な環境

- Node.js >= 18.0.0
- Notion Integration（API トークン取得済み）
- Anthropic API キー
- Make.com アカウント（Webhook 経由でリクエストを送る場合）

---

## 環境変数

`.env` ファイルをプロジェクトルートに作成し、以下の変数を設定してください。

```env
# 認証
SECRET_TOKEN=         # Make.com からのリクエスト検証に使うトークン
MASTER_PW=            # SECRET_TOKEN を暗号化するマスターパスワード

# API キー
ANTHROPIC_API_KEY=    # Anthropic (Claude) API キー
NOTION_TOKEN=         # Notion Integration トークン

# Notion データベース ID
NOTION_TASK_DB_ID=         # タスク管理 DB の ID
NOTION_DAILY_NOTE_DB_ID=   # デイリーノート DB の ID

# 暗号化設定
CRYPTO_ALGORITHM=
CRYPTO_IV_LENGTH=
CRYPTO_SALT_LENGTH=
CRYPTO_TAG_LENGTH=
CRYPTO_KEY_LENGTH=
CRYPTO_ITERATIONS=

# サーバー（省略時は 8080）
PORT=8080
```

---

## インストール・起動

```bash
npm install
npm run build
npm start
```

開発時は TypeScript を直接実行できます。

```bash
npm run dev
```

---

## テスト

```bash
# ユニットテスト
npm test

# カバレッジ計測
npm run test:coverage

# ウォッチモード
npm run test:watch
```

> e2e テストは Notion / Claude API のクレジットを消費するため、手動で実行してください。

---

## API リクエスト仕様

### POST /generate-daily-report

認証には `x-api-key` ヘッダーが必要です。値は `SECRET_TOKEN` を `MASTER_PW` で暗号化したものを設定してください。

```
POST /generate-daily-report
x-api-key: <暗号化済みトークン>
```

レスポンス: `202 Accepted`（処理はバックグラウンドで継続）

---

## Notion 側の設定

1. **タスク DB** に `Status` プロパティ（Select型）を用意し、`Doing` / `DoToday` のオプションを作成する
2. **デイリーノート DB** に `日付` プロパティ（Date型）を用意する
3. タスクページの本文にサブタスク・期限（`期限：MM/DD` 形式）を記載する
4. デイリーノートページの本文に以下のセクション見出しを記載する
   - `【今日行ったこと】`
   - `【翌営業日に行うこと】`
   - `【課題・懸念事項】`
   - `【健康状態】`
5. Notion Automations でボタン押下時に Make.com へ Webhook を送るシナリオを設定する

---

## Cloud Run へのデプロイ

`.github/workflows/deploy.yml` に GitHub Actions によるデプロイ設定があります。
`main` ブランチへのマージ時に自動デプロイされます。
