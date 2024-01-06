import {IsOptional, IsString} from 'class-validator';
import {HttpJoinChat} from 'src/shared/HttpEndpoints/chat';

export class JoinChatDto {
  @IsOptional()
  @IsString()
  password?: string;

  constructor(data: HttpJoinChat.reqTemplate) {
    this.password = data?.password;
  }
}
