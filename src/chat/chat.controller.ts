import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  UnprocessableEntityException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
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
import {FileInterceptor} from '@nestjs/platform-express';

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
    @Param('chatId', ParseIntPipe) chatId: number,
  ): Promise<HttpGetAllMessage.resTemplate> {
    return this.chat.getAllMessagesFromChatId(userId, chatId);
  }

  @UseInterceptors(FileInterceptor('chatAvatar'))
  @Post(HttpCreateChat.endPoint)
  async createChat(
    @GetInfoFromJwt('userId') userId: number,
    @Body() dto: CreateChatDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({maxSize: 1024 * 1024}),
          new FileTypeValidator({fileType: 'image/*'}),
        ],
        fileIsRequired: false,
      }),
    )
    chatAvatar: Express.Multer.File,
  ): Promise<HttpCreateChat.resTemplate> {
    if (chatAvatar) dto.chatAvatar = chatAvatar;
    return this.chat.createChat(userId, dto);
  }

  @Get(HttpGetChatInfo.endPoint)
  async getChatInfo(
    @Param('chatId', ParseIntPipe) chatId: number,
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

  @UseInterceptors(FileInterceptor('chatAvatar'))
  @Patch(HttpUpdateChat.endPoint)
  async updateChat(
    @GetInfoFromJwt('userId') userId: number,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() dto: UpdateChatDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({maxSize: 1024 * 1024}),
          new FileTypeValidator({fileType: 'image/*'}),
        ],
        fileIsRequired: false,
      }),
    )
    chatAvatar: Express.Multer.File,
  ): Promise<HttpUpdateChat.resTemplate> {
    if (!Object.keys(dto).length) throw new UnprocessableEntityException('no data to update');
    if (chatAvatar) dto.chatAvatar = chatAvatar;
    await this.chat.updateChat({...dto, userId, chatId});
    return this.chat.getChatInfo(chatId);
  }
}
