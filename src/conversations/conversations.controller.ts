import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto';
import { CreateGroupConversationDto } from './dto/create-group-conversation.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Post('direct')
  async createOrGetDirect(
    @Req() req: any,
    @Body() dto: CreateDirectConversationDto,
  ) {
    const userId = req.user.sub;
    const conversation =
      await this.conversationsService.createOrGetDirectConversation(
        userId,
        dto.targetUserId,
      );
    return {
      data: conversation,
      error: null,
    };
  }

  @Post('group')
  async createGroup(@Req() req: any, @Body() dto: CreateGroupConversationDto) {
    const userId = req.user.sub;
    const conversation =
      await this.conversationsService.createGroupConversation(
        userId,
        dto.title,
        dto.memberIds,
      );
    return {
      data: conversation,
      error: null,
    };
  }

  @Get()
  async listMyConversations(@Req() req: any) {
    const userId = req.user.sub;
    const conversations =
      await this.conversationsService.listUserConversations(userId);
    return {
      data: conversations,
      error: null,
    };
  }

  @Get(':id')
  async getConversation(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    const conversation = await this.conversationsService.getConversationById(
      userId,
      id,
    );
    return {
      data: conversation,
      error: null,
    };
  }
}
