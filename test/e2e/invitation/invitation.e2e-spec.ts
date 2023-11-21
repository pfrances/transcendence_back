import {Test} from '@nestjs/testing';
import * as supertest from 'supertest';
import {InvitationModule} from '../../../src/invitation/invitation.module';
import {UserModule} from '../../../src/user/user.module';
import {PrismaModule} from '../../../src/prisma/prisma.module';
import {INestApplication, ValidationPipe} from '@nestjs/common';
import {PrismaService} from '../../../src/prisma/prisma.service';
import {UserService} from '../../../src/user/user.service';
import {IdefaultUserData, createDefaultUser} from './defaultUser.data';
import {JwtService} from '../../../src/jwt/jwt.service';
import {HttpSendInvitation} from '../../../src/shared/HttpEndpoints/invitation';
import {testBodyByCtr} from '../utils/test.utils';
import {getJsonData, writeJsonData} from '../../data/getDefaultData';
import {JwtModule} from '../../../src/jwt/jwt.module';

describe('InvitationController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let user: UserService;
  let jwt: JwtService;
  let httpServer: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [InvitationModule, PrismaModule, JwtModule, UserModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({whitelist: true}));
    await app.init();
    prisma = await moduleRef.get(PrismaService);
    user = await moduleRef.get(UserService);
    jwt = await moduleRef.get(JwtService);
    await prisma.cleanDatabase();
    httpServer = supertest(app.getHttpServer());
    const defaultUser = await createDefaultUser(user, jwt);
    writeJsonData(defaultUser);
  });

  describe('invitation', () => {
    let defaultUser: IdefaultUserData[] = [];
    it('should get default user data', () => {
      expect(() => (defaultUser = getJsonData() as IdefaultUserData[])).not.toThrow();
    });
    for (const sender of defaultUser) {
      for (const receiver of defaultUser) {
        if (sender.userId === receiver.userId) continue;
        it(`[invitation] user ${sender.userId} should be able to invite user ${receiver.userId}`, async () => {
          const reqBody: HttpSendInvitation.reqTemplate = {targetUserId: receiver.userId};
          const res = await httpServer
            .post(`${HttpSendInvitation.getEndPointFull('friend')}`)
            .send(reqBody)
            .set('Accept', 'application/json')
            .set('Authorization', `Bearer ${sender.authToken}`)
            .expect(201);
          testBodyByCtr(res.body, HttpSendInvitation.resTemplate);
        });
      }
    }
  });

  afterAll(async () => {
    await app.close();
  });
});
