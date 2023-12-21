import {Injectable, Scope} from '@nestjs/common';
import {WsException} from '@nestjs/websockets';
import {Socket} from 'socket.io';
import {JwtTokenPayload} from 'src/auth/interface';

@Injectable({scope: Scope.DEFAULT})
export class WsSocketService {
  private static ClientSocketMap = new Map<number, Socket[]>();
  private static ClientJwtMap = new Map<string, JwtTokenPayload>();

  static getClientSocketsByUserId(userId: number): Socket[] {
    const clientSocket = WsSocketService.ClientSocketMap.get(userId);
    if (!clientSocket) throw new Error('client socket not found');
    return clientSocket;
  }

  static getUserIdByClientSocketId(socketId: string): number {
    const userId = WsSocketService.ClientJwtMap.get(socketId)?.userId;
    if (!userId) throw new Error('user id not found');
    return userId;
  }

  static getJwtInfoByClientSocketId(socketId: string): JwtTokenPayload {
    const jwt = WsSocketService.ClientJwtMap.get(socketId);
    if (!jwt) throw new Error('jwt not found');
    return jwt;
  }

  static addUserToSocketMap(client: Socket): void {
    const jwtPayload = client?.data as JwtTokenPayload;
    const userId = jwtPayload?.userId;
    const clientId = client?.id;
    if (!jwtPayload) throw new WsException('jwt payload not found');
    if (!userId) throw new WsException('user id not found');
    if (!clientId) throw new WsException('client socket id not found');
    const clientSocket = WsSocketService.ClientSocketMap.get(userId);
    if (clientSocket) clientSocket.push(client);
    else WsSocketService.ClientSocketMap.set(userId, [client]);
    WsSocketService.ClientJwtMap.set(clientId, jwtPayload);
  }

  static removeUserFromSocketsMap(userId: number): void {
    const sockets = WsSocketService.ClientSocketMap.get(userId);
    sockets?.forEach(socket => {
      const clientId = socket?.id;
      if (clientId) {
        WsSocketService.ClientSocketMap.delete(userId);
        WsSocketService.ClientJwtMap.delete(clientId);
        socket.disconnect();
      }
    });
  }
}
