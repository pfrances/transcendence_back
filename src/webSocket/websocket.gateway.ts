import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {Server, Socket} from 'socket.io';
import {SocketAuthMiddleware} from 'src/auth/middleware/ws.middleware';
import {WsConnectionService} from './WsConnection/WsConnection.service';
import {WsRoomService} from './WsRoom/WsRoom.service';
import {JwtService} from 'src/jwt/jwt.service';

@WebSocketGateway()
export class SocketMonitorGateway
  implements OnGatewayInit, OnGatewayDisconnect, OnGatewayConnection
{
  constructor(
    private readonly connection: WsConnectionService,
    private readonly jwt: JwtService,
  ) {}

  @WebSocketServer() server: Server;

  afterInit(client: Socket) {
    client.use(SocketAuthMiddleware(this.jwt) as any);
    WsRoomService.setServer(this.server);
  }

  handleConnection(client: Socket) {
    this.connection.handleClientConnection(client);
  }

  handleDisconnect(client: Socket) {
    const {userId} = this.jwt.decodeToken(client.handshake.auth.token);
    this.connection.handleClientDisconnection(userId);
  }
}
