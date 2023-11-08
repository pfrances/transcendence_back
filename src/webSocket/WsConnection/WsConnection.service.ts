import {Injectable} from '@nestjs/common';
import {Socket} from 'socket.io';
import {WsSocketService} from '../WsSocket/WsSocket.service';
import {ChatService} from 'src/chat/chat.service';
import {FriendService} from 'src/friend/friend.service';

@Injectable()
export class WsConnectionService {
  constructor(
    private readonly Friend: FriendService,
    private readonly Chat: ChatService,
  ) {}

  addClientToRelatedRooms(userId: number) {
    this.Friend.handleUserConnection(userId);
    this.Chat.handleUserConnection(userId);
  }

  removeClientFromRelatedRooms(userId: number) {
    this.Friend.handleUserDisconnection(userId);
    this.Chat.handleUserDisconnection(userId);
  }

  handleClientConnection(client: Socket) {
    WsSocketService.addUserToSocketMap(client);
    this.addClientToRelatedRooms(client.data.userId);
  }

  handleClientDisconnection(userId: number) {
    this.removeClientFromRelatedRooms(userId);
    WsSocketService.removeUserFromSocketsMap(userId);
  }
}
