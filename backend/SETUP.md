# Backend セットアップガイド (macOS)

## 📋 必要なもの

- Node.js 16以上
- PostgreSQL 15
- Redis

---

## 🚀 セットアップ方法

#### PostgreSQLのセットアップ

```bash
# PostgreSQLがインストールされているか確認
which psql

# インストールされていない場合
brew install postgresql@15

# PostgreSQLを起動
brew services start postgresql@15

# データベースを作成
psql postgres
```

psqlに接続できたら、以下のSQLを実行：

```sql
CREATE DATABASE soccer_game;
\q
```

データベース初期化：

```bash
# スキーマを適用
npm run db:init

# または、直接psqlで適用
psql -U postgres -d soccer_game -f schema.sql
```

#### Redisのセットアップ

```bash
# Redisがインストールされているか確認
which redis-server

# インストールされていない場合
brew install redis

# Redisを起動
brew services start redis

# 起動確認
redis-cli ping
# "PONG" と返ってくればOK
```

#### 環境変数の設定

`.env`ファイルを編集して、ポート番号を確認：

```bash
# PostgreSQLのポートを確認（デフォルトは5432）
lsof -i :5432

# Redisのポートを確認（デフォルトは6379）
lsof -i :6379
```

ポートが異なる場合は、`.env`ファイルを修正してください。

#### サーバー起動

```bash
npm run dev
```

---

## 🔧 便利なコマンド

### npm scripts

```bash
# 開発サーバー起動（ホットリロード）
npm run dev

# 本番サーバー起動
npm start

# データベース初期化
npm run db:init

# psqlでスキーマ適用（パスワード入力が必要な場合）
npm run db:setup
```

### Homebrew Services

```bash
# PostgreSQL起動
brew services start postgresql@15

# PostgreSQL停止
brew services stop postgresql@15

# Redis起動
brew services start redis

# Redis停止
brew services stop redis

# サービス一覧確認
brew services list
```

### PostgreSQL

```bash
# PostgreSQL接続
psql -U postgres -d soccer_game

# テーブル一覧表示
\dt

# データベース一覧
\l

# 終了
\q
```

### Redis

```bash
# Redis CLI起動
redis-cli

# 接続確認
ping

# すべてのキーを表示
keys *

# 特定のキーの値を取得
get player:p_1234

# 終了
exit
```

---

## 🐛 トラブルシューティング

### PostgreSQLのパスワードがわからない

```bash
# パスワードなしで接続を試す
psql postgres

# ポートを指定して接続（PostgreSQL@15の場合）
/opt/homebrew/Cellar/postgresql@15/15.12_1/bin/psql -U postgres -p 5433

# 環境変数で指定
export PGPASSWORD=your_password
psql -U postgres postgres

# .pgpassファイルを使う方法
echo "localhost:5433:*:postgres:your_password" > ~/.pgpass
chmod 600 ~/.pgpass
```

### ポートが使用中

```bash
# ポート5433を使用しているプロセスを確認
lsof -i :5433

# プロセスを停止
kill -9 <PID>

# PostgreSQLサービスを再起動
brew services restart postgresql@15

# または、別のポートを使用
# .envファイルでPG_PORTを変更（現在は5433を使用）
```

### Redisに接続できない

```bash
# Redisが起動しているか確認
brew services list | grep redis

# Redisを起動
brew services start redis

# 起動確認
redis-cli ping
```

### データベースが見つからない

```bash
# データベースを作成
psql postgres -c "CREATE DATABASE soccer_game;"

# スキーマを適用
npm run db:init
```

---

## 📁 ファイル構成

```
backend/
├── .env                    # 環境変数（gitignore対象）
├── .env.example           # 環境変数のテンプレート
├── schema.sql             # データベーススキーマ
├── package.json           # npm設定
├── server.js             # エントリーポイント
├── config/               # 設定ファイル
├── controllers/          # コントローラー
├── models/              # モデル
├── routes/              # ルート定義
├── scripts/             # ユーティリティスクリプト
│   └── initDb.js       # DB初期化スクリプト
└── services/            # サービス層
    ├── dbService.js    # PostgreSQL接続
    ├── redisService.js # Redis接続
    └── ...
```

---

## 🎯 次のステップ

1. ✅ 依存関係インストール (`npm install`)
2. ✅ 環境変数設定 (`.env`作成)
3. ✅ PostgreSQL起動
4. ✅ Redis起動
5. ✅ データベース初期化 (`npm run db:init`)
6. ✅ サーバー起動 (`npm run dev`)

すべて完了したら、`http://localhost:3000` でサーバーにアクセスできます！
