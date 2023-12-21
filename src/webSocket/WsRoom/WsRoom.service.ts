import {Injectable} from '@nestjs/common';
import {BroadcastMessageInRoom, JoinLeaveRoom, RoomName, SendMessageInRoom} from './interface';
import {Server} from 'socket.io';
import {WsSocketService} from '../WsSocket/WsSocket.service';
import {WsEvents_FromServer} from 'src/shared/WsEvents';

@Injectable()
export class WsRoomService {
  constructor() {}
  private static roomsMap = new Map<string, number[]>();
  private static server: Server;

  static setServer(server: Server) {
    WsRoomService.server = server;
  }

  private getNbClientsInRoom(roomName: string): number {
    return WsRoomService.roomsMap.get(roomName)?.length ?? 0;
  }

  private addUserToRoomMap(roomName: string, userId: number): void {
    const users = WsRoomService.roomsMap.get(roomName) ?? [];
    users.push(userId);
    WsRoomService.roomsMap.set(roomName, users);
  }

  private removeUserFromRoomMap(roomName: string, userId: number): void {
    const users = WsRoomService.roomsMap.get(roomName) ?? [];
    const index = users.indexOf(userId);
    if (index >= 0) {
      users.splice(index, 1);
      if (users.length > 0) WsRoomService.roomsMap.set(roomName, users);
      else this.deleteServerRoom(roomName);
    }
  }

  private deleteServerRoom(roomName: string): void {
    WsRoomService.server.sockets.adapter.rooms.delete(roomName);
    WsRoomService.roomsMap.delete(roomName);
  }

  private getRoomNameFromTemplate(template: RoomName): string {
    return `${template.prefix}${template.roomId}`;
  }

  addUserToRoom(data: JoinLeaveRoom): void {
    const clients = WsSocketService.getClientSocketsByUserId(data.userId);
    if (clients && clients.length > 0) {
      const roomName = this.getRoomNameFromTemplate(data);
      clients.forEach(client => client.join(roomName));
      this.addUserToRoomMap(roomName, data.userId);
    }
  }

  removeUserFromRoom(data: JoinLeaveRoom): void {
    const clients = WsSocketService.getClientSocketsByUserId(data.userId);
    clients?.forEach(client => {
      if (client) {
        const roomName = this.getRoomNameFromTemplate(data);
        client.leave(roomName);
        this.removeUserFromRoomMap(roomName, data.userId);
      }
    });
  }

  sendMessageInRoom(data: SendMessageInRoom): void {
    const roomName = this.getRoomNameFromTemplate(data);
    const sockets = WsSocketService.getClientSocketsByUserId(data.senderId) ?? [
      WsRoomService.server,
    ];
    if (this.getNbClientsInRoom(roomName) > 0) {
      sockets.forEach(socket => socket.to(roomName).emit(data.eventName, data.message));
    }
  }

  broadcastMessageInRoom(data: BroadcastMessageInRoom): void {
    const roomName = this.getRoomNameFromTemplate(data);
    if (this.getNbClientsInRoom(roomName) > 0)
      WsRoomService.server.to(roomName).emit(data.eventName, data.message);
  }

  sendMessageToUser(userId: number, dto: WsEvents_FromServer.template): void {
    const clientIds = WsSocketService.getClientSocketsByUserId(userId);
    clientIds?.forEach(client => {
      if (client) client.emit(dto.eventName, dto.message);
    });
  }
}
