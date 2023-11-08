import {ExecutionContext, UnauthorizedException, createParamDecorator} from '@nestjs/common';
import {WsException} from '@nestjs/websockets';
import {WsSocketService} from 'src/webSocket/WsSocket/WsSocket.service';

export const GetInfoFromJwt = createParamDecorator(
  (data: 'userId' | 'nickname' | undefined, ctx: ExecutionContext) => {
    const ctxType = ctx.getType();
    let userInfo;
    if (ctxType === 'http') {
      userInfo = ctx.switchToHttp().getRequest()?.user;
      if (!userInfo) throw new UnauthorizedException('Jwt is missing');
    } else if (ctxType === 'ws') {
      const client = ctx.switchToWs().getClient();
      userInfo = WsSocketService.getJwtInfoByClientSocketId(client?.id);
      if (!userInfo) throw new WsException('Jwt is missing');
    }

    const value = data ? userInfo[data] : userInfo;
    if (!value && ctxType === 'http') throw new UnauthorizedException(`${data} is missing`);
    if (!value && ctxType === 'ws') throw new WsException(`${data} is missing`);
    return value;
  },
);
