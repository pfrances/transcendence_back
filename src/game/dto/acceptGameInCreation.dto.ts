import {IsBoolean} from 'class-validator';
import {HttpGameAcceptInCreation} from 'src/shared/HttpEndpoints/game';

export class AcceptGameInCreationDto {
  @IsBoolean()
  hasAccepted: boolean;

  constructor(req: HttpGameAcceptInCreation.reqTemplate) {
    this.hasAccepted = req?.hasAccepted;
  }
}
