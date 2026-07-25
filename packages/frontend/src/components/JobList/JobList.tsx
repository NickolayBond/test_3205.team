import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchJobs, setActiveJob } from "../../store/jobsSlice";
import { socketService } from "../../api/socket";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import "./JobList.scss";
import { FaCheck, FaLink } from "react-icons/fa";
import { FaXmark } from "react-icons/fa6";

interface JobListProps {
  activeJobId: string | null;
  onSelectJob: (jobId: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  in_progress: "В процессе",
  completed: "Завершено",
  cancelled: "Отменено",
  failed: "Ошибка",
};

const JobList: React.FC<JobListProps> = ({ activeJobId, onSelectJob }) => {
  const dispatch = useAppDispatch();
  const { jobs, loading, socketConnected } = useAppSelector(
    (state) => state.jobs,
  );

  useEffect(() => {
    socketService.connect();
    dispatch(fetchJobs());
  }, [dispatch]);

  const handleSelectJob = (jobId: string) => {
    onSelectJob(jobId);
    dispatch(setActiveJob(jobId));
  };

  if (loading.jobs && jobs.length === 0) {
    return (
      <div className="job-list card">
        <div className="job-list-header">
          <h2>Задания</h2>
        </div>
        <div className="loading-skeleton">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-item" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="job-list card">
      <div className="job-list-header">
        <h2>Задания</h2>
        <div className="job-list-actions">
          <span className="job-count">{jobs.length}</span>
          <span
            className={`connection-status ${socketConnected ? "online" : "offline"}`}
            title={socketConnected ? "WebSocket подключен" : "Нет соединения"}
          >
            ●
          </span>
        </div>
      </div>

      <div className="job-list-items">
        {jobs.length === 0 ? (
          <div className="empty-jobs">
            <p>Нет заданий</p>
            <span>Создайте первое задание выше</span>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className={`job-item ${activeJobId === job.id ? "active" : ""}`}
              onClick={() => handleSelectJob(job.id)}
            >
              <div className="job-item-header">
                <span className="job-id">#{job.id.slice(0, 8)}</span>
                <span className={`badge badge-${job.status}`}>
                  {STATUS_LABELS[job.status] || job.status}
                </span>
              </div>

              <div className="job-item-info">
                <span className="job-urls">
                  <FaLink /> {job.totalUrls} URL
                </span>
                <span className="job-stats">
                  <span className="stat stat-ok">
                    <FaCheck size={10} /> {job.successUrls}
                  </span>
                  <span className="stat stat-err">
                    <FaXmark size={14} /> {job.errorUrls}
                  </span>
                </span>
              </div>

              <div className="job-item-footer">
                <span className="job-time">
                  {formatDistanceToNow(new Date(job.createdAt), {
                    addSuffix: true,
                    locale: ru,
                  })}
                </span>
                {job.progress && job.status === "in_progress" && (
                  <span className="job-progress">{job.progress}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JobList;
