import {ForbiddenException} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';
import {
  GameInProgressData,
  GameInProgressPlayerData,
  GameRules,
  GameStatus,
} from 'src/shared/HttpEndpoints/interfaces';

export class Game {
  private readonly prisma: PrismaService;
  private readonly rules: GameRules;
  private readonly gameId: number;

  private status: Omit<GameStatus, 'IN_CREATION'>;
  private playerOne: GameInProgressPlayerData;
  private playerTwo: GameInProgressPlayerData;
  private ballPositionX: number;
  private ballPositionY: number;

  constructor(
    prisma: PrismaService,
    gameId: number,
    rules: GameRules,
    playerOneId: number,
    playerTwoId: number,
  ) {
    this.gameId = gameId;
    this.status = 'IN_PROGRESS';
    this.rules = rules;
    this.playerOne = this.initPlayerData(playerOneId);
    this.playerTwo = this.initPlayerData(playerTwoId);
    this.ballPositionX = 0;
    this.ballPositionY = 0;
    this.prisma = prisma;
  }

  public updatePlayerPaddlePos(userId: number, paddlePos: number): void {
    if (this.playerOne.userId === userId) this.playerOne.paddlePos = paddlePos;
    else if (this.playerTwo.userId === userId) this.playerTwo.paddlePos = paddlePos;
    else throw new ForbiddenException('user not in game');
  }

  public updateBallPosition(ballPositionX: number, ballPositionY: number): void {
    this.ballPositionX = ballPositionX;
    this.ballPositionY = ballPositionY;
    const player = ballPositionX === 0 ? this.playerTwo : this.playerOne;
    player.score++;
    this.prisma.gameParticipation.update({
      where: {gameId_userId: {gameId: this.gameId, userId: player.userId}},
      data: {score: player.score},
    });
  }

  public getGameData(): GameInProgressData {
    return {
      gameId: this.gameId,
      status: this.status,
      rules: this.rules,
      playerOne: this.playerOne,
      playerTwo: this.playerTwo,
      ballPositionX: this.ballPositionX,
      ballPositionY: this.ballPositionY,
    };
  }

  public getGameId(): number {
    return this.gameId;
  }

  public getPlayerOneId(): number {
    return this.playerOne.userId;
  }

  public getPlayerTwoId(): number {
    return this.playerTwo.userId;
  }

  public isPlayerInGame(userId: number): boolean {
    return this.playerOne.userId === userId || this.playerTwo.userId === userId;
  }

  private initPlayerData(playerId: number): GameInProgressPlayerData {
    return {
      userId: playerId,
      paddlePos: 0,
      score: 0,
    };
  }

  public async cancelGame(): Promise<void> {
    await this.endGame('CANCELED');
  }

  private async endGame(status: 'FINISHED' | 'CANCELED'): Promise<void> {
    this.status = status;
    await this.prisma.game.update({
      where: {gameId: this.gameId},
      data: {
        gameStatus: status,
        participants: {
          update: [
            {
              where: {gameId_userId: {gameId: this.gameId, userId: this.playerOne.userId}},
              data: {
                score: this.playerOne.score,
                isWinner:
                  this.playerOne.score > this.playerTwo.score &&
                  this.playerOne.score >= this.rules.scoreToWin,
              },
            },
            {
              where: {gameId_userId: {gameId: this.gameId, userId: this.playerTwo.userId}},
              data: {
                score: this.playerTwo.score,
                isWinner:
                  this.playerTwo.score > this.playerOne.score &&
                  this.playerTwo.score >= this.rules.scoreToWin,
              },
            },
          ],
        },
      },
    });
  }
}
