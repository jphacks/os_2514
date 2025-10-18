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
# フォールバック参照（Cloud Buildでブランチがmainでもdbが無い場合があるため、まず dev-infra-init-docker を試す）
ARG REPO_REF="dev-infra-init-docker"
RUN set -eux; \
    # backend ディレクトリの正規化
    if [ -d /app/src/backend ]; then \
    cp -a /app/src/backend /app/backend; \
    else \
    cp -a /app/src /app/backend; \
    fi; \
    # db ディレクトリの取得（優先: ビルドコンテキスト → リモートの dev-infra-init-docker → main）
    if [ -d /app/src/db ]; then \
    cp -a /app/src/db /app/db; \
    else \
    echo "db/ not found in build context. Trying to fetch from remote..."; \
    apk add --no-cache git; \
    fetched=""; \
    for REF in "${REPO_REF}" "dev-infra-init-docker" "main"; do \
    echo "Trying ${REPO_URL}@${REF}"; \
    if git ls-remote --heads "${REPO_URL}" "${REF}" | grep -q .; then \
    rm -rf /tmp/repo; \
    git clone --depth 1 --branch "${REF}" "${REPO_URL}" /tmp/repo && fetched="${REF}" && break; \
    fi; \
    done; \
    if [ -n "$fetched" ] && [ -d /tmp/repo/db ]; then \
    cp -a /tmp/repo/db /app/db; \
    echo "Fetched db from ${REPO_URL}@${fetched}"; \
    else \
    echo "ERROR: db directory not found in build context or remote branches (tried: ${REPO_REF}, dev-infra-init-docker, main)."; \
    exit 1; \
    fi; \
    rm -rf /tmp/repo; \
    fi

WORKDIR /app/backend


# server.jsの存在確認用（デバッグ用）
RUN ls -l /app/backend
RUN npm install --omit=dev

# Cloud Run 既定の PORT=8080 を明示
EXPOSE 8080

CMD ["node", "server.js"]