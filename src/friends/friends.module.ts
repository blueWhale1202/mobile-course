import { Module } from '@nestjs/common';
import { QrModule } from '../qr/qr.module';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

@Module({
  imports: [QrModule],
  providers: [FriendsService],
  controllers: [FriendsController],
})
export class FriendsModule {}
