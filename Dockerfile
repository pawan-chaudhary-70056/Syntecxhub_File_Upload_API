# syntax=docker/dockerfile:1

FROM node:20-slim AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev


FROM node:20-slim AS runner

ENV NODE_ENV=production
# Disable optional telemetry from transitive dependencies.
ENV SCARF_ANALYTICS=false

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

RUN mkdir -p /app/uploads/originals /app/uploads/optimized /app/uploads/thumbnails \
    && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
