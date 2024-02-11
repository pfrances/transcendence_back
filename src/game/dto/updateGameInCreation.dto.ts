import {IsIn, IsNumber, Max, Min} from 'class-validator';
import {HttpGameUpdateInCreation} from 'src/shared/HttpEndpoints/game';
import {BallSize, BallSpeed, PaddleSize, PaddleSpeed} from 'src/shared/HttpEndpoints/interfaces';

export class UpdateGameInCreationDto {
  @IsNumber({maxDecimalPlaces: 0})
  @Min(1)
  @Max(20)
  scoreToWin: number;

  @IsIn(['SLOW', 'NORMAL', 'FAST', 'VERY_FAST'])
  ballSpeed: BallSpeed;

  @IsIn(['VERY_SMALL', 'SMALL', 'NORMAL', 'BIG', 'VERY_BIG'])
  ballSize: BallSize;

  @IsIn(['SLOW', 'NORMAL', 'FAST', 'VERY_FAST'])
  paddleSpeed: PaddleSpeed;

  @IsIn(['VERY_SMALL', 'SMALL', 'NORMAL', 'BIG', 'VERY_BIG'])
  paddleSize: PaddleSize;

  constructor(req: HttpGameUpdateInCreation.reqTemplate) {
    this.scoreToWin = req?.scoreToWin;
    this.ballSpeed = req?.ballSpeed;
    this.ballSize = req?.ballSize;
    this.paddleSpeed = req?.paddleSpeed;
    this.paddleSize = req?.paddleSize;
  }
}
