import { Module } from '@nestjs/common';
import { MediaCleanupService } from './application/media-cleanup.service';
import { MediaService } from './application/media.service';

@Module({
  providers: [MediaService, MediaCleanupService],
  exports: [MediaService, MediaCleanupService],
})
export class MediaModule {}
