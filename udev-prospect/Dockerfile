# syntax=docker/dockerfile:1
# UDEV Prospect — imagem da aplicação (target "app") e do worker (target "worker", inclui Chromium).

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]

FROM app AS worker
# Chromium + dependências do sistema para a verificação em ecrã móvel (versão alinhada com o pacote playwright do package-lock)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium && rm -rf /var/lib/apt/lists/*
CMD ["npx", "tsx", "scripts/worker.ts"]
