FROM node:20-alpine

WORKDIR /app

# DB module をコピー (backend の依存関係として必要)
COPY db ./db

# package.json をコピーして依存関係をインストール
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev

# アプリケーションのソースをコピー
COPY backend/ ./

EXPOSE 3000

CMD ["node", "server.js"]