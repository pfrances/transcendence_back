import {UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {IsEmail, IsNotEmpty, IsOptional, IsString} from 'class-validator';
import {HttpSignUp} from 'src/shared/HttpEndpoints/auth';

@UseInterceptors(FileInterceptor('avatar'))
export class SignUpDto {
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  avatar?: Express.Multer.File;

  constructor(dto: HttpSignUp.reqTemplate & {avatar?: Express.Multer.File}) {
    this.nickname = dto?.nickname;
    this.email = dto?.email;
    this.password = dto?.password;
    this.avatar = dto?.avatar;
  }
}
