import {ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';
import {SetRelationship} from './interface';
import {WsLeftFriend, WsNewFriend} from 'src/shared/WsEvents/friend';
import {RoomNamePrefix} from 'src/webSocket/WsRoom/interface';
import {
  WsFriendConnection,
  WsFriendDisconnection,
  WsFriend_FromServer,
} from 'src/shared/WsEvents/friend';
import {WsRoomService} from 'src/webSocket/WsRoom/WsRoom.service';
import {WsSocketService} from 'src/webSocket/WsSocket/WsSocket.service';
import {UserPublicProfile} from 'src/shared/HttpEndpoints/interfaces';

@Injectable()
export class FriendService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsRoom: WsRoomService,
  ) {}
  private readonly prefix: RoomNamePrefix = 'Friend_Info-';

  async getUserFriendUserIds(userId: number): Promise<number[]> {
    const profile = await this.prisma.friend.findMany({
      where: {userId},
      select: {friendId: true},
    });
    if (!profile) throw new Error(`user with id '${userId}' not found`);
    return profile.map(p => p.friendId);
  }

  async getUserFriendProfilesList(userId: number): Promise<UserPublicProfile[]> {
    const friends = await this.prisma.friend.findMany({
      where: {userId},
      select: {friend: {select: {userId: true, nickname: true, avatarUrl: true}}},
    });
    return friends.map(f => ({...f.friend, isOnline: WsSocketService.isOnline(f.friend.userId)}));
  }

  async setRelationship({userId, targetUserId}: SetRelationship): Promise<void> {
    try {
      await this.prisma.friend.createMany({
        data: [
          {userId, friendId: targetUserId},
          {userId: targetUserId, friendId: userId},
        ],
      });
      this.handleWsFriendEvent(new WsNewFriend.Dto({friendId: targetUserId}));
      this.handleWsFriendEvent(new WsNewFriend.Dto({friendId: userId}));
    } catch (e) {
      throw new ConflictException('friend relationship already exist');
    }
  }

  async unsetRelationship({userId, targetUserId}: SetRelationship): Promise<void> {
    if (userId === targetUserId)
      throw new ConflictException('userId and targetUserId are the same');
    try {
      await this.prisma.friend.deleteMany({
        where: {
          OR: [
            {userId, friendId: targetUserId},
            {userId: targetUserId, friendId: userId},
          ],
        },
      });
      this.handleWsFriendEvent(new WsLeftFriend.Dto({friendId: targetUserId}));
      this.handleWsFriendEvent(new WsLeftFriend.Dto({friendId: userId}));
    } catch (e) {
      throw new NotFoundException('friend relationship not found');
    }
  }

  handleWsFriendEvent(eventDto: WsFriend_FromServer.template): void {
    const prefix = this.prefix;
    const roomId = eventDto.message.friendId;
    this.wsRoom.broadcastMessageInRoom({prefix, roomId, ...eventDto});
  }

  async handleUserConnection(userId: number): Promise<void> {
    const prefix = this.prefix;
    const friendIds = await this.getUserFriendUserIds(userId);
    this.handleWsFriendEvent(new WsFriendConnection.Dto({friendId: userId}));
    friendIds.forEach(roomId => {
      this.wsRoom.addUserToRoom({userId, prefix, roomId});
    });
  }

  async handleUserDisconnection(userId: number): Promise<void> {
    const prefix = this.prefix;
    const friendIds = await this.getUserFriendUserIds(userId);
    this.handleWsFriendEvent(new WsFriendDisconnection.Dto({friendId: userId}));
    friendIds.forEach(roomId => {
      this.wsRoom.removeUserFromRoom({userId, prefix, roomId});
    });
  }
}
