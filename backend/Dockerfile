FROM node:20-alpine AS base

ENV NODE_ENV=production
ENV NODE_PATH=/app/backend/node_modules:/app/node_modules
WORKDIR /app/backend

# Copy manifests first for better caching
COPY backend/package.json ./package.json
COPY db /app/db

# Install backend deps (file:../db will resolve because /app/db exists)
RUN --mount=type=cache,target=/root/.npm npm install --omit=dev \
    && mkdir -p /app/node_modules \
    && cp -r node_modules/* /app/node_modules/ || true

# Copy sources
COPY backend .

EXPOSE 3000
CMD ["node", "server.js"]
