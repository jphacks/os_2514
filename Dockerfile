# Multi-service monorepo simple backend image
FROM node:20-alpine AS base

ENV NODE_ENV=production
WORKDIR /app

# Use npm workspaces install at the repo root so os2514-db resolves as a package
COPY package.json ./package.json
COPY backend/package.json ./backend/package.json
COPY db/package.json ./db/package.json
RUN --mount=type=cache,target=/root/.npm npm install --omit=dev

# Copy sources after installing deps
COPY backend ./backend
COPY db ./db

EXPOSE 3000
CMD ["node", "backend/server.js"]

