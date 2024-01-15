import {SubscribeMessage, WebSocketGateway} from '@nestjs/websockets';
import {WsDtoPipe} from 'src/decorator/ValidateWebSocketDto.decorator';
import {GetInfoFromJwt} from 'src/decorator';
import {WsSetUserStatus, WsUserStatusChange} from 'src/shared/WsEvents/user';
import {SetUserStatusDto} from './dto/SetUserStatus.dto';
import {WsSocketService} from 'src/webSocket/WsSocket/WsSocket.service';
import {WsRoomService} from 'src/webSocket/WsRoom/WsRoom.service';

@WebSocketGateway()
export class UserGateway {
  constructor(private readonly room: WsRoomService) {}

  @SubscribeMessage(WsSetUserStatus.eventName)
  async onUserSetState(
    @GetInfoFromJwt('userId') userId: number,
    @WsDtoPipe(SetUserStatusDto) dto: SetUserStatusDto,
  ): Promise<void> {
    WsSocketService.setUserStatus(userId, dto.status);
    this.room.broadcastToAll(
      new WsUserStatusChange.Dto({
        status: dto.status,
        userId,
      }),
    );
  }
}
