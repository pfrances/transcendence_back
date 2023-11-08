while ! nc -z "dev-db" "5432"; do
  sleep 1
done

npx prisma migrate dev --name init
yarn build
yarn start