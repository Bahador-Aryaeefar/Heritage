import { Module } from '@nestjs/common';
import { QrModule } from '../qr/qr.module';
import { SitesService } from './application/sites.service';
import { PublicLandingController, PublicSitesController } from './presentation/public-sites.controller';

@Module({
  imports: [QrModule],
  controllers: [PublicLandingController, PublicSitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
