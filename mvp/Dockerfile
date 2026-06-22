# Build from repo root: docker build -f mvp/Dockerfile .
# Railway: set Dockerfile path to mvp/Dockerfile, root directory /

FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY mvp/package.json mvp/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

RUN npm ci --omit=dev

FROM node:22-alpine AS build
WORKDIR /app

RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY mvp/package.json mvp/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY mvp mvp

RUN npm run build --workspace=@theme-editor/shared \
  && npm run generate --workspace=@theme-editor/db \
  && npm run build --workspace=mvp

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl \
  && addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/mvp/build ./mvp/build
COPY --from=build /app/mvp/package.json ./mvp/package.json
COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json

WORKDIR /app/mvp
USER app
EXPOSE 3000

CMD ["npm", "run", "start"]
