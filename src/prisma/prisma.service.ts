import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {Prisma, PrismaClient} from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({datasourceUrl: process.env.DATABASE_URL});
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'TEST') throw new Error('Attempted to clean non-test database');
    const models = Reflect.ownKeys(Prisma.ModelName);
    await Promise.allSettled(
      models.map(async model => {
        await this.$executeRaw`TRUNCATE TABLE "${model}" CASCADE;`;
        await this.$executeRaw`ALTER SEQUENCE "${model}_id_seq" RESTART WITH 1;`;
      }),
    );
  }
}
