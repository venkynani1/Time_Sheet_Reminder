// Centralizes HTTP requests to the weekly timesheet reminder API.
import axios from 'axios';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const api = axios.create({ baseURL: `${apiBaseUrl.replace(/\/$/, '')}/api` });

export const getMembers = async () => (await api.get('/members')).data;
export const addMember = async (member) => (await api.post('/members', member)).data;
export const updateMember = async (id, member) => (await api.put(`/members/${id}`, member)).data;
export const deleteMember = async (id) => api.delete(`/members/${id}`);
export const importMembersCsv = async (csv) => (await api.post('/members/import', { csv })).data;
export const getCurrentWeek = async () => (await api.get('/timesheet/current-week')).data;
export const confirmTimesheet = async (token, answer) => (await api.post(`/timesheet/confirm/${token}`, { answer })).data;
export const sendRemindersNow = async () => (await api.post('/timesheet/send-reminders-now')).data;
export const resetWeek = async () => (await api.post('/timesheet/reset-week')).data;
export const markSubmitted = async (memberId) => (await api.post(`/timesheet/mark-submitted/${memberId}`)).data;
export const getLogs = async () => (await api.get('/timesheet/logs')).data;
export const getSettings = async () => (await api.get('/timesheet/settings')).data;
export const sendTestEmail = async (email) => (await api.post('/settings/test-email', { email })).data;
export const getEmailTemplate = async () => (await api.get('/settings/email-template')).data;
export const updateEmailTemplate = async (template) => (await api.put('/settings/email-template', template)).data;
