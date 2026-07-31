FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash git wget ca-certificates curl docker.io \
  && ARCH="$(dpkg --print-architecture)" \
  && mkdir -p /usr/local/lib/docker/cli-plugins \
  && curl -fsSL "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-${ARCH}" \
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
