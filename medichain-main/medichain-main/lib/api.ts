import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medichain_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Surface backend error messages instead of generic Axios HTTP errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const backendMsg = error?.response?.data?.error;
    if (backendMsg) {
      error.message = backendMsg;
    }
    return Promise.reject(error);
  }
);


// Auth API
export const authAPI = {
  getNonce: async (address: string) => {
    const response = await api.post('/api/auth/nonce', { address });
    return response.data.nonce;
  },

  login: async (address: string, signature: string) => {
    const response = await api.post('/api/auth/login', { address, signature });
    return response.data.token;
  },
};

// Records API
export const recordsAPI = {
  uploadRecord: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/records', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getMyRecords: async () => {
    const response = await api.get('/api/records/mine');
    return response.data.records;
  },

  getRecord: async (recordId: string) => {
    const response = await api.get(`/api/records/${recordId}`);
    return response.data;
  },
};

// Access API
export const accessAPI = {
  grantAccess: async (recordId: string, provider: string, expiresAt: number) => {
    const response = await api.post('/api/access/grant', {
      recordId,
      provider,
      expiresAt,
    });
    return response.data;
  },

  revokeAccess: async (recordId: string, provider: string) => {
    const response = await api.post('/api/access/revoke', {
      recordId,
      provider,
    });
    return response.data;
  },

  checkAccess: async (recordId: string) => {
    const response = await api.get(`/api/access/check/${recordId}`);
    return response.data;
  },
};

// Audit API
export const auditAPI = {
  getAuditTrail: async (recordId: string) => {
    const response = await api.get(`/api/audit/${recordId}`);
    return response.data.events;
  },
};

// AI API
export const aiAPI = {
  checkConflicts: async (medications: string[], allergies: string[]) => {
    const response = await api.post('/api/ai/check-conflicts', {
      medications,
      allergies,
    });
    return response.data;
  },
};

export default api;
