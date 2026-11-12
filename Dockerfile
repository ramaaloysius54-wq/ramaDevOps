FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package*.json ./
COPY prisma ./prisma/

FROM base AS dependencies
RUN npm ci

FROM dependencies AS build
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm run bot:build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/dist-bot ./dist-bot
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma

EXPOSE 3000 4000

# Kosongkan CMD spesifik, karena eksekusinya akan diatur oleh Kubernetes YAML
