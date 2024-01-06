import {IsEmail, IsOptional, IsString} from 'class-validator';
import {HttpEditMe} from 'src/shared/HttpEndpoints/user';

export class EditUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  avatar?: Express.Multer.File;

  @IsOptional()
  @IsString()
  password?: string;

  constructor(dto: HttpEditMe.reqTemplate & {avatar?: Express.Multer.File}) {
    this.email = dto?.email;
    this.nickname = dto?.nickname;
    this.avatar = dto?.avatar;
    this.password = dto?.password;
  }
}
