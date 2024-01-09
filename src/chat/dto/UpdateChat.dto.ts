import {IsOptional, IsString} from 'class-validator';
import {HttpUpdateChat} from 'src/shared/HttpEndpoints/chat';

export class UpdateChatDto {
  @IsOptional()
  @IsString()
  chatName?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  chatAvatar?: Express.Multer.File;

  constructor(data: HttpUpdateChat.reqTemplate & {chatAvatar?: Express.Multer.File}) {
    this.chatName = data?.chatName;
    this.password = data?.password;
    this.chatAvatar = data?.chatAvatar;
  }
}
