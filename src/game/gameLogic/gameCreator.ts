import {
  GameInCreationData,
  GameInCreationPlayerData,
  GameRules,
} from 'src/shared/HttpEndpoints/interfaces';
import {Game} from './game';
import {ForbiddenException} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';
import {WsRoomService} from 'src/webSocket/WsRoom/WsRoom.service';

export class GameCreator {
  static nextGameInCreationId: number = 0;
  private gameInCreationId: number;
  private rules: GameRules;
  private status: 'IN_CREATION' | 'IN_PROGRESS';
  private hasMatched: boolean;
  private playerOne: GameInCreationPlayerData;
  private playerTwo: GameInCreationPlayerData;

  constructor(playerOneId: number, playerTwoId: number) {
    this.gameInCreationId = this.generateGameInCreationId();
    this.rules = this.initRules();
    this.status = 'IN_CREATION';
    this.hasMatched = false;
    this.playerOne = this.initPlayerData(playerOneId);
    this.playerTwo = this.initPlayerData(playerTwoId);
  }

  public acceptGame(userId: number, hasAccepted: boolean) {
    if (this.playerOne.userId !== userId && this.playerTwo.userId !== userId)
      throw new ForbiddenException('user not in game');
    if (this.status !== 'IN_CREATION') throw new ForbiddenException('game already started');
    if (this.playerOne.hasAccepted && this.playerTwo.hasAccepted)
      throw new ForbiddenException('game already accepted');
    if (this.playerOne.userId === userId) this.playerOne.hasAccepted = hasAccepted;
    else this.playerTwo.hasAccepted = hasAccepted;
    if (this.playerOne.hasAccepted && this.playerTwo.hasAccepted) {
      this.hasMatched = true;
    }
  }

  public updateGame(userId: number, rules: GameRules): void {
    if (this.playerOne.userId !== userId && this.playerTwo.userId !== userId)
      throw new ForbiddenException('user not in game');
    if (this.status !== 'IN_CREATION') throw new ForbiddenException('game already started');
    if (this.playerOne.hasAccepted && this.playerTwo.hasAccepted)
      throw new ForbiddenException('game already accepted');
    this.rules = rules;
    this.playerOne.hasAccepted = false;
    this.playerTwo.hasAccepted = false;
  }

  public getHasMatched(): boolean {
    return this.hasMatched;
  }

  public getGameInCreationId(): number {
    return this.gameInCreationId;
  }

  public async generateGame(prisma: PrismaService, room: WsRoomService): Promise<Game> {
    if (!this.hasMatched) throw new Error('game not matched');
    if (this.status !== 'IN_CREATION') throw new Error('game already started');
    this.status = 'IN_PROGRESS';
    const gameId = await this.createGameInDb(prisma);
    return new Game(prisma, room, gameId, this.rules, this.playerOne.userId, this.playerTwo.userId);
  }

  private async createGameInDb(prisma: PrismaService): Promise<number> {
    const game = await prisma.game.create({
      data: {
        gameStatus: 'IN_PROGRESS',
        scoreToWin: this.rules.scoreToWin,
        ballSpeed: this.rules.ballSpeed,
        ballSize: this.rules.ballSize,
        paddleSpeed: this.rules.paddleSpeed,
        paddleSize: this.rules.paddleSize,
        participants: {
          create: [{userId: this.playerOne.userId}, {userId: this.playerTwo.userId}],
        },
      },
      select: {gameId: true},
    });
    return game.gameId;
  }

  private initRules(): GameRules {
    return {
      scoreToWin: 3,
      ballSpeed: 'NORMAL',
      ballSize: 'NORMAL',
      paddleSpeed: 'NORMAL',
      paddleSize: 'NORMAL',
    };
  }

  private initPlayerData(playerId: number): GameInCreationPlayerData {
    return {
      userId: playerId,
      hasAccepted: false,
    };
  }

  public isPlayerInGame(userId: number): boolean {
    return this.playerOne.userId === userId || this.playerTwo.userId === userId;
  }

  private generateGameInCreationId(): number {
    return GameCreator.nextGameInCreationId++;
  }

  public getGameInCreationData(): GameInCreationData {
    return {
      gameInCreationId: this.gameInCreationId,
      status: this.status,
      rules: this.rules,
      playerOne: this.playerOne,
      playerTwo: this.playerTwo,
    };
  }
}
