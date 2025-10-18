
# 机上バーチャルサッカー Frontend（Game/）

Three.js を用いたサッカー風ミニゲームのフロントエンドです。静的 SPA 構成で、`index.html` を起点に ES Modules（CDN経由）で動作します。

本ドキュメントでは、概要、ディレクトリ構成、前提条件、セットアップ、デプロイ手順、カスタマイズ、注意点をまとめます。

## ディレクトリ構成

```text
Game/
 index.html        # エントリポイント（importmap + main.js 読み込み）
 Main.js           # Three.js シーン・UI・ゲームループ初期化
 Match.js          # ゲームロジック本体
 Ball/             # ボールのモデル・ビュー・プレゼンター
 Player/           # プレイヤーのモデル・ビュー・プレゼンター
 Input/            # 入力ハンドラ・ジョイスティック
 ConstData/        # ゲーム定数
```

## 前提条件

- モダンブラウザ（ES Modules, importmap, WebGL2 対応）
- サーバー不要（本番は静的ホスティング推奨）

## セットアップ・デプロイ手順

### ローカルでの再現方法（静的サーバー）

`frontend/Game/Game/` ディレクトリで以下のいずれかのコマンドを実行し、 <http://localhost:8080/index.html> へアクセスしてください。

#### Node.js http-server

```bash
npm install -g http-server
cd frontend/Game/Game
http-server -p 8080
# → http://localhost:8080/index.html
```

#### Python 簡易サーバー

```bash
cd frontend/Game/Game
python3 -m http.server 8080
# → http://localhost:8080/index.html
```

### 静的ホスティング（Netlify, Vercel, GitHub Pages など）

- `frontend/Game/Game/` ディレクトリをそのまま公開ディレクトリに指定
- 追加ビルド不要
- ルート: `index.html`

#### Netlify 例

```bash
netlify deploy --dir=frontend/Game/Game --prod
# → https://<your-site>.netlify.app で公開
```

#### Vercel 例

```bash
vercel frontend/Game/Game --prod
# → https://<your-project>.vercel.app で公開
```

#### GitHub Pages 例（gh-pages ブランチ利用）

```bash
cd frontend/Game/Game
git init
git add .
git commit -m "deploy frontend"
git branch -M gh-pages
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin gh-pages
# → GitHub Pages の設定で gh-pages ブランチを公開
```

### Nginx/Apache など自前サーバー

- `frontend/Game/Game/` 配下をドキュメントルートにコピー
- MIME type 設定（.js: application/javascript, .json: application/json）

#### Nginx 例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html/frontend/Game/Game;
    index index.html;
    location ~* \.(js|json)$ {
        add_header Content-Type application/javascript;
    }
}
```

#### Apache 例

```bash
cp -r frontend/Game/Game/* /var/www/html/
# .htaccess で MIME type 設定（必要なら）
```

## カスタマイズ・拡張

- Three.js のバージョンは importmap で指定（CDN: jsdelivr）
- UI/ロジックの改造は `Game/` 配下の JS を編集
- サーバー連携（WebSocket など）は現状未実装。必要に応じて追加

## 注意点

- ファイル直開き（file://）では importmap が効かず動作しません。必ず http(s) 経由で配信してください。
- モバイル端末では UI/操作性に制限がある場合があります。

---

© 2025 ArcTech
