import {IsNotEmpty, IsString} from 'class-validator';
import {HttpRefresh} from 'src/shared/HttpEndpoints/auth';

export class RefreshDto {
  @IsNotEmpty()
  @IsString()
  authToken: string;

  @IsNotEmpty()
  @IsString()
  refreshToken: string;

  constructor(dto: HttpRefresh.reqTemplate) {
    this.authToken = dto?.authToken;
    this.refreshToken = dto?.refreshToken;
  }
}
