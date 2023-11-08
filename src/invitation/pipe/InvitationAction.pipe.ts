import {PipeTransform, Injectable} from '@nestjs/common';
import {NotInEnumException} from 'src/customException';
import {InvitationActionEnum_Url} from '../enum';

@Injectable()
export class InvitationActionPipe implements PipeTransform {
  transform(value: any): InvitationActionEnum_Url {
    if (!Object.values(InvitationActionEnum_Url).includes(value)) {
      throw new NotInEnumException(value, InvitationActionEnum_Url);
    }
    return value;
  }
}
