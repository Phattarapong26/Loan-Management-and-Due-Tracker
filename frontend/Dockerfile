FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

# Railway passes these as build args via Variables
ARG VITE_API_URL
ARG VITE_BACKEND_URL

# Fallback to Railway backend URL if not provided
ENV VITE_API_URL=${VITE_API_URL:-https://backend-production-cf04.up.railway.app}
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL:-https://backend-production-cf04.up.railway.app}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist

ENV PORT=3000
EXPOSE 3000

# -s: SPA mode, --no-clipboard: don't copy URL, uses serve.json for cache headers
CMD ["sh", "-c", "serve dist -p ${PORT:-8080} --no-clipboard"]
