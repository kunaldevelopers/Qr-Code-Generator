// Auth Configuration for MongoDB-based JWT Authentication

/**
 * API Endpoints for authentication
 */
export const AUTH_API = {
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  REGISTER: "/auth/register",
  LOGIN: "/auth/login",
  USER_INFO: "/auth/me",
  QR_CODES: "/qrcodes",
  BULK_QR: "/qrcodes/bulk",
  FORMAT_QR: "/qrcodes/format-content",
  UPLOAD_LOGO: "/qrcodes/upload-logo",
  ANALYTICS: "/analytics",
};

/**
 * Token handling utilities
 */
export const TokenService = {
  /**
   * Get the stored JWT token
   */
  getToken: (): string | null => {
    return localStorage.getItem("token");
  },

  /**
   * Save token to localStorage
   */
  setToken: (token: string): void => {
    localStorage.setItem("token", token);
  },

  /**
   * Remove token from localStorage
   */
  removeToken: (): void => {
    localStorage.removeItem("token");
  },

  /**
   * Get auth header with Bearer token
   */
  getAuthHeader: (): { Authorization: string } | {} => {
    const token = TokenService.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
};

/**
 * User service for getting and setting user data
 */
export const UserService = {
  /**
   * Get the stored user data
   */
  getUser: () => {
    const userId = localStorage.getItem("userId");
    const email = localStorage.getItem("userEmail");

    return userId && email ? { userId, email } : null;
  },

  /**
   * Save user data to localStorage
   */
  setUser: (userId: string, email: string): void => {
    localStorage.setItem("userId", userId);
    localStorage.setItem("userEmail", email);
  },

  /**
   * Remove user data from localStorage
   */
  removeUser: (): void => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
  },
};

/**
 * API client for making authenticated requests
 */
export const ApiClient = {
  /**
   * Make authenticated GET request
   */
  get: async (endpoint: string) => {
    const response = await fetch(`${AUTH_API.BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        ...TokenService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Make authenticated POST request
   */
  post: async (endpoint: string, data: any) => {
    const response = await fetch(`${AUTH_API.BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...TokenService.getAuthHeader(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Make authenticated POST request with FormData (for file uploads)
   */
  postFormData: async (endpoint: string, formData: FormData) => {
    const response = await fetch(`${AUTH_API.BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        ...TokenService.getAuthHeader(),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Make authenticated DELETE request
   */
  delete: async (endpoint: string) => {
    const response = await fetch(`${AUTH_API.BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: {
        ...TokenService.getAuthHeader(),
      },
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`API request failed: ${response.status}`);
    }

    // For 204 No Content responses
    if (response.status === 204) {
      return null;
    }

    return response.json();
  },
};
