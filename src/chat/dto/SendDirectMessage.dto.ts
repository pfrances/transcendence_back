import {IsNotEmpty, IsNumber, IsString} from 'class-validator';
import {WsSendDirectMessage} from 'src/shared/WsEvents/chat';

export class SendDirectMessageDto {
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsString()
  messageContent: string;

  constructor(data: WsSendDirectMessage.eventMessageTemplate) {
    this.userId = data?.userId;
    this.messageContent = data?.messageContent;
  }
}
