FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
# Install necessary dependencies for node-gyp/native modules if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6 \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

ENV TZ="America/Argentina/Buenos_Aires"
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
COPY scripts ./scripts
RUN \
  if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; \
  else echo "Lockfile not found." && exit 1; \
  fi


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1


RUN npm install prisma@6.1.0 -g && npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    tzdata \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*
    
ENV TZ="America/Argentina/Buenos_Aires"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Create backups directory with correct permissions
RUN mkdir -p backups
RUN chown nextjs:nodejs backups

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
