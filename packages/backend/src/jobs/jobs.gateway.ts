import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger, Injectable, forwardRef, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JobsService } from './jobs.service';
import { Job } from './entities/job.entity';
import { getMessageError } from '../common/utils/message-error';

@Injectable()
@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: 'jobs',
})
export class JobsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(JobsGateway.name);
  private readonly clientRooms = new Map<string, Set<string>>();

  constructor(
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService: JobsService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.clientRooms.set(client.id, new Set());
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clientRooms.delete(client.id);
  }

  @SubscribeMessage('subscribe-job')
  async handleSubscribeJob(client: Socket, payload: { jobId: string }) {
    const { jobId } = payload;
    this.logger.log(`Client ${client.id} subscribed to job: ${jobId}`);

    client.join(this.roomName(jobId));

    const subscriptions = this.clientRooms.get(client.id) ?? new Set();
    subscriptions.add(jobId);
    this.clientRooms.set(client.id, subscriptions);

    try {
      const job = await this.jobsService.getJobDetails(jobId);
      client.emit('job-update', { jobId, data: job });
    } catch (error) {
      const messageError = getMessageError(error);
      this.logger.error(`Error sending initial job data: ${messageError}`);
      client.emit('job-error', { jobId, error: messageError });
    }
  }

  @SubscribeMessage('unsubscribe-job')
  handleUnsubscribeJob(client: Socket, payload: { jobId: string }) {
    const { jobId } = payload;
    this.logger.log(`Client ${client.id} unsubscribed from job: ${jobId}`);

    client.leave(this.roomName(jobId));
    this.clientRooms.get(client.id)?.delete(jobId);
  }

  @SubscribeMessage('get-job-status')
  async handleGetJobStatus(client: Socket, payload: { jobId: string }) {
    const { jobId } = payload;
    try {
      const job = await this.jobsService.getJobDetails(jobId);
      client.emit('job-status', { jobId, data: job });
    } catch (error) {
      client.emit('job-error', { jobId, error: getMessageError(error) });
    }
  }

  sendJobUpdate(jobId: string, data: unknown) {
    this.emitToJob(jobId, 'job-update', { jobId, data }, 'job update');
  }

  broadcastJobUpdate(job: Job) {
    this.emitToJob(
      job.id,
      'job-update',
      { jobId: job.id, data: job },
      'broadcast',
    );
  }

  sendJobError(jobId: string, error: string) {
    this.emitToJob(jobId, 'job-error', { jobId, error }, 'error');
  }

  async sendJobsList(client: Socket) {
    try {
      const jobs = await this.jobsService.getAllJobs();
      client.emit('jobs-list', jobs);
    } catch (error) {
      client.emit('error', { message: getMessageError(error) });
    }
  }

  private roomName(jobId: string): string {
    return `job-${jobId}`;
  }

  /**
   * Централизованная отправка события в комнату задания
   * с проверкой инициализации сервера.
   */
  private emitToJob(
    jobId: string,
    event: string,
    payload: unknown,
    context: string,
  ): void {
    if (!this.server) {
      this.logger.warn(`Server not initialized, skipping ${context}`);
      return;
    }
    this.logger.debug(`Emitting "${event}" for ${jobId}`);
    this.server.to(this.roomName(jobId)).emit(event, payload);
  }
}
