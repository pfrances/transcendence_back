import {Module} from '@nestjs/common';
import {WsConnectionService} from './WsConnection.service';
import {FriendModule} from 'src/friend/friend.module';
import {ChatModule} from 'src/chat/chat.module';
import {WsRoomModule} from '../WsRoom/WsRoom.module';
import {UserModule} from 'src/user/user.module';
import {GameModule} from 'src/game/game.module';

@Module({
  imports: [FriendModule, ChatModule, WsRoomModule, UserModule, GameModule],
  providers: [WsConnectionService],
  exports: [WsConnectionService],
})
export class WsConnectionModule {}
