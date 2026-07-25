import { Injectable, Logger } from '@nestjs/common';
import { IJobStorage } from './storage.interface';
import { Job, UrlResult } from '../jobs/entities/job.entity';

@Injectable()
export class MemoryStorageService implements IJobStorage {
  private readonly logger = new Logger(MemoryStorageService.name);
  private readonly jobs = new Map<string, Job>();
  private readonly urlResults = new Map<string, UrlResult[]>();

  async createJob(job: Job): Promise<Job> {
    this.jobs.set(job.id, job);
    this.urlResults.set(job.id, []);
    this.logger.debug(`Job created: ${job.id}`);
    return job;
  }

  async getJob(id: string): Promise<Job | null> {
    return this.jobs.get(id) || null;
  }

  async getAllJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | null> {
    const job = this.jobs.get(id);
    if (!job) return null;

    const updated = { ...job, ...updates };
    this.jobs.set(id, updated);
    this.logger.debug(`Job updated: ${id}, status: ${updated.status}`);
    return updated;
  }

  async deleteJob(id: string): Promise<boolean> {
    const deleted = this.jobs.delete(id);
    if (deleted) {
      this.urlResults.delete(id);
      this.logger.debug(`Job deleted: ${id}`);
    }
    return deleted;
  }

  async updateUrlResult(jobId: string, urlResult: UrlResult): Promise<void> {
    const results = this.urlResults.get(jobId) || [];
    const index = results.findIndex((r) => r.url === urlResult.url);

    if (index >= 0) results[index] = urlResult;
    else results.push(urlResult);

    this.urlResults.set(jobId, results);
  }

  async getUrlResults(jobId: string): Promise<UrlResult[]> {
    return this.urlResults.get(jobId) || [];
  }
}
