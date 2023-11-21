import {
  Body,
  Controller,
  Get,
  Patch,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import {JwtAuthGuard} from 'src/auth/guard';
import {EditUserDto} from './dto';
import {UserService} from './user.service';
import {GetInfoFromJwt} from 'src/decorator';
import {HttpAllUsers, HttpEditMe, HttpGetMe, HttpUser} from 'src/shared/HttpEndpoints/user';

@Controller(HttpUser.endPointBase)
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(HttpGetMe.endPoint)
  async getMe(@GetInfoFromJwt('userId') userId: number): Promise<HttpGetMe.resTemplate> {
    return await this.userService.getUserPublicInfo({userId});
  }

  @Get(HttpAllUsers.endPoint)
  async getAllUsers(): Promise<HttpAllUsers.resTemplate> {
    const users = await this.userService.getAllUsersPublicInfo();
    return new HttpAllUsers.resTemplate(users);
  }

  @Patch(HttpEditMe.endPoint)
  async editProfile(
    @GetInfoFromJwt('userId') userId: number,
    @Body() dto: EditUserDto,
  ): Promise<HttpEditMe.resTemplate> {
    if (!Object.keys(dto).length) throw new UnprocessableEntityException('no data to update');
    return await this.userService.editUserInfo({userId}, dto);
  }
}
