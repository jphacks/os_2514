# DB Module

PostgreSQL およびスキーマ管理を `db/` に集約しました。

## 構成

- `dbService.js`: アプリから利用するDBアクセサ（Poolと各種関数）
- `schema.sql`: DDL（テーブル/ビュー/インデックス）
- `initDb.js`: `.env` を読み込み、`schema.sql` を実行して初期化

## 使い方

- 初期化

```bash
node db/initDb.js
# または backend から互換スクリプト
npm --prefix backend run db:init
```

- psql で適用

```bash
psql -U postgres -d soccer_game -f db/schema.sql
```

## 環境変数

`.env`（ルートまたは backend 直下）で以下を設定可能：

```env
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=soccer_game
PG_USER=postgres
PG_PASSWORD=postgres
- psql で適用
```
