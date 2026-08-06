FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash git wget ca-certificates curl docker.io postgresql-client \
  && ARCH="$(dpkg --print-architecture)" \
  && case "$ARCH" in amd64) COMPOSE_ARCH=x86_64 ;; arm64) COMPOSE_ARCH=aarch64 ;; armhf) COMPOSE_ARCH=armv7 ;; *) COMPOSE_ARCH="$ARCH" ;; esac \
  && mkdir -p /usr/local/lib/docker/cli-plugins \
  && curl -fsSL "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-${COMPOSE_ARCH}" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose \
  && chmod +x /usr/local/lib/docker/cli-plugins/docker-compose \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV OPS_PORT=9090
EXPOSE 9090

CMD ["node", "server.js"]
