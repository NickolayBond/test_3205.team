import { UrlResult } from '../entities/job.entity';
import { PROCESSED_URL_STATUSES } from '../constants/job-status.constants';

export interface JobStatistics {
  processedUrls: number;
  successUrls: number;
  errorUrls: number;
}

/**
 * Подсчёт статистики задания на основе результатов URL.
 */
export function calculateJobStatistics(results: UrlResult[]): JobStatistics {
  let processedUrls = 0;
  let successUrls = 0;
  let errorUrls = 0;

  for (const result of results) {
    if (PROCESSED_URL_STATUSES.includes(result.status)) processedUrls++;
    if (result.status === 'success') successUrls++;
    if (result.status === 'error') errorUrls++;
  }

  return { processedUrls, successUrls, errorUrls };
}

/**
 * Все ли URL обработаны (для определения completed/failed).
 */
export function areAllUrlsProcessed(results: UrlResult[]): boolean {
  return results.every((r) => PROCESSED_URL_STATUSES.includes(r.status));
}
