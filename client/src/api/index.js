import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pitchos_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (email, password) => api.post('/auth/register', { email, password });
export const login = (email, password) => api.post('/auth/login', { email, password });
export const loginDemo = () => api.post('/auth/demo');
export const getMe = () => api.get('/auth/me');

// Upload
export const uploadDeck = (file, deckName, onProgress) => {
  const form = new FormData();
  form.append('deck', file);
  form.append('deckName', deckName);
  return api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  });
};
export const uploadSampleDeck = () => api.post('/upload/sample');

// Analysis
export const startAnalysis = (sessionId) => api.post(`/analyze/${sessionId}`);
export const getAnalysis = (sessionId) => api.get(`/analyze/${sessionId}`);

// QA
export const getQAState = (sessionId) => api.get(`/qa/${sessionId}/state`);
export const getQAMessages = (sessionId) => api.get(`/qa/${sessionId}/messages`);
export const startQA = (sessionId) => api.post(`/qa/${sessionId}/start`);
export const submitAnswer = (sessionId, areaId, answer, lastQuestion) =>
  api.post(`/qa/${sessionId}/answer`, { areaId, answer, lastQuestion });

// Report
export const generateReport = (sessionId) => api.post(`/report/${sessionId}/generate`);
export const getReport = (sessionId) => api.get(`/report/${sessionId}`);
export const getAllSessions = () => api.get('/report/sessions/all');

export default api;
