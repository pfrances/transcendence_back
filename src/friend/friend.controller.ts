import {Body, Controller, Delete, Get, UseGuards} from '@nestjs/common';
import {JwtAuthGuard} from 'src/auth/guard';
import {FriendService} from './friend.service';
import {GetInfoFromJwt} from 'src/decorator';
import {RemoveFriendDto} from './dto';
import {HttpFriend, HttpGetFriendsList, HttpRemoveFriend} from 'src/shared/HttpEndpoints/friend';

@Controller(HttpFriend.endPointBase)
@UseGuards(JwtAuthGuard)
export class FriendController {
  constructor(private readonly friend: FriendService) {}

  @Get(HttpGetFriendsList.endPoint)
  async getUserFriendProfiles(
    @GetInfoFromJwt('userId') userId: number,
  ): Promise<HttpGetFriendsList.resTemplate> {
    const friendsProfiles = await this.friend.getUserFriendProfilesList(userId);
    return {friendsProfiles};
  }

  @Delete(HttpRemoveFriend.endPoint)
  async deleteFriend(
    @GetInfoFromJwt('userId') userId: number,
    @Body() dto: RemoveFriendDto,
  ): Promise<HttpRemoveFriend.resTemplate> {
    await this.friend.unsetRelationship({userId, targetUserId: dto.friendId});
    return {};
  }
}
