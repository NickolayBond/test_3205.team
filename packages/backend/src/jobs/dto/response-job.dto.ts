import { Job, JobStatus, UrlResult } from '../entities/job.entity';

export class JobResponseDto {
  id!: string;
  urls?: string[];
  status!: JobStatus;
  createdAt!: Date;
  updatedAt!: Date;
  startedAt?: Date;
  finishedAt?: Date;
  totalUrls!: number;
  processedUrls!: number;
  successUrls!: number;
  errorUrls!: number;
  urlResults?: UrlResult[];
  progress?: string; 

  static fromJob(job: Job, urlResults?: UrlResult[]): JobResponseDto {
    const processed = job.processedUrls || 0;
    const total = job.totalUrls || job.urls?.length || 0;

    return {
      id: job.id,
      urls: job.urls,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      totalUrls: total,
      processedUrls: processed,
      successUrls: job.successUrls || 0,
      errorUrls: job.errorUrls || 0,
      urlResults: urlResults || [],
      progress: `${processed} из ${total}`,
    };
  }
}
