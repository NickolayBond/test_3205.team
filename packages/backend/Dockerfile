# ==================== Dependencies & Build ====================
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

RUN npm ci

COPY src ./src

RUN npm run build

# ==================== Development ====================
FROM node:18-alpine AS development

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

RUN npm ci

COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "start:dev"]


# ==================== Production ====================
FROM node:18-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main"]
