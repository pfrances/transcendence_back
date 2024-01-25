import {ForbiddenException} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';
import {
  GameInProgressPlayerData,
  GameRules,
  GameStatus,
  ballSizeToNumber,
  ballSpeedToNumber,
  paddleHeightToNumber,
  paddleSpeedToNumber,
  paddleWidthToNumber,
} from 'src/shared/HttpEndpoints/interfaces';
import {WsGameStateUpdatePosition} from 'src/shared/WsEvents/game';
import {WsRoomService} from 'src/webSocket/WsRoom/WsRoom.service';

type PlayerData = GameInProgressPlayerData & {isDisconnected: boolean};
type Ball = {x: number; y: number; dx: number; dy: number; radiusX: number; radiusY: number};

const ratio = 4 / 3;
const xMax = 1 * ratio;
const yMax = 1;
const centerPos = (axys: 'x' | 'y'): number => (axys === 'x' ? xMax : yMax) / 2;

export class Game {
  private readonly prisma: PrismaService;
  private readonly room: WsRoomService;
  private readonly rules: GameRules;
  private readonly gameId: number;

  private status: Omit<GameStatus, 'IN_CREATION'>;
  private playerOne: PlayerData;
  private playerTwo: PlayerData;
  private ball: Ball;
  private paddleHeight: number;
  private paddleWidth: number;
  private paddleSpeed: number;

  private sendDataInterval?: NodeJS.Timeout;
  private cancelGameTimeout?: NodeJS.Timeout;
  private waitBeforeResetBallTimeout?: NodeJS.Timeout;
  private timeToResetBall?: number;
  private accelerationInterval?: NodeJS.Timeout;

  constructor(
    prisma: PrismaService,
    room: WsRoomService,
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
    this.ball = {
      x: centerPos('x'),
      y: centerPos('y'),
      dx: 0,
      dy: 0,
      radiusX: ballSizeToNumber(rules.ballSize) * ratio,
      radiusY: ballSizeToNumber(rules.ballSize),
    };
    this.resetBall();
    this.prisma = prisma;
    this.room = room;
    const prefix = 'Game-';
    this.room.addUserToRoom({prefix, roomId: gameId, userId: playerOneId});
    this.room.addUserToRoom({prefix, roomId: gameId, userId: playerTwoId});
    this.room.broadcastMessageInRoom({
      eventName: 'gameStart',
      prefix,
      roomId: gameId,
      message: {gameId},
    });
    this.paddleHeight = paddleHeightToNumber(rules.paddleSize);
    this.paddleWidth = paddleWidthToNumber(rules.paddleSize) * ratio;
    this.paddleSpeed = paddleSpeedToNumber(rules.paddleSpeed);
    this.sendDataInterval = setInterval(() => {
      let countdown: number | undefined = undefined;
      if (this.status === 'IN_PROGRESS') {
        if (this.waitBeforeResetBallTimeout && this.timeToResetBall)
          countdown = Math.ceil(this.timeToResetBall - Date.now());
        else this.updateBallPosition();
      }
      this.room.broadcastMessageInRoom({
        eventName: 'gameStateUpdate',
        prefix,
        roomId: gameId,
        message: {...this.getGameData(), countdown},
      });
      if (this.status === 'FINISHED' || this.status === 'CANCELED')
        clearInterval(this.sendDataInterval);
    }, 1000 / 60);
  }

  public updatePlayerPaddlePos(userId: number, dir: 'up' | 'down'): void {
    if (this.waitBeforeResetBallTimeout) return;
    const move = dir === 'up' ? -this.paddleSpeed : this.paddleSpeed;
    const paddleHalfHeight = this.paddleHeight / 2;
    const player =
      this.playerOne.userId === userId
        ? this.playerOne
        : this.playerTwo.userId === userId
        ? this.playerTwo
        : null;
    if (!player) throw new ForbiddenException('user not in game');
    if (player.paddlePos + move - paddleHalfHeight < 0) player.paddlePos = paddleHalfHeight;
    else if (player.paddlePos + move + paddleHalfHeight > yMax)
      player.paddlePos = yMax - paddleHalfHeight;
    else player.paddlePos += move;
  }

  private checkPaddleCollision(): boolean {
    const paddleHalfHeight = this.paddleHeight / 2;

    const tolerance = this.ball.radiusY;
    if (
      this.ball.x - this.ball.radiusX <= this.paddleWidth &&
      this.ball.y - this.ball.radiusY + tolerance >= this.playerOne.paddlePos - paddleHalfHeight &&
      this.ball.y + this.ball.radiusY - tolerance <= this.playerOne.paddlePos + paddleHalfHeight
    ) {
      const impact = (this.ball.y - this.playerOne.paddlePos) / this.paddleHeight;
      this.calculateBallBounce(impact);
      this.ball.x = this.paddleWidth + this.ball.radiusX;
      return true;
    }
    if (
      this.ball.x + this.ball.radiusX >= xMax - this.paddleWidth &&
      this.ball.y - this.ball.radiusY + tolerance >= this.playerTwo.paddlePos - paddleHalfHeight &&
      this.ball.y + this.ball.radiusY - tolerance <= this.playerTwo.paddlePos + paddleHalfHeight
    ) {
      const impact = (this.ball.y - this.playerTwo.paddlePos) / this.paddleHeight;
      this.calculateBallBounce(impact);
      this.ball.x = xMax - this.paddleWidth - this.ball.radiusX;
      return true;
    }
    return false;
  }

