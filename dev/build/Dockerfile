# ====================
# --- Build Assets ---
# ====================
FROM harbor.gdalpha.com/alpha-tools/nodejs:24.14.0-alpine3.23 AS assets

ENV NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node \
    npm_config_build_from_source=true

RUN sed -i 's#https://dl-cdn.alpinelinux.org#https://mirrors.aliyun.com#g' /etc/apk/repositories && \
    npm config set registry https://registry.npmmirror.com && \
    apk add yarn g++ make cmake python3 py3-setuptools --no-cache

WORKDIR /wiki

COPY ./client ./client
COPY ./dev ./dev
COPY ./patches ./patches
COPY ./package.json ./package.json
COPY ./yarn.lock ./yarn.lock
COPY ./.babelrc ./.babelrc
COPY ./.eslintignore ./.eslintignore
COPY ./.eslintrc.yml ./.eslintrc.yml

RUN sed -i 's#https://registry.npmjs.org#https://registry.npmmirror.com#g; s#https://registry.yarnpkg.com#https://registry.npmmirror.com#g' yarn.lock && \
    yarn config set registry https://registry.npmmirror.com && \
    yarn cache clean
RUN yarn --frozen-lockfile --non-interactive
RUN yarn build
RUN rm -rf /wiki/node_modules
RUN yarn --production --frozen-lockfile --non-interactive
RUN yarn patch-package

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
COPY --chown=node:node --from=assets /wiki/node_modules ./node_modules
COPY --chown=node:node ./server ./server
COPY --chown=node:node --from=assets /wiki/server/views ./server/views
COPY --chown=node:node ./dev/build/config.yml ./config.yml
COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./LICENSE ./LICENSE

USER node

VOLUME ["/wiki/data/content"]

EXPOSE 3000
EXPOSE 3443

# HEALTHCHECK --interval=30s --timeout=30s --start-period=30s --retries=3 CMD curl -f http://localhost:3000/healthz

CMD ["node", "--no-deprecation", "server"]
