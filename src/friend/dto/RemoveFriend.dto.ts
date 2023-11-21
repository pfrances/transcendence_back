import {IsNotEmpty, IsNumber} from 'class-validator';
import {HttpRemoveFriend} from 'src/shared/HttpEndpoints/friend';

export class RemoveFriendDto {
  @IsNumber()
  @IsNotEmpty()
  friendId: number;

  constructor(dto: HttpRemoveFriend.reqTemplate) {
    this.friendId = dto?.friendId;
  }
}
