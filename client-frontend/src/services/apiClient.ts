import axios, { AxiosError } from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
});

export interface ApiErrorPayload {
  message?: string;
  error?: string;
  statusCode?: number;
  [key: string]: unknown;
}

export class ApiError extends Error {
  public readonly status?: number;
  public readonly payload?: ApiErrorPayload;

  constructor(message: string, status?: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response) {
      const { data, status } = error.response;
      const message = data?.message || data?.error || error.message;
      throw new ApiError(message, status, data);
    }

    if (error.request) {
      throw new ApiError('Network error, request not received');
    }

    throw new ApiError(error.message);
  },
);

