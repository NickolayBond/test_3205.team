import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { Job, UrlResult } from './entities/job.entity';
import { JobsService } from './jobs.service';
import { JobResponseDto } from './dto/response-job.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createJob(
    @Body() createJobDto: CreateJobDto,
  ): Promise<{ jobId: string }> {
    return this.jobsService.createJob(createJobDto);
  }

  @Get()
  async getAllJobs(): Promise<JobResponseDto[]> {
    const jobs = await this.jobsService.getAllJobs();
    return jobs.map((job) => JobResponseDto.fromJob(job));
  }

  @Get(':id')
  async getJobDetails(@Param('id') id: string): Promise<JobResponseDto> {
    const { job, urlResults } = await this.getJobWithResults(id);
    return JobResponseDto.fromJob(job, urlResults);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelJob(@Param('id') id: string): Promise<void> {
    await this.jobsService.cancelJob(id);
  }

  private async getJobWithResults(
    id: string,
  ): Promise<{ job: Job; urlResults: UrlResult[] }> {
    const job = await this.jobsService.getJobDetails(id);
    return {
      job,
      urlResults: job.urlResults || [],
    };
  }
}
