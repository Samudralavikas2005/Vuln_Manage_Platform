# Multi-Stage Production Dockerfile for Vulnerability Management Platform
# Security Practice 1: Minimal alpine base image
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Security Practice 2: Clean production dependency installation
RUN npm ci --only=production

# Copy application source code
COPY . .

# Final Minimal Runtime Image
FROM node:20-alpine AS runner
WORKDIR /app

# Security Practice 3: Non-root user execution
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy built application & dependencies from builder stage
COPY --from=builder /app /app

# Set file ownership to non-root nodejs user
RUN chown -R nodejs:nodejs /app

# Switch execution context to unprivileged non-root user
USER nodejs

# Security Practice 4: Explicit port exposure & environmental variables
EXPOSE 3000
ENV NODE_ENV=production

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
