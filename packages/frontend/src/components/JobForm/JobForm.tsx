import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { createJob, fetchJobs } from "../../store/jobsSlice";
import "./JobForm.scss";

interface JobFormProps {
  onJobCreated: (jobId: string) => void;
}

const JobForm: React.FC<JobFormProps> = ({ onJobCreated }) => {
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.jobs);
  const [urls, setUrls] = useState("https://3205.team/");
  const [error, setError] = useState("");

  const urlCount = urls.split("\n").filter((u) => u.trim()).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const urlList = urls
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean);

    if (urlList.length === 0) {
      setError("Пожалуйста, введите хотя бы один URL");
      return;
    }

    const invalidUrls = urlList.filter((url) => {
      try {
        new URL(url);
        return false;
      } catch {
        return true;
      }
    });

    if (invalidUrls.length > 0) {
      setError(`Некорректные URL: ${invalidUrls.join(", ")}`);
      return;
    }

    try {
      const jobId = await dispatch(createJob(urlList)).unwrap();
      onJobCreated(jobId);
      setUrls("");
      await dispatch(fetchJobs());
    } catch (err: any) {
      setError(err.message || "Ошибка при создании задания");
    }
  };

  return (
    <div className="job-form card">
      <div className="job-form-title">
        <span className="job-form-icon"></span>
        <h2>Создать задание</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="urls">
            URL адреса
            <span className="url-counter">{urlCount} шт.</span>
          </label>
          <textarea
            id="urls"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="https://example.com&#10;https://google.com&#10;https://github.com"
            rows={6}
            disabled={loading.create}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading.create || !urls.trim()}
        >
          {loading.create ? "Создание..." : "Запустить проверку"}
        </button>

        <div className="form-hint">Поддерживается до 100 URL за раз</div>
      </form>
    </div>
  );
};

export default JobForm;
