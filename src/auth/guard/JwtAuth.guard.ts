import {CanActivate, ExecutionContext, Injectable, UnauthorizedException} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {JwtTokenPayload} from '../interface';
import {Observable} from 'rxjs';
import {JwtService} from 'src/jwt/jwt.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly jwt: JwtService) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    try {
      if (context.getType() === 'http') {
        const req = context.switchToHttp().getRequest();
        const token = req?.headers?.authorization?.split(' ')[1] ?? req?.headers?.access_token;
        req.user = this.validateToken(token, 'http');
        return true;
      } else if (context.getType() === 'ws') {
        const client = context.switchToWs().getClient();
        const token = client?.handshake?.auth?.token ?? client?.handshake?.headers?.access_token;
        client.handshake.auth.payload = this.validateToken(token, 'ws');
        return true;
      }
    } catch (err: any) {
      throw new UnauthorizedException('invalid token');
    }
    return false;
  }
  validateToken(token: string, ctx: 'http' | 'ws' = 'http'): JwtTokenPayload {
    return this.jwt.verifyAndDecodeAuthToken(token, ctx);
  }
}
