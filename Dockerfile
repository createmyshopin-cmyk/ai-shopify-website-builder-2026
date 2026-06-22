# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY mvp/package.json mvp/
COPY packages/api/package.json packages/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/workers/package.json packages/workers/

RUN npm ci --omit=dev

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY mvp/package.json mvp/
COPY packages/api/package.json packages/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/workers/package.json packages/workers/

RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY packages/api packages/api
COPY "base theme" "base theme"

RUN npm run build --workspace=@theme-editor/shared \
  && npm run build --workspace=@theme-editor/db \
  && npm run generate --workspace=@theme-editor/db \
  && npm run build --workspace=@theme-editor/api

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=3001

RUN addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/api/dist ./packages/api/dist
COPY --from=build /app/packages/api/package.json ./packages/api/package.json
COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/base\ theme ./base\ theme

USER app
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

CMD ["node", "packages/api/dist/main.js"]
