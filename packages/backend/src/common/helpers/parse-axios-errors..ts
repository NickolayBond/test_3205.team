import axios from 'axios';
import { getMessageError } from '../utils/message-error';

interface ServerErrorData {
  message?: string;
}

/**
 * Парсинг ошибок Axios для получения HTTP статуса и сообщения
 */
export function parseAxiosError(error: unknown): {
  httpStatus?: number;
  errorMessage: string;
} {
  let httpStatus: number | undefined;
  let errorMessage = getMessageError(error);

  if (axios.isAxiosError<ServerErrorData>(error)) {
    httpStatus = error.response?.status;

    // Приоритет сообщений об ошибке
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'DNS resolution failed';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused';
    }
  }

  return { httpStatus, errorMessage };
}
