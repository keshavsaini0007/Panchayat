import api from './api';

export const register = (data) => api.post('/auth/register', data);

export const login = (data) => api.post('/auth/login', data);

export const getMe = () => api.get('/auth/me');

export const sendOtp = (email) => api.post('/auth/send-otp', { email });

export const verifyOtp = (email, otp) => api.post('/auth/verify-otp', { email, otp });
