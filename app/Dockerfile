# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /workspace/app

# Copy only manifests first so Docker caches the install layer
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:22-alpine AS runner

# Create a non-root user with no login shell and no home directory
RUN addgroup -S aggie && adduser -S -G aggie -H aggie

WORKDIR /workspace/app

# Copy installed modules from the deps stage
COPY --from=deps /workspace/app/node_modules ./node_modules

# Copy application source
COPY . .

# Pre-create the clients directory in the image so the volume mount target exists
# (it will be overridden by the host mount at runtime)
RUN mkdir -p /workspace/clients

# Drop all privileges — run as 'aggie' from here on
USER aggie

# Expose the port (the host side is bound to 127.0.0.1 in docker-compose.yml)
EXPOSE 3000

CMD ["node", "server.js"]
