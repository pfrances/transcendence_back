import {Module} from '@nestjs/common';
import {WsConnectionService} from './WsConnection.service';
import {FriendModule} from 'src/friend/friend.module';
import {ChatModule} from 'src/chat/chat.module';

@Module({
  imports: [FriendModule, ChatModule],
  providers: [WsConnectionService],
  exports: [WsConnectionService],
})
export class WsConnectionModule {}
