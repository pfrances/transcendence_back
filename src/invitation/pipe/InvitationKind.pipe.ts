import {PipeTransform, Injectable} from '@nestjs/common';
import {NotInEnumException} from 'src/customException';
import {InvitationKindEnum_Url} from '../enum';
import {InvitationKind} from '@prisma/client';
import {InvitationKind_Url} from 'src/shared/HttpEndpoints/types';

@Injectable()
export class InvitationKindPipe implements PipeTransform {
  private getFormatedKind(kind: InvitationKind_Url): InvitationKind {
    if (kind === 'chat') return 'CHAT';
    else if (kind == 'friend') return 'FRIEND';
    else throw new NotInEnumException(kind, InvitationKindEnum_Url);
  }

  transform(value: any): InvitationKind {
    if (!Object.values(InvitationKindEnum_Url).includes(value)) {
      throw new NotInEnumException(value, InvitationKindEnum_Url);
    }
    return this.getFormatedKind(value);
  }
}
