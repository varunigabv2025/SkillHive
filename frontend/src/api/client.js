import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const TOKEN_KEY = 'auth_token';
export const AUTH_EXPIRED_EVENT = 'auth:expired';

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (e) {}
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCall = error.config?.url?.startsWith('/api/auth/login') || error.config?.url?.startsWith('/api/auth/register');
    if (error.response?.status === 401 && !isAuthCall) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

export const loginUser = async (username, password) => (await api.post('/api/auth/login', { username, password })).data;

export const registerUser = async (username, password) =>
  (await api.post('/api/auth/register', { username, password })).data;

export const getCurrentUser = async () => (await api.get('/api/auth/me')).data.user;

export const getAdminUsers = async () => (await api.get('/api/admin/users')).data;

export const analyzeResume = async (file, jobDescription, githubUrl) => {
  console.log('[DEBUG client.js] Preparing FormData for /api/analyze...');
  const formData = new FormData();
  formData.append('resume_file', file);
  formData.append('job_description', jobDescription);
  if (githubUrl && typeof githubUrl === 'string' && githubUrl.trim()) {
    formData.append('github_url', githubUrl.trim());
  }

  console.log(`[DEBUG client.js] Executing POST request to ${API_BASE_URL}/api/analyze...`);
  const response = await api.post('/api/analyze', formData);
  console.log('[DEBUG client.js] Response received from server:', response.data);
  return response.data;
};

export const analyzeGithub = async (githubUrl) => {
  console.log(`[DEBUG client.js] Analyzing GitHub Profile: ${githubUrl}...`);
  const username = githubUrl ? githubUrl.split('/').filter(Boolean).pop() : githubUrl;
  const response = await api.post('/api/github/analyze', { username });
  return response.data;
};

export const getHistory = async () => {
  console.log(`[DEBUG client.js] Fetching history from ${API_BASE_URL}/api/history...`);
  const response = await api.get('/api/history');
  return response.data;
};

export const getAnalysis = async (id) => {
  console.log(`[DEBUG client.js] Fetching analysis #${id} from ${API_BASE_URL}/api/history/${id}...`);
  const response = await api.get(`/api/history/${id}`);
  return response.data;
};
