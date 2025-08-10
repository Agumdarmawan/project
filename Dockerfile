# Multi-stage build for QR Attendance app

# Base image
FROM node:20-alpine AS base
WORKDIR /app

# Builder installs deps and builds client and server
FROM base AS builder
# Enable corepack for pnpm/yarn if needed (we use npm here)

# Copy manifests first for better layer caching
COPY server/package.json server/package-lock.json* ./server/
COPY client/package.json client/package-lock.json* ./client/

# Install dependencies
RUN cd server && npm install && cd ../client && npm install

# Copy rest of sources
COPY server ./server
COPY client ./client

# Build client
RUN cd client && npm run build

# Build server and generate Prisma client
RUN cd server && npm run prisma:generate && npm run build

# Runtime image
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /data

# Copy server production deps only
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/node_modules ./server/node_modules
# Copy built server and prisma folder
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
# Copy client build into server/public for static serving
COPY --from=builder /app/client/dist ./server/public

# Copy entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port
EXPOSE 3000

# Default envs (can be overridden by compose/.env)
ENV PORT=3000 \
    DATABASE_URL="file:/data/dev.db" \
    JWT_SECRET=change_me \
    PUBLIC_APP_URL="http://localhost:3000"

WORKDIR /app/server
ENTRYPOINT ["/entrypoint.sh"]