  private calculateBallBounce(impact: number): void {
    const maxBounceAngle = Math.PI / 3;
    const proportionnedDx = this.ball.dx * ratio;
    const speed = Math.sqrt(proportionnedDx ** 2 + this.ball.dy ** 2);

    const angle = Math.atan2(this.ball.dy, proportionnedDx);

    const bounceAngle = impact * maxBounceAngle;
    let newAngle = bounceAngle + Math.PI - angle;
    const angleMin = Math.PI / 12;

    if (newAngle > -Math.PI / 2 - angleMin && newAngle < -Math.PI / 2 + angleMin) {
      newAngle =
        Math.abs(newAngle) < Math.PI / 2 ? -Math.PI / 2 + angleMin : -Math.PI / 2 - angleMin;
    } else if (newAngle > Math.PI / 2 - angleMin && newAngle < Math.PI / 2 + angleMin) {
      newAngle = Math.abs(newAngle) < Math.PI / 2 ? Math.PI / 2 - angleMin : Math.PI / 2 + angleMin;
    }

    this.ball.dx = (speed * Math.cos(newAngle)) / ratio;
    this.ball.dy = speed * Math.sin(newAngle);
  }

  private updateBallPosition(): void {
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    if (this.ball.y - this.ball.radiusY <= 0) {
      this.ball.y = this.ball.radiusY;
      this.ball.dy *= -1;
    } else if (this.ball.y + this.ball.radiusY >= yMax) {
      this.ball.y = yMax - this.ball.radiusY;
      this.ball.dy *= -1;
    }

    if (this.checkPaddleCollision()) return;

    let hasScored = false;
    if (this.ball.x - this.ball.radiusX <= 0) {
      this.ball.x = this.ball.radiusX;
      this.playerTwo.score++;
      hasScored = true;
    } else if (this.ball.x + this.ball.radiusX >= xMax) {
      this.ball.x = xMax - this.ball.radiusX;
      this.playerOne.score++;
      hasScored = true;
    }
    if (hasScored) {
      clearInterval(this.accelerationInterval);
      if (
        this.playerOne.score >= this.rules.scoreToWin ||
        this.playerTwo.score >= this.rules.scoreToWin
      ) {
        this.endGame('FINISHED');
      } else this.resetBall();
    }
  }

  private resetBall(): void {
    this.ball.dx = 0;
    this.ball.dy = 0;
    this.waitBeforeResetBallTimeout = setTimeout(() => {
      this.accelerationInterval = setInterval(() => {
        this.ball.dx *= 1.01;
        this.ball.dy *= 1.01;
      }, 1000);
      this.ball.x = centerPos('x');
      this.ball.y = centerPos('y');
      const speed = ballSpeedToNumber(this.rules.ballSpeed);
      this.ball.dx = speed * (Math.random() < 0.5 ? 1 : -1) * ratio;
      this.ball.dy = 0;
      clearTimeout(this.waitBeforeResetBallTimeout);
      this.waitBeforeResetBallTimeout = undefined;
    }, 3000);
    this.timeToResetBall = Date.now() + 3000;
  }

  public waitForReconnect(userId: number): void {
    if (this.playerOne.userId === userId) this.playerOne.isDisconnected = true;
    else if (this.playerTwo.userId === userId) this.playerTwo.isDisconnected = true;
    else throw new ForbiddenException('user not in game');
    this.status = 'PAUSED';
    this.cancelGameTimeout = setTimeout(() => this.cancelGame(), 10000);
  }

  public reconnect(userId: number): void {
    if (this.playerOne.userId === userId) this.playerOne.isDisconnected = false;
    else if (this.playerTwo.userId === userId) this.playerTwo.isDisconnected = false;
    else throw new ForbiddenException('user not in game');
    if (!this.playerOne.isDisconnected && !this.playerTwo.isDisconnected) {
      this.status = 'IN_PROGRESS';
      clearTimeout(this.cancelGameTimeout);
    }
  }

  public getGameData(): WsGameStateUpdatePosition.eventMessageTemplate {
    return {
      gameId: this.gameId,
      status: this.status,
      player1: {
        paddlePos: this.playerOne.paddlePos,
        score: this.playerOne.score,
        userId: this.playerOne.userId,
      },
      player2: {
        paddlePos: this.playerTwo.paddlePos,
        score: this.playerTwo.score,
        userId: this.playerTwo.userId,
      },
      ball: {x: this.ball.x / ratio, y: this.ball.y},
      rules: this.rules,
    };
  }

  public getGameId(): number {
    return this.gameId;
  }

  public isPlayerInGame(userId: number): boolean {
    return this.playerOne.userId === userId || this.playerTwo.userId === userId;
  }

  private initPlayerData(playerId: number): PlayerData {
    return {
      userId: playerId,
      paddlePos: centerPos('y'),
      score: 0,
      isDisconnected: false,
    };
  }

  public async cancelGame(): Promise<void> {
    await this.endGame('CANCELED');
  }

  public isGameFinished(): boolean {
    return this.status === 'FINISHED' || this.status === 'CANCELED';
  }

  private async endGame(status: 'FINISHED' | 'CANCELED'): Promise<void> {
    this.status = status;
    await this.prisma.game.update({
      where: {gameId: this.gameId},
      data: {
        gameStatus: status,
        finishedAt: new Date(),
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
