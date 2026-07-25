import { forwardRef, Injectable, Logger, Inject } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import type { IJobStorage } from '../../storage/storage.interface';
import { UrlResult } from '../entities/job.entity';
import { JobsGateway } from '../jobs.gateway';
import { randomDelay } from '../../common/utils/delay';
import { Semaphore } from '../../common/utils/semaphore';
import { parseAxiosError } from '../../common/helpers/parse-axios-errors.';
import { calculateJobStatistics } from '../utils/job-statistics.util';
import { broadcastCurrentJob } from '../utils/job-broadcast.helper';

const HTTP_REQUEST_TIMEOUT_MS = 10_000;
const HTTP_MAX_REDIRECTS = 5;
const CANCEL_MESSAGE = 'Задача отменена пользователем';

@Injectable()
export class UrlCheckProcessor {
  private readonly logger = new Logger(UrlCheckProcessor.name);
  private readonly maxConcurrent: number;

  constructor(
    @Inject('IJobStorage') private readonly storage: IJobStorage,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => JobsGateway))
    private readonly gateway: JobsGateway,
  ) {
    this.maxConcurrent = this.configService.get('rateLimit.maxConcurrent') || 5;
  }

  async processUrls(jobId: string, urls: string[]): Promise<void> {
    this.logger.log(`Processing ${urls.length} URLs for job ${jobId}`);

    const semaphore = new Semaphore(this.maxConcurrent);

    const promises = urls.map((url) =>
      semaphore.acquire().then(async () => {
        try {
          await this.processSingleUrl(jobId, url);
        } finally {
          semaphore.release();
        }
      }),
    );

    await Promise.allSettled(promises);
    this.logger.log(`Finished processing URLs for job ${jobId}`);
  }

  private async processSingleUrl(jobId: string, url: string): Promise<void> {
    const startTime = Date.now();
    let result: UrlResult = {
      url,
      status: 'in_progress',
      startedAt: new Date(),
    };

    try {
      await this.storage.updateUrlResult(jobId, result);
      await broadcastCurrentJob(this.storage, this.gateway, jobId);

      if (await this.isJobCancelled(jobId)) {
        return this.finalizeUrl(
          jobId,
          this.markCancelled(result, 'Job was cancelled'),
        );
      }

      await randomDelay(0, 10);

      if (await this.isJobCancelled(jobId)) {
        return this.finalizeUrl(
          jobId,
          this.markCancelled(result, CANCEL_MESSAGE),
        );
      }

      const response = await axios.head(url, {
        timeout: HTTP_REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
        maxRedirects: HTTP_MAX_REDIRECTS,
      });

      const isSuccess = response.status >= 200 && response.status < 400;
      result = {
        ...result,
        status: isSuccess ? 'success' : 'error',
        httpStatus: response.status,
        errorMessage: isSuccess ? undefined : `HTTP ${response.status}`,
        finishedAt: new Date(),
        duration: Date.now() - startTime,
      };

      this.logger.debug(`URL processed: ${url}, status: ${result.status}`);
    } catch (error) {
      const { httpStatus, errorMessage } = parseAxiosError(error);
      result = {
        ...result,
        status: 'error',
        httpStatus,
        errorMessage,
        finishedAt: new Date(),
        duration: Date.now() - startTime,
      };
      this.logger.error(`URL failed: ${url}, error: ${errorMessage}`);
    }

    await this.finalizeUrl(jobId, result);
  }

  private async isJobCancelled(jobId: string): Promise<boolean> {
    const job = await this.storage.getJob(jobId);
    return job?.status === 'cancelled';
  }

  private markCancelled(result: UrlResult, message: string): UrlResult {
    return {
      ...result,
      status: 'cancelled',
      errorMessage: message,
      finishedAt: new Date(),
    };
  }

  private async finalizeUrl(jobId: string, result: UrlResult): Promise<void> {
    await this.storage.updateUrlResult(jobId, result);
    this.gateway.sendJobUpdate(jobId, { urlResults: [result] });
    await this.updateJobStatistics(jobId);
  }

  private async updateJobStatistics(jobId: string): Promise<void> {
    const job = await this.storage.getJob(jobId);
    if (!job || job.status === 'cancelled') return;

    const allResults = await this.storage.getUrlResults(jobId);
    const stats = calculateJobStatistics(allResults);

    await this.storage.updateJob(jobId, {
      ...stats,
      updatedAt: new Date(),
    });

    await broadcastCurrentJob(this.storage, this.gateway, jobId);
  }
}
