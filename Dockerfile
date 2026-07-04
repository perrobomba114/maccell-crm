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
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 -g nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/src ./src

RUN mkdir .next
RUN chown nextjs:nodejs .next
RUN mkdir -p backups
RUN chown nextjs:nodejs backups
RUN mkdir -p upload/repairs/images upload/branches upload/profiles upload/knowledge upload/pantallas
RUN chown -R nextjs:nodejs upload

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss && node server.js"]
