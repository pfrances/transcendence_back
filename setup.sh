fuser -k 3333/tcp
docker compose down
docker compose up -d
sleep 2
npx prisma migrate dev --name 'dev_devupdate'
npx prisma studio dev &
yarn start:dev