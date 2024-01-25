import {SubscribeMessage, WebSocketGateway} from '@nestjs/websockets';
import {GetInfoFromJwt} from 'src/decorator';
import {WsDtoPipe} from 'src/decorator/ValidateWebSocketDto.decorator';
import {WsSendPlayerMove} from 'src/shared/WsEvents/game';
import {SendPlayerMoveDto} from './dto/sendPlayerMove.dto';
import {GameService} from './game.service';

@WebSocketGateway()
export class GameGateway {
  constructor(private readonly gameService: GameService) {}
  @SubscribeMessage(WsSendPlayerMove.eventName)
  async onNewMessage(
    @GetInfoFromJwt('userId') userId: number,
    @WsDtoPipe(SendPlayerMoveDto) dto: SendPlayerMoveDto,
  ): Promise<void> {
    this.gameService.handlePlayerMove(userId, dto);
  }
}
