import { FaPauseCircle } from "react-icons/fa";
import { FaClock } from "react-icons/fa";
import { FaCheckCircle } from "react-icons/fa";
import { FaRegTimesCircle } from "react-icons/fa";
import { FaTrash } from "react-icons/fa";
import React, { type ReactElement } from "react";
import type { UrlResult } from "../../types/job.types";
import type { IconType } from "react-icons";
import "./UrlResultItem.scss";

interface UrlResultItemProps {
  result: UrlResult;
}

const STATUS_CONFIG: Record<
  string,
  { icon: ReactElement<any, IconType>; label: string }
> = {
  pending: { icon: <FaPauseCircle />, label: "Ожидает" },
  in_progress: { icon: <FaClock />, label: "Проверяется..." },
  success: { icon: <FaCheckCircle />, label: "Успешно" },
  error: { icon: <FaRegTimesCircle />, label: "Ошибка" },
  cancelled: { icon: <FaTrash />, label: "Отменено" },
};

const formatDuration = (ms?: number) => {
  if (!ms) return "-";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
};

const UrlResultItem: React.FC<UrlResultItemProps> = ({ result }) => {
  const config = STATUS_CONFIG[result.status] || STATUS_CONFIG.pending;

  return (
    <div className="url-result-item">
      <div className="url-result-icon">{config.icon}</div>

      <div className="url-result-content">
        <div className="url-result-url">{result.url}</div>

        <div className="url-result-meta">
          <span className={`url-status url-status-${result.status}`}>
            {config.label}
          </span>

          {result.httpStatus && (
            <span className="url-http-status">HTTP {result.httpStatus}</span>
          )}

          {result.duration && (
            <span className="url-duration">
              {formatDuration(result.duration)}
            </span>
          )}
        </div>

        {result.errorMessage && (
          <div className="url-error">{result.errorMessage}</div>
        )}
      </div>
    </div>
  );
};

export default UrlResultItem;
