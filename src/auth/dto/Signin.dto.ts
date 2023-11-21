import {IsNotEmpty, IsString} from 'class-validator';
import {HttpSignIn} from 'src/shared/HttpEndpoints/auth';

export class SignInDto {
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  constructor(dto: HttpSignIn.reqTemplate) {
    this.nickname = dto.nickname;
    this.password = dto.password;
  }
}
