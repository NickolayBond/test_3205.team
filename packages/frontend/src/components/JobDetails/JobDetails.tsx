import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  cancelJob,
  setActiveJob,
  fetchJobDetails,
} from "../../store/jobsSlice";
import UrlResultItem from "./UrlResultItem";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import "./JobDetails.scss";
import { FaCheck } from "react-icons/fa";
import { FaXmark } from "react-icons/fa6";
interface JobDetailsProps {
  jobId: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  in_progress: "В процессе",
  completed: "Завершено",
  cancelled: "Отменено",
  failed: "Ошибка",
};

const JobDetails: React.FC<JobDetailsProps> = ({ jobId }) => {
  const dispatch = useAppDispatch();
  const { activeJobDetails, loading } = useAppSelector((state) => state.jobs);

  useEffect(() => {
    if (jobId) {
      dispatch(setActiveJob(jobId));
      dispatch(fetchJobDetails(jobId));
    }
    return () => {
      dispatch(setActiveJob(null));
    };
  }, [jobId, dispatch]);

  const handleCancel = async () => {
    if (window.confirm("Вы уверены, что хотите отменить это задание?")) {
      await dispatch(cancelJob(jobId));
    }
  };

  const formatDate = (date: string) =>
    format(new Date(date), "dd MMM yyyy, HH:mm", { locale: ru });

  if (loading.details && !activeJobDetails) {
    return (
      <div className="job-details card">
        <div className="loading-state">
          <div className="spinner" />
          <p>Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (!activeJobDetails) {
    return (
      <div className="job-details card">
        <div className="empty-state">
          <p>Задание не найдено</p>
        </div>
      </div>
    );
  }

  const job = activeJobDetails;
  const isCompleted = ["completed", "cancelled", "failed"].includes(job.status);
  const progress = job.processedUrls || 0;
  const total = job.totalUrls || 0;
  const progressPercent = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="job-details card">
      <div className="job-details-header">
        <div className="job-details-title">
          <h2>Детали задания</h2>
          <span className={`badge badge-${job.status}`}>
            {STATUS_LABELS[job.status]}
          </span>
        </div>
        {!isCompleted && (
          <button className="btn btn-danger" onClick={handleCancel}>
            Отменить
          </button>
        )}
      </div>

      <div className="job-details-meta">
        <div className="meta-item">
          <span className="meta-label">ID задания</span>
          <span className="meta-value mono">{job.id}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Создано</span>
          <span className="meta-value">{formatDate(job.createdAt)}</span>
        </div>
        {job.startedAt && (
          <div className="meta-item">
            <span className="meta-label">Начато</span>
            <span className="meta-value">{formatDate(job.startedAt)}</span>
          </div>
        )}
        {job.finishedAt && (
          <div className="meta-item">
            <span className="meta-label">Завершено</span>
            <span className="meta-value">{formatDate(job.finishedAt)}</span>
          </div>
        )}
      </div>

      <div className="job-details-progress">
        <div className="progress-stats">
          <span className="progress-text">
            {progress} из {total} обработано
          </span>
          <span className="progress-percent">{progressPercent}%</span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${job.status === "in_progress" ? "animated" : ""}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="progress-details">
          <span className="stat success">
            <FaCheck size={10} /> Успешно: {job.successUrls}
          </span>
          <span className="stat error">
            <FaXmark size={14} /> Ошибок: {job.errorUrls}
          </span>
          {job.status === "in_progress" && (
            <span className="stat status-label">Выполняется...</span>
          )}
        </div>
      </div>

      <div className="job-details-results">
        <h3>Результаты проверки URL</h3>
        <div className="results-list">
          {job.urlResults && job.urlResults.length > 0 ? (
            job.urlResults.map((result, index) => (
              <UrlResultItem key={`${result.url}-${index}`} result={result} />
            ))
          ) : (
            <div className="no-results">Ожидание результатов...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
