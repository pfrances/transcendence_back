FROM node:lts-alpine

RUN addgroup -g 1001 -S transcendence_group && adduser -u 1001 -S transcendence -G transcendence_group
WORKDIR /app_back-end
COPY package*.json tsconfig*.json yarn.lock init_back-end.sh nest-cli.json ./
COPY src ./src
COPY prisma ./prisma

RUN yarn install && \
    yarn build && \
    rm -rf src tsconfig*.json node_modules && \
    yarn install --production && \
    rm -f package*.json yarn.lock
RUN chmod +x init_back-end.sh && chown -R transcendence:transcendence_group ./
USER transcendence

ENTRYPOINT [ "sh", "init_back-end.sh" ]