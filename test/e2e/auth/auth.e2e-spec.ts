import {Test} from '@nestjs/testing';
import {INestApplication, ValidationPipe} from '@nestjs/common';
import {HttpSignUp} from '../../../src/shared/HttpEndpoints/auth/SignUp';
import * as supertest from 'supertest';
import {PrismaService} from '../../../src/prisma/prisma.service';
import {testBodyByCtr, validateEmail} from '../utils/test.utils';
import {signUpData} from './signUp.data';
import {AuthModule} from '../../../src/auth/auth.module';
import {PrismaModule} from '../../../src/prisma/prisma.module';
import {UserService} from '../../../src/user/user.service';
import {JwtModule} from '../../../src/jwt/jwt.module';
import {UserModule} from '../../../src/user/user.module';
import {HttpAuth42, HttpSignIn} from '../../../src/shared/HttpEndpoints/auth';
import {signInData} from './signIn.data';
import {createDefaultUser, createUserData} from '../invitation/defaultUser.data';
import {JwtService} from '../../../src/jwt/jwt.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let user: UserService;
  let jwt: JwtService;
  let httpServer: supertest.SuperTest<supertest.Test>;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule, PrismaModule, JwtModule, UserModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({whitelist: true}));
    await app.init();
    prisma = moduleRef.get(PrismaService);
    user = moduleRef.get(UserService);
    jwt = moduleRef.get(JwtService);
    await prisma.cleanDatabase();
    httpServer = supertest(app.getHttpServer());
    await createDefaultUser(user, jwt);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: {
        profile: {nickname: {notIn: createUserData.map(user => user.nickname)}},
      },
    });
  });

  describe(`${HttpAuth42.endPointFull} ${HttpAuth42.method}`, () => {
    const clientId = process.env.OAUTH42_CLIENT_ID;
    const redirectUri = process.env.OAUTH42_REDIRECT_URI;
    if (!clientId || !redirectUri) throw new Error('Missing env variables');
    it(`[auth42] should redirect to 42 auth`, async () => {
      const res = await httpServer[HttpAuth42.method](HttpAuth42.endPointFull)
        .set('Accept', 'application/json')
        .expect(302);

      const parsedUrl = new URL(res.headers.location);
      expect(parsedUrl.protocol).toBe('https:');
      expect(parsedUrl.host).toBe('api.intra.42.fr');
      expect(parsedUrl.pathname).toBe('/oauth/authorize');
      expect(parsedUrl.searchParams.get('response_type')).toBe('code');
      expect(parsedUrl.searchParams.get('redirect_uri')).toBe(redirectUri);
      expect(parsedUrl.searchParams.get('client_id')).toBe(clientId);
    });
    it(`[auth42] should redirect to 42 auth even when get directly cb link`, async () => {
      const res = await httpServer[HttpAuth42.method.toLowerCase()](HttpAuth42.endPointFull_CB)
        .set('Accept', 'application/json')
        .expect(302);
      const parsedUrl = new URL(res.headers.location);
      expect(parsedUrl.protocol).toBe('https:');
      expect(parsedUrl.host).toBe('api.intra.42.fr');
      expect(parsedUrl.pathname).toBe('/oauth/authorize');
      expect(parsedUrl.searchParams.get('response_type')).toBe('code');
      expect(parsedUrl.searchParams.get('redirect_uri')).toBe(redirectUri);
      expect(parsedUrl.searchParams.get('client_id')).toBe(clientId);
    });
    it(`[auth42] should unauthorized when code is not valid`, async () => {
      const res = await httpServer[HttpAuth42.method](HttpAuth42.endPointFull_CB)
        .query({redirectUri})
        .query({clientId})
        .query({code: 'notvalidcode'})
        .set('Accept', 'application/json')
        .expect(401);
      expect(res.error).toBeTruthy();
    });
    it(`[auth42] should redirect when client_id is not valid`, async () => {
      const res = await httpServer[HttpAuth42.method](HttpAuth42.endPointFull_CB)
        .query({redirectUri})
        .query({clientId: 'notvalidcode'})
        .set('Accept', 'application/json')
        .expect(302);
      const parsedUrl = new URL(res.headers.location);
      expect(parsedUrl.protocol).toBe('https:');
      expect(parsedUrl.host).toBe('api.intra.42.fr');
      expect(parsedUrl.pathname).toBe('/oauth/authorize');
      expect(parsedUrl.searchParams.get('response_type')).toBe('code');
      expect(parsedUrl.searchParams.get('redirect_uri')).toBe(redirectUri);
      expect(parsedUrl.searchParams.get('client_id')).toBe(clientId);
    });
  });

  describe(`${HttpSignUp.endPointFull} ${HttpSignUp.method}`, () => {
    signUpData.map(async reqBody => {
      const {email, password, nickname} = reqBody;
      let itMessage = '';
      let status = 201;
      if (!email || !password || !nickname) {
        status = 400;
        itMessage = 'empty or undefined string';
      } else if (!validateEmail(email)) {
        status = 400;
        itMessage = 'email is not valid';
      } else if (!testBodyByCtr(reqBody, HttpSignUp.reqTemplate)) {
        status = 400;
        itMessage = 'reqbody is not valid';
      } else if (createUserData.find(user => user.nickname === nickname)) {
        status = 409;
        itMessage = 'nickname is already taken';
      }
      it(`[signUp] should ${
        itMessage ? `not pass: ${itMessage}` : 'pass'
      } with status ${status}`, async () => {
        const res = await httpServer[HttpSignUp.method](HttpSignUp.endPointFull)
          .send(reqBody)
          .set('Accept', 'application/json')
          .expect(status);
        if (status >= 400) expect(res.error).toBeTruthy();
        else expect(testBodyByCtr(res.body, HttpSignUp.resTemplate)).toBe(true);
      });
    });
  });

  describe(`${HttpSignIn.endPointFull} ${HttpSignIn.method}`, () => {
    signInData.map(async reqBody => {
      const {nickname, password} = reqBody;
      let itMessage = '';
      let status = 201;
      if (!password || !nickname) {
        status = 400;
        itMessage = 'empty or undefined string';
      } else if (!testBodyByCtr(reqBody, HttpSignIn.reqTemplate)) {
        status = 400;
        itMessage = 'reqbody is not valid';
      } else if (!createUserData.find(user => user.nickname === nickname)) {
        status = 401;
        itMessage = 'user not in database';
      }
      it(`[signIn] should ${
        itMessage ? `not pass: ${itMessage}` : 'pass'
      } with status ${status}`, async () => {
        const res = await httpServer[HttpSignIn.method](HttpSignIn.endPointFull)
          .send(reqBody)
          .set('Accept', 'application/json');
        if (status >= 400) expect(res.error).toBeTruthy();
        else expect(testBodyByCtr(res.body, HttpSignIn.resTemplate)).toBe(true);
      });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
