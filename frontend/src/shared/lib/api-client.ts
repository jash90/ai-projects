import axios, { AxiosInstance } from 'axios'
import type { ApiResponse } from '@/shared/types'
// NOTE: Intentional coupling — interceptor requires synchronous access to auth tokens.
// authStore is imported directly because the request interceptor needs the token
// before every HTTP call, and the response interceptor needs to refresh/clear tokens.
import { authStore } from '@/features/auth/store'

function lazyBreadcrumb(type: string, message: string, data?: Record<string, unknown>, _level?: string) {
  import('@/shared/analytics/sentry').then(({ addBreadcrumb: ab }) => { try { ab(type, message, data); } catch {} })
}
function lazyCapture(err: unknown, ctx?: Record<string, unknown>) {
  import('@/shared/analytics/sentry').then(({ captureException: ce }) => { try { ce(err, ctx); } catch {} })
}

class ApiClient {
  private client: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (token: string) => void
    reject: (error: any) => void
  }> = []

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error)
      } else {
        resolve(token!)
      }
    })
    this.failedQueue = []
  }

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 120000,
      withCredentials: true,
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        const token = authStore.getState().tokens?.access_token
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        lazyBreadcrumb('http', `${config.method?.toUpperCase()} ${config.url}`, {
          method: config.method?.toUpperCase(),
          url: config.url,
        })
        return config
      },
      (error) => Promise.reject(error)
    )

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        lazyBreadcrumb('http', `API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
          method: originalRequest?.method?.toUpperCase(),
          url: originalRequest?.url,
          status: error.response?.status,
        }, 'error')

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          if (this.isRefreshing) {
            return new Promise<string>((resolve, reject) => {
              this.failedQueue.push({ resolve, reject })
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              return this.client(originalRequest)
            })
          }

          this.isRefreshing = true

          try {
            const refreshToken = authStore.getState().tokens?.refresh_token
            if (refreshToken) {
              const response = await this.client.post<ApiResponse<{ access_token: string }>>('/auth/refresh', {
                refresh_token: refreshToken,
              })

              if (response.data.success && response.data.data) {
                const newToken = response.data.data.access_token
                authStore.getState().setTokens({
                  access_token: newToken,
                  refresh_token: refreshToken,
                })

                this.processQueue(null, newToken)

                originalRequest.headers.Authorization = `Bearer ${newToken}`
                return this.client(originalRequest)
              }
            }
          } catch (refreshError) {
            this.processQueue(refreshError)
            authStore.getState().logout()
            return Promise.reject(refreshError)
          } finally {
            this.isRefreshing = false
          }
        }

        try {
          lazyBreadcrumb('http', `API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            url: error.config?.url,
            status: error.response?.status,
          });
          if (error.response?.status >= 500) {
            lazyCapture(error, { url: error.config?.url, status: error.response?.status });
          }
        } catch {}

        if (error.response?.data) {
          const errorData = error.response.data;
          const structuredError = new Error(errorData.error || errorData.message || 'API Error');
          structuredError.name = 'APIError';
          (structuredError as any).errorData = errorData;
          return Promise.reject(structuredError);
        }

        return Promise.reject(error)
      }
    )
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params })
    return response.data
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data)
    return response.data
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data)
    return response.data
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url)
    return response.data
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data)
    return response.data
  }

  async uploadFile<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await this.client.post<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })

    return response.data
  }

  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, { responseType: 'blob' })
    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }

  async postFormData<T>(url: string, formData: FormData): Promise<T> {
    const response = await this.client.post<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }

  async putFormData<T>(url: string, formData: FormData): Promise<T> {
    const response = await this.client.put<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }

  getClient(): AxiosInstance {
    return this.client
  }
}

export const apiClient = new ApiClient()
