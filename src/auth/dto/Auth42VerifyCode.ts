import {IsInt, IsNotEmpty, IsString} from 'class-validator';
import {HttpAuth42VerifyCode} from 'src/shared/HttpEndpoints/auth';

export class Auth42VerifyCodeDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsInt()
  userId: number;

  constructor(dto: HttpAuth42VerifyCode.reqTemplate) {
    this.code = dto?.code;
    this.userId = dto?.userId;
  }
}
