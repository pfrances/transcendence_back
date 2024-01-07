import {IsNotEmpty, IsOptional, IsString} from 'class-validator';
import {HttpCreateChat} from 'src/shared/HttpEndpoints/chat';

export class CreateChatDto {
  @IsString()
  @IsNotEmpty()
  chatName: string;

  @IsOptional()
  chatAvatar?: Express.Multer.File;

  @IsOptional()
  @IsString()
  password?: string;

  constructor(data: HttpCreateChat.reqTemplate & {chatAvatar?: Express.Multer.File}) {
    this.chatName = data?.chatName;
    this.chatAvatar = data?.chatAvatar;
    this.password = data?.password;
  }
}
