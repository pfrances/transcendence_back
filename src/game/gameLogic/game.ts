import {WsException} from '@nestjs/websockets';
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
import {WsSocketService} from 'src/webSocket/WsSocket/WsSocket.service';

type PlayerData = GameInProgressPlayerData & {isDisconnected: boolean};
type Ball = {x: number; y: number; dx: number; dy: number; radiusX: number; radiusY: number};

const prefix = 'Game-';
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
  private player1: PlayerData;
  private player2: PlayerData;
  private ball: Ball;
  private paddleHeight: number;
  private paddleWidth: number;
  private paddleSpeed: number;

  private sendDataInterval: NodeJS.Timeout;

  private waitBeforeResetBallTimeout?: NodeJS.Timeout;
  private timeToResetBall: number;

  private accelerationInterval?: NodeJS.Timeout;

  private cancelGameTimeout?: NodeJS.Timeout;

  constructor(
    prisma: PrismaService,
    room: WsRoomService,
    gameId: number,
    rules: GameRules,
    player1Id: number,
    player2Id: number,
  ) {
    this.gameId = gameId;
    this.rules = rules;
    this.status = 'IN_PROGRESS';
    this.player1 = this.initPlayerData(player1Id);
    this.player2 = this.initPlayerData(player2Id);
    this.ball = this.initBallData();
    this.paddleHeight = paddleHeightToNumber(rules.paddleSize);
    this.paddleWidth = paddleWidthToNumber(rules.paddleSize) * ratio;
    this.paddleSpeed = paddleSpeedToNumber(rules.paddleSpeed);
    this.timeToResetBall = 0;
    this.prisma = prisma;
    this.room = room;
    this.room.addUserToRoom({prefix, roomId: gameId, userId: player1Id});
    this.room.addUserToRoom({prefix, roomId: gameId, userId: player2Id});
    this.resetBall();
    this.room.broadcastMessageInRoom({
      eventName: 'gameStart',
      prefix,
      roomId: this.gameId,
      message: {gameId: this.gameId},
    });
    this.sendDataInterval = setInterval(() => this.broadcastGameData(), 1000 / 60);
  }

  private broadcastGameData(): void {
    this.updateBallPosition();
    const countdown = Math.floor(this.timeToResetBall - Date.now());
    const message = {...this.getGameData(), countdown: countdown > 0 ? countdown : undefined};
    this.room.broadcastMessageInRoom({
      eventName: 'gameStateUpdate',
      prefix,
      roomId: this.gameId,
      message,
    });
    if (this.isGameFinished()) clearInterval(this.sendDataInterval);
  }

  public updatePlayerPaddlePos(userId: number, dir: 'up' | 'down'): void {
    if (this.status !== 'IN_PROGRESS') return;
    const move = dir === 'up' ? -this.paddleSpeed : this.paddleSpeed;
    const paddleHalfHeight = this.paddleHeight / 2;
    const player =
      this.player1.userId === userId
        ? this.player1
        : this.player2.userId === userId
        ? this.player2
        : null;
    if (!player) throw new WsException('user not in game');
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
      this.ball.y + this.ball.radiusY >= this.player1.paddlePos - paddleHalfHeight - tolerance &&
      this.ball.y - this.ball.radiusY <= this.player1.paddlePos + paddleHalfHeight + tolerance
    ) {
      const impact = (this.ball.y - this.player1.paddlePos) / this.paddleHeight;
      this.calculateBallBounce(impact);
      this.ball.x = this.paddleWidth + this.ball.radiusX;
      return true;
    }
    if (
      this.ball.x + this.ball.radiusX >= xMax - this.paddleWidth &&
      this.ball.y + this.ball.radiusY >= this.player2.paddlePos - paddleHalfHeight - tolerance &&
      this.ball.y - this.ball.radiusY <= this.player2.paddlePos + paddleHalfHeight + tolerance
    ) {
      const impact = (this.ball.y - this.player2.paddlePos) / paddleHalfHeight;
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
    if (newAngle < 0) newAngle += 2 * Math.PI;

    const angleMin = Math.PI / 8;
    const halfPI = Math.PI / 2;
    const threeHalfPI = (3 * Math.PI) / 2;
    if (newAngle > halfPI - angleMin && newAngle < halfPI + angleMin) {
      newAngle = newAngle < halfPI ? halfPI - angleMin : halfPI + angleMin;
    } else if (newAngle > threeHalfPI - angleMin && newAngle < threeHalfPI + angleMin) {
      newAngle = newAngle < threeHalfPI ? threeHalfPI - angleMin : threeHalfPI + angleMin;
    }

    this.ball.dx = (speed * Math.cos(newAngle)) / ratio;
    this.ball.dy = speed * Math.sin(newAngle);
  }

  private updateBallPosition(): void {
    if (this.status !== 'IN_PROGRESS' || this.timeToResetBall > Date.now()) return;

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
      this.player2.score++;
      hasScored = true;
    } else if (this.ball.x + this.ball.radiusX >= xMax) {
      this.ball.x = xMax - this.ball.radiusX;
      this.player1.score++;
      hasScored = true;
    }
    if (hasScored) {
      clearInterval(this.accelerationInterval);
      if (
        this.player1.score >= this.rules.scoreToWin ||
        this.player2.score >= this.rules.scoreToWin
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

  public handleUserDisconnection(userId: number): void {
    if (this.isGameFinished()) return;
    if (this.player1.userId === userId) this.player1.isDisconnected = true;
    else if (this.player2.userId === userId) this.player2.isDisconnected = true;
    else throw new WsException('user not in game');
    this.status = 'PAUSED';
    if (this.player1.isDisconnected && this.player2.isDisconnected)
      this.cancelGameTimeout = setTimeout(() => this.cancelGame(), 30000);
  }

  public handleUserReconnection(userId: number): void {
    if (this.isGameFinished()) return;
    if (this.player1.userId === userId) this.player1.isDisconnected = false;
    else if (this.player2.userId === userId) this.player2.isDisconnected = false;
    else throw new WsException('user not in game');
    if (!this.player1.isDisconnected && !this.player2.isDisconnected) {
      this.status = 'IN_PROGRESS';
      this.timeToResetBall = Date.now() + 3000;
      if (this.cancelGameTimeout) {
        clearTimeout(this.cancelGameTimeout);
        this.cancelGameTimeout = undefined;
      }
    }
  }

  public getGameData(): WsGameStateUpdatePosition.eventMessageTemplate {
    return {
      status: this.status,
      player1: {
        paddlePos: this.player1.paddlePos,
        score: this.player1.score,
      },
      player2: {
        paddlePos: this.player2.paddlePos,
        score: this.player2.score,
      },
      ball: {x: this.ball.x / ratio, y: this.ball.y},
    };
  }

  public getGameId(): number {
    return this.gameId;
  }

  public isPlayerInGame(userId: number): boolean {
    return this.player1.userId === userId || this.player2.userId === userId;
  }

  private initBallData(): Ball {
    return {
      x: centerPos('x'),
      y: centerPos('y'),
      dx: 0,
      dy: 0,
      radiusX: ballSizeToNumber(this.rules.ballSize) * ratio,
      radiusY: ballSizeToNumber(this.rules.ballSize),
    };
  }

  private initPlayerData(playerId: number): PlayerData {
    return {
      userId: playerId,
      paddlePos: centerPos('y'),
      score: 0,
      isDisconnected: WsSocketService.isOnline(playerId) == false,
    };
  }

  public async cancelGame(): Promise<void> {
    if (this.isGameFinished()) return;
    await this.endGame('CANCELED');
    this.broadcastGameData();
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
              where: {gameId_userId: {gameId: this.gameId, userId: this.player1.userId}},
              data: {
                score: this.player1.score,
                isWinner:
                  this.player1.score > this.player2.score &&
                  this.player1.score >= this.rules.scoreToWin,
              },
            },
            {
              where: {gameId_userId: {gameId: this.gameId, userId: this.player2.userId}},
              data: {
                score: this.player2.score,
                isWinner:
                  this.player2.score > this.player1.score &&
                  this.player2.score >= this.rules.scoreToWin,
              },
            },
          ],
        },
      },
    });
  }
}
