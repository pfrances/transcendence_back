import {HttpJoinChat} from 'src/shared/HttpEndpoints/chat';

export class JoinChatDto implements HttpJoinChat.reqTemplate {
  password?: string;
}
