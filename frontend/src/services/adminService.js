import api from './api';

export const getAllUsers = (params) => api.get('/admin/users', { params });

export const updateUserRole = (id, role) =>
  api.patch(`/admin/users/${id}/role`, { role });

export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

export const getAnalytics = () => api.get('/admin/analytics');
