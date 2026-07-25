import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IJobStorage } from './storage.interface';
import { MemoryStorageService } from './memory-storage.service';

@Global()
@Module({
  providers: [
    {
      provide: 'IJobStorage',
      useFactory: (): IJobStorage => new MemoryStorageService(),
      inject: [ConfigService],
    },
    MemoryStorageService,
  ],
  exports: ['IJobStorage'],
})
export class StorageModule {}
