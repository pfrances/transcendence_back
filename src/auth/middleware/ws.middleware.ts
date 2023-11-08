import {Socket} from 'socket.io';
import {JwtService} from 'src/jwt/jwt.service';

type SocketIOMiddleWare = {
  (client: Socket, next: (err?: Error) => void);
};

export const SocketAuthMiddleware = (jwt: JwtService): SocketIOMiddleWare => {
  return (client: Socket, next: (err?: Error) => void) => {
    try {
      const token = client?.handshake?.auth?.token ?? client?.handshake?.headers?.access_token;
      client.data = jwt.verifyAndDecodeAuthToken(token, 'ws');
      next();
    } catch (err) {
      next(err);
    }
  };
};
