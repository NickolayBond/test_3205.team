import { io, Socket } from "socket.io-client";
import { applyJobUpdate, setSocketConnected } from "../store/jobsSlice";
import { store } from "../store/store";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

class SocketService {
  private socket: Socket | null = null;
  private subscriptions = new Map<string, (data: any) => void>();
  private jobSubscriptions = new Map<string, Set<string>>();
  private activeJobIds = new Set<string>();

  connect() {
    if (this.socket) return;

    this.socket = io(`${SOCKET_URL}/jobs`, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    this.socket.on("connect", () => {
      console.log("Connected to socket server");
      store.dispatch(setSocketConnected(true));

      this.activeJobIds.forEach((jobId) => {
        this.socket?.emit("subscribe-job", { jobId });
      });
    });

    this.socket.on("disconnect", () => {
      store.dispatch(setSocketConnected(false));
    });

    this.socket.on("job-update", (data) => {
      const { jobId, data: jobData } = data;
      console.log("job-update:", data);

      store.dispatch(applyJobUpdate({ id: jobId, changes: jobData }));

      const callbacks = this.jobSubscriptions.get(jobId);
      if (callbacks) {
        callbacks.forEach((callbackId) => {
          const callback = this.subscriptions.get(callbackId);
          if (callback) callback(data);
        });
      }
    });
  }
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.subscriptions.clear();
    this.jobSubscriptions.clear();
  }

  subscribeToJob(jobId: string, callback: (data: any) => void): string {
    const callbackId = `cb-${Date.now()}-${Math.random()}`;
    this.subscriptions.set(callbackId, callback);

    if (!this.jobSubscriptions.has(jobId))
      this.jobSubscriptions.set(jobId, new Set());

    this.jobSubscriptions.get(jobId)?.add(callbackId);
    this.activeJobIds.add(jobId);

    if (!this.socket) {
      this.connect();
    }

    if (this.socket?.connected) this.socket.emit("subscribe-job", { jobId });

    return callbackId;
  }

  unsubscribeFromJob(jobId: string, callbackId: string) {
    const callbacks = this.jobSubscriptions.get(jobId);
    if (callbacks) {
      callbacks.delete(callbackId);
      if (callbacks.size === 0) {
        this.jobSubscriptions.delete(jobId);
        this.activeJobIds.delete(jobId);
        if (this.socket?.connected) {
          this.socket.emit("unsubscribe-job", { jobId });
        }
      }
    }
    this.subscriptions.delete(callbackId);
  }

  unsubscribeAllFromJob(jobId: string) {
    const callbacks = this.jobSubscriptions.get(jobId);
    if (callbacks) {
      callbacks.forEach((callbackId) => {
        this.subscriptions.delete(callbackId);
      });
      this.jobSubscriptions.delete(jobId);
      if (this.socket?.connected)
        this.socket.emit("unsubscribe-job", { jobId });
    }
  }

  getJobStatus(jobId: string) {
    if (this.socket?.connected) {
      this.socket.emit("get-job-status", { jobId });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
