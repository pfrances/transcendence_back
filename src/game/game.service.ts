import {ConflictException, ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {UpdateGameInCreationDto} from './dto/updateGameInCreation.dto';
import {
  GameHistory,
  GameInCreationData,
  GameMatchMakingInfo,
} from 'src/shared/HttpEndpoints/interfaces';
import {PrismaService} from 'src/prisma/prisma.service';
import {Game} from './gameLogic/game';
import {GameCreator} from './gameLogic';
import {WsRoomService} from 'src/webSocket/WsRoom/WsRoom.service';
import {RoomNamePrefix} from 'src/webSocket/WsRoom/interface';
import {SendPlayerMoveDto} from './dto/sendPlayerMove.dto';
import {WsException} from '@nestjs/websockets';
import {WsSocketService} from 'src/webSocket/WsSocket/WsSocket.service';

@Injectable()
export class GameService {
  private static readonly roomGameInCreationPrefix: RoomNamePrefix = 'Game_In_Creation-';
  private static readonly roomGameNamePrefix: RoomNamePrefix = 'Game-';
  private static waitingUser = new Set<number>();
  private static gameInCreation = new Map<number, GameCreator>();
  private static gameInProgress = new Map<number, Game>();
  constructor(private readonly prisma: PrismaService, private readonly room: WsRoomService) {
    setInterval(() => {
      for (const game of GameService.gameInProgress.values()) {
        if (game.isGameFinished()) {
          const gameId = game.getGameId();
          const prefix = GameService.roomGameNamePrefix;
          this.room.deleteRoom({prefix, roomId: gameId});
          GameService.gameInProgress.delete(gameId);
        }
      }
    }, 1000);
  }

  joinWaitList(userId: number): void {
    if (GameService.waitingUser.has(userId)) throw new ConflictException('already in waiting list');
    GameService.waitingUser.add(userId);
    if (GameService.waitingUser.size >= 2) this.newGameInCreation();
  }

  leaveGame(userId: number): void {
    if (GameService.waitingUser.has(userId)) {
      GameService.waitingUser.delete(userId);
      return;
    }
    for (const game of GameService.gameInProgress.values()) {
      if (!game.isPlayerInGame(userId)) continue;
      const gameId = game.getGameId();
      const prefix = GameService.roomGameNamePrefix;
      this.room.sendMessageInRoom({
        eventName: 'gameLeave',
        prefix,
        roomId: gameId,
        senderId: userId,
        message: {userId, gameId},
      });
      this.room.deleteRoom({prefix, roomId: gameId});
      game.cancelGame();
      GameService.gameInProgress.delete(gameId);
      return;
    }

    for (const game of GameService.gameInCreation.values()) {
      if (!game.isPlayerInGame(userId)) continue;
      const GameInCreationId = game.getGameInCreationId();
      const prefix = GameService.roomGameInCreationPrefix;
      this.room.sendMessageInRoom({
        eventName: 'gameLeave',
        prefix,
        roomId: GameInCreationId,
        senderId: userId,
        message: {userId, gameId: GameInCreationId},
      });
      this.room.deleteRoom({prefix, roomId: GameInCreationId});
      GameService.gameInCreation.delete(GameInCreationId);
      return;
    }

    throw new NotFoundException('not in waiting list');
  }

  updateGameInCreation(
    userId: number,
    gameInCreationId: number,
    dto: UpdateGameInCreationDto,
  ): void {
    const gameInCreation = GameService.gameInCreation.get(gameInCreationId);
    if (!gameInCreation) throw new NotFoundException('game not found');
    gameInCreation.updateGame(userId, {...dto});
    const prefix = GameService.roomGameInCreationPrefix;
    this.room.broadcastMessageInRoom({
      eventName: 'gameInCreationChange',
      prefix,
      roomId: gameInCreationId,
      message: gameInCreation.getGameInCreationData(),
    });
  }

  async acceptGameInCreation(
    userId: number,
    gameInCreationId: number,
    hasAccepted: boolean,
  ): Promise<void> {
    const gameInCreation = GameService.gameInCreation.get(gameInCreationId);
    if (!gameInCreation) throw new NotFoundException('game not found');
    gameInCreation.acceptGame(userId, hasAccepted);
    if (gameInCreation.getHasMatched()) {
      let prefix = GameService.roomGameInCreationPrefix;
      this.room.deleteRoom({prefix, roomId: gameInCreationId});
      const game = await gameInCreation.generateGame(this.prisma, this.room);
      const gameId = game.getGameId();
      GameService.gameInProgress.set(gameId, game);
      GameService.gameInCreation.delete(gameInCreationId);
    } else {
      const prefix = GameService.roomGameInCreationPrefix;
      this.room.broadcastMessageInRoom({
        eventName: 'gameInCreationChange',
        prefix,
        roomId: gameInCreationId,
        message: gameInCreation.getGameInCreationData(),
      });
    }
  }

  getGameInCreation(userId: number, gameInCreationId: number): GameInCreationData {
    const gameInCreation = GameService.gameInCreation.get(gameInCreationId);
    if (!gameInCreation) throw new NotFoundException('game not found');
    if (!gameInCreation.isPlayerInGame(userId)) throw new ForbiddenException('user not in game');
    return gameInCreation.getGameInCreationData();
  }

  getMatchMakingInfo(userId: number): GameMatchMakingInfo {
    if (GameService.waitingUser.has(userId)) return {status: 'WAITING_FOR_PLAYER'};
    for (const game of GameService.gameInProgress.values()) {
      if (game.isGameFinished() || !game.isPlayerInGame(userId)) continue;
      return {
        status: 'IN_GAME',
        gameId: game.getGameId(),
      };
    }
    for (const game of GameService.gameInCreation.values()) {
      if (!game.isPlayerInGame(userId)) continue;
      return {
        status: 'IN_GAME_CREATION',
        gameInCreationId: game.getGameInCreationId(),
      };
    }
    return {status: 'UNREGISTERED'};
  }

  private newGameInCreation(): void {
    if (GameService.waitingUser.size < 2)
      throw new NotFoundException('not enough user in waiting list');
    const userOneId = GameService.waitingUser.values().next().value;
    GameService.waitingUser.delete(userOneId);
    const userTwoId = GameService.waitingUser.values().next().value;
    GameService.waitingUser.delete(userTwoId);
    const gameInCreation = new GameCreator(userOneId, userTwoId);
    const gameInCreationId = gameInCreation.getGameInCreationId();
    GameService.gameInCreation.set(gameInCreation.getGameInCreationId(), gameInCreation);
    const prefix = GameService.roomGameInCreationPrefix;
    this.room.addUserToRoom({prefix, roomId: gameInCreationId, userId: userOneId});
    this.room.addUserToRoom({prefix, roomId: gameInCreationId, userId: userTwoId});

    this.room.broadcastMessageInRoom({
      eventName: 'gameMatch',
      prefix,
      roomId: gameInCreationId,
      message: {gameInCreationId},
    });
  }

  async handleUserConnection(userId: number): Promise<void> {
    for (const game of GameService.gameInCreation.values()) {
      if (!game.isPlayerInGame(userId)) continue;
      const GameInCreationId = game.getGameInCreationId();
      const prefix = GameService.roomGameInCreationPrefix;
      this.room.addUserToRoom({prefix, roomId: GameInCreationId, userId});
      return;
    }
    for (const game of GameService.gameInProgress.values()) {
      if (game.isGameFinished() || !game.isPlayerInGame(userId)) continue;
      const gameId = game.getGameId();
      const prefix = GameService.roomGameNamePrefix;
      this.room.addUserToRoom({prefix, roomId: gameId, userId});
      game.reconnect(userId);
      return;
    }
  }

  async handleUserDisconnection(userId: number): Promise<void> {
    for (const game of GameService.gameInCreation.values()) {
      if (!game.isPlayerInGame(userId)) continue;
      const GameInCreationId = game.getGameInCreationId();
      const prefix = GameService.roomGameInCreationPrefix;
      this.room.removeUserFromRoom({prefix, roomId: GameInCreationId, userId});
      return;
    }

    for (const game of GameService.gameInProgress.values()) {
      if (game.isGameFinished() || !game.isPlayerInGame(userId)) continue;
      const gameId = game.getGameId();
      const prefix = GameService.roomGameNamePrefix;
      this.room.removeUserFromRoom({prefix, roomId: gameId, userId});
      game.waitForReconnect(userId);
      return;
    }
  }

  handlePlayerMove(userId: number, dto: SendPlayerMoveDto): void {
    const game = GameService.gameInProgress.get(dto.gameId);
    if (!game) throw new WsException('game not found');
    if (!game.isPlayerInGame(userId)) throw new WsException('user not in game');
    game.updatePlayerPaddlePos(userId, dto.direction);
  }

  async getMatchHistory(userId: number): Promise<GameHistory[]> {
    const plays = await this.prisma.game.findMany({
      where: {participants: {some: {userId}}},
      select: {
        gameId: true,
        gameStatus: true,
        scoreToWin: true,
        ballSpeed: true,
        ballSize: true,
        paddleSpeed: true,
        paddleSize: true,
        startedAt: true,
        finishedAt: true,
        participants: {
          select: {
            score: true,
            isWinner: true,
            userProfile: {select: {nickname: true, avatarUrl: true, userId: true}},
          },
        },
      },
    });
    return plays.map(play => {
      const p1Particip = play.participants[0];
      const p2Particip = play.participants[1];
      const playerOne = {
        profile: {
          ...p1Particip.userProfile,
          isOnline: WsSocketService.isOnline(p1Particip.userProfile.userId),
        },
        score: p1Particip.score,
      };
      const playerTwo = {
        profile: {
          ...p2Particip.userProfile,
          isOnline: WsSocketService.isOnline(p2Particip.userProfile.userId),
        },
        score: p2Particip.score,
      };
      const winnerId = play.participants.find(particip => particip.isWinner)?.userProfile.userId;

      return {
        gameId: play.gameId,
        winnerId,
        startDate: play.startedAt,
        endDate: play.finishedAt ?? undefined,
        playerOne,
        playerTwo,
        winner: play.participants.find(particip => particip.isWinner)?.userProfile,
        rules: {
          scoreToWin: play.scoreToWin,
          ballSpeed: play.ballSpeed,
          ballSize: play.ballSize,
          paddleSpeed: play.paddleSpeed,
          paddleSize: play.paddleSize,
        },
      };
    });
  }
}
