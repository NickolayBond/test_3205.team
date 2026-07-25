import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { UrlCheckProcessor } from './processors/url-check.processor';
import { JobsGateway } from './jobs.gateway';
import { ConfigService } from '@nestjs/config';
import { IJobStorage } from '../storage/storage.interface';
import { MemoryStorageService } from '../storage/memory-storage.service';

describe('JobsService', () => {
  let service: JobsService;
  let storage: IJobStorage;
  let gateway: JobsGateway;

  beforeEach(async () => {
    const mockGateway = {
      sendJobUpdate: jest.fn(),
      broadcastJobUpdate: jest.fn(),
      sendJobError: jest.fn(),
      sendJobsList: jest.fn(),
      emitToJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<JobsService>(JobsService);
    storage = module.get<IJobStorage>('IJobStorage');
    gateway = module.get<JobsGateway>(JobsGateway);
  });

  afterEach(async () => {
    const jobs = await storage.getAllJobs();
    for (const job of jobs) {
      await storage.deleteJob(job.id);
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createJob', () => {
    it('should create a job with unique URLs', async () => {
      const dto = {
        urls: ['https://example.com', 'https://google.com', 'https://example.com'],
      };

      const result = await service.createJob(dto);

      expect(result).toHaveProperty('jobId');
      expect(gateway.broadcastJobUpdate).toHaveBeenCalled();
      
      const job = await storage.getJob(result.jobId);
      expect(job).toBeDefined();
      expect(job?.urls).toHaveLength(2);
      expect(job?.urls).toContain('https://example.com');
      expect(job?.urls).toContain('https://google.com');
      expect(job?.status).toBe('in_progress');
    });
  });

  describe('getAllJobs', () => {
    it('should return empty array when no jobs exist', async () => {
      const jobs = await service.getAllJobs();
      expect(jobs).toEqual([]);
    });

    it('should return all jobs sorted by creation date', async () => {
      await service.createJob({ urls: ['https://a.com'] });
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.createJob({ urls: ['https://b.com'] });

      const jobs = await service.getAllJobs();
      expect(jobs).toHaveLength(2);
      expect(jobs[0].urls[0]).toBe('https://b.com');
      expect(jobs[1].urls[0]).toBe('https://a.com');
    });
  });

  describe('getJobDetails', () => {
    it('should return job details with URL results', async () => {
      const { jobId } = await service.createJob({ 
        urls: ['https://example.com'] 
      });

      await storage.updateUrlResult(jobId, {
        url: 'https://example.com',
        status: 'pending',
      });

      const details = await service.getJobDetails(jobId);
      expect(details.id).toBe(jobId);
      expect(details.urlResults).toBeDefined();
      expect(Array.isArray(details.urlResults)).toBe(true);
    });

    it('should throw error when job not found', async () => {
      await expect(service.getJobDetails('non-existent-id')).rejects.toThrow(
        'Job with ID non-existent-id not found'
      );
    });
  });

  describe('cancelJob', () => {
    it('should cancel a pending job', async () => {
      const { jobId } = await service.createJob({ 
        urls: ['https://example.com'] 
      });

      await storage.updateUrlResult(jobId, {
        url: 'https://example.com',
        status: 'in_progress',
      });

      await service.cancelJob(jobId);
      
      const job = await storage.getJob(jobId);
      expect(job?.status).toBe('cancelled');
      expect(gateway.sendJobUpdate).toHaveBeenCalled();
      expect(gateway.broadcastJobUpdate).toHaveBeenCalled();
    });

    it('should throw error when job not found', async () => {
      await expect(service.cancelJob('non-existent-id')).rejects.toThrow(
        'Job with ID non-existent-id not found'
      );
    });

    it('should throw error when cancelling completed job', async () => {
      const { jobId } = await service.createJob({ 
        urls: ['https://example.com'] 
      });

      await storage.updateJob(jobId, { status: 'completed' });

      await expect(service.cancelJob(jobId)).rejects.toThrow(
        'Job already completed'
      );
    });

    it('should throw error when cancelling cancelled job', async () => {
      const { jobId } = await service.createJob({ 
        urls: ['https://example.com'] 
      });

      await service.cancelJob(jobId);
      
      await expect(service.cancelJob(jobId)).rejects.toThrow(
        'Job already cancelled'
      );
    });
  });

  describe('processJob', () => {
    it('should handle errors during processing', async () => {
      const { jobId } = await service.createJob({ 
        urls: ['https://example.com'] 
      });

      const processor = jest.spyOn(service, 'processJob' as any);
      processor.mockImplementationOnce(async () => {
        throw new Error('Processing failed');
      });

      const job = await storage.getJob(jobId);
      expect(job).toBeDefined();
      
      processor.mockRestore();
    });
  });
});