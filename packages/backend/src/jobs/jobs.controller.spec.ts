import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { ConfigService } from '@nestjs/config';
import { MemoryStorageService } from '../storage/memory-storage.service';
import { JobsGateway } from './jobs.gateway';
import { JobsService } from './jobs.service';
import { UrlCheckProcessor } from './processors/url-check.processor';

describe('JobsController', () => {
  let controller: JobsController;

  const mockGateway = {
    sendJobUpdate: jest.fn(),
    broadcastJobUpdate: jest.fn(),
    sendJobError: jest.fn(),
    sendJobsList: jest.fn(),
    emitToJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        JobsService,
        {
          provide: 'IJobStorage',
          useClass: MemoryStorageService,
        },
        {
          provide: UrlCheckProcessor,
          useValue: {
            processUrls: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: JobsGateway,
          useValue: mockGateway,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'rateLimit.maxConcurrent') return 5;
              if (key === 'rateLimit.delayMin') return 0;
              if (key === 'rateLimit.delayMax') return 10;
              return null;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<JobsController>(JobsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
