import {SubscribeMessage, WebSocketGateway} from '@nestjs/websockets';
import {SendMessageDto} from './dto';
import {ChatService} from './chat.service';
import {WsDtoPipe} from 'src/decorator/ValidateWebSocketDto.decorator';
import {GetInfoFromJwt} from 'src/decorator';
import {WsSendMessage} from 'src/shared/WsEvents/chat/sendMessage';
import {WsSendDirectMessage} from 'src/shared/WsEvents/chat';
import {SendDirectMessageDto} from './dto/SendDirectMessage.dto';

@WebSocketGateway()
export class ChatGateway {
  constructor(private readonly chat: ChatService) {}

  @SubscribeMessage(WsSendMessage.eventName)
  async onNewMessage(
    @GetInfoFromJwt('userId') userId: number,
    @WsDtoPipe(SendMessageDto) dto: SendMessageDto,
  ): Promise<void> {
    await this.chat.sendMessage(userId, dto);
  }

  @SubscribeMessage(WsSendDirectMessage.eventName)
  async onNewDirectMessage(
    @GetInfoFromJwt('userId') userId: number,
    @WsDtoPipe(SendDirectMessageDto) dto: SendDirectMessageDto,
  ): Promise<void> {
    await this.chat.sendDirectMessage(userId, dto);
  }
}
