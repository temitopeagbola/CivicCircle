# syntax=docker/dockerfile:1
# CivicCircle API. Build from the repo root:  docker build -f apps/api/Dockerfile .
# Used by docker compose (api + seed) and by Render (render.yaml).

FROM node:24-bookworm-slim AS base
WORKDIR /app
# npm ci validates every workspace manifest against the lockfile, so copy them all.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

FROM base AS build
# Only the API workspace's dependencies (no Expo, no root dev tooling).
RUN npm ci --workspace @civiccircle/api --include-workspace-root=false --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @civiccircle/api

FROM base AS runtime
ENV NODE_ENV=production
RUN npm ci --workspace @civiccircle/api --include-workspace-root=false --omit=dev --no-audit --no-fund \
  && npm cache clean --force
COPY --from=build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
USER node
ENV PORT=8787
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
