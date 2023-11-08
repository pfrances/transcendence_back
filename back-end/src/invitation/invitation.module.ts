import {Module} from '@nestjs/common';
import {InvitationsService} from './invitation.service';
import {ChatModule} from 'src/chat/chat.module';
import {InvitationController} from './invitation.controller';
import {FriendModule} from 'src/friend/friend.module';
import {WsRoomModule} from 'src/webSocket/WsRoom/WsRoom.module';

@Module({
  imports: [ChatModule, FriendModule, WsRoomModule],
  providers: [InvitationsService],
  controllers: [InvitationController],
  exports: [InvitationsService],
})
export class InvitationModule {}
