import {IsEmail, IsNotEmpty, IsOptional, IsString} from 'class-validator';
import {HttpEditMe} from 'src/shared/HttpEndpoints/user';

export class EditUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  nickname?: string;

  @IsOptional()
  avatar?: Express.Multer.File;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  password?: string;

  constructor(dto: HttpEditMe.reqTemplate & {avatar?: Express.Multer.File}) {
    this.email = dto?.email;
    this.nickname = dto?.nickname;
    this.avatar = dto?.avatar;
    this.password = dto?.password;
  }
}
