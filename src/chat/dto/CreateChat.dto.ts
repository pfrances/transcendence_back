import {IsNotEmpty, IsOptional, IsString} from 'class-validator';
import {HttpCreateChat} from 'src/shared/HttpEndpoints/chat';

export class CreateChatDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  chatAvatar?: Express.Multer.File;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  password?: string;

  constructor(data: HttpCreateChat.reqTemplate & {chatAvatar?: Express.Multer.File}) {
    this.name = data?.name;
    this.chatAvatar = data?.chatAvatar;
    this.password = data?.password;
  }
}
