# syntax=docker/dockerfile:1

FROM node:20-bullseye-slim AS base

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 build-essential ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./

RUN corepack enable \
  && yarn install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["node", "--loader", "ts-node/esm", "src/actors/mediatorServer.ts"]
