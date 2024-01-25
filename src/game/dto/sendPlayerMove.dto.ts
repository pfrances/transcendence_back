import {IsIn, IsNumber} from 'class-validator';
import {WsSendPlayerMove} from 'src/shared/WsEvents/game';

export class SendPlayerMoveDto {
  @IsNumber()
  gameId: number;

  @IsIn(['up', 'down'])
  direction: 'up' | 'down';

  constructor(data: WsSendPlayerMove.eventMessageTemplate) {
    this.direction = data?.direction;
    this.gameId = data?.gameId;
  }
}
