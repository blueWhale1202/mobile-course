import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QrService } from './qr.service';

@Controller('qr')
export class QrController {
  constructor(private qrService: QrService) {}

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyQr(@Req() req: any) {
    const userId = req.user.sub;
    const qr = await this.qrService.getOrCreateQrToken(userId);

    return {
      data: qr,
      error: null,
    };
  }
}
