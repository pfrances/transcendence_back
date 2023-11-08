import {Injectable, Scope} from '@nestjs/common';
import {WsException} from '@nestjs/websockets';
import {Socket} from 'socket.io';
import {JwtTokenPayload} from 'src/auth/interface';

@Injectable({scope: Scope.DEFAULT})
export class WsSocketService {
  private static ClientSocketMap = new Map<number, Socket>();
  private static ClientJwtMap = new Map<string, JwtTokenPayload>();

  static getClientSocketByUserId(userId: number): Socket {
    return WsSocketService.ClientSocketMap.get(userId);
  }

  static getUserIdByClientSocketId(socketId: string): number {
    return WsSocketService.ClientJwtMap.get(socketId)?.userId;
  }

  static getJwtInfoByClientSocketId(socketId: string): JwtTokenPayload {
    return WsSocketService.ClientJwtMap.get(socketId);
  }

  static addUserToSocketMap(client: Socket): void {
    const jwtPayload = client?.data;
    const userId = jwtPayload?.userId;
    const clientId = client?.id;
    if (!jwtPayload) throw new WsException('jwt payload not found');
    if (!userId) throw new WsException('user id not found');
    if (!clientId) throw new WsException('client socket id not found');
    WsSocketService.ClientSocketMap.set(userId, client);
    WsSocketService.ClientJwtMap.set(clientId, jwtPayload);
  }

  static removeUserFromSocketsMap(userId: number): void {
    const clientId = WsSocketService.ClientSocketMap.get(userId)?.id;
    if (clientId) {
      WsSocketService.ClientSocketMap.delete(userId);
      WsSocketService.ClientJwtMap.delete(clientId);
    }
  }
}
