import {IsNotEmpty, IsNumber, IsString} from 'class-validator';
import {WsSendMessage} from 'src/shared/WsEvents/chat';

export class SendMessageDto implements WsSendMessage.eventMessageTemplate {
  @IsNumber()
  chatId: number;

  @IsString()
  @IsNotEmpty()
  messageContent: string;
}
