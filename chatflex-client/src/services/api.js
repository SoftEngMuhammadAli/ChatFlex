import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("chatflex_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  register: (payload) => api.post("/auth/register", payload),
  login: (payload) => api.post("/auth/login", payload),
  oauth: (payload) => api.post("/auth/oauth", payload),
  requestEmailVerification: (payload) => api.post("/auth/verify-email/request", payload),
  verifyEmail: (payload) => api.post("/auth/verify-email/confirm", payload),
  forgotPassword: (payload) => api.post("/auth/forgot-password", payload),
  resetPassword: (payload) => api.post("/auth/reset-password", payload),
  me: () => api.get("/auth/me")
};

export const workspaceApi = {
  get: () => api.get("/workspace"),
  updateSettings: (payload) => api.patch("/workspace/settings", payload),
  users: () => api.get("/workspace/users"),
  invite: (payload) => api.post("/workspace/invite", payload)
};

export const conversationApi = {
  list: (params) => api.get("/conversations", { params }),
  getOne: (conversationId) => api.get(`/conversations/${conversationId}`),
  update: (conversationId, payload) => api.patch(`/conversations/${conversationId}`, payload),
  assign: (conversationId, payload) => api.patch(`/conversations/${conversationId}/assign`, payload),
  addMessage: (conversationId, payload) => api.post(`/conversations/${conversationId}/messages`, payload),
  addNote: (conversationId, payload) => api.post(`/conversations/${conversationId}/notes`, payload)
};

export const faqApi = {
  list: () => api.get("/faqs"),
  create: (payload) => api.post("/faqs", payload),
  update: (faqId, payload) => api.patch(`/faqs/${faqId}`, payload),
  remove: (faqId) => api.delete(`/faqs/${faqId}`)
};

export const analyticsApi = {
  summary: (params) => api.get("/analytics/summary", { params })
};

export const billingApi = {
  plans: () => api.get("/billing/plans"),
  usage: () => api.get("/billing/usage")
};

export default api;
