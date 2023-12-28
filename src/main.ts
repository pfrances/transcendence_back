import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {ValidationPipe} from '@nestjs/common';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({whitelist: true}));
  app.use(
    cors({
      origin: process.env.NODE_ENV === 'TEST' ? '*' : process.env.FRONTEND_URL,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    }),
  );
  await app.listen(3333);
}
bootstrap();
