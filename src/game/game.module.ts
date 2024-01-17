import {Module} from '@nestjs/common';
import {GameController} from './game.controller';
import {GameService} from './game.service';
import {PrismaModule} from 'src/prisma/prisma.module';
import {WsRoomService} from 'src/webSocket/WsRoom/WsRoom.service';

@Module({
  controllers: [GameController],
  providers: [GameService, PrismaModule, WsRoomService],
  exports: [GameService],
})
export class GameModule {}
