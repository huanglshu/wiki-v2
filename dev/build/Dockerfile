# ==========================
# --- Build Dependencies ---
# ==========================
FROM harbor.gdalpha.com/alpha-tools/nodejs:24.14.0-alpine3.23 AS dependencies

ENV NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node \
    npm_config_build_from_source=true \
    YARN_CACHE_FOLDER=/usr/local/share/.cache/yarn

RUN sed -i 's#https://dl-cdn.alpinelinux.org#https://mirrors.aliyun.com#g' /etc/apk/repositories && \
    npm config set registry https://registry.npmmirror.com && \
    apk add yarn g++ make cmake python3 py3-setuptools --no-cache

WORKDIR /wiki

COPY ./patches ./patches
COPY ./package.json ./package.json
COPY ./yarn.lock ./yarn.lock

RUN sed -i 's#https://registry.npmjs.org#https://registry.npmmirror.com#g; s#https://registry.yarnpkg.com#https://registry.npmmirror.com#g' yarn.lock && \
    yarn config set registry https://registry.npmmirror.com

FROM dependencies AS build-dependencies
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,sharing=locked \
    yarn --frozen-lockfile --non-interactive

FROM dependencies AS production-dependencies
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,sharing=locked \
    yarn --production --frozen-lockfile --non-interactive

# ====================
# --- Build Assets ---
# ====================
FROM build-dependencies AS assets

COPY ./client ./client
COPY ./data/sideload ./data/sideload
COPY ./dev/webpack ./dev/webpack
COPY ./dev/templates ./dev/templates
COPY ./.babelrc ./.babelrc
COPY ./.eslintignore ./.eslintignore
COPY ./.eslintrc.yml ./.eslintrc.yml

RUN yarn build

# ===============
# --- Release ---
# ===============
FROM harbor.gdalpha.com/alpha-tools/nodejs:24.14.0-alpine3.23
LABEL maintainer="requarks.io"

RUN sed -i 's#https://dl-cdn.alpinelinux.org#https://mirrors.aliyun.com#g' /etc/apk/repositories && \
    npm config set registry https://registry.npmmirror.com && \
    apk add bash curl git openssh gnupg sqlite --no-cache && \
    mkdir -p /wiki && \
    mkdir -p /logs && \
    mkdir -p /wiki/data/content && \
    chown -R node:node /wiki /logs

WORKDIR /wiki

COPY --chown=node:node --from=assets /wiki/assets ./assets
COPY --chown=node:node --from=production-dependencies /wiki/node_modules ./node_modules
COPY --chown=node:node ./server ./server
COPY --chown=node:node --from=assets /wiki/server/views ./server/views
COPY --chown=node:node --from=assets /wiki/data/sideload ./server/sideload
COPY --chown=node:node ./data/sideload ./data/sideload
COPY --chown=node:node ./dev/build/config.yml ./config.yml
COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./LICENSE ./LICENSE

RUN node -e 'const fs = require("fs"); const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")); pkg.dev = false; fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n")'

USER node

VOLUME ["/wiki/data/content"]

EXPOSE 3000
EXPOSE 3443

# HEALTHCHECK --interval=30s --timeout=30s --start-period=30s --retries=3 CMD curl -f http://localhost:3000/healthz

CMD ["node", "--no-deprecation", "server"]
