import {Test} from '@nestjs/testing';
import {PrismaModule} from '../../src/prisma/prisma.module';
import {PrismaService} from '../../src/prisma/prisma.service';
import {AuthModule} from '../../src/auth/auth.module';
import {UserModule} from '../../src/user/user.module';
import {UserService} from '../../src/user/user.service';
import {JwtModule} from '../../src/jwt/jwt.module';
import {JwtService} from '../../src/jwt/jwt.service';
import {ValidationPipe} from '@nestjs/common';
import {createDefaultUser} from '../e2e/invitation/defaultUser.data';
import {writeJsonData} from './getDefaultData';

describe('Create test data', () => {
  let user: UserService;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule, UserModule, JwtModule, PrismaModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({whitelist: true}));
    await app.init();
    const prisma = moduleRef.get(PrismaService);
    user = moduleRef.get(UserService);
    jwt = moduleRef.get(JwtService);
    await prisma.cleanDatabase();
  });

  it(`should create data`, async () => {
    const defaultUser = await createDefaultUser(user, jwt);
    const test = () => writeJsonData(defaultUser);
    expect(test).not.toThrow();
  });
});
