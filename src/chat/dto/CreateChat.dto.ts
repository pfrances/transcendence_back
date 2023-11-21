import {IsNotEmpty, IsOptional, IsString, IsUrl} from 'class-validator';
import {HttpCreateChat} from 'src/shared/HttpEndpoints/chat';

export class CreateChatDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsUrl()
  chatAvatarUrl?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  password?: string;

  constructor(data: HttpCreateChat.reqTemplate) {
    this.name = data.name;
    this.chatAvatarUrl = data.chatAvatarUrl;
    this.password = data.password;
  }
}
