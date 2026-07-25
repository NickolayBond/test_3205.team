import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { IJobStorage } from '../storage/storage.interface';
import { Job, JobStatus, UrlResult } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UrlCheckProcessor } from './processors/url-check.processor';
import { randomUUID } from 'crypto';
import { JobsGateway } from './jobs.gateway';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @Inject('IJobStorage') private readonly storage: IJobStorage,
    private readonly urlCheckProcessor: UrlCheckProcessor,
    private readonly jobsGateway: JobsGateway,
  ) {}

  async createJob(createJobDto: CreateJobDto): Promise<{ jobId: string }> {
    const { urls } = createJobDto;
    const uniqueUrls = [...new Set(urls)];

    const job: Job = {
      id: randomUUID(),
      urls: uniqueUrls,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      totalUrls: uniqueUrls.length,
      processedUrls: 0,
      successUrls: 0,
      errorUrls: 0,
    };

    await this.storage.createJob(job);
    this.logger.log(`Job created: ${job.id}, URLs: ${uniqueUrls.length}`);

    // Уведомление через WebSocket
    this.jobsGateway.broadcastJobUpdate(job);

    this.processJob(job.id).catch((error) => {
      this.logger.error(`Error processing job ${job.id}:`, error);
    });

    return { jobId: job.id };
  }

  async getAllJobs(): Promise<Job[]> {
    return this.storage.getAllJobs();
  }

  async getJobDetails(id: string): Promise<Job & { urlResults: UrlResult[] }> {
    const job = await this.storage.getJob(id);
    if (!job) throw new NotFoundException(`Job with ID ${id} not found`);

    const urlResults = await this.storage.getUrlResults(id);
    return { ...job, urlResults };
  }

  async cancelJob(id: string): Promise<void> {
    const job = await this.storage.getJob(id);
    if (!job) throw new NotFoundException(`Job with ID ${id} not found`);

    if (['completed', 'cancelled', 'failed'].includes(job.status))
      throw new BadRequestException(`Job already ${job.status}`);

    await this.storage.updateJob(id, {
      status: 'cancelled',
      updatedAt: new Date(),
      finishedAt: new Date(),
    });

    const urlResults = await this.storage.getUrlResults(id);
    for (const result of urlResults) {
      if (result.status === 'pending' || result.status === 'in_progress') {
        const updatedResult: UrlResult = {
          ...result,
          status: 'cancelled',
          finishedAt: new Date(),
          errorMessage: 'Задача отменена пользователем',
        };
        await this.storage.updateUrlResult(id, updatedResult);
        this.jobsGateway.sendJobUpdate(id, { urlResults: [updatedResult] });
      }
    }

    const updatedJob = await this.storage.getJob(id);
    if (updatedJob) {
      this.jobsGateway.broadcastJobUpdate(updatedJob);
    }

    this.logger.log(`Job cancelled: ${id}`);
  }

  private async processJob(jobId: string): Promise<void> {
    try {
      await this.storage.updateJob(jobId, {
        status: 'in_progress',
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      const job = await this.storage.getJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      // Уведомление об изменении статуса
      const updatedJob = await this.storage.getJob(jobId);
      if (updatedJob) this.jobsGateway.broadcastJobUpdate(updatedJob);

      if (job.status === 'cancelled') return;

      for (const url of job.urls) {
        await this.storage.updateUrlResult(jobId, {
          url,
          status: 'pending',
        });
      }

      await this.urlCheckProcessor.processUrls(
        jobId,
        job.urls,
      );

      const finalJob = await this.storage.getJob(jobId);
      if (finalJob && finalJob.status !== 'cancelled') {
        const allResults = await this.storage.getUrlResults(jobId);
        const allProcessed = allResults.every((r) =>
          ['success', 'error', 'cancelled'].includes(r.status),
        );

        const status: JobStatus = allProcessed ? 'completed' : 'failed';
        await this.storage.updateJob(jobId, {
          status,
          finishedAt: new Date(),
          updatedAt: new Date(),
          processedUrls: allResults.length,
          successUrls: allResults.filter((r) => r.status === 'success').length,
          errorUrls: allResults.filter((r) => r.status === 'error').length,
        });

        const completedJob = await this.storage.getJob(jobId);
        if (completedJob) {
          this.jobsGateway.broadcastJobUpdate(completedJob);
        }

        this.logger.log(`Job ${jobId} completed with status: ${status}`);
      }
    } catch (error) {
      this.logger.error(`Error processing job ${jobId}:`, error);
      await this.storage.updateJob(jobId, {
        status: 'failed',
        finishedAt: new Date(),
        updatedAt: new Date(),
      });

      const failedJob = await this.storage.getJob(jobId);
      if (failedJob) {
        this.jobsGateway.broadcastJobUpdate(failedJob);
      }
    }
  }
}
