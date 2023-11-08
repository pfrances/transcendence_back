import {Module} from '@nestjs/common';
import {WsRoomService} from './WsRoom.service';

@Module({
  providers: [WsRoomService],
  exports: [WsRoomService],
})
export class WsRoomModule {}
