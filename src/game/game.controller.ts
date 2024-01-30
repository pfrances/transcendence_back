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
  HttpGetMatchHistory,
  HttpGetGame,
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
  async leaveGame(
    @GetInfoFromJwt('userId') userId: number,
  ): Promise<HttpGameJoinWaitList.resTemplate> {
    await this.game.leaveGame(userId);
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
  async acceptInCreation(
    @GetInfoFromJwt('userId') userId: number,
    @Param('gameInCreationId', ParseIntPipe) gameInCreationId: number,
    @Body() dto: AcceptGameInCreationDto,
  ): Promise<HttpGameAcceptInCreation.resTemplate> {
    await this.game.acceptGameInCreation(userId, gameInCreationId, dto.hasAccepted);
    return {};
  }

  @Get(HttpGetMatchMakingInfo.endPoint)
  async getMatchMakingInfo(
    @GetInfoFromJwt('userId') userId: number,
  ): Promise<HttpGetMatchMakingInfo.resTemplate> {
    return await this.game.getMatchMakingInfo(userId);
  }

  @Get(HttpGetGameInCreation.endPoint)
  getInCreation(
    @GetInfoFromJwt('userId') userId: number,
    @Param('gameInCreationId', ParseIntPipe) gameInCreationId: number,
  ): HttpGetGameInCreation.resTemplate {
    const gameInCreation = this.game.getGameInCreation(userId, gameInCreationId);
    return {gameInCreation};
  }

  @Get(HttpGetMatchHistory.endPoint)
  async getMatchHistory(
    @Param('userId', ParseIntPipe) targetUserId: number,
  ): Promise<HttpGetMatchHistory.resTemplate> {
    const plays = await this.game.getMatchHistory(targetUserId);
    return {plays};
  }

  @Get(HttpGetGame.endPoint)
  async getGame(@Param('gameId', ParseIntPipe) gameId: number): Promise<HttpGetGame.resTemplate> {
    return await this.game.getGame(gameId);
  }
}
