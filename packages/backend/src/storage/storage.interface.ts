import { Job, UrlResult } from "../jobs/entities/job.entity";

export interface IJobStorage {
  createJob(job: Job): Promise<Job>;
  getJob(id: string): Promise<Job | null>;
  getAllJobs(): Promise<Job[]>;
  updateJob(id: string, job: Partial<Job>): Promise<Job | null>;
  deleteJob(id: string): Promise<boolean>;
  
  updateUrlResult(jobId: string, urlResult: UrlResult): Promise<void>;
  getUrlResults(jobId: string): Promise<UrlResult[]>;
}