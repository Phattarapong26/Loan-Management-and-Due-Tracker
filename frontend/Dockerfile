FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API_URL=http://localhost:3000
ARG VITE_BACKEND_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Write nginx config with placeholder, replace at runtime
RUN echo 'server { listen NGINX_PORT; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' \
    > /etc/nginx/conf.d/default.conf

# Entrypoint: replace NGINX_PORT with actual $PORT then start nginx
CMD ["sh", "-c", "sed -i \"s/NGINX_PORT/${PORT:-80}/g\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
