import api from './api';

export const getComplaints = (params) => api.get('/complaints', { params });

export const getComplaintById = (id) => api.get(`/complaints/${id}`);

export const createComplaint = (formData, onUploadProgress) =>
  api.post('/complaints', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });

export const upvoteComplaint = (id) => api.post(`/complaints/${id}/upvote`);

export const addComment = (id, message) =>
  api.post(`/complaints/${id}/comment`, { message });

export const getMyComplaints = () => api.get('/complaints/my/list');

export const updateStatus = (id, data) =>
  api.patch(`/complaints/${id}/status`, data);

export const getWardComplaints = (params) =>
  api.get('/complaints/ward/list', { params });

export const getAllComplaintsAdmin = (params) =>
  api.get('/complaints/admin/all', { params });

export const deleteComplaint = (id) => api.delete(`/complaints/${id}`);
