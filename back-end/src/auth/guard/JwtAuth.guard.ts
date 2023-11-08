import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {JwtTokenPayload} from '../interface';
import {AuthService} from '../auth.service';
import {Observable} from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor() {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    if (context.getType() === 'http') {
      return super.canActivate(context);
    } else if (context.getType() === 'ws') {
      const client = context.switchToWs().getClient();
      const token = client?.handshake?.auth?.token ?? client?.handshake?.headers?.access_token;
      client.handshake.auth.payload = JwtAuthGuard.validateToken(token, 'ws');
      return true;
    }
  }
  static validateToken(token: string, ctx: 'http' | 'ws' = 'http'): JwtTokenPayload {
    return AuthService.verifyAndDecodeAuthToken(token, ctx);
  }
}
