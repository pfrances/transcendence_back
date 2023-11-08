import {ExecutionContext, Injectable, UnauthorizedException} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';

@Injectable()
export class FortyTwoAuthGuard extends AuthGuard('42') {
  constructor() {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<any> {
    try {
      return await super.canActivate(context);
    } catch (err) {
      throw new UnauthorizedException(err?.code ?? 'invalid access');
    }
  }
}
