import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QrModule } from '../qr/qr.module';
import { MediaModule } from '../media/media.module';
import { AdminSitesService } from './application/admin-sites.service';
import { SiteReviewsService } from './application/site-reviews.service';
import { SitesService } from './application/sites.service';
import { AdminSitesController } from './presentation/admin-sites.controller';
import { PublicLandingController, PublicSitesController } from './presentation/public-sites.controller';

@Module({
  imports: [QrModule, MediaModule, forwardRef(() => AuthModule)],
  controllers: [PublicLandingController, PublicSitesController, AdminSitesController],
  providers: [SitesService, AdminSitesService, SiteReviewsService],
  exports: [SitesService, SiteReviewsService],
})
export class SitesModule {}
