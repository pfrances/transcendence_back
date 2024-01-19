FROM node:latest

WORKDIR /app_back-end
COPY package.json tsconfig.json ./
COPY src/ prisma/ ./
COPY init_back-end.sh ./

RUN yarn

ENTRYPOINT [ "sh", "init_back-end.sh" ]