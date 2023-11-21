import {Module} from '@nestjs/common';
import {ChatService} from './chat.service';
import {ChatGateway} from './chat.gateway';
import {ChatController} from './chat.controller';
import {AuthModule} from 'src/auth/auth.module';
import {WsRoomModule} from 'src/webSocket/WsRoom/WsRoom.module';
import {HashManagerModule} from 'src/hashManager/hashManager.module';

@Module({
  imports: [AuthModule, WsRoomModule, HashManagerModule],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
