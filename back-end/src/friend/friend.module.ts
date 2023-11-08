import {Module} from '@nestjs/common';
import {FriendService} from './friend.service';
import {FriendController} from './friend.controller';
import {UserModule} from 'src/user/user.module';
import {WsRoomModule} from 'src/webSocket/WsRoom/WsRoom.module';

@Module({
  imports: [WsRoomModule, UserModule],
  providers: [FriendService],
  controllers: [FriendController],
  exports: [FriendService],
})
export class FriendModule {}
