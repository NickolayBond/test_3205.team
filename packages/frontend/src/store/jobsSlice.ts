import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { jobsApi } from "../api/jobs";
import type { Job, JobDetail } from "../types/job.types";
import { socketService } from "../api/socket";

interface JobsState {
  jobs: Job[];
  activeJobId: string | null;
  activeJobDetails: JobDetail | null;
  loading: {
    jobs: boolean;
    details: boolean;
    create: boolean;
    cancel: boolean;
  };
  error: string | null;
  socketConnected: boolean;
  activeCallbackId: string | null;
}

const initialState: JobsState = {
  jobs: [],
  activeJobId: null,
  activeJobDetails: null,
  loading: {
    jobs: false,
    details: false,
    create: false,
    cancel: false,
  },
  error: null,
  socketConnected: false,
  activeCallbackId: null,
};

export const fetchJobs = createAsyncThunk(
  "jobs/fetchJobs",
  async (_, { rejectWithValue }) => {
    try {
      return await jobsApi.getAllJobs();
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch jobs",
      );
    }
  },
);

export const createJob = createAsyncThunk(
  "jobs/createJob",
  async (urls: string[], { rejectWithValue }) => {
    try {
      const response = await jobsApi.createJob({ urls });
      socketService.connect();
      return response.jobId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create job",
      );
    }
  },
);

export const cancelJob = createAsyncThunk(
  "jobs/cancelJob",
  async (jobId: string, { rejectWithValue }) => {
    try {
      await jobsApi.cancelJob(jobId);
      return jobId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to cancel job",
      );
    }
  },
);

export const fetchJobDetails = createAsyncThunk(
  "jobs/fetchJobDetails",
  async (jobId: string, { rejectWithValue }) => {
    try {
      return await jobsApi.getJobDetails(jobId);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch job details",
      );
    }
  },
);

const jobsSlice = createSlice({
  name: "jobs",
  initialState,
  reducers: {
    setActiveJob: (state, action: PayloadAction<string | null>) => {
      if (state.activeJobId && state.activeCallbackId) {
        socketService.unsubscribeFromJob(
          state.activeJobId,
          state.activeCallbackId,
        );
        state.activeCallbackId = null;
      }

      // Сброс старых деталей
      state.activeJobDetails = null;
      state.activeJobId = action.payload;

      // Подписаться на новый job
      if (action.payload) {
        socketService.connect();

        const callbackId = socketService.subscribeToJob(
          action.payload,
          (data) => {
            console.log("🔔 WebSocket update for job:", data.jobId);
          },
        );

        state.activeCallbackId = callbackId;

        // Загрузка деталей через API
        // dispatch используется извне
      }
    },

    clearError: (state) => {
      state.error = null;
    },

    setSocketConnected: (state, action: PayloadAction<boolean>) => {
      state.socketConnected = action.payload;
    },

    applyJobUpdate: (
      state,
      action: PayloadAction<{ id: string; changes: any }>,
    ) => {
      const { id, changes } = action.payload;

      const index = state.jobs.findIndex((j) => j.id === id);
      if (index !== -1) {
        state.jobs[index] = {
          ...state.jobs[index],
          ...changes,
        };
      }

      // Обновление активной задачи
      if (state.activeJobId === id && state.activeJobDetails) {
        if (changes.urlResults) {
          state.activeJobDetails = {
            ...state.activeJobDetails,
            ...changes,
            urlResults: changes.urlResults || state.activeJobDetails.urlResults,
          };
        } else {
          state.activeJobDetails = {
            ...state.activeJobDetails,
            ...changes,
          };
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchJobs
      .addCase(fetchJobs.pending, (state) => {
        state.loading.jobs = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.loading.jobs = false;
        state.jobs = action.payload;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading.jobs = false;
        state.error = action.payload as string;
      })

      // createJob
      .addCase(createJob.pending, (state) => {
        state.loading.create = true;
        state.error = null;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.loading.create = false;
        state.activeJobId = action.payload;
        socketService.connect();
      })
      .addCase(createJob.rejected, (state, action) => {
        state.loading.create = false;
        state.error = action.payload as string;
      })

      // fetchJobDetails
      .addCase(fetchJobDetails.pending, (state) => {
        state.loading.details = true;
        state.error = null;
      })
      .addCase(fetchJobDetails.fulfilled, (state, action) => {
        state.loading.details = false;
        state.activeJobDetails = action.payload;

        const index = state.jobs.findIndex((j) => j.id === action.payload.id);
        if (index !== -1) {
          state.jobs[index] = {
            ...state.jobs[index],
            ...action.payload,
          };
        }
      })
      .addCase(fetchJobDetails.rejected, (state, action) => {
        state.loading.details = false;
        state.error = action.payload as string;
        state.activeJobDetails = null;
      })

      // cancelJob
      .addCase(cancelJob.pending, (state) => {
        state.loading.cancel = true;
        state.error = null;
      })
      .addCase(cancelJob.fulfilled, (state, action) => {
        state.loading.cancel = false;

        const index = state.jobs.findIndex((j) => j.id === action.payload);
        if (index !== -1) {
          state.jobs[index].status = "cancelled";
        }

        if (state.activeJobId === action.payload && state.activeJobDetails) {
          state.activeJobDetails.status = "cancelled";
        }
      })
      .addCase(cancelJob.rejected, (state, action) => {
        state.loading.cancel = false;
        state.error = action.payload as string;
      });
  },
});

export const { setActiveJob, clearError, setSocketConnected, applyJobUpdate } =
  jobsSlice.actions;

export default jobsSlice.reducer;
