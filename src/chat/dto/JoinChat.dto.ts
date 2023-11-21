import {HttpJoinChat} from 'src/shared/HttpEndpoints/chat';

export class JoinChatDto {
  password?: string;
  constructor(data: HttpJoinChat.reqTemplate) {
    this.password = data?.password;
  }
}
