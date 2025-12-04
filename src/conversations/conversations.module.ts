import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  providers: [ConversationsService],
  controllers: [ConversationsController],
})
export class ConversationsModule {}
