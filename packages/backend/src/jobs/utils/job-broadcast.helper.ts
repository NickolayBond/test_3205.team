import type { IJobStorage } from '../../storage/storage.interface';
import { JobsGateway } from '../jobs.gateway';
import { Job } from '../entities/job.entity';

/**
 * Получает актуальное состояние задания из хранилища
 * и рассылает broadcast-обновление подписчикам.
 * Возвращает актуальный Job (или null, если не найден).
 */
export async function broadcastCurrentJob(
  storage: IJobStorage,
  gateway: JobsGateway,
  jobId: string,
): Promise<Job | null> {
  const job = await storage.getJob(jobId);
  if (job) gateway.broadcastJobUpdate(job);
  return job;
}
