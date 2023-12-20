import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import {ChatService} from './chat.service';
import {GetInfoFromJwt} from 'src/decorator';
import {CreateChatDto, JoinChatDto, UpdateChatDto} from './dto';
import {JwtAuthGuard} from 'src/auth/guard';
import {
  HttpChat,
  HttpCreateChat,
  HttpGetAllChats,
  HttpGetAllMessage,
  HttpGetChatInfo,
  HttpJoinChat,
  HttpLeaveChat,
  HttpUpdateChat,
} from 'src/shared/HttpEndpoints/chat';

@Controller(HttpChat.endPointBase)
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get(HttpGetAllChats.endPoint)
  async getAllChats(): Promise<HttpGetAllChats.resTemplate> {
    return this.chat.getAllChats();
  }

  @Get(HttpGetAllMessage.endPoint)
  async getAllMessage(
    @GetInfoFromJwt('userId') userId: number,
    @Query('chatId', ParseIntPipe) chatId: number,
  ): Promise<HttpGetAllMessage.resTemplate> {
    return this.chat.getAllMessagesFromChatId(userId, chatId);
  }

  @Post(HttpCreateChat.endPoint)
  async createChat(
    @GetInfoFromJwt('userId') userId: number,
    @Body() dto: CreateChatDto,
  ): Promise<HttpCreateChat.resTemplate> {
    return this.chat.createChat(userId, dto);
  }

  @Get(HttpGetChatInfo.endPoint)
  async getChatInfo(
    @Query('chatId', ParseIntPipe) chatId: number,
  ): Promise<HttpGetChatInfo.resTemplate> {
    return this.chat.getChatInfo(chatId);
  }

  @Post(HttpJoinChat.endPoint)
  async joinChat(
    @GetInfoFromJwt('userId') userId: number,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() dto: JoinChatDto,
  ): Promise<HttpJoinChat.resTemplate> {
    await this.chat.joinChat({userId, chatId, ...dto});
    return this.chat.getChatInfo(chatId);
  }

  @Post(HttpLeaveChat.endPoint)
  async leaveChat(
    @GetInfoFromJwt('userId') userId: number,
    @Param('chatId', ParseIntPipe) chatId: number,
  ): Promise<HttpLeaveChat.resTemplate> {
    await this.chat.leaveChat({userId, chatId});
    return this.chat.getChatInfo(chatId);
  }

  @Patch(HttpUpdateChat.endPoint)
  async updateChat(
    @GetInfoFromJwt('userId') userId: number,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() dto: UpdateChatDto,
  ): Promise<HttpUpdateChat.resTemplate> {
    if (!Object.keys(dto).length) throw new UnprocessableEntityException('no data to update');
    await this.chat.updateChat({...dto, userId, chatId});
    return this.chat.getChatInfo(chatId);
  }
}
