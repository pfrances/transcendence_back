import {IsNotEmpty, IsNumber} from 'class-validator';
import {HttpRemoveFriend} from 'src/shared/HttpEndpoints/friend';

export class RemoveFriendDto implements HttpRemoveFriend.reqTemplate {
  @IsNumber()
  @IsNotEmpty()
  friendId: number;
}
