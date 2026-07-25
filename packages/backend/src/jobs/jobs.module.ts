import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { UrlCheckProcessor } from './processors/url-check.processor';
import { JobsGateway } from './jobs.gateway';

@Module({
  controllers: [JobsController],
  providers: [
    JobsService, 
    UrlCheckProcessor, 
    JobsGateway
  ],
  exports: [JobsService, JobsGateway],
})
export class JobsModule {}