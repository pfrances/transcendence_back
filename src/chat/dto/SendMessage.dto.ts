import {IsNotEmpty, IsNumber, IsString} from 'class-validator';
import {WsSendMessage} from 'src/shared/WsEvents/chat';

export class SendMessageDto {
  @IsNumber()
  chatId: number;

  @IsNotEmpty()
  @IsString()
  messageContent: string;

  constructor(data: WsSendMessage.eventMessageTemplate) {
    this.chatId = data?.chatId;
    this.messageContent = data?.messageContent;
  }
}
