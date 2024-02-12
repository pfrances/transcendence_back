import {Injectable, UnauthorizedException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {JwtService as Jwt} from '@nestjs/jwt';
import {WsException} from '@nestjs/websockets';
import {JwtTokenPayload} from 'src/auth/interface';
import {RefreshJwt} from './interface/refreshJwt';
import {JwtData} from '../shared/HttpEndpoints/types';

@Injectable()
export class JwtService {
  private jwtRefreshSecret: string;
  constructor(private readonly jwt: Jwt, private readonly config: ConfigService) {
    this.jwtRefreshSecret = this.config.getOrThrow('JWT_REFRESH_KEY');
  }

  async createAuthToken(tokenData: JwtTokenPayload): Promise<JwtData> {
    const authToken = this.jwt.sign(tokenData);
    const expiresAt = this.getJwtExpirationDate(authToken);
    return {token: authToken, expiresAt};
  }

  async createRefreshToken(tokenData: JwtTokenPayload): Promise<JwtData> {
    const refreshToken = this.jwt.sign(tokenData, {expiresIn: '7d', secret: this.jwtRefreshSecret});
    const expiresAt = this.getJwtExpirationDate(refreshToken);
    return {token: refreshToken, expiresAt};
  }

  async refreshAccessToken(refreshToken: string, authToken: string): Promise<RefreshJwt> {
    try {
      this.jwt.verify(authToken, {ignoreExpiration: true});
    } catch (err: any) {
      throw new UnauthorizedException(err);
    }
    const payload = this.verifyAndDecodeAuthToken(refreshToken, 'http', true);

    const newAuthToken = await this.createAuthToken(payload);
    const newRefreshToken = await this.createRefreshToken(payload);

    return {authToken: newAuthToken, refreshToken: newRefreshToken};
  }
  private getJwtExpirationDate(token: string): number {
    const payload = this.jwt.decode(token, {json: true});
    return payload.exp * 1000;
  }

  decodeRefreshToken(refreshToken: string): JwtTokenPayload {
    const payload = this.jwt.decode(refreshToken, {json: true}) as JwtTokenPayload;
    return {userId: payload.userId, nickname: payload.nickname};
  }

  decodeToken(authToken: string): JwtTokenPayload {
    const payload = this.jwt.decode(authToken, {json: true}) as JwtTokenPayload;
    return {userId: payload.userId, nickname: payload.nickname};
  }

  verifyAndDecodeAuthToken(
    authToken: string,
    ctx: 'http' | 'ws' = 'http',
    isRefresh: boolean = false,
  ): JwtTokenPayload {
    try {
      if (isRefresh) {
        this.jwt.verify(authToken, {secret: this.jwtRefreshSecret});
        return this.decodeRefreshToken(authToken);
      }
      this.jwt.verify(authToken);
      return this.decodeToken(authToken);
    } catch (err: any) {
      if (ctx === 'http') throw new UnauthorizedException(err);
      if (ctx === 'ws') throw new WsException(err);
      throw err;
    }
  }
}
