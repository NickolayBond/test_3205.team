export type JobStatus =
  'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';

export interface UrlResult {
  url: string;
  status: 'pending' | 'in_progress' | 'success' | 'error' | 'cancelled';
  httpStatus?: number;
  errorMessage?: string;
  startedAt?: Date;
  finishedAt?: Date;
  duration?: number; // в миллисекундах
}

export interface Job {
  id: string;
  urls: string[];
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;

  // Статистика
  totalUrls: number;
  processedUrls: number;
  successUrls: number;
  errorUrls: number;

  urlResults?: UrlResult[];
}
