import {Module} from '@nestjs/common';
import {GameController} from './game.controller';
import {GameService} from './game.service';
import {PrismaModule} from 'src/prisma/prisma.module';
import {WsRoomService} from 'src/webSocket/WsRoom/WsRoom.service';
import { GameGateway } from './game.gateway';

@Module({
  controllers: [GameController],
  providers: [GameService, PrismaModule, WsRoomService, GameGateway],
  exports: [GameService],
})
export class GameModule {}
