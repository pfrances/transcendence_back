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
    const prefix = this.prefix;
    if (userId === targetUserId)
      throw new ConflictException('userId and targetUserId are the same');

    const ourProfile = await this.prisma.profile.findUnique({
      where: {userId},
      select: {userId: true, nickname: true, avatarUrl: true},
    });
    if (!ourProfile) throw new Error(`user with id '${userId}' not found`);
    const friendProfile = await this.prisma.profile.findUnique({
      where: {userId: targetUserId},
      select: {userId: true, nickname: true, avatarUrl: true},
    });
    if (!friendProfile) throw new Error(`user with id '${targetUserId}' not found`);

    try {
      await this.prisma.friend.createMany({
        data: [
          {userId, friendId: targetUserId},
          {userId: targetUserId, friendId: userId},
        ],
      });
      this.wsRoom.addUserToRoom({userId, prefix, roomId: targetUserId});
      this.wsRoom.addUserToRoom({userId: targetUserId, prefix, roomId: userId});
      this.handleWsFriendEvent(new WsNewFriend.Dto({friend: friendProfile}));
      this.handleWsFriendEvent(new WsNewFriend.Dto({friend: ourProfile}));
    } catch (e) {
      throw new ConflictException('friend relationship already exist');
    }
  }

  async unsetRelationship({userId, targetUserId}: SetRelationship): Promise<void> {
    const prefix = this.prefix;
    if (userId === targetUserId)
      throw new ConflictException('userId and targetUserId are the same');

    const ourProfile = await this.prisma.profile.findUnique({
      where: {userId},
      select: {userId: true, nickname: true, avatarUrl: true},
    });
    if (!ourProfile) throw new Error(`user with id '${userId}' not found`);
    const friendProfile = await this.prisma.profile.findUnique({
      where: {userId: targetUserId},
      select: {userId: true, nickname: true, avatarUrl: true},
    });
    if (!friendProfile) throw new Error(`user with id '${targetUserId}' not found`);
    try {
      await this.prisma.friend.deleteMany({
        where: {
          OR: [
            {userId, friendId: targetUserId},
            {userId: targetUserId, friendId: userId},
          ],
        },
      });
      this.handleWsFriendEvent(new WsLeftFriend.Dto({friend: friendProfile}));
      this.handleWsFriendEvent(new WsLeftFriend.Dto({friend: ourProfile}));
      this.wsRoom.removeUserFromRoom({userId, prefix, roomId: targetUserId});
      this.wsRoom.removeUserFromRoom({userId: targetUserId, prefix, roomId: userId});
    } catch (e) {
      throw new NotFoundException('friend relationship not found');
    }
  }

  handleWsFriendEvent(eventDto: WsFriend_FromServer.template): void {
    const prefix = this.prefix;
    const roomId = eventDto.message.friend.userId;
    this.wsRoom.broadcastMessageInRoom({prefix, roomId, ...eventDto});
  }

  async handleUserConnection(userId: number): Promise<void> {
    const prefix = this.prefix;
    const friendIds = await this.getUserFriendUserIds(userId);
    const profile = await this.prisma.profile.findUnique({
      where: {userId},
      select: {userId: true, nickname: true, avatarUrl: true},
    });
    if (!profile) return;
    this.handleWsFriendEvent(new WsFriendConnection.Dto({friend: profile}));
    friendIds.forEach(roomId => {
      this.wsRoom.addUserToRoom({userId, prefix, roomId});
    });
  }

  async handleUserDisconnection(userId: number): Promise<void> {
    const prefix = this.prefix;
    const friendIds = await this.getUserFriendUserIds(userId);
    const profile = await this.prisma.profile.findUnique({
      where: {userId},
      select: {userId: true, nickname: true, avatarUrl: true},
    });
    if (!profile) return;
    this.handleWsFriendEvent(new WsFriendDisconnection.Dto({friend: profile}));
    friendIds.forEach(roomId => {
      this.wsRoom.removeUserFromRoom({userId, prefix, roomId});
    });
  }
}
