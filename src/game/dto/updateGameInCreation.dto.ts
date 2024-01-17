import {IsNumber, Max, Min} from 'class-validator';
import {HttpGameUpdateInCreation} from 'src/shared/HttpEndpoints/game';

export class UpdateGameInCreationDto {
  @IsNumber({maxDecimalPlaces: 0})
  @Min(1)
  @Max(20)
  scoreToWin: number;

  constructor(req: HttpGameUpdateInCreation.reqTemplate) {
    this.scoreToWin = req?.scoreToWin;
  }
}
