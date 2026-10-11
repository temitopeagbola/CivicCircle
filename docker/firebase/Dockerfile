# syntax=docker/dockerfile:1
# Firebase Emulator Suite (Auth, Firestore, Storage + UI) for local development.
# Uses the "demo-civiccircle" project id, which needs no Google credentials.

FROM eclipse-temurin:21-jre AS jre

FROM node:24-bookworm-slim
COPY --from=jre /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk \
    PATH=/opt/java/openjdk/bin:$PATH \
    FIREBASE_CLI_DISABLE_UPDATE_CHECK=true
ARG FIREBASE_TOOLS_VERSION=15.33.0
RUN npm install -g firebase-tools@${FIREBASE_TOOLS_VERSION} --no-audit --no-fund && npm cache clean --force

WORKDIR /firebase
COPY docker/firebase/firebase.json ./firebase.json
COPY firebase ./firebase
# Download the emulator binaries at build time so `up` is fast and works offline.
RUN firebase setup:emulators:firestore && firebase setup:emulators:storage && firebase setup:emulators:ui
COPY docker/firebase/start.sh /usr/local/bin/start-emulators
RUN chmod +x /usr/local/bin/start-emulators

EXPOSE 4000 4400 8080 9099 9199
HEALTHCHECK --interval=5s --timeout=3s --start-period=30s --retries=20 \
  CMD node -e "fetch('http://127.0.0.1:4400/emulators').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["start-emulators"]
