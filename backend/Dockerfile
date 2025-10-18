FROM node:20-alpine

WORKDIR /app/backend

# DB module をコピー (backend の依存関係として必要)
COPY db /app/db

# package.json をコピーして依存関係をインストール
COPY backend/package*.json ./
RUN npm install --omit=dev

# アプリケーションのソースをコピー
COPY backend/ ./

EXPOSE 3000

CMD ["node", "server.js"]