FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app

ARG VITE_API_URL=http://localhost:3000
ARG VITE_BACKEND_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

RUN npm install -g serve

EXPOSE 3000

# Railway injects $PORT — serve must listen on it
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT}"]
