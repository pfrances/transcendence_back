# fuser -k 3333/tcp
yarn db:restart
npx prisma migrate dev --name 'dev_update'
npx prisma studio dev &
yarn start:dev