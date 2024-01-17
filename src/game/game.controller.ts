import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {JwtAuthGuard} from 'src/auth/guard';
import {
  HttpGame,
  HttpGameAcceptInCreation,
  HttpGameJoinWaitList,
  HttpLeaveGame,
  HttpGameUpdateInCreation,
  HttpGetGameInCreation,
  HttpGetMatchMakingInfo,
} from 'src/shared/HttpEndpoints/game';
import {GameService} from './game.service';
import {GetInfoFromJwt} from 'src/decorator';
import {AcceptGameInCreationDto, UpdateGameInCreationDto} from './dto';

@Controller(HttpGame.endPointBase)
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(private readonly game: GameService) {}
  @Post(HttpGameJoinWaitList.endPoint)
  joinWaitList(@GetInfoFromJwt('userId') userId: number): HttpGameJoinWaitList.resTemplate {
    this.game.joinWaitList(userId);
    return {};
  }

  @Delete(HttpLeaveGame.endPoint)
  leaveGame(@GetInfoFromJwt('userId') userId: number): HttpGameJoinWaitList.resTemplate {
    this.game.leaveGame(userId);
    return {};
  }

  @Patch(HttpGameUpdateInCreation.endPoint)
  updateInCreation(
    @GetInfoFromJwt('userId') userId: number,
    @Param('gameInCreationId', ParseIntPipe) gameInCreationId: number,
    @Body() dto: UpdateGameInCreationDto,
  ): HttpGameUpdateInCreation.resTemplate {
    this.game.updateGameInCreation(userId, gameInCreationId, dto);
    return {};
  }

  @Patch(HttpGameAcceptInCreation.endPoint)
  acceptInCreation(
    @GetInfoFromJwt('userId') userId: number,
    @Param('gameInCreationId', ParseIntPipe) gameInCreationId: number,
    @Body() dto: AcceptGameInCreationDto,
  ): HttpGameAcceptInCreation.resTemplate {
    this.game.acceptGameInCreation(userId, gameInCreationId, dto.hasAccepted);
    return {};
  }

  @Get(HttpGetMatchMakingInfo.endPoint)
  getMatchMakingInfo(@GetInfoFromJwt('userId') userId: number): HttpGetMatchMakingInfo.resTemplate {
    return this.game.getMatchMakingInfo(userId);
  }

  @Get(HttpGetGameInCreation.endPoint)
  getInCreation(
    @GetInfoFromJwt('userId') userId: number,
    @Param('gameInCreationId', ParseIntPipe) gameInCreationId: number,
  ): HttpGetGameInCreation.resTemplate {
    const gameInCreation = this.game.getGameInCreation(userId, gameInCreationId);
    return {gameInCreation};
  }
}
