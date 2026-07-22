import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/me/password', data),
};

// --- Projects ---
export const projectApi = {
  list: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  listMembers: (id) => api.get(`/projects/${id}/members`),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data),
  removeMember: (projectId, userId) => api.delete(`/projects/${projectId}/members/${userId}`),
};

// --- Boards ---
export const boardApi = {
  listByProject: (projectId) => api.get(`/boards/project/${projectId}`),
  get: (id) => api.get(`/boards/${id}`),
  addColumn: (boardId, data) => api.post(`/boards/${boardId}/columns`, data),
  deleteColumn: (columnId) => api.delete(`/boards/columns/${columnId}`),
};

// --- Sprints ---
export const sprintApi = {
  listByProject: (projectId) => api.get(`/sprints/project/${projectId}`),
  create: (data) => api.post('/sprints', data),
  update: (id, data) => api.put(`/sprints/${id}`, data),
  delete: (id) => api.delete(`/sprints/${id}`),
};

// --- Issues ---
export const issueApi = {
  listByProject: (projectId, params) => api.get(`/issues/project/${projectId}`, { params }),
  getBacklog: (projectId) => api.get(`/issues/backlog/${projectId}`),
  get: (id) => api.get(`/issues/${id}`),
  create: (data) => api.post('/issues', data),
  update: (id, data) => api.put(`/issues/${id}`, data),
  move: (id, data) => api.put(`/issues/${id}/move`, data),
  delete: (id) => api.delete(`/issues/${id}`),
  // Comments
  listComments: (issueId) => api.get(`/issues/${issueId}/comments`),
  addComment: (issueId, data) => api.post(`/issues/${issueId}/comments`, data),
  deleteComment: (commentId) => api.delete(`/issues/comments/${commentId}`),
  // Labels
  listLabels: (projectId) => api.get(`/issues/labels/project/${projectId}`),
  createLabel: (data) => api.post('/issues/labels', data),
  deleteLabel: (id) => api.delete(`/issues/labels/${id}`),
};

// --- Users ---
export const userApi = {
  list: () => api.get('/users'),
};

// --- Super Admin ---
export const adminApi = {
  listUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
  resetPassword: (userId, new_password) => api.put(`/admin/users/${userId}/reset-password`, { new_password }),
  updateStatus: (userId, is_active) => api.put(`/admin/users/${userId}/status`, { is_active }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
};

export default api;
