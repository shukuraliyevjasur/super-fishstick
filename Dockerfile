# 24, not 20: Prisma 7 requires Node >=22, and npm 10 (bundled with 20) cannot
# install a lockfile written by npm 11 — it resolves nested wasm deps differently.
FROM node:24-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

CMD ["npm", "run", "worker"]
