import {ExecutionContext, Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {AuthGuard} from '@nestjs/passport';
import {Request, Response} from 'express';
import {HttpAuth42} from 'src/shared/HttpEndpoints/auth';

@Injectable()
export class FortyTwoAuthGuard extends AuthGuard('42auth') implements FortyTwoAuthGuard {
  private readonly frontUrl: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.frontUrl = this.config.getOrThrow('FRONTEND_URL');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest() as Request;

    const codeMissing = req.path === HttpAuth42.endPointFull_CB && !req.query.code;
    const error_param = req.query.error;
    const error_description_query = req.query.error_description;

    if (error_param || error_description_query || codeMissing) {
      const res = context.switchToHttp().getResponse() as Response;
      res.redirect(`${this.frontUrl}/auth?OAuth42Error=Unauthorized`);
      return false;
    }
    try {
      const res = (await super.canActivate(context)) as boolean;
      return res;
    } catch (err) {
      const res = context.switchToHttp().getResponse() as Response;
      res.redirect(`${this.frontUrl}/auth?OAuth42Error=Unauthorized`);
      return false;
    }
  }
}
