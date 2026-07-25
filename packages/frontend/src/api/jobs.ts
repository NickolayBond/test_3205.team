import type { CreateJobRequest, CreateJobResponse, Job, JobDetail } from '../types/job.types';
import { apiClient } from './client';

export const jobsApi = {
  createJob: async (data: CreateJobRequest): Promise<CreateJobResponse> => {
    const response = await apiClient.post<CreateJobResponse>('/jobs', data);
    return response.data;
  },

  getAllJobs: async (): Promise<Job[]> => {
    const response = await apiClient.get<Job[]>('/jobs');
    return response.data;
  },

  getJobDetails: async (id: string): Promise<JobDetail> => {
    const response = await apiClient.get<JobDetail>(`/jobs/${id}`);
    return response.data;
  },

  cancelJob: async (id: string): Promise<void> => {
    await apiClient.delete(`/jobs/${id}`);
  },
};