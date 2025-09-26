import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { Notify, Screen } from 'quasar';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const storedTokens = localStorage.getItem('auth_tokens');
    if (storedTokens) {
      try {
        const tokens = JSON.parse(storedTokens);
        if (tokens.access_token) {
          config.headers.Authorization = `Bearer ${tokens.access_token}`;
        }
      } catch (err) {
        console.error('Failed to parse stored tokens:', err);
      }
    }
    return config;
  },
  (error: Error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Get refresh token
        const storedTokens = localStorage.getItem('auth_tokens');
        if (!storedTokens) {
          throw new Error('No refresh token available');
        }

        const tokens = JSON.parse(storedTokens);
        if (!tokens.refresh_token) {
          throw new Error('No refresh token available');
        }

        // Attempt to refresh token
        const response = await api.post('/auth/refresh', {
          refresh_token: tokens.refresh_token,
        });

        if (response.data && response.data.access_token) {
          const newTokens = {
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token,
            expires_in: response.data.expires_in,
            refresh_expires_in: 7 * 24 * 60 * 60,
          };
          localStorage.setItem('auth_tokens', JSON.stringify(newTokens));

          // Update authorization header for original request
          originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;

          processQueue(null, newTokens.access_token);
          return api(originalRequest);
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (refreshError) {
        processQueue(refreshError as Error, null);

        // Clear auth and redirect to login
        localStorage.removeItem('auth_tokens');
        localStorage.removeItem('auth_user');

        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError as Error);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      Notify.create({
        message: error.response.data?.message || 'Access denied',
        position: Screen.gt.xs ? 'top-right' : 'top',
        classes: 'max-width-24rem notify-error',
      });
    }

    // Handle 500 Internal Server Error
    if (error.response?.status >= 500) {
      Notify.create({
        message: 'Server error. Please try again later',
        position: Screen.gt.xs ? 'top-right' : 'top',
        classes: 'max-width-24rem notify-error',
      });
    }

    // Handle network errors
    if (!error.response && error.message === 'Network Error') {
      Notify.create({
        message: 'Network error. Please check your connection',
        position: Screen.gt.xs ? 'top-right' : 'top',
        classes: 'max-width-24rem notify-error',
      });
    }

    return Promise.reject(error as Error);
  },
);

export default api;
