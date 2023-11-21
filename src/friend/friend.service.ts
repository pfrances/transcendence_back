import {ConflictException, Injectable} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';
import {SetRelationship} from './interface';
import {FriendPublicProfilesList} from 'src/shared/HttpEndpoints/interfaces';
import {WsLeftFriend, WsNewFriend} from 'src/shared/WsEvents/friend';
import {RoomNamePrefix} from 'src/webSocket/WsRoom/interface';
import {
  WsFriendConnection,
  WsFriendDisconnection,
  WsFriend_FromServer,
} from 'src/shared/WsEvents/friend';
import {WsRoomService} from 'src/webSocket/WsRoom/WsRoom.service';

@Injectable()
export class FriendService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsRoom: WsRoomService,
  ) {}
  private readonly prefix: RoomNamePrefix = 'Friend_Info-';

  async getUserFriendUserIds(userId: number): Promise<number[]> {
    const profile = await this.prisma.profile.findUnique({
      where: {userId},
      select: {friendUserIds: true},
    });
    if (!profile) throw new Error(`user with id '${userId}' not found`);
    return profile.friendUserIds;
  }

  async getUserFriendProfilesList(userId: number): Promise<FriendPublicProfilesList> {
    const userProfile = await this.prisma.profile.findUnique({
      where: {userId},
      select: {friendsProfiles: {select: {userId: true, nickname: true, avatarUrl: true}}},
    });
    if (!userProfile) throw new Error(`user with id '${userId}' not found`);
    return {friendsProfiles: userProfile.friendsProfiles};
  }

  private async setSingleRelationship({userId, targetUserId}: SetRelationship): Promise<void> {
    await this.prisma.profile.update({
      where: {userId: userId},
      data: {friendUserIds: {push: targetUserId}},
    });
    this.handleWsFriendEvent(new WsNewFriend.Dto({friendId: targetUserId}));
  }

  async setRelationship({
    userId,
    targetUserId,
  }: SetRelationship): Promise<FriendPublicProfilesList> {
    await this.setSingleRelationship({userId, targetUserId});
    await this.setSingleRelationship({targetUserId, userId});
    return this.getUserFriendProfilesList(userId);
  }

  private async unsetSingleRelationship({userId, targetUserId}: SetRelationship): Promise<void> {
    const user1FriendIds = await this.getUserFriendUserIds(userId);
    await this.prisma.profile.update({
      where: {userId: userId},
      data: {friendUserIds: {set: user1FriendIds.filter(id => id !== targetUserId)}},
    });
    this.handleWsFriendEvent(new WsLeftFriend.Dto({friendId: targetUserId}));
  }

  async unsetRelationship({
    userId,
    targetUserId,
  }: SetRelationship): Promise<FriendPublicProfilesList> {
    if (userId === targetUserId)
      throw new ConflictException('userId and targetUserId are the same');
    await this.unsetSingleRelationship({userId, targetUserId});
    await this.unsetSingleRelationship({targetUserId, userId});
    return this.getUserFriendProfilesList(userId);
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
