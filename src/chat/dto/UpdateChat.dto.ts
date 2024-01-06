import {Role} from '@prisma/client';
import {IsArray, IsOptional} from 'class-validator';
import {HttpUpdateChat} from 'src/shared/HttpEndpoints/chat';

export class UpdateChatDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  password?: string;

  @IsOptional()
  chatAvatar?: Express.Multer.File;

  @IsOptional()
  @IsArray()
  participants?: {
    userId: number;
    targetRole?: Role;
    muteUntil?: Date;
    blockUntil?: Date;
    kick?: boolean;
  }[];

  constructor(data: HttpUpdateChat.reqTemplate & {chatAvatar?: Express.Multer.File}) {
    this.name = data?.name;
    this.password = data?.password;
    this.chatAvatar = data?.chatAvatar;
    this.participants = data?.participants;
  }
}
