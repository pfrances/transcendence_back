import {Module} from '@nestjs/common';
import {WsSocketService} from './WsSocket.service';

@Module({
  providers: [WsSocketService],
  exports: [WsSocketService],
})
export class WsSocketModule {}
