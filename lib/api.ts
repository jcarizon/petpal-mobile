import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Config } from '../constants/config';
import { getTokens, saveTokens, clearTokens } from './storage';
import { ApiError } from '../types';

// Create Axios instance
const api: AxiosInstance = axios.create({
  baseURL: Config.API_URL,
  timeout: Config.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Track refresh state to avoid infinite loops
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
};

// Request interceptor - attach JWT
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const tokens = await getTokens();
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const tokens = await getTokens();
        if (!tokens?.accessToken) {
          throw new Error('No refresh token');
        }

        const refreshToken = tokens.refreshToken ?? tokens.accessToken;

        const response = await axios.post(`${Config.API_URL}/auth/refresh`, {
          token: refreshToken,
          refreshToken,
        });

        const responsePayload = response.data?.data ?? response.data;
        const accessToken = responsePayload?.tokens?.accessToken ?? responsePayload?.token;
        const nextRefreshToken = responsePayload?.tokens?.refreshToken ?? refreshToken;

        if (!accessToken) {
          throw new Error('Invalid refresh response');
        }

        await saveTokens({ accessToken, refreshToken: nextRefreshToken });

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearTokens();
        // Trigger logout in auth store - import dynamically to avoid circular deps
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Transform error to user-friendly message
    const apiError: ApiError = {
      message: getErrorMessage(error),
      code: (error.response?.data as Record<string, string>)?.code,
      statusCode: error.response?.status,
    };

    return Promise.reject(apiError);
  }
);

function getErrorMessage(error: AxiosError): string {
  if (!error.response) {
    return 'Network error. Please check your connection.';
  }

  const data = error.response.data as Record<string, string> | undefined;
  if (data?.message) {
    return data.message;
  }

  switch (error.response.status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You don\'t have permission to do this.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This record already exists.';
    case 422:
      return 'Validation error. Please check your input.';
    case 500:
      return 'Server error. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default api;
