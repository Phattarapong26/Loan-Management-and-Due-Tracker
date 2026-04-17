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

FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

# nginx template — Railway will substitute $PORT at runtime
COPY --from=builder /app/dist /usr/share/nginx/html

RUN printf 'server {\n\
    listen $PORT;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/templates/default.conf.template

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

EXPOSE 80

# nginx docker image supports envsubst via templates/ directory automatically
CMD ["nginx", "-g", "daemon off;"]
