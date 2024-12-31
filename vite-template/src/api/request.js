// axios.js

import axios from 'axios';
import router from '@/router';

// 创建axios实例
const instance = axios.create({
  baseURL: '/api',
  timeout: 10000,  // 增加超时时间到10秒
  withCredentials: true
});

// 添加请求拦截器
instance.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 清除 token
      localStorage.removeItem('token');
      router.push('/login');
      return Promise.reject(new Error('请先登录'));
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default instance;
