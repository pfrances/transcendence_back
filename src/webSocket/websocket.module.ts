import {Module} from '@nestjs/common';
import {SocketMonitorGateway} from './websocket.gateway';
import {AuthModule} from 'src/auth/auth.module';
import {WsConnectionModule} from './WsConnection/WsConnection.module';
import {JwtModule} from 'src/jwt/jwt.module';

@Module({
  imports: [AuthModule, WsConnectionModule, JwtModule],
  providers: [SocketMonitorGateway],
})
export class WebSocketModule {}
