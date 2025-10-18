FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

# リポジトリ全体 or backend 単体のどちらでも動作するように、一旦すべてを /app/src にコピー
COPY . /app/src

# 必要なレイアウトに正規化
# - /app/src/backend があればそれを /app/backend に昇格
# - なければ /app/src をそのまま /app/backend とみなす
# - /app/src/db が無い場合は GitHub から該当リビジョンの db を取得（Cloud Build でも動作）
ARG REPO_URL="https://github.com/jphacks/os_2514"
ARG REPO_REF="main"
RUN set -eux; \
    if [ -d /app/src/backend ]; then \
    cp -a /app/src/backend /app/backend; \
    else \
    cp -a /app/src /app/backend; \
    fi; \
    if [ -d /app/src/db ]; then \
    cp -a /app/src/db /app/db; \
    else \
    echo "db/ not found in build context. Fetching from ${REPO_URL}@${REPO_REF}"; \
    apk add --no-cache git; \
    git clone --depth 1 --branch "${REPO_REF}" "${REPO_URL}" /tmp/repo; \
    cp -a /tmp/repo/db /app/db; \
    rm -rf /tmp/repo; \
    fi

WORKDIR /app/backend

# 依存関係をインストール（backend/package.json は 'os2514-db': 'file:../db' を参照）
RUN npm install --omit=dev

# Cloud Run 既定の PORT=8080 を明示
EXPOSE 8080

CMD ["node", "server.js"]