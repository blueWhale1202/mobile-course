import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AcceptFriendRequestDto } from './dto/accept-friend-request.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { RequestFromQrDto } from './dto/request-from-qr.dto';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { FriendsService } from './friends.service';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Post('request')
  async sendRequest(@Req() req: any, @Body() dto: SendFriendRequestDto) {
    const userId = req.user.sub;
    const friendship = await this.friendsService.sendFriendRequest(
      userId,
      dto.targetUserId,
    );
    return { data: friendship, error: null };
  }

  @Post('request-from-qr')
  async sendRequestFromQr(@Req() req: any, @Body() dto: RequestFromQrDto) {
    const userId = req.user.sub;
    const friendship = await this.friendsService.sendFriendRequestFromQr(
      userId,
      dto.token,
    );
    return { data: friendship, error: null };
  }

  @Post('accept')
  async accept(@Req() req: any, @Body() dto: AcceptFriendRequestDto) {
    const userId = req.user.sub;
    const friendship = await this.friendsService.acceptFriendRequest(
      userId,
      dto.friendshipId,
    );
    return { data: friendship, error: null };
  }

  @Post('reject')
  async reject(@Req() req: any, @Body() dto: AcceptFriendRequestDto) {
    const userId = req.user.sub;
    const result = await this.friendsService.rejectFriendRequest(
      userId,
      dto.friendshipId,
    );
    return { data: result, error: null };
  }

  @Post('block')
  async block(@Req() req: any, @Body() dto: BlockUserDto) {
    const userId = req.user.sub;
    const friendship = await this.friendsService.blockUser(
      userId,
      dto.targetUserId,
    );
    return { data: friendship, error: null };
  }

  @Get('list')
  async listFriends(@Req() req: any) {
    const userId = req.user.sub;
    const friends = await this.friendsService.listFriends(userId);
    return { data: friends, error: null };
  }

  @Get('pending')
  async listPending(@Req() req: any) {
    const userId = req.user.sub;
    const pending = await this.friendsService.listPendingRequests(userId);
    return { data: pending, error: null };
  }
}
