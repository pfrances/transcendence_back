import {Test} from '@nestjs/testing';
import {INestApplication, ValidationPipe} from '@nestjs/common';
import * as supertest from 'supertest';
import {PrismaService} from '../../../src/prisma/prisma.service';
import {PrismaModule} from '../../../src/prisma/prisma.module';
import {UserService} from '../../../src/user/user.service';
import {JwtModule} from '../../../src/jwt/jwt.module';
import {UserModule} from '../../../src/user/user.module';
import {editMeData} from '../../data/editMe.data';
import {HttpEditMe, HttpGetMe} from '../../../src/shared/HttpEndpoints/user';
import {JwtService} from '../../../src/jwt/jwt.service';
import {UserPublicProfile} from '../../../src/shared/HttpEndpoints/interfaces';
import {CreateStandardUser} from '../../../src/user/interface';
import {testBodyByCtr} from '../utils/test.utils';
import {createUserData} from '../invitation/defaultUser.data';

interface IData {
  privateInfo: {email: string; password: string};
  publicProfile: UserPublicProfile;
  authToken: string;
}

async function createTestData(
  user: UserService,
  jwt: JwtService,
  data: CreateStandardUser,
): Promise<IData> {
  const {email, password, nickname, avatarUrl} = data;
  const userId = await user.getUserIdByNickname(nickname);
  const authToken = await jwt.createAuthToken({userId, nickname});
  return {
    privateInfo: {email, password},
    publicProfile: {
      userId,
      nickname,
      avatarUrl: avatarUrl || null,
    },
    authToken,
  };
}

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let user: UserService;
  let httpServer: supertest.SuperTest<supertest.Test>;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [UserModule, JwtModule, PrismaModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({whitelist: true}));
    await app.init();
    prisma = await moduleRef.get(PrismaService);
    user = await moduleRef.get(UserService);
    jwt = await moduleRef.get(JwtService);
    httpServer = supertest(app.getHttpServer());
    await prisma.cleanDatabase();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    for (const data of createUserData) await user.createUser(data);
  });

  describe('user', () => {
    for (const elem of createUserData) {
      it(`${HttpGetMe.endPointFull} should return user info`, async () => {
        const data = await createTestData(user, jwt, elem);
        const res = await httpServer[HttpGetMe.method](HttpGetMe.endPointFull)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${data.authToken}`)
          .expect(200);

        expect(res.body).toMatchObject(data.publicProfile);
      });

      for (const editBody of editMeData) {
        const {nickname, password, email} = editBody;
        let status = 200;
        if (nickname === '' || password === '' || email === '') status = 400;
        else if (nickname === undefined && password === undefined && email === undefined)
          status = 422;
        else if (nickname && elem.nickname !== nickname) {
          if (createUserData.some(elem => elem.nickname === nickname)) status = 409;
        }

        it(`${HttpEditMe.endPointFull} -- should ${
          status >= 400 ? 'not allow' : 'allow'
        } edit`, async () => {
          const userId = await user.getUserIdByNickname(elem.nickname);
          const authToken = await jwt.createAuthToken({nickname, userId});
          const res = await httpServer[HttpEditMe.method](HttpEditMe.endPointFull)
            .set('Accept', 'application/json')
            .set('Authorization', `Bearer ${authToken}`)
            .send(editBody)
            .expect(status);
          if (status >= 400) expect(res.error).toBeTruthy();
          else expect(testBodyByCtr(res.body, HttpEditMe.resTemplate)).toBe(true);
        });
      }
    }

    it(`[http] should return 401 when no auth token`, async () => {
      await httpServer[HttpGetMe.method](HttpGetMe.endPointFull)
        .set('Accept', 'application/json')
        .expect(401);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
