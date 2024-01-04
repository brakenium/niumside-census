FROM oven/bun:1.0-alpine AS builder

COPY . /app
WORKDIR /app

RUN bun install

CMD ["bun", "run", "start"]
