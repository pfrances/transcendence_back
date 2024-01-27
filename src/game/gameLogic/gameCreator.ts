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
  private player1: GameInCreationPlayerData;
  private player2: GameInCreationPlayerData;

  constructor(player1Id: number, player2Id: number) {
    this.gameInCreationId = this.generateGameInCreationId();
    this.rules = this.initRules();
    this.status = 'IN_CREATION';
    this.hasMatched = false;
    this.player1 = this.initPlayerData(player1Id);
    this.player2 = this.initPlayerData(player2Id);
  }

  public acceptGame(userId: number, hasAccepted: boolean) {
    if (this.player1.userId !== userId && this.player2.userId !== userId)
      throw new ForbiddenException('user not in game');
    if (this.status !== 'IN_CREATION') throw new ForbiddenException('game already started');
    if (this.player1.hasAccepted && this.player2.hasAccepted)
      throw new ForbiddenException('game already accepted');
    if (this.player1.userId === userId) this.player1.hasAccepted = hasAccepted;
    else this.player2.hasAccepted = hasAccepted;
    if (this.player1.hasAccepted && this.player2.hasAccepted) {
      this.hasMatched = true;
    }
  }

  public updateGame(userId: number, rules: GameRules): void {
    if (this.player1.userId !== userId && this.player2.userId !== userId)
      throw new ForbiddenException('user not in game');
    if (this.status !== 'IN_CREATION') throw new ForbiddenException('game already started');
    if (this.player1.hasAccepted && this.player2.hasAccepted)
      throw new ForbiddenException('game already accepted');
    this.rules = rules;
    this.player1.hasAccepted = false;
    this.player2.hasAccepted = false;
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
    return new Game(prisma, room, gameId, this.rules, this.player1.userId, this.player2.userId);
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
          create: [{userId: this.player1.userId}, {userId: this.player2.userId}],
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
    return this.player1.userId === userId || this.player2.userId === userId;
  }

  private generateGameInCreationId(): number {
    return GameCreator.nextGameInCreationId++;
  }

  public getGameInCreationData(): GameInCreationData {
    return {
      gameInCreationId: this.gameInCreationId,
      status: this.status,
      rules: this.rules,
      player1: this.player1,
      player2: this.player2,
    };
  }
}
