import {IsIn, IsNotEmpty, IsString} from 'class-validator';
import {UserStatusType} from 'src/shared/HttpEndpoints/interfaces';
import {WsSetUserStatus} from 'src/shared/WsEvents/user';

export class SetUserStatusDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['waitingForGame', 'onGame', 'onChat', 'chilling'])
  status: UserStatusType;

  constructor(data: WsSetUserStatus.eventMessageTemplate) {
    this.status = data?.status;
  }
}
