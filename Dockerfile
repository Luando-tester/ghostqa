# GhostQA — Kiroween 2026
# Playwright needs system browser deps; use the official Playwright image
# (Node 22 + Chromium + all deps preinstalled). dist/ is gitignored, so the
# host builds from src with `npm run build`.
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
COPY public ./public
COPY test ./test
RUN npm run build

# Runtime state: haunt reports + screenshots are written here and served
RUN mkdir -p reports

ENV NODE_ENV=production
# Render / Railway / Fly inject PORT; default 3000 for local runs
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/server.js"]
