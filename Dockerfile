# 24, not 20: Prisma 7 requires Node >=22, and npm 10 (bundled with 20) cannot
# install a lockfile written by npm 11 — it resolves nested wasm deps differently.
FROM node:24-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force && rm -rf /root/.npm

COPY . .
RUN npx prisma generate && rm -rf /root/.cache/prisma /root/.npm

CMD ["npm", "run", "worker"]
