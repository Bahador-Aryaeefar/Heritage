import { Module } from '@nestjs/common';
import { QrService } from './application/qr.service';

@Module({
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
