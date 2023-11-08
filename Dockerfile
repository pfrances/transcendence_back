FROM node:latest

WORKDIR /app_back-end
COPY package.json yarn.lock tsconfig.json ./
COPY src/ prisma/ ./
COPY init_back-end.sh ./

RUN npm install yarn
RUN yarn install

ENTRYPOINT [ "sh", "init_back-end.sh" ]