import { JobStatus, UrlResult } from '../entities/job.entity';

/** Статусы, в которых задание считается завершённым (нельзя отменить/обрабатывать). */
export const TERMINAL_JOB_STATUSES: readonly JobStatus[] = [
  'completed',
  'cancelled',
  'failed',
];

/** Статусы URL, считающиеся обработанными. */
export const PROCESSED_URL_STATUSES: readonly UrlResult['status'][] = [
  'success',
  'error',
  'cancelled',
];

/** Статусы URL, которые ещё можно отменить. */
export const CANCELLABLE_URL_STATUSES: readonly UrlResult['status'][] = [
  'pending',
  'in_progress',
];

export const isTerminalJobStatus = (status: JobStatus): boolean =>
  TERMINAL_JOB_STATUSES.includes(status);

export const isProcessedUrlStatus = (status: UrlResult['status']): boolean =>
  PROCESSED_URL_STATUSES.includes(status);
