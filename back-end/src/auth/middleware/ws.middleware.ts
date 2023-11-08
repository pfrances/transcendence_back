import {Socket} from 'socket.io';
import {JwtAuthGuard} from '../guard';

type SocketIOMiddleWare = {
  (client: Socket, next: (err?: Error) => void);
};

export const SocketAuthMiddleware = (): SocketIOMiddleWare => {
  return (client: Socket, next: (err?: Error) => void) => {
    try {
      const token = client?.handshake?.auth?.token ?? client?.handshake?.headers?.access_token;
      client.data = JwtAuthGuard.validateToken(token, 'ws');
      next();
    } catch (err) {
      next(err);
    }
  };
};
