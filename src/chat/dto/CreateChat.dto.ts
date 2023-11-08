import {IsNotEmpty, IsOptional, IsString, IsUrl} from 'class-validator';
import {HttpCreateChat} from 'src/shared/HttpEndpoints/chat';

export class CreateChatDto implements HttpCreateChat.reqTemplate {
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
}
