import {IsNotEmpty, IsString} from 'class-validator';
import {HttpSignIn} from 'src/shared/HttpEndpoints/auth';

export class SignInDto implements HttpSignIn.reqTemplate {
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
