# syntax=docker/dockerfile:1

FROM node:20-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl libssl3 tzdata libc6-dev && rm -rf /var/lib/apt/lists/*
ENV TZ="America/Argentina/Buenos_Aires"
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package.json package-lock.json* ./
COPY scripts/patch-sdk.js ./scripts/patch-sdk.js
RUN if [ -f package-lock.json ]; then npm ci --legacy-peer-deps --no-audit --fund=false; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN node scripts/build-technical-worker.mjs
RUN --mount=type=secret,id=NEXT_SERVER_ACTIONS_ENCRYPTION_KEY,required=true \
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(cat /run/secrets/NEXT_SERVER_ACTIONS_ENCRYPTION_KEY)" npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client poppler-utils tesseract-ocr tesseract-ocr-eng tesseract-ocr-spa \
    && rm -rf /var/lib/apt/lists/*

# The official node:20-slim image provides node as UID/GID 1000, which is
# also the identity used by the RAG worker for the shared schematic volume.

COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/src ./src

RUN mkdir .next
RUN chown node:node .next
RUN mkdir -p backups
RUN chown node:node backups
RUN mkdir -p upload/repairs/images upload/branches upload/profiles upload/knowledge upload/pantallas
RUN chown -R node:node upload

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=node:node /app/node_modules/prisma ./node_modules/prisma
USER node
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "scripts/start-with-technical-worker.sh"]
