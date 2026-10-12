# syntax=docker/dockerfile:1
# Static web export of the Expo app served by nginx (local docker compose only;
# production is built by Netlify). Build from the repo root.

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @civiccircle/web --include-workspace-root=false --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web

# EXPO_PUBLIC_* values are inlined into the bundle at build time.
ARG EXPO_PUBLIC_API_URL=http://localhost:8787
ARG EXPO_PUBLIC_FIREBASE_API_KEY=demo-key
ARG EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-civiccircle.firebaseapp.com
ARG EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-civiccircle
ARG EXPO_PUBLIC_FIREBASE_APP_ID=demo-app
ARG EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL=http://localhost:9099
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL \
    EXPO_PUBLIC_FIREBASE_API_KEY=$EXPO_PUBLIC_FIREBASE_API_KEY \
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=$EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN \
    EXPO_PUBLIC_FIREBASE_PROJECT_ID=$EXPO_PUBLIC_FIREBASE_PROJECT_ID \
    EXPO_PUBLIC_FIREBASE_APP_ID=$EXPO_PUBLIC_FIREBASE_APP_ID \
    EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL=$EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL
RUN npm run build -w @civiccircle/web

FROM nginx:1.27-alpine
COPY docker/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
