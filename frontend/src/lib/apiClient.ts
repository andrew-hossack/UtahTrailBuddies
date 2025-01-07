// src/lib/apiClient.ts
const API_BASE_URL = import.meta.env.VITE_API_URL;

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
}

export const apiClient = {
  async fetch(endpoint: string, config: RequestConfig = {}) {
    const { params, ...requestConfig } = config;

    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url, {
      ...requestConfig,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
    });

    if (!response.ok) {
      throw new Error("API request failed");
    }

    return response.json();
  },

  get(endpoint: string, config: RequestConfig = {}) {
    return this.fetch(endpoint, { ...config, method: "GET" });
  },

  post(endpoint: string, data: any, config: RequestConfig = {}) {
    return this.fetch(endpoint, {
      ...config,
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  put(endpoint: string, data: any, config: RequestConfig = {}) {
    return this.fetch(endpoint, {
      ...config,
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete(endpoint: string, config: RequestConfig = {}) {
    return this.fetch(endpoint, { ...config, method: "DELETE" });
  },
};
