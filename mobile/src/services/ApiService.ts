import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
}

/**
 * Serviço de API para comunicação com o backend
 */
export class ApiService {
  private config: ApiConfig;
  private authToken: string | null = null;

  constructor(config: ApiConfig) {
    this.config = config;
    this.loadAuthToken();
  }

  /**
   * Carrega token de autenticação do storage
   */
  private async loadAuthToken(): Promise<void> {
    try {
      this.authToken = await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error loading auth token:', error);
    }
  }

  /**
   * Define token de autenticação
   */
  async setAuthToken(token: string): Promise<void> {
    this.authToken = token;
    await AsyncStorage.setItem('authToken', token);
  }

  /**
   * Remove token de autenticação
   */
  async clearAuthToken(): Promise<void> {
    this.authToken = null;
    await AsyncStorage.removeItem('authToken');
  }

  /**
   * Executa requisição HTTP
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseURL}${endpoint}`;
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.authToken) {
      requestHeaders.Authorization = `Bearer ${this.authToken}`;
    }

    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (data && method !== 'GET') {
      requestConfig.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, requestConfig);
      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: responseData.message || `HTTP ${response.status}`,
          errors: responseData.errors,
        };
      }

      return {
        success: true,
        data: responseData.data || responseData,
        message: responseData.message,
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, headers);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, headers);
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, headers);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, headers);
  }
}

export default ApiService;