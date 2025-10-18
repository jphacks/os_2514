FROM node:20-alpine

ENV NODE_ENV=production

# ルートに作業ディレクトリを用意
WORKDIR /app

# 先にDBモジュールを配置（backendのfile依存を解決するため）
COPY db ./db

# 依存関係のインストール（キャッシュを効かせるためにpackage*.jsonのみ先にコピー）
COPY backend/package*.json ./backend/

# backend配下でインストールを実行
WORKDIR /app/backend
RUN npm install --omit=dev

# アプリ本体のソースコードをコピー
COPY backend/ ./

# Cloud Run既定のPORT=8080に合わせてExpose（任意だが明示）
EXPOSE 8080

# アプリを起動
CMD ["node", "server.js"]