import {WsEvents_FromServer} from 'src/shared/WsEvents';

export type RoomNamePrefix = 'Friend_Info-' | 'Chatroom-' | 'Game-';

export interface RoomName {
  prefix: RoomNamePrefix;
  roomId: number;
}

export interface JoinLeaveRoom extends RoomName {
  userId: number;
}

export interface BroadcastMessageInRoom extends RoomName, WsEvents_FromServer.template {}

export interface SendMessageInRoom extends BroadcastMessageInRoom {
  senderId: number;
}
