# Backend サーバー（threejs-sync-server）

サッカー風ミニゲームのリアルタイム同期サーバーです。REST API と WebSocket を提供し、ルーム状態（プレイヤー、ボール、スコア等）をクライアントと同期します。

このドキュメントでは、概要、セットアップ手順、API/WS 仕様、開発メモをまとめます。

## 概要

- ランタイム: Node.js 20（`.nvmrc` にバージョン固定: 20.19.2）
- フレームワーク/ライブラリ:
  - Express: REST API と静的配信
  - ws: WebSocket サーバー
- ポート: デフォルト 3000（`server.js` 内で固定）
- ヘルスチェック: `GET /health`（200 OK / "OK"）
- 静的配信: `backend/public/` 配下（任意、現在はディレクトリ未作成）

## ディレクトリ構成

```text
backend/
  server.js              # Express + WebSocket エントリポイント
  package.json           # 依存関係と npm scripts
  .nvmrc                 # Node.js の推奨バージョン
  config/
    constants.js         # サーバーの同期間隔などの定数
  routes/
    index.js             # /api 以下の REST ルーティング
  controllers/
    roomController.js    # ルーム制御（開始/終了/状態取得）
    playerController.js  # プレイヤー参加/情報取得
    matchController.js   # 試合結果保存（ダミー）
  models/
    player.js            # プレイヤーモデル
    ball.js              # ボールモデル
  services/
    room.js              # ルームのゲームロジック（シングルトン）
    syncService.js       # WebSocket イベント処理と tick 配信
    dbService.js         # PostgreSQL 連携の枠（未実装）
    redisService.js      # Redis 同期の枠（未実装）
```

## 前提条件

- macOS / Linux / Windows（開発は macOS を想定）
- Node.js 20 系（`.nvmrc` 参照）と npm

任意（動作確認用）:

- wscat（WebSocket クライアント）: `npm i -g wscat`

## セットアップ手順

プロジェクトルートではなく、必ず `backend/` ディレクトリで実行してください。

```bash
# Node.js 20 を用意（nvm を使用する場合）
nvm install
nvm use

# 依存関係をインストール
npm ci   # lockfile があるため推奨（無い場合は npm install）

# サーバー起動
npm start
# -> http://localhost:3000 で待受（/health, /api/*, WebSocket）
```

停止はターミナルで Ctrl + C。

## 設定（環境変数など）

現状、必須の環境変数はありません。主な設定値は `config/constants.js` にハードコードされています。

- `TICK_INTERVAL`（デフォルト 50ms）: サーバーからの状態配信周期
- `SYNC_INTERVAL`（デフォルト 1000ms）: クライアントからの同期周期目安

ポートは `server.js` にて `3000` に固定されています。必要であればコードを `process.env.PORT` を参照するように変更してください。

## REST API

ベースパス: `/api`

- `GET /health`
  - 200 OK, ボディは `OK`（API ルートの外側に存在）

- `GET /api/room`
  - ルームの現在状態を返します。
  - レスポンス例（簡略）:

    ```json
    {
      "state": "waiting|playing|finished",
      "score": { "alpha": 0, "bravo": 0 },
      "ball": { "x": 300, "z": 200, "ownerId": null },
      "players": [ { "id": "p_1234", "name": "Alice", "team": "alpha", ... } ]
    }
    ```

- `POST /api/room/start`
  - ゲームを開始します。戻り値に最新のルーム状態。

- `POST /api/room/end`
  - ゲームを終了します。戻り値に最新のルーム状態。

- `POST /api/player/join`
  - プレイヤーをルームに参加させます。
  - リクエスト JSON 例:

    ```json
    { "name": "Alice", "team": "alpha" }
    ```

  - レスポンス例:

    ```json
    { "success": true, "player": { "id": "p_1234", "name": "Alice", "team": "alpha", ... } }
    ```

- `GET /api/player/:id`
  - 指定 ID のプレイヤー情報。

- `POST /api/match/save`
  - 試合結果の保存（ダミー実装）。

curl サンプル（参考）:

```bash
# ヘルス
curl -i http://localhost:3000/health

# ルーム取得
curl -s http://localhost:3000/api/room | jq .

# ゲーム開始
curl -s -X POST http://localhost:3000/api/room/start | jq .

# 参加
curl -s -X POST http://localhost:3000/api/player/join \
 -H 'Content-Type: application/json' \
 -d '{"name":"Alice","team":"alpha"}' | jq .
```

## WebSocket プロトコル

- エンドポイント: `ws://localhost:3000/`
- 接続直後に現在のルーム状態が一度送られます。
  - 形式: `{ "type": "roomState", "payload": <roomJSON> }`
- サーバーは `TICK_INTERVAL` 毎に全体状態をブロードキャストします。
  - 形式: `{ "type": "tick", "payload": <roomJSON> }`

クライアントから送信できるメッセージ（例）:

```json
// 参加
{ "type": "join", "payload": { "name": "Alice", "team": "alpha" } }

// 位置・方向・状態の更新（任意のフィールドのみでOK）
{ "type": "update", "payload": { "x": 123, "z": 45, "direction": 270, "state": "run" } }

// アクション: kick / tackle / pass
{ "type": "action", "payload": { "action": "kick", "direction": 90 } }

// ゲーム制御
{ "type": "control", "payload": { "command": "startGame" } }

// 離脱
{ "type": "leave" }
```

サーバーからの応答（例）:

- 参加受理: `{ "type": "joinAck", "payload": { "playerId": "p_1234" } }`
- 定期同期: `{ "type": "tick", "payload": <roomJSON> }`

wscat での動作確認（任意）:

```bash
# wscat をインストール（任意）
npm i -g wscat

# 接続
wscat -c ws://localhost:3000/

# 参加（wscat 内で送信）
> { "type": "join", "payload": { "name": "Alice", "team": "alpha" } }
```

## ゲームロジック（抜粋）

- ルームはシングルトン（`services/room.js`）。`state`: `waiting|playing|finished`
- ボール/プレイヤーの座標は 2D（x,z）。キャンバス想定サイズ: 600x400
- アクション:
  - kick: 所有者のみ。ボールに速度付与（減衰あり）
  - tackle: 近距離の敵（< 30）をスタン（1秒）。ボール所有者なら奪取
  - pass: 同チームの近距離味方（< 100）へ優先的に譲渡。候補がなければ kick
- ボール所有（ownerId）がある場合、所有者の座標に追従
- ゴール判定:
  - 左ゴール: `x < 10 && 150 < z < 250` -> bravo に加点
  - 右ゴール: `x > 590 && 150 < z < 250` -> alpha に加点
- 同期:
  - 50ms 毎に `tick` を全クライアントへ送信（`config/constants.js`）

## 将来的な拡張（コード中のフック）

- Redis（`services/redisService.js`）: 複数サーバー間の位置情報同期のための枠
- PostgreSQL（`services/dbService.js` / `controllers/matchController.js`）: 試合結果の保存枠

## トラブルシュート

- Node バージョンでエラーが出る
  - `nvm use` で `.nvmrc` のバージョンを使用してください。
- ポート 3000 が使用中
  - 既存プロセスを終了するか、`server.js` のポートを変更してください。
- WebSocket に接続できない
  - サーバー起動中か確認し、ファイアウォール/プロキシを確認してください。

## ライセンス

このリポジトリのライセンスはリポジトリルートの `LICENSE` を参照してください。

© 2025 ArcTech
