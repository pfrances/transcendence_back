import {ConflictException, ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {UpdateGameInCreationDto} from './dto/updateGameInCreation.dto';
import {GameInCreationData, GameMatchMakingInfo} from 'src/shared/HttpEndpoints/interfaces';
import {PrismaService} from 'src/prisma/prisma.service';
import {Game} from './gameLogic/game';
import {GameCreator} from './gameLogic';
import {WsRoomService} from 'src/webSocket/WsRoom/WsRoom.service';
import {RoomNamePrefix} from 'src/webSocket/WsRoom/interface';

@Injectable()
export class GameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly room: WsRoomService,
  ) {}
  private static readonly roomGameInCreationPrefix: RoomNamePrefix = 'Game_In_Creation-';
  private static readonly roomGameNamePrefix: RoomNamePrefix = 'Game-';
  private static waitingUser = new Set<number>();
  private static gameInCreation = new Map<number, GameCreator>();
  private static gameInProgress = new Map<number, Game>();

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

      prefix = GameService.roomGameNamePrefix;
      const game = await gameInCreation.generateGame(this.prisma);
      const gameId = game.getGameId();
      GameService.gameInProgress.set(gameId, game);
      this.room.addUserToRoom({prefix, roomId: gameId, userId: game.getPlayerOneId()});
      this.room.addUserToRoom({prefix, roomId: gameId, userId: game.getPlayerTwoId()});
      this.room.broadcastMessageInRoom({
        eventName: 'gameStart',
        prefix,
        roomId: gameId,
        message: {gameId},
      });
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
      if (!game.isPlayerInGame(userId)) continue;
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
      if (!game.isPlayerInGame(userId)) continue;
      const gameId = game.getGameId();
      const prefix = GameService.roomGameNamePrefix;
      this.room.addUserToRoom({prefix, roomId: gameId, userId});
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
      if (!game.isPlayerInGame(userId)) continue;
      const gameId = game.getGameId();
      const prefix = GameService.roomGameNamePrefix;
      this.room.removeUserFromRoom({prefix, roomId: gameId, userId});
      return;
    }
  }
}
