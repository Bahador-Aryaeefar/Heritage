import { Global, Module } from '@nestjs/common';
import { LocalDiskStorageService } from './local-disk-storage.service';
import { StagingService } from './staging.service';
import { STORAGE_SERVICE } from './storage.interface';

@Global()
@Module({
  providers: [
    LocalDiskStorageService,
    { provide: STORAGE_SERVICE, useExisting: LocalDiskStorageService },
    StagingService,
  ],
  exports: [STORAGE_SERVICE, LocalDiskStorageService, StagingService],
})
export class StorageModule {}
