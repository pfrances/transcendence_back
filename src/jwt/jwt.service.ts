import {Injectable, UnauthorizedException} from '@nestjs/common';
import {JwtService as Jwt} from '@nestjs/jwt';
import {WsException} from '@nestjs/websockets';
import {JwtTokenPayload} from 'src/auth/interface';

@Injectable()
export class JwtService {
  constructor(private readonly jwt: Jwt) {}

  async createAuthToken(tokenData: JwtTokenPayload): Promise<string> {
    return this.jwt.sign(tokenData);
  }

  decodeToken(authToken: string): JwtTokenPayload {
    const payload = this.jwt.decode(authToken, {json: true}) as JwtTokenPayload;
    return {userId: payload.userId, nickname: payload.nickname};
  }

  verifyAndDecodeAuthToken(authToken: string, ctx: 'http' | 'ws' = 'http'): JwtTokenPayload {
    try {
      this.jwt.verify(authToken);
      return this.decodeToken(authToken);
    } catch (err: any) {
      if (ctx === 'http') throw new UnauthorizedException(err);
      if (ctx === 'ws') throw new WsException(err);
      throw err;
    }
  }
}
