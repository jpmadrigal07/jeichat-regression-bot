FROM oven/bun:1.3.10

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src ./src

ENV NODE_ENV=production

# Cloud Cursor runs verification in a hosted VM. No Playwright/browser install in this image.
CMD ["bun", "run", "src/index.js"]
