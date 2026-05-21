# Build stage
FROM node:24-alpine AS builder

# Build arguments for configuration
ARG REBUILDERD_URL=http://localhost:8080
ARG REBUILDERD_AUTH_TOKEN=""

WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --network-concurrency 10

COPY . .

ENV REBUILDERD_URL=${REBUILDERD_URL}
ENV REBUILDERD_AUTH_TOKEN=${REBUILDERD_AUTH_TOKEN}

RUN pnpm run build

# Serve stage
FROM nginx:alpine

ARG REBUILDERD_URL=http://localhost:8080
ARG REBUILDERD_AUTH_TOKEN=""

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /tmp/nginx.conf.template
RUN envsubst '${REBUILDERD_URL} ${REBUILDERD_AUTH_TOKEN}' \
    < /tmp/nginx.conf.template \
    > /etc/nginx/conf.d/default.conf \
    && rm /tmp/nginx.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]