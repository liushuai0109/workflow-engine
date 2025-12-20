import axios, { AxiosInstance, AxiosError } from 'axios';

// API 基础地址配置
const getBaseURL = (): string => {
  if (import.meta.env.PROD) {
    return 'https://server.biz.com';
  }
  return 'http://server.biz.com:4000';
};

// 创建 axios 实例
const api: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证 token 等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // 统一错误处理
    if (error.response) {
      const data = error.response.data as any;
      if (data?.error) {
        console.error('API Error:', data.error);
      }
    } else if (error.request) {
      console.error('Network Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;

