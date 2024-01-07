import {Role} from '@prisma/client';
import {IsArray, IsOptional} from 'class-validator';
import {HttpUpdateChat} from 'src/shared/HttpEndpoints/chat';

export class UpdateChatDto {
  @IsOptional()
  chatName?: string;

  @IsOptional()
  password?: string;

  @IsOptional()
  chatAvatar?: Express.Multer.File;

  @IsOptional()
  @IsArray()
  participants?: {
    userId: number;
    role?: Role;
    mutedUntil?: Date;
    blockedUntil?: Date;
    kick?: boolean;
  }[];

  constructor(data: HttpUpdateChat.reqTemplate & {chatAvatar?: Express.Multer.File}) {
    this.chatName = data?.chatName;
    this.password = data?.password;
    this.chatAvatar = data?.chatAvatar;
    this.participants = data?.participants;
  }
}
