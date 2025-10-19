# Quick Setup Guide

## 現在の環境確認

```bash
# PostgreSQL@15がポート5433で起動中
/opt/homebrew/Cellar/postgresql@15/15.12_1/bin/psql -U postgres -p 5433

# .envファイルでPG_PORT=5433に設定済み
```

---

## セットアップ手順（初回のみ）

### 1. 依存関係のインストール

```bash
cd backend
npm install
```

### 2. Redisのインストールと起動

```bash
# Redisをインストール
brew install redis

# Redisを起動
brew services start redis

# 起動確認
redis-cli ping
# "PONG" と返ってくればOK
```

### 3. データベースの作成

PostgreSQLに接続してデータベースを作成：

```bash
# PostgreSQLに接続（ポート5433）
/opt/homebrew/Cellar/postgresql@15/15.12_1/bin/psql -U postgres -p 5433
```

PostgreSQLプロンプトで以下を実行：

```sql
CREATE DATABASE soccer_game;
\q
```

### 4. スキーマの適用

```bash
# Node.jsスクリプトでスキーマ適用
npm run db:init
```

### 5. サーバー起動

```bash
npm run dev
```

---

## 日常的な起動手順

```bash
# 1. PostgreSQLが起動しているか確認
brew services list | grep postgresql

# 2. Redisが起動しているか確認
brew services list | grep redis

# 3. サーバー起動
cd backend
npm run dev
```

---

## トラブルシューティング

### Redisに接続できない

```bash
# Redisを起動
brew services start redis

# 確認
redis-cli ping
```

### PostgreSQLに接続できない

```bash
# PostgreSQL@15を起動
brew services start postgresql@15

# 接続確認
/opt/homebrew/Cellar/postgresql@15/15.12_1/bin/psql -U postgres -p 5433
```

### ポート番号の確認

```bash
# .envファイルを確認
cat .env | grep PORT
```

現在の設定：
- PostgreSQL: `PG_PORT=5433`
- Redis: `REDIS_PORT=6379`
- Server: `PORT=3000`
