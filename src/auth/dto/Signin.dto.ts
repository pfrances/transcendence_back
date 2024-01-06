import {IsNotEmpty, IsString} from 'class-validator';
import {HttpSignIn} from 'src/shared/HttpEndpoints/auth';

export class SignInDto {
  @IsNotEmpty()
  @IsString()
  nickname: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  constructor(dto: HttpSignIn.reqTemplate) {
    this.nickname = dto?.nickname;
    this.password = dto?.password;
  }
}
