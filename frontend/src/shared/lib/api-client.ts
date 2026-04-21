/**
 * API Client for backend communication
 * Production-ready with error handling, retry logic, token refresh, and timezone handling
 * Uses native fetch API - no external dependencies
 */

import { TimezoneUtil } from './timezone';

// In dev (Vite), always use same-origin and rely on Vite proxy (`/api`, `/uploads`)
// This prevents random tunnel DNS issues from breaking the app.
const API_BASE_URL = import.meta.env.DEV
    ? window.location.origin
    : (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || window.location.origin);

interface RequestOptions extends RequestInit {
    params?: Record<string, string | number | boolean | undefined>;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    skipAuth?: boolean; // Skip authentication for public endpoints
    silent?: boolean; // Don't redirect to login on 401 (for silent session checks)
}

interface ApiResponse<T> {
    data: T | null;
    error: {
        message: string;
        technicalMessage?: string;
        status: number;
        code?: string;
        details?: any;
        nextSteps?: string[];
    } | null;
}

class ApiClient {
    private baseUrl: string;
    private refreshTokenPromise: Promise<string | null> | null = null;
    private readonly defaultTimeout = 30000; // 30 seconds
    private readonly defaultRetries = 2;
    private readonly defaultRetryDelay = 1000; // 1 second
    private timezoneCookieSet = false;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
        // Initialize timezone cookie on first load
        this.initializeTimezoneCookie();
    }

    /**
     * Initialize timezone cookie once on app load
     * This enables CORS preflight caching by moving timezone from header to cookie
     */
    private initializeTimezoneCookie(): void {
        try {
            // Check if timezone cookie already exists
            const cookies = document.cookie.split(';');
            const timezoneCookie = cookies.find((c) => c.trim().startsWith('client-timezone='));
            
            if (!timezoneCookie) {
                // Get client timezone
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Bangkok';
                
                // Set cookie with appropriate flags
                const isProduction = window.location.protocol === 'https:';
                const cookieFlags = [
                    `client-timezone=${encodeURIComponent(timezone)}`,
                    'path=/',
                    'max-age=31536000', // 1 year
                    'SameSite=Lax', // Allow cross-site but secure
                    isProduction ? 'Secure' : '', // HTTPS only in production
                ].filter(Boolean).join('; ');
                
                document.cookie = cookieFlags;
                this.timezoneCookieSet = true;
                
                if (import.meta.env.DEV) {
                    console.log(`[API Client] Timezone cookie set: ${timezone}`);
                }
            } else {
                this.timezoneCookieSet = true;
                if (import.meta.env.DEV) {
                    const timezone = decodeURIComponent(timezoneCookie.split('=')[1]);
                    console.log(`[API Client] Timezone cookie exists: ${timezone}`);
                }
            }
        } catch (error) {
            console.error('[API Client] Failed to set timezone cookie:', error);
            // Fallback: will use header if cookie fails
        }
    }

    /**
     * Get auth token from storage
     */
    private getAuthToken(): string | null {
        // Try to get from cookies first (set by backend)
        const cookies = document.cookie.split(';');
        const tokenCookie = cookies.find((c) => c.trim().startsWith('accessToken='));
        if (tokenCookie) {
            return decodeURIComponent(tokenCookie.split('=')[1]);
        }
        // Fallback to localStorage
        return localStorage.getItem('accessToken');
    }

    /**
     * Get refresh token from storage
     */
    private getRefreshToken(): string | null {
        const cookies = document.cookie.split(';');
        const refreshTokenCookie = cookies.find((c) => c.trim().startsWith('refreshToken='));
        if (refreshTokenCookie) {
            return decodeURIComponent(refreshTokenCookie.split('=')[1]);
        }
        return localStorage.getItem('refreshToken');
    }

    /**
     * Set auth token in storage
     */
    private setAuthToken(token: string): void {
        localStorage.setItem('accessToken', token);
        // Also set in cookie for backend compatibility
        document.cookie = `accessToken=${encodeURIComponent(token)}; path=/; max-age=3600; SameSite=Strict`;
    }

    /**
     * Clear auth tokens
     */
    private clearAuthTokens(): void {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }

    /**
     * Refresh access token
     */
    private async refreshAccessToken(): Promise<string | null> {
        // Prevent multiple simultaneous refresh requests
        if (this.refreshTokenPromise) {
            return this.refreshTokenPromise;
        }

        this.refreshTokenPromise = (async () => {
            try {
                const refreshToken = this.getRefreshToken();
                if (!refreshToken) {
                    return null;
                }

                const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ refreshToken }),
                    credentials: 'include',
                });

                if (!response.ok) {
                    // Refresh failed - clear tokens and redirect to login
                    this.clearAuthTokens();
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                    return null;
                }

                const data = await response.json();
                
                if (data.data?.accessToken) {
                    this.setAuthToken(data.data.accessToken);
                    

                    // TOKEN ROTATION: Update refresh token if provided
                    if (data.data?.refreshToken) {
                        localStorage.setItem('refreshToken', data.data.refreshToken);
                        document.cookie = `refreshToken=${encodeURIComponent(data.data.refreshToken)}; path=/; max-age=604800; SameSite=Strict`;
                        
                    }

                    return data.data.accessToken;
                }

                return null;
            } catch (error) {
                console.error('Token refresh failed:', error);
                this.clearAuthTokens();
                return null;
            } finally {
                this.refreshTokenPromise = null;
            }
        })();

        return this.refreshTokenPromise;
    }

    /**
     * Check if token is about to expire and refresh preemptively
     */
    private async checkAndRefreshToken(): Promise<void> {
        const token = this.getAuthToken();
        if (!token) return;

        try {
            // Decode token to check expiry
            const parts = token.split('.');
            if (parts.length !== 3) return;

            const payload = JSON.parse(atob(parts[1]));
            if (!payload.exp) return;

            const expiryTime = payload.exp * 1000; // Convert to milliseconds
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;

            // If token expires in less than 5 minutes, refresh it
            if ((expiryTime - now) < fiveMinutes && (expiryTime - now) > 0) {
                await this.refreshAccessToken();
            }
        } catch (error) {
            // Ignore errors in preemptive refresh
        }
    }

    /**
     * Process request body to handle dates
     */
    private processRequestBody(body: any): any {
        if (!body || typeof body !== 'object') {
            return body;
        }

        // Convert dates to server time (UTC) for API requests
        const processValue = (value: any): any => {
            if (value instanceof Date) {
                // Validate date before processing
                if (isNaN(value.getTime())) {
                    console.warn('[API Client] Invalid Date object found, skipping conversion:', value);
                    return null; // Return null for invalid dates
                }
                try {
                    return TimezoneUtil.toServerTime(value);
                } catch (error) {
                    console.warn('[API Client] Failed to convert date to server time:', value, error);
                    return null; // Return null if conversion fails
                }
            }
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value)) {
                // Looks like a single, valid ISO date string - convert to server time
                try {
                    return TimezoneUtil.toServerTime(value);
                } catch (error) {
                    console.warn('[API Client] Failed to convert date string to server time:', value, error);
                    return value; // Return original string if conversion fails
                }
            }
            if (Array.isArray(value)) {
                return value.map(processValue);
            }
            if (value && typeof value === 'object') {
                const processed: any = {};
                for (const [key, val] of Object.entries(value)) {
                    processed[key] = processValue(val);
                }
                return processed;
            }
            return value;
        };

        return processValue(body);
    }

    /**
     * Process response data to handle dates
     */
    private processResponseData(data: any): any {
        if (!data || typeof data !== 'object') {
            return data;
        }

        // Convert server dates to client timezone for display
        const processValue = (value: any): any => {
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value)) {
                // Looks like a single, valid ISO date string from server
                try {
                    return TimezoneUtil.fromServerTime(value);
                } catch (error) {
                    console.warn('[API Client] Failed to convert server date to client time:', value, error);
                    return value; // Return original string if conversion fails
                }
            }
            if (Array.isArray(value)) {
                return value.map(processValue);
            }
            if (value && typeof value === 'object') {
                const processed: any = {};
                for (const [key, val] of Object.entries(value)) {
                    processed[key] = processValue(val);
                }
                return processed;
            }
            return value;
        };

        return processValue(data);
    }
    private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
        const url = new URL(endpoint, this.baseUrl);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value));
                }
            });
        }
        return url.toString();
    }

    /**
     * Create timeout promise
     */
    private createTimeoutPromise(timeout: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), timeout);
        });
    }

    /**
     * Make HTTP request with retry logic
     */
    private async request<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<ApiResponse<T>> {
        const {
            params,
            timeout = this.defaultTimeout,
            retries = this.defaultRetries,
            retryDelay = this.defaultRetryDelay,
            skipAuth = false,
            silent = false,
            ...fetchOptions
        } = options;

        // Check if this is a public endpoint (login, register, etc.)
        const isPublicEndpoint = skipAuth || 
            endpoint.includes('/auth/login') || 
            endpoint.includes('/auth/register') ||
            endpoint.includes('/auth/forgot-password') ||
            endpoint.includes('/auth/reset-password') ||
            endpoint.includes('/auth/verify-email');

        // Only check and refresh token for authenticated endpoints
        if (!isPublicEndpoint) {
            await this.checkAndRefreshToken();
        }

        let lastError: Error | null = null;
        let forcedToken: string | null = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const url = this.buildUrl(endpoint, params);
                // ✅ Get token: Use forcedToken if available (from refresh), otherwise get from storage
                const token = forcedToken || this.getAuthToken();

                // Only log in development mode
                if (import.meta.env.DEV && attempt > 0) {
                    console.log(`[API Client] Retry attempt ${attempt} for ${endpoint}`);
                }

                const headers: HeadersInit = {
                    ...fetchOptions.headers,
                };

                // Only set Content-Type if there's a body
                if (fetchOptions.body !== undefined) {
                    headers['Content-Type'] = 'application/json';
                }

                // ✅ Timezone is now sent via cookie (set in constructor)
                // This enables CORS preflight caching by removing custom header
                // Fallback: If cookie failed to set, use header
                if (!this.timezoneCookieSet) {
                    headers['X-Client-Timezone'] = 'Asia/Bangkok';
                }

                // Only add Authorization header for authenticated endpoints
                if (token && !isPublicEndpoint) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                // Create abort controller for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                try {
                    const response = await Promise.race([
                        fetch(url, {
                            ...fetchOptions,
                            headers,
                            credentials: 'include',
                            signal: controller.signal,
                        }),
                        this.createTimeoutPromise(timeout),
                    ]);

                    clearTimeout(timeoutId);

                    // Handle empty response - parse first
                    let data: any;
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const text = await response.text();
                        data = text ? JSON.parse(text) : {};
                    } else {
                        data = {};
                    }

                    // Handle 401 Unauthorized - try to refresh token
                    if (response.status === 401) {
                        // Skip token refresh for public endpoints (login page)
                        if (isPublicEndpoint) {
                            return {
                                data: null,
                                error: {
                                    message: this.getUserFriendlyMessage(401, data.error?.message || data.message),
                                    status: 401,
                                    code: data.error?.code,
                                    details: data.error?.details,
                                    nextSteps: data.error?.nextSteps,
                                },
                            };
                        }

                        // Only try to refresh once (on first attempt)
                        if (attempt === 0 && !silent) {
                            const oldToken = token?.substring(0, 20);
                            const newToken = await this.refreshAccessToken();
                            if (newToken) {
                                await new Promise(resolve => setTimeout(resolve, 500));

                                // FORCE USE NEW TOKEN
                                forcedToken = newToken;

                                continue;
                            } else {
                            }
                        } else if (attempt > 0) {
                        }
                        
                        // If refresh failed, this is a retry, or silent mode - return 401 error without redirect
                        return {
                            data: null,
                            error: {
                                message: silent ? 'Session expired' : 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
                                status: 401,
                                code: 'SESSION_EXPIRED',
                            },
                        };
                    }

                    // Handle empty response
                    if (!response.ok) {
                        // Don't retry on client errors (4xx) except 401
                        if (response.status >= 400 && response.status < 500 && response.status !== 401) {
                            return {
                                data: null,
                                error: {
                                    message: this.getUserFriendlyMessage(response.status, data.error?.message || data.message),
                                    technicalMessage: data.error?.technicalMessage || data.error?.message || data.message,
                                    status: response.status,
                                    code: data.error?.code,
                                    details: data.error?.details,
                                    nextSteps: data.error?.nextSteps,
                                },
                            };
                        }

                        // Retry on server errors (5xx) or network errors
                        if (response.status >= 500 || response.status === 0) {
                            lastError = new Error(data.error?.message || `HTTP ${response.status}`);
                            if (attempt < retries) {
                                await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
                                continue;
                            }
                        }

                        return {
                            data: null,
                            error: {
                                message: this.getUserFriendlyMessage(response.status, data.error?.message || data.message),
                                status: response.status,
                                code: data.error?.code,
                                details: data.error?.details,
                                nextSteps: data.error?.nextSteps,
                            },
                        };
                    }

                    // Process response data for timezone conversion
                    const processedData = this.processResponseData(data.data || data);

                    return { data: processedData, error: null };
                } catch (fetchError: any) {
                    clearTimeout(timeoutId);

                    // Handle abort (timeout)
                    if (fetchError.name === 'AbortError' || fetchError.message === 'Request timeout') {
                        lastError = new Error('การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง');
                        if (attempt < retries) {
                            await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
                            continue;
                        }
                    }

                    // Handle network errors
                    if (fetchError instanceof TypeError || fetchError.message.includes('fetch')) {
                        lastError = fetchError;
                        if (attempt < retries) {
                            await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
                            continue;
                        }
                    }

                    throw fetchError;
                }
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                if (attempt < retries) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
                    continue;
                }
            }
        }

        // All retries exhausted
        return {
            data: null,
            error: {
                message: this.getUserFriendlyMessage(0, lastError?.message),
                status: 0,
            },
        };
    }

    /**
     * Convert technical error messages to user-friendly Thai messages
     * Now supports Backend Error Response with nextSteps and supportContact
     */
    private getUserFriendlyMessage(status: number, originalMessage?: string, errorData?: any): string {
        // If backend provides a Thai message (contains Thai characters), use it directly
        if (originalMessage && /[\u0E00-\u0E7F]/.test(originalMessage)) {
            return originalMessage;
        }

        // Check for specific error patterns first
        if (originalMessage) {
            const lowerMsg = originalMessage.toLowerCase();
            
            // Authentication errors
            if (lowerMsg.includes('invalid credentials') || lowerMsg.includes('incorrect password')) {
                return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
            }
            if (lowerMsg.includes('user not found') || lowerMsg.includes('account not found')) {
                return 'ไม่พบบัญชีผู้ใช้นี้ในระบบ';
            }
            if (lowerMsg.includes('account locked') || lowerMsg.includes('account disabled')) {
                return 'บัญชีของคุณถูกระงับ กรุณาติดต่อผู้ดูแลระบบ';
            }
            
            // Network errors
            if (lowerMsg.includes('network') || lowerMsg.includes('fetch')) {
                return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
            }
            if (lowerMsg.includes('timeout')) {
                return 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง';
            }
            
            // Permission errors
            if (lowerMsg.includes('permission') || lowerMsg.includes('forbidden')) {
                return 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
            }
            
            // Validation errors
            if (lowerMsg.includes('validation') || lowerMsg.includes('invalid')) {
                return 'ข้อมูลที่กรอกไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่';
            }
            
            // Duplicate errors
            if (lowerMsg.includes('duplicate') || lowerMsg.includes('already exists')) {
                return 'ข้อมูลนี้มีอยู่ในระบบแล้ว';
            }
        }

        // Fallback to status code messages
        switch (status) {
            case 400:
                return 'ข้อมูลที่ส่งมาไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่';
            case 401:
                return 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง';
            case 403:
                return 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
            case 404:
                return 'ไม่พบข้อมูลที่ต้องการ';
            case 409:
                return 'ข้อมูลนี้มีอยู่ในระบบแล้ว';
            case 422:
                return 'ข้อมูลที่กรอกไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่';
            case 429:
                return 'คุณส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
            case 500:
                return 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง';
            case 502:
            case 503:
                return 'ระบบไม่สามารถให้บริการได้ชั่วคราว กรุณาลองใหม่ในภายหลัง';
            case 504:
                return 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง';
            case 0:
                return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
            default:
                return originalMessage || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
        }
    }

    /**
     * GET request
     */
    async get<T>(endpoint: string, params?: RequestOptions['params'], options?: Omit<RequestOptions, 'params'>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'GET', params, ...options });
    }

    /**
     * POST request
     */
    async post<T>(endpoint: string, body?: any, params?: RequestOptions['params'], options?: Omit<RequestOptions, 'params'>): Promise<ApiResponse<T>> {
        const processedBody = body !== undefined ? this.processRequestBody(body) : undefined;
        return this.request<T>(endpoint, {
            method: 'POST',
            body: processedBody !== undefined ? JSON.stringify(processedBody) : undefined,
            params,
            ...options,
        });
    }

    /**
     * PUT request
     */
    async put<T>(endpoint: string, body?: any, params?: RequestOptions['params'], options?: Omit<RequestOptions, 'params'>): Promise<ApiResponse<T>> {
        const processedBody = body !== undefined ? this.processRequestBody(body) : undefined;
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: processedBody !== undefined ? JSON.stringify(processedBody) : undefined,
            params,
            ...options,
        });
    }

    /**
     * PATCH request
     */
    async patch<T>(endpoint: string, body?: any, params?: RequestOptions['params'], options?: Omit<RequestOptions, 'params'>): Promise<ApiResponse<T>> {
        const processedBody = body !== undefined ? this.processRequestBody(body) : undefined;
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: processedBody !== undefined ? JSON.stringify(processedBody) : undefined,
            params,
            ...options,
        });
    }

    /**
     * DELETE request
     */
    async delete<T>(endpoint: string, params?: RequestOptions['params'], options?: Omit<RequestOptions, 'params'>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'DELETE', params, ...options });
    }

    /**
     * Upload file with progress tracking
     */
    async uploadFile<T>(
        endpoint: string,
        file: File,
        additionalFields?: Record<string, string>,
        onProgress?: (progress: number) => void
    ): Promise<ApiResponse<T>> {
        try {
            const formData = new FormData();
            formData.append('file', file);

            if (additionalFields) {
                Object.entries(additionalFields).forEach(([key, value]) => {
                    formData.append(key, value);
                });
            }

            const token = this.getAuthToken();
            const headers: HeadersInit = {};

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const url = this.buildUrl(endpoint);

            // Use XMLHttpRequest for progress tracking
            return new Promise((resolve) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable && onProgress) {
                        const progress = Math.round((e.loaded / e.total) * 100);
                        onProgress(progress);
                    }
                });

                xhr.addEventListener('load', () => {
                    try {
                        const data = xhr.responseText ? JSON.parse(xhr.responseText) : {};

                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve({ data: data.data || data, error: null });
                        } else {
                            resolve({
                                data: null,
                                error: {
                                    message: this.getUserFriendlyMessage(xhr.status, data.error?.message || data.message),
                                    status: xhr.status,
                                    code: data.error?.code,
                                    details: data.error?.details,
                                    nextSteps: data.error?.nextSteps,
                                },
                            });
                        }
                    } catch (error) {
                        resolve({
                            data: null,
                            error: {
                                message: 'ไม่สามารถประมวลผลข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                                status: xhr.status,
                            },
                        });
                    }
                });

                xhr.addEventListener('error', () => {
                    resolve({
                        data: null,
                        error: {
                            message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
                            status: 0,
                        },
                    });
                });

                xhr.addEventListener('abort', () => {
                    resolve({
                        data: null,
                        error: {
                            message: 'การอัปโหลดถูกยกเลิก',
                            status: 0,
                        },
                    });
                });

                xhr.open('POST', url);
                xhr.withCredentials = true;

                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }

                xhr.send(formData);
            });
        } catch (error) {
            return {
                data: null,
                error: {
                    message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์ กรุณาลองใหม่อีกครั้ง',
                    status: 0,
                },
            };
        }
    }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types for use in components
export type { ApiResponse, RequestOptions };

// Export user-friendly error handler for components
export function getErrorMessage(error: ApiResponse<any>['error']): string {
    return error?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
}
