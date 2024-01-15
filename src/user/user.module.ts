import {Module} from '@nestjs/common';
import {UserController} from './user.controller';
import {UserService} from './user.service';
import {HashManagerModule} from 'src/hashManager/hashManager.module';
import {ImageModule} from 'src/image/image.module';
import {WsRoomModule} from 'src/webSocket/WsRoom/WsRoom.module';
import {UserGateway} from './user.gateway';

@Module({
  imports: [HashManagerModule, ImageModule, WsRoomModule],
  controllers: [UserController],
  providers: [UserService, UserGateway],
  exports: [UserService],
})
export class UserModule {}
