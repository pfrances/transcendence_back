import {Injectable} from '@nestjs/common';
import {Socket} from 'socket.io';
import {WsSocketService} from '../WsSocket/WsSocket.service';
import {ChatService} from 'src/chat/chat.service';
import {FriendService} from 'src/friend/friend.service';
import {WsRoomService} from '../WsRoom/WsRoom.service';
import {UserService} from 'src/user/user.service';
import {WsUser_FromServer} from 'src/shared/WsEvents/user';
import {GameService} from 'src/game/game.service';

@Injectable()
export class WsConnectionService {
  constructor(
    private readonly friend: FriendService,
    private readonly user: UserService,
    private readonly chat: ChatService,
    private readonly room: WsRoomService,
    private readonly game: GameService,
  ) {}

  addClientToRelatedRooms(userId: number) {
    this.friend.handleUserConnection(userId);
    this.chat.handleUserConnection(userId);
    this.game.handleUserConnection(userId);
  }

  removeClientFromRelatedRooms(userId: number) {
    this.friend.handleUserDisconnection(userId);
    this.chat.handleUserDisconnection(userId);
    this.game.handleUserDisconnection(userId);
  }

  async handleClientConnection(client: Socket) {
    try {
      const userId = client.data.userId as number;
      WsSocketService.addUserToSocketMap(client);
      this.addClientToRelatedRooms(userId);
      const user = await this.user.getUserPublicInfo({userId});
      this.room.broadcastToAll({
        eventName: WsUser_FromServer.userConnection.eventName,
        message: {user, type: 'connection'},
      });
    } catch (e) {
      client.disconnect();
    }
  }

  async handleClientDisconnection(userId: number) {
    try {
      this.removeClientFromRelatedRooms(userId);
      WsSocketService.removeUserFromSocketsMap(userId);
      const user = await this.user.getUserPublicInfo({userId});
      this.room.broadcastToAll({
        eventName: WsUser_FromServer.userConnection.eventName,
        message: {user, type: 'disconnection'},
      });
    } catch (e) {}
  }
}
