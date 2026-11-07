# Production Dockerfile for StrangerVerse Backend
FROM node:20-alpine

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package descriptors
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy application source
COPY src ./src

# Expose port
EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production

# Start production server
CMD ["node", "src/index.js"]
