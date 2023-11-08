import {Module} from '@nestjs/common';
import {SocketMonitorGateway} from './websocket.gateway';
import {AuthModule} from 'src/auth/auth.module';
import {WsConnectionModule} from './WsConnection/WsConnection.module';

@Module({
  imports: [AuthModule, WsConnectionModule],
  providers: [SocketMonitorGateway],
})
export class WebSocketModule {}